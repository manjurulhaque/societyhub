"use server"

import { revalidatePath } from "next/cache"
import { requireCommitteeAccess, FINANCIAL_ROLES } from "@/lib/auth/requireAuth"
import { prisma } from "@/lib/prisma"
import { recordAuditLog } from "@/lib/audit"
import { sanitizeText } from "@/lib/sanitize"
import { getSafeErrorMessage } from "@/lib/errors"
import { logger } from "@/lib/logger"
import { parseBankStatementCsv, generateSampleBankStatementCsv } from "@/lib/accounting/bankStatementParser"
import {
  analyzeBankStatement,
  type AutoReconciliationAnalysisResult,
  type ReconciledTransactionMatch,
} from "@/lib/accounting/bankAutoMatchEngine"
import type { PaymentMode, PaymentStatus, ExpenseStatus } from "@/generated/prisma/client"

export type AnalysisActionState = {
  success?: boolean
  error?: string
  result?: AutoReconciliationAnalysisResult
}

export type BatchExecutionActionState = {
  success?: boolean
  error?: string
  reconciledCount?: number
  totalReconciledAmount?: number
  message?: string
}

/**
 * Server action to parse bank statement CSV and perform heuristic auto-matching.
 */
export async function analyzeStatementAction(
  societyCode: string,
  accountId: string,
  csvContent: string
): Promise<AnalysisActionState> {
  try {
    const authContext = await requireCommitteeAccess(societyCode, FINANCIAL_ROLES)
    const societyId = authContext.society.id

    if (!csvContent || !csvContent.trim()) {
      return { error: "Bank statement CSV content is empty." }
    }

    if (!accountId) {
      return { error: "Please select a bank account to reconcile against." }
    }

    const statement = parseBankStatementCsv(csvContent)
    if (!statement.rows || statement.rows.length === 0) {
      return { error: "No valid transaction rows found in the uploaded statement." }
    }

    const analysis = await analyzeBankStatement({
      societyId,
      accountId,
      statement,
    })

    return {
      success: true,
      result: analysis,
    }
  } catch (err: unknown) {
    logger.error("Error analyzing bank statement", err, "analyzeStatementAction", { societyCode, accountId })
    return { error: getSafeErrorMessage(err, "Failed to analyze bank statement.") }
  }
}

/**
 * Executes batch auto-reconciliation for approved matched rows.
 */
