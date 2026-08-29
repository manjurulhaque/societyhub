"use server"

import { revalidatePath } from "next/cache"
import { requireCommitteeAccess, COMMITTEE_ROLES } from "@/lib/auth/requireAuth"
import { prisma } from "@/lib/prisma"
import { recordAuditLog } from "@/lib/audit"
import type { ReconStatus } from "@/generated/prisma/client"

export type ReconActionState = {
  success?: boolean
  error?: string
  message?: string
  reconId?: string
}

/**
 * Commits a formal Bank Reconciliation Statement (BRS)
 */
export async function commitBankReconciliation(
  societyCode: string,
  data: {
    accountId: string
    statementDate: string
    statementBalance: number
    bookBalance: number
    uncreditedTotal: number
    unpresentedTotal: number
    discrepancy: number
    notes?: string | null
  }
): Promise<ReconActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, COMMITTEE_ROLES)
    const societyId = context.society.id

    const account = await prisma.account.findFirst({
      where: { id: data.accountId, societyId, accountType: "BANK" },
    })
    if (!account) return { error: "Bank account not found." }

    const statementDate = new Date(data.statementDate)
    const isExactMatch = Math.abs(data.discrepancy) < 0.01
    const status: ReconStatus = isExactMatch ? "RECONCILED" : "DRAFT"

    const recon = await prisma.bankReconciliation.create({
      data: {
        accountId: data.accountId,
        statementDate,
        statementBalance: data.statementBalance,
        ledgerBalance: data.bookBalance,
        difference: data.discrepancy,
        status,
        notes: data.notes?.trim() || null,
        reconciledAt: isExactMatch ? new Date() : null,
      },
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "CREATE",
      entity: "BankReconciliation",
      entityId: recon.id,
      description: `${context.user.email} committed Bank Reconciliation (BRS) for ${account.name} as of ${statementDate.toLocaleDateString()} (Status: ${status}, Diff: ₹${data.discrepancy})`,
      newData: {
        account: account.name,
        statementDate: data.statementDate,
        statementBalance: data.statementBalance,
        ledgerBalance: data.bookBalance,
        status,
      },
    })

    revalidatePath(`/society/${societyCode}/accounts/reconciliation`)
    revalidatePath(`/society/${societyCode}/accounts`)

    return {
      success: true,
      message: `Bank Reconciliation statement saved as ${status}.`,
      reconId: recon.id,
    }
  } catch (err: unknown) {
    console.error("Failed to commit bank reconciliation:", err)
    const message = err instanceof Error ? err.message : "Failed to commit reconciliation."
    return { error: message }
  }
}

export type ClearChequeActionState = {
  success?: boolean
  error?: string
  message?: string
  chequeId?: string
}

/**
 * Inline 1-click clearance of a cheque directly from the Bank Reconciliation workspace
 */
export async function clearChequeInlineAction(
  societyCode: string,
  chequeId: string,
  clearedDateStr?: string
): Promise<ClearChequeActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, COMMITTEE_ROLES)
    const societyId = context.society.id

    const cheque = await prisma.chequeRegister.findFirst({
      where: { id: chequeId, societyId },
      include: { account: true },
    })

    if (!cheque) {
      return { error: "Cheque record not found in this society." }
    }

    if (cheque.status === "CLEARED") {
      return { error: "This cheque is already marked as cleared." }
    }

    const clearedOn = clearedDateStr ? new Date(clearedDateStr) : new Date()

    await prisma.$transaction(async (tx) => {
      await tx.chequeRegister.update({
        where: { id: cheque.id },
        data: {
          status: "CLEARED",
          clearedOn,
        },
      })

      // If inward, credit the account balance; if outward, debit
      if (cheque.direction === "INWARD") {
        await tx.account.update({
          where: { id: cheque.accountId },
          data: {
            currentBalance: { increment: cheque.amount },
          },
        })
      } else {
        await tx.account.update({
          where: { id: cheque.accountId },
          data: {
            currentBalance: { decrement: cheque.amount },
          },
        })
      }
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "STATUS_CHANGE",
      entity: "ChequeRegister",
      entityId: cheque.id,
      description: `${context.user.email} marked ${cheque.direction} Cheque #${cheque.chequeNumber} (${cheque.partyName}) as CLEARED on ${clearedOn.toLocaleDateString()} (₹${Number(cheque.amount).toLocaleString("en-IN")}) via Reconciliation workspace`,
      oldData: { status: cheque.status },
      newData: { status: "CLEARED", clearedOn: clearedOn.toISOString() },
    })

    revalidatePath(`/society/${societyCode}/accounts/reconciliation`)
    revalidatePath(`/society/${societyCode}/accounts`)
    revalidatePath(`/society/${societyCode}/cheques`)
    revalidatePath(`/society/${societyCode}/dashboard`)

    return {
      success: true,
      message: `Cheque #${cheque.chequeNumber} (₹${Number(cheque.amount).toLocaleString("en-IN")}) marked as CLEARED.`,
      chequeId: cheque.id,
    }
  } catch (err: unknown) {
    console.error("Failed to mark cheque as cleared:", err)
    const message = err instanceof Error ? err.message : "Failed to clear cheque."
    return { error: message }
  }
}

