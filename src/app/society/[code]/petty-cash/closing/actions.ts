"use server"

import { revalidatePath } from "next/cache"
import { requireCommitteeAccess, COMMITTEE_ROLES } from "@/lib/auth/requireAuth"
import { prisma } from "@/lib/prisma"
import { recordAuditLog } from "@/lib/audit"

export type CashClosingActionState = {
  success?: boolean
  error?: string
  message?: string
  logId?: string
}

/**
 * Records a physical cash count and closing log
 */
export async function recordCashClosing(
  societyCode: string,
  data: {
    closingDate: string
    openingBalance: number
    totalReceipts: number
    totalPayments: number
    calculatedBalance: number
    actualPhysicalCash: number
    difference: number
    note500?: number
    note200?: number
    note100?: number
    note50?: number
    note20?: number
    note10?: number
    coins?: number
    notes?: string | null
  }
): Promise<CashClosingActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, COMMITTEE_ROLES)
    const societyId = context.society.id

    const pettyAccount = await prisma.account.findFirst({
      where: { societyId, accountType: "PETTY_CASH", isActive: true, deletedAt: null },
    })
    if (!pettyAccount) return { error: "Petty cash account not found." }

    const closingDate = new Date(data.closingDate)
    const isMatched = Math.abs(data.difference) < 0.01

    const log = await prisma.cashClosingLog.create({
      data: {
        societyId,
        accountId: pettyAccount.id,
        closingDate,
        openingBalance: data.openingBalance,
        totalReceipts: data.totalReceipts,
        totalPayments: data.totalPayments,
        calculatedBalance: data.calculatedBalance,
        actualPhysicalCash: data.actualPhysicalCash,
        difference: data.difference,
        note500: data.note500 || 0,
        note200: data.note200 || 0,
        note100: data.note100 || 0,
        note50: data.note50 || 0,
        note20: data.note20 || 0,
        note10: data.note10 || 0,
        coins: data.coins || 0,
        notes: data.notes?.trim() || null,
        verifiedBy: context.user.email || context.user.id,
      },
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "CREATE",
      entity: "CashClosingLog",
      entityId: log.id,
      description: `${context.user.email} logged physical petty cash verification on ${closingDate.toLocaleDateString()} (Physical: ₹${data.actualPhysicalCash}, Calculated: ₹${data.calculatedBalance}, Diff: ₹${data.difference})`,
      newData: {
        closingDate: data.closingDate,
        actualPhysicalCash: data.actualPhysicalCash,
        calculatedBalance: data.calculatedBalance,
        difference: data.difference,
      },
    })

    revalidatePath(`/society/${societyCode}/petty-cash/closing`)
    revalidatePath(`/society/${societyCode}/petty-cash`)

    return {
      success: true,
      message: `Physical cash count recorded. ${isMatched ? "Zero discrepancy." : `Discrepancy of ₹${data.difference} noted.`}`,
      logId: log.id,
    }
  } catch (err: unknown) {
    console.error("Failed to record cash closing log:", err)
    const message = err instanceof Error ? err.message : "Failed to record cash count."
    return { error: message }
  }
}
