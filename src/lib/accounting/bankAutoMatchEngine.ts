import { prisma } from "@/lib/prisma"
import type { BankStatementRow, ParsedBankStatement } from "./bankStatementParser"
import { ensureStandardExpenseCategories } from "@/lib/expenseCategories"
import { matchRecurringUtilityRule } from "./recurringRuleEngine"

export type ReconActionType =
  | "CLEAR_INWARD_CHEQUE"
  | "CLEAR_OUTWARD_CHEQUE"
  | "RECORD_BILL_PAYMENT"
  | "RECORD_ADVANCE_PAYMENT"
  | "RECORD_BANK_CHARGE_EXPENSE"
  | "RECORD_BANK_INTEREST"
  | "RECORD_VENDOR_EXPENSE"
  | "ALREADY_RECONCILED"
  | "MANUAL_REVIEW"
  | "IGNORE"

export type MatchConfidence = "HIGH" | "MEDIUM" | "LOW" | "NONE"

export interface MatchedEntityDetail {
  flatId?: string
  flatLabel?: string
  billId?: string
  billLabel?: string
  billAmount?: number
  chequeRegisterId?: string
  chequeNumber?: string
  partyName?: string
  vendorId?: string
  vendorName?: string
  categoryId?: string
  categoryName?: string
}

export interface ReconciledTransactionMatch {
  rowId: string
  date: string
  rawDate: string
  narration: string
  referenceNumber: string | null
  chequeNumber: string | null
  debit: number
  credit: number
  balance: number | null
  type: "CREDIT" | "DEBIT"
  actionType: ReconActionType
  confidence: MatchConfidence
  matchScore: number // 0 to 100
  reason: string
  matchedDetails: MatchedEntityDetail
  isAutoSelected: boolean // True if confidence === HIGH
  isDuplicate?: boolean
  duplicateReason?: string
}

export interface AutoReconciliationAnalysisResult {
  societyId: string
  accountId: string
  accountName: string
  bankName: string | null
  accountNumber: string | null
  currentBalance: number
  statement: ParsedBankStatement
  summary: {
    totalRows: number
    highConfidenceCount: number
    mediumConfidenceCount: number
    unmatchedCount: number
    duplicateCount: number
    totalCredits: number
    totalDebits: number
    matchedCreditAmount: number
    matchedDebitAmount: number
  }
  matches: ReconciledTransactionMatch[]
}

/**
 * Normalizes text for loose matching (strips special characters and extra spaces).
 */
function normalizeForMatch(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "")
}

/**
 * Checks if a flat number matches the candidate string.
 * Supports: "101", "A-101", "Wing A 101", "A101", etc.
 */
function isFlatMatch(candidate: string | null, flatNumber: string, blockName?: string | null): boolean {
  if (!candidate) return false
  const normCand = normalizeForMatch(candidate)
  const normFlat = normalizeForMatch(flatNumber)
  const normBlock = blockName ? normalizeForMatch(blockName) : ""

  if (normCand === normFlat) return true
  if (normBlock && normCand === `${normBlock}${normFlat}`) return true
  if (normCand.includes(normFlat)) return true

  return false
}

/**
 * Analyzes parsed bank statement rows against current society records.
 */