export async function executeAutoReconciliationBatch(
  societyCode: string,
  accountId: string,
  itemsToReconcile: ReconciledTransactionMatch[]
): Promise<BatchExecutionActionState> {
  try {
    const authContext = await requireCommitteeAccess(societyCode, FINANCIAL_ROLES)
    const societyId = authContext.society.id

    if (!itemsToReconcile || itemsToReconcile.length === 0) {
      return { error: "No transactions selected for reconciliation." }
    }

    const account = await prisma.account.findFirst({
      where: { id: accountId, societyId, isActive: true },
    })
    if (!account) {
      return { error: "Target bank account not found." }
    }

    let reconciledCount = 0
    let totalReconciledAmount = 0

    // Fetch initial payment count for sequential receipt numbers
    const initialPaymentCount = await prisma.payment.count({ where: { societyId } })
    let receiptSequence = initialPaymentCount + 1

    const now = new Date()
    const yearMonth = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, "0")}`

    await prisma.$transaction(
      async (tx) => {
        for (const item of itemsToReconcile) {
          const txnDate = new Date(item.date)
          const ref = item.referenceNumber ? sanitizeText(item.referenceNumber) : null
          const narrationSanitized = sanitizeText(item.narration)

          // Detect payment mode from narration
          let mode: PaymentMode = "BANK"
          const narrUpper = item.narration.toUpperCase()
          if (narrUpper.includes("UPI")) {
            mode = "UPI"
          } else if (narrUpper.includes("NEFT") || narrUpper.includes("RTGS") || narrUpper.includes("IMPS")) {
            mode = "BANK"
          } else if (item.chequeNumber || narrUpper.includes("CHQ") || narrUpper.includes("CLG")) {
            mode = "CHEQUE"
          }

          if (item.actionType === "CLEAR_INWARD_CHEQUE" && item.matchedDetails.chequeRegisterId) {
            // Update Inward Cheque to CLEARED
            const chq = await tx.chequeRegister.findUnique({
              where: { id: item.matchedDetails.chequeRegisterId },
            })
            if (chq && chq.status !== "CLEARED") {
              await tx.chequeRegister.update({
                where: { id: chq.id },
                data: {
                  status: "CLEARED",
                  clearedOn: txnDate,
                },
              })
              await tx.account.update({
                where: { id: accountId },
                data: { currentBalance: { increment: chq.amount } },
              })
            }
            reconciledCount++
            totalReconciledAmount += item.credit
          } else if (item.actionType === "CLEAR_OUTWARD_CHEQUE" && item.matchedDetails.chequeRegisterId) {
            // Update Outward Cheque to CLEARED
            const chq = await tx.chequeRegister.findUnique({
              where: { id: item.matchedDetails.chequeRegisterId },
            })
            if (chq && chq.status !== "CLEARED") {
              await tx.chequeRegister.update({
                where: { id: chq.id },
                data: {
                  status: "CLEARED",
                  clearedOn: txnDate,
                },
              })
              await tx.account.update({
                where: { id: accountId },
                data: { currentBalance: { decrement: chq.amount } },
              })
            }
            reconciledCount++
            totalReconciledAmount += item.debit
          } else if (item.actionType === "RECORD_BILL_PAYMENT" && item.matchedDetails.billId) {
            // Record Payment against Bill
            const bill = await tx.bill.findFirst({
              where: { id: item.matchedDetails.billId, societyId },
              include: { payments: { where: { status: "SUCCESS" } } },
            })

            if (bill) {
              const receiptNumber = `REC-${yearMonth}-${receiptSequence.toString().padStart(4, "0")}`
              receiptSequence++

              await tx.payment.create({
                data: {
                  societyId,
                  billId: bill.id,
                  flatId: bill.flatId,
                  accountId,
                  receiptNumber,
                  amount: item.credit,
                  paidOn: txnDate,
                  mode,
                  status: "SUCCESS" as PaymentStatus,
                  reference: ref,
                  remarks: `Auto-reconciled from Bank Statement: ${narrationSanitized}`,
                },
              })

              const prevPaid = bill.payments.reduce((s, p) => s + Number(p.amount), 0)
              const totalPaid = prevPaid + item.credit
              const billTotal = Number(bill.amount)

              if (totalPaid >= billTotal) {
                await tx.bill.update({
                  where: { id: bill.id },
                  data: { status: "PAID", paidDate: txnDate },
                })
              } else {
                await tx.bill.update({
                  where: { id: bill.id },
                  data: { status: "PARTIALLY_PAID" },
                })
              }

              await tx.account.update({
                where: { id: accountId },
                data: { currentBalance: { increment: item.credit } },
              })

              reconciledCount++
              totalReconciledAmount += item.credit
            }
          } else if (item.actionType === "RECORD_ADVANCE_PAYMENT" && item.matchedDetails.flatId) {
            // Record Advance Payment for Flat
            const receiptNumber = `REC-${yearMonth}-${receiptSequence.toString().padStart(4, "0")}`
            receiptSequence++

            await tx.payment.create({
              data: {
                societyId,
                flatId: item.matchedDetails.flatId,
                isAdvance: true,
                accountId,
                receiptNumber,
                amount: item.credit,
                paidOn: txnDate,
                mode,
                status: "SUCCESS" as PaymentStatus,
                reference: ref,
                remarks: `Auto-reconciled Advance Credit: ${narrationSanitized}`,
              },
            })

            await tx.account.update({
              where: { id: accountId },
              data: { currentBalance: { increment: item.credit } },
            })

            reconciledCount++
            totalReconciledAmount += item.credit
          } else if (item.actionType === "RECORD_BANK_CHARGE_EXPENSE") {
            // Record Bank Charge Expense
            let categoryId = item.matchedDetails.categoryId
            if (!categoryId) {
              const defaultCat =
                (await tx.expenseCategory.findFirst({
                  where: {
                    societyId,
                    name: { contains: "Bank", mode: "insensitive" },
                    isActive: true,
                    deletedAt: null,
                  },
                })) ||
                (await tx.expenseCategory.findFirst({
                  where: { societyId, isActive: true, deletedAt: null },
                }))
              categoryId = defaultCat?.id
            }

            if (categoryId) {
              await tx.expense.create({
                data: {
                  societyId,
                  categoryId,
                  accountId,
                  title: `Bank Charges: ${narrationSanitized.slice(0, 50)}`,
                  description: narrationSanitized,
                  amount: item.debit,
                  expenseDate: txnDate,
                  mode: "BANK",
                  status: "PAID" as ExpenseStatus,
                  reference: ref,
                },
              })

              await tx.account.update({
                where: { id: accountId },
                data: { currentBalance: { decrement: item.debit } },
              })

              reconciledCount++
              totalReconciledAmount += item.debit
            }
          } else if (item.actionType === "RECORD_BANK_INTEREST") {
            // Record Interest Credit
            const receiptNumber = `INT-${yearMonth}-${receiptSequence.toString().padStart(4, "0")}`
            receiptSequence++

            await tx.payment.create({
              data: {
                societyId,
                isAdvance: true,
                accountId,
                receiptNumber,
                amount: item.credit,
                paidOn: txnDate,
                mode: "BANK",
                status: "SUCCESS" as PaymentStatus,
                reference: ref,
                remarks: `Bank Savings / Sweep Interest: ${narrationSanitized}`,
              },
            })

            await tx.account.update({
              where: { id: accountId },
              data: { currentBalance: { increment: item.credit } },
            })

            reconciledCount++
            totalReconciledAmount += item.credit
          } else if (item.actionType === "RECORD_VENDOR_EXPENSE" && item.matchedDetails.vendorId) {
            // Record Vendor Expense
            const vendor = await tx.vendor.findFirst({
              where: { id: item.matchedDetails.vendorId, societyId },
            })

            const defaultCat = await tx.expenseCategory.findFirst({
              where: { societyId, isActive: true },
              orderBy: { name: "asc" },
            })

            if (defaultCat) {
              await tx.expense.create({
                data: {
                  societyId,
                  categoryId: defaultCat.id,
                  vendorId: item.matchedDetails.vendorId,
                  accountId,
                  title: `Vendor Payment: ${vendor?.companyName || vendor?.name || narrationSanitized.slice(0, 50)}`,
                  description: narrationSanitized,
                  amount: item.debit,
                  expenseDate: txnDate,
                  mode: "BANK",
                  status: "PAID" as ExpenseStatus,
                  reference: ref,
                },
              })

              await tx.account.update({
                where: { id: accountId },
                data: { currentBalance: { decrement: item.debit } },
              })

              reconciledCount++
              totalReconciledAmount += item.debit
            }
          }
        }
      },
      { timeout: 20000 }
    )

    // Audit log
    await recordAuditLog({
      societyId,
      userId: authContext.user.id,
      action: "UPDATE",
      entity: "BankReconciliation",
      entityId: accountId,
      description: `${authContext.user.email} auto-reconciled ${reconciledCount} transactions (Total: ₹${totalReconciledAmount.toLocaleString("en-IN")}) for ${account.name}`,
      newData: {
        accountId,
        reconciledCount,
        totalReconciledAmount,
      },
    })

    // Revalidate paths
    revalidatePath(`/society/${societyCode}/accounts/reconciliation`)
    revalidatePath(`/society/${societyCode}/accounts`)
    revalidatePath(`/society/${societyCode}/bills`)
    revalidatePath(`/society/${societyCode}/payments`)
    revalidatePath(`/society/${societyCode}/expenses`)
    revalidatePath(`/society/${societyCode}/cheques`)
    revalidatePath(`/society/${societyCode}/dashboard`)
    revalidatePath(`/society/${societyCode}/reports`)

    return {
      success: true,
      reconciledCount,
      totalReconciledAmount,
      message: `Successfully auto-reconciled ${reconciledCount} transactions totaling ₹${totalReconciledAmount.toLocaleString("en-IN")}.`,
    }
  } catch (err: unknown) {
    logger.error("Failed to execute batch auto-reconciliation", err, "executeAutoReconciliationBatch", { societyCode, accountId, count: itemsToReconcile.length })
    return { error: getSafeErrorMessage(err, "Failed to execute auto-reconciliation.") }
  }
}

/**
 * Generates sample bank statement CSV string.
 */
export async function getSampleBankStatementCsv(): Promise<string> {
  return generateSampleBankStatementCsv()
}
