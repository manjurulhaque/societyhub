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