export async function analyzeBankStatement(params: {
  societyId: string
  accountId: string
  statement: ParsedBankStatement
}): Promise<AutoReconciliationAnalysisResult> {
  const { societyId, accountId, statement } = params

  // 1. Fetch Account
  const account = await prisma.account.findFirst({
    where: { id: accountId, societyId, isActive: true, deletedAt: null },
  })
  if (!account) {
    throw new Error("Target bank account not found in this society.")
  }

  // 2. Ensure standard expense categories exist and fetch Bank Charges category
  await ensureStandardExpenseCategories(societyId)
  const expenseCategories = await prisma.expenseCategory.findMany({
    where: { societyId, isActive: true, deletedAt: null },
  })
  const bankChargesCat = expenseCategories.find(
    (c) => c.name.toLowerCase().includes("bank ledger") || c.name.toLowerCase().includes("bank charge")
  ) || expenseCategories[0]

  // 3. Fetch active flats with occupants
  const flats = await prisma.flat.findMany({
    where: { block: { societyId }, isActive: true, deletedAt: null },
    include: {
      block: true,
      people: {
        where: { toDate: null },
        include: { person: true },
      },
    },
  })

  // 4. Fetch pending/unpaid bills
  const pendingBills = await prisma.bill.findMany({
    where: {
      societyId,
      status: { in: ["PENDING", "PARTIALLY_PAID"] },
    },
    include: {
      flat: {
        include: { block: true },
      },
      payments: {
        where: { status: "SUCCESS" },
      },
    },
    orderBy: [{ year: "asc" }, { month: "asc" }],
  })

  // 5. Fetch uncleared cheques in ChequeRegister
  const unclearedCheques = await prisma.chequeRegister.findMany({
    where: {
      societyId,
      accountId,
      status: { in: ["RECEIVED", "IN_CLEARING", "ISSUED"] },
    },
  })

  // 6. Fetch cleared cheques (to prevent duplicate clearing)
  const clearedCheques = await prisma.chequeRegister.findMany({
    where: {
      societyId,
      accountId,
      status: "CLEARED",
    },
  })

  // 7. Fetch existing payments (to detect already recorded collections/receipts)
  const existingPayments = await prisma.payment.findMany({
    where: {
      societyId,
      status: "SUCCESS",
    },
    select: {
      id: true,
      receiptNumber: true,
      amount: true,
      paidOn: true,
      reference: true,
      flatId: true,
      flat: { select: { number: true, block: { select: { name: true } } } },
    },
    take: 500,
    orderBy: { paidOn: "desc" },
  })

  // 8. Fetch existing expenses (to detect already recorded expenses/debits)
  const existingExpenses = await prisma.expense.findMany({
    where: {
      societyId,
      status: "PAID",
    },
    select: {
      id: true,
      title: true,
      amount: true,
      expenseDate: true,
      reference: true,
    },
    take: 500,
    orderBy: { expenseDate: "desc" },
  })

  // 9. Fetch active vendors
  const vendors = await prisma.vendor.findMany({
    where: { societyId, isActive: true, deletedAt: null },
  })

  const matches: ReconciledTransactionMatch[] = []
  let highConfidenceCount = 0
  let mediumConfidenceCount = 0
  let unmatchedCount = 0
  let duplicateCount = 0
  let matchedCreditAmount = 0
  let matchedDebitAmount = 0

  for (const row of statement.rows) {
    const textNorm = normalizeForMatch(row.narration + " " + (row.referenceNumber || ""))

    if (row.type === "CREDIT") {
      const creditAmt = row.credit

      // D1: Already Cleared Cheque Check
      if (row.chequeNumber) {
        const clearedChq = clearedCheques.find(
          (c) =>
            c.direction === "INWARD" &&
            c.chequeNumber === row.chequeNumber &&
            Math.abs(Number(c.amount) - creditAmt) < 0.01
        )
        if (clearedChq) {
          matches.push({
            rowId: row.rowId,
            date: row.date,
            rawDate: row.rawDate,
            narration: row.narration,
            referenceNumber: row.referenceNumber,
            chequeNumber: row.chequeNumber,
            debit: 0,
            credit: creditAmt,
            balance: row.balance,
            type: "CREDIT",
            actionType: "ALREADY_RECONCILED",
            confidence: "NONE",
            matchScore: 0,
            reason: `Already Cleared: Inward Cheque #${clearedChq.chequeNumber} (${clearedChq.partyName})`,
            matchedDetails: {
              chequeRegisterId: clearedChq.id,
              chequeNumber: clearedChq.chequeNumber,
              partyName: clearedChq.partyName,
            },
            isAutoSelected: false,
            isDuplicate: true,
            duplicateReason: `Inward cheque #${clearedChq.chequeNumber} was already cleared on ${clearedChq.clearedOn ? new Date(clearedChq.clearedOn).toLocaleDateString() : "prior date"}.`,
          })
          duplicateCount++
          continue
        }
      }

      // D2: Existing Payment with exact Reference / UTR Match
      const refToMatch = row.referenceNumber || row.entities.utrReferenceCandidate
      if (refToMatch && refToMatch.length >= 6) {
        const existingPayment = existingPayments.find(
          (p) =>
            p.reference &&
            p.reference.toLowerCase().includes(refToMatch.toLowerCase()) &&
            Math.abs(Number(p.amount) - creditAmt) < 0.01
        )
        if (existingPayment) {
          matches.push({
            rowId: row.rowId,
            date: row.date,
            rawDate: row.rawDate,
            narration: row.narration,
            referenceNumber: row.referenceNumber,
            chequeNumber: row.chequeNumber,
            debit: 0,
            credit: creditAmt,
            balance: row.balance,
            type: "CREDIT",
            actionType: "ALREADY_RECONCILED",
            confidence: "NONE",
            matchScore: 0,
            reason: `Already Accounted: Payment Receipt ${existingPayment.receiptNumber}`,
            matchedDetails: {
              flatId: existingPayment.flatId || undefined,
              flatLabel: existingPayment.flat ? `${existingPayment.flat.block?.name ? `${existingPayment.flat.block.name}-` : ""}${existingPayment.flat.number}` : undefined,
            },
            isAutoSelected: false,
            isDuplicate: true,
            duplicateReason: `Already recorded in books as Payment ${existingPayment.receiptNumber} on ${new Date(existingPayment.paidOn).toLocaleDateString()}.`,
          })
          duplicateCount++
          continue
        }
      }

      // C1: Cheque Number match (Inward Cheques)
      if (row.chequeNumber) {
        const matchedCheque = unclearedCheques.find(
          (c) =>
            c.direction === "INWARD" &&
            c.chequeNumber === row.chequeNumber &&
            Math.abs(Number(c.amount) - creditAmt) < 0.01
        )
        if (matchedCheque) {
          matches.push({
            rowId: row.rowId,
            date: row.date,
            rawDate: row.rawDate,
            narration: row.narration,
            referenceNumber: row.referenceNumber,
            chequeNumber: row.chequeNumber,
            debit: 0,
            credit: creditAmt,
            balance: row.balance,
            type: "CREDIT",
            actionType: "CLEAR_INWARD_CHEQUE",
            confidence: "HIGH",
            matchScore: 100,
            reason: `Exact Inward Cheque #${matchedCheque.chequeNumber} Match (${matchedCheque.partyName})`,
            matchedDetails: {
              chequeRegisterId: matchedCheque.id,
              chequeNumber: matchedCheque.chequeNumber,
              partyName: matchedCheque.partyName,
            },
            isAutoSelected: true,
          })
          highConfidenceCount++
          matchedCreditAmount += creditAmt
          continue
        }
      }

      // Find matching flat from candidate or resident names
      let targetFlat = null
      if (row.entities.flatCandidate) {
        targetFlat = flats.find((f) =>
          isFlatMatch(row.entities.flatCandidate, f.number, f.block.name)
        )
      }

      // If flat not found by candidate, check if any person's name appears in narration
      if (!targetFlat) {
        for (const f of flats) {
          const personMatch = f.people.find(
            (p) => p.person.name && textNorm.includes(normalizeForMatch(p.person.name))
          )
          if (personMatch) {
            targetFlat = f
            break
          }
        }
      }

      if (targetFlat) {
        const flatLabel = `${targetFlat.block.name ? `${targetFlat.block.name}-` : ""}${targetFlat.number}`
        const flatBills = pendingBills.filter((b) => b.flatId === targetFlat.id)

        // C2: Exact Bill Match for this flat
        const exactBill = flatBills.find((b) => {
          const paidSum = b.payments.reduce((sum, p) => sum + Number(p.amount), 0)
          const remaining = Number(b.amount) + Number(b.lateFeeAmount) - paidSum
          return Math.abs(remaining - creditAmt) < 0.01
        })

        if (exactBill) {
          matches.push({
            rowId: row.rowId,
            date: row.date,
            rawDate: row.rawDate,
            narration: row.narration,
            referenceNumber: row.referenceNumber,
            chequeNumber: row.chequeNumber,
            debit: 0,
            credit: creditAmt,
            balance: row.balance,
            type: "CREDIT",
            actionType: "RECORD_BILL_PAYMENT",
            confidence: "HIGH",
            matchScore: 95,
            reason: `Flat ${flatLabel} Exact Bill Match (${exactBill.month}/${exactBill.year} Bill: ₹${Number(exactBill.amount).toLocaleString("en-IN")})`,
            matchedDetails: {
              flatId: targetFlat.id,
              flatLabel,
              billId: exactBill.id,
              billLabel: `${exactBill.month}/${exactBill.year} Bill`,
              billAmount: Number(exactBill.amount),
            },
            isAutoSelected: true,
          })
          highConfidenceCount++
          matchedCreditAmount += creditAmt
          continue
        }

        // C3: Flat found, but amount doesn't match single bill
        if (flatBills.length > 0) {
          const oldestBill = flatBills[0]
          matches.push({
            rowId: row.rowId,
            date: row.date,
            rawDate: row.rawDate,
            narration: row.narration,
            referenceNumber: row.referenceNumber,
            chequeNumber: row.chequeNumber,
            debit: 0,
            credit: creditAmt,
            balance: row.balance,
            type: "CREDIT",
            actionType: "RECORD_BILL_PAYMENT",
            confidence: "MEDIUM",
            matchScore: 80,
            reason: `Flat ${flatLabel} Partial/Multi-Bill Payment against ${oldestBill.month}/${oldestBill.year} (Bill: ₹${Number(oldestBill.amount).toLocaleString("en-IN")})`,
            matchedDetails: {
              flatId: targetFlat.id,
              flatLabel,
              billId: oldestBill.id,
              billLabel: `${oldestBill.month}/${oldestBill.year} Bill`,
              billAmount: Number(oldestBill.amount),
            },
            isAutoSelected: false,
          })
          mediumConfidenceCount++
          continue
        } else {
          // No unpaid bills -> Advance Payment
          matches.push({
            rowId: row.rowId,
            date: row.date,
            rawDate: row.rawDate,
            narration: row.narration,
            referenceNumber: row.referenceNumber,
            chequeNumber: row.chequeNumber,
            debit: 0,
            credit: creditAmt,
            balance: row.balance,
            type: "CREDIT",
            actionType: "RECORD_ADVANCE_PAYMENT",
            confidence: "MEDIUM",
            matchScore: 75,
            reason: `Flat ${flatLabel} Advance Maintenance Credit (No pending bills)`,
            matchedDetails: {
              flatId: targetFlat.id,
              flatLabel,
            },
            isAutoSelected: false,
          })
          mediumConfidenceCount++
          continue
        }
      }

      // C4: Bank Interest Keyword
      if (row.entities.isInterestKeyword) {
        matches.push({
          rowId: row.rowId,
          date: row.date,
          rawDate: row.rawDate,
          narration: row.narration,
          referenceNumber: row.referenceNumber,
          chequeNumber: row.chequeNumber,
          debit: 0,
          credit: creditAmt,
          balance: row.balance,
          type: "CREDIT",
          actionType: "RECORD_BANK_INTEREST",
          confidence: "HIGH",
          matchScore: 90,
          reason: `Savings Account / Sweep Bank Interest Credit (₹${creditAmt.toLocaleString("en-IN")})`,
          matchedDetails: {},
          isAutoSelected: true,
        })
        highConfidenceCount++
        matchedCreditAmount += creditAmt
        continue
      }

      // C5: Unmatched Credit
      matches.push({
        rowId: row.rowId,
        date: row.date,
        rawDate: row.rawDate,
        narration: row.narration,
        referenceNumber: row.referenceNumber,
        chequeNumber: row.chequeNumber,
        debit: 0,
        credit: creditAmt,
        balance: row.balance,
        type: "CREDIT",
        actionType: "MANUAL_REVIEW",
        confidence: "NONE",
        matchScore: 0,
        reason: "Unrecognized inward credit. Please select matching flat or bill.",
        matchedDetails: {},
        isAutoSelected: false,
      })
      unmatchedCount++
    } else {
      // DEBIT / Outward Withdrawal
      const debitAmt = row.debit

      // D0: Already Cleared Outward Cheque
      if (row.chequeNumber) {
        const clearedChq = clearedCheques.find(
          (c) =>
            c.direction === "OUTWARD" &&
            c.chequeNumber === row.chequeNumber &&
            Math.abs(Number(c.amount) - debitAmt) < 0.01
        )
        if (clearedChq) {
          matches.push({
            rowId: row.rowId,
            date: row.date,
            rawDate: row.rawDate,
            narration: row.narration,
            referenceNumber: row.referenceNumber,
            chequeNumber: row.chequeNumber,
            debit: debitAmt,
            credit: 0,
            balance: row.balance,
            type: "DEBIT",
            actionType: "ALREADY_RECONCILED",
            confidence: "NONE",
            matchScore: 0,
            reason: `Already Cleared: Outward Cheque #${clearedChq.chequeNumber} (${clearedChq.partyName})`,
            matchedDetails: {
              chequeRegisterId: clearedChq.id,
              chequeNumber: clearedChq.chequeNumber,
              partyName: clearedChq.partyName,
            },
            isAutoSelected: false,
            isDuplicate: true,
            duplicateReason: `Outward cheque #${clearedChq.chequeNumber} was already cleared on ${clearedChq.clearedOn ? new Date(clearedChq.clearedOn).toLocaleDateString() : "prior date"}.`,
          })
          duplicateCount++
          continue
        }
      }

      // D0.2: Existing Expense with exact Reference Match
      if (row.referenceNumber && row.referenceNumber.length >= 6) {
        const existingExp = existingExpenses.find(
          (e) =>
            e.reference &&
            e.reference.toLowerCase().includes(row.referenceNumber!.toLowerCase()) &&
            Math.abs(Number(e.amount) - debitAmt) < 0.01
        )
        if (existingExp) {
          matches.push({
            rowId: row.rowId,
            date: row.date,
            rawDate: row.rawDate,
            narration: row.narration,
            referenceNumber: row.referenceNumber,
            chequeNumber: row.chequeNumber,
            debit: debitAmt,
            credit: 0,
            balance: row.balance,
            type: "DEBIT",
            actionType: "ALREADY_RECONCILED",
            confidence: "NONE",
            matchScore: 0,
            reason: `Already Booked: Expense "${existingExp.title}"`,
            matchedDetails: {},
            isAutoSelected: false,
            isDuplicate: true,
            duplicateReason: `Expense "${existingExp.title}" (Ref: ${existingExp.reference}) was already recorded on ${new Date(existingExp.expenseDate).toLocaleDateString()}.`,
          })
          duplicateCount++
          continue
        }
      }

      // D1: Outward Cheque Number Match
      if (row.chequeNumber) {
        const matchedCheque = unclearedCheques.find(
          (c) =>
            c.direction === "OUTWARD" &&
            c.chequeNumber === row.chequeNumber &&
            Math.abs(Number(c.amount) - debitAmt) < 0.01
        )
        if (matchedCheque) {
          matches.push({
            rowId: row.rowId,
            date: row.date,
            rawDate: row.rawDate,
            narration: row.narration,
            referenceNumber: row.referenceNumber,
            chequeNumber: row.chequeNumber,
            debit: debitAmt,
            credit: 0,
            balance: row.balance,
            type: "DEBIT",
            actionType: "CLEAR_OUTWARD_CHEQUE",
            confidence: "HIGH",
            matchScore: 100,
            reason: `Issued Cheque #${matchedCheque.chequeNumber} cleared to ${matchedCheque.partyName} (₹${debitAmt.toLocaleString("en-IN")})`,
            matchedDetails: {
              chequeRegisterId: matchedCheque.id,
              chequeNumber: matchedCheque.chequeNumber,
              partyName: matchedCheque.partyName,
            },
            isAutoSelected: true,
          })
          highConfidenceCount++
          matchedDebitAmount += debitAmt
          continue
        }
      }

      // D2: Bank Charges & Ledger Fees
      if (row.entities.isBankChargesKeyword) {
        matches.push({
          rowId: row.rowId,
          date: row.date,
          rawDate: row.rawDate,
          narration: row.narration,
          referenceNumber: row.referenceNumber,
          chequeNumber: row.chequeNumber,
          debit: debitAmt,
          credit: 0,
          balance: row.balance,
          type: "DEBIT",
          actionType: "RECORD_BANK_CHARGE_EXPENSE",
          confidence: "HIGH",
          matchScore: 90,
          reason: `Bank Service Charges / SMS / Ledger Fees (₹${debitAmt.toLocaleString("en-IN")})`,
          matchedDetails: {
            categoryId: bankChargesCat?.id,
            categoryName: bankChargesCat?.name || "Bank Ledger & Maintenance Charges",
          },
          isAutoSelected: true,
        })
        highConfidenceCount++
        matchedDebitAmount += debitAmt
        continue
      }

      // D3: Recurring Utility & AMC Overhead Rule Engine
      const ruleMatch = matchRecurringUtilityRule(row.narration, expenseCategories)
      if (ruleMatch) {
        matches.push({
          rowId: row.rowId,
          date: row.date,
          rawDate: row.rawDate,
          narration: row.narration,
          referenceNumber: row.referenceNumber,
          chequeNumber: row.chequeNumber,
          debit: debitAmt,
          credit: 0,
          balance: row.balance,
          type: "DEBIT",
          actionType: "RECORD_VENDOR_EXPENSE",
          confidence: "HIGH",
          matchScore: 88,
          reason: `⚡ Rule Match [${ruleMatch.matchedRule.name}]: Narration matched "${ruleMatch.matchedKeyword}" -> Auto-categorized as ${ruleMatch.categoryName}`,
          matchedDetails: {
            categoryId: ruleMatch.categoryId,
            categoryName: ruleMatch.categoryName,
          },
          isAutoSelected: true,
        })
        highConfidenceCount++
        matchedDebitAmount += debitAmt
        continue
      }

      // D4: Vendor Name Match
      const matchedVendor = vendors.find((v) => {
        const vNameNorm = normalizeForMatch(v.name)
        const vCompNorm = v.companyName ? normalizeForMatch(v.companyName) : ""
        return (
          (vNameNorm.length >= 4 && textNorm.includes(vNameNorm)) ||
          (vCompNorm.length >= 4 && textNorm.includes(vCompNorm))
        )
      })

      if (matchedVendor) {
        matches.push({
          rowId: row.rowId,
          date: row.date,
          rawDate: row.rawDate,
          narration: row.narration,
          referenceNumber: row.referenceNumber,
          chequeNumber: row.chequeNumber,
          debit: debitAmt,
          credit: 0,
          balance: row.balance,
          type: "DEBIT",
          actionType: "RECORD_VENDOR_EXPENSE",
          confidence: "MEDIUM",
          matchScore: 80,
          reason: `Vendor payment matched: ${matchedVendor.companyName || matchedVendor.name} (₹${debitAmt.toLocaleString("en-IN")})`,
          matchedDetails: {
            vendorId: matchedVendor.id,
            vendorName: matchedVendor.companyName || matchedVendor.name,
          },
          isAutoSelected: false,
        })
        mediumConfidenceCount++
        continue
      }

      // D4: Unmatched Debit
      matches.push({
        rowId: row.rowId,
        date: row.date,
        rawDate: row.rawDate,
        narration: row.narration,
        referenceNumber: row.referenceNumber,
        chequeNumber: row.chequeNumber,
        debit: debitAmt,
        credit: 0,
        balance: row.balance,
        type: "DEBIT",
        actionType: "MANUAL_REVIEW",
        confidence: "NONE",
        matchScore: 0,
        reason: "Unrecognized outward withdrawal. Please assign expense category or vendor.",
        matchedDetails: {},
        isAutoSelected: false,
      })
      unmatchedCount++
    }
  }

  return {
    societyId,
    accountId,
    accountName: account.name,
    bankName: account.bankName,
    accountNumber: account.accountNumber,
    currentBalance: Number(account.currentBalance),
    statement,
    summary: {
      totalRows: matches.length,
      highConfidenceCount,
      mediumConfidenceCount,
      unmatchedCount,
      duplicateCount,
      totalCredits: statement.totalCredits,
      totalDebits: statement.totalDebits,
      matchedCreditAmount: Math.round(matchedCreditAmount * 100) / 100,
      matchedDebitAmount: Math.round(matchedDebitAmount * 100) / 100,
    },
    matches,
  }
}
