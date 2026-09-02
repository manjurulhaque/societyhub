"use server"

import { revalidatePath } from "next/cache"
import { requireCommitteeAccess, FINANCIAL_ROLES } from "@/lib/auth/requireAuth"
import { prisma } from "@/lib/prisma"
import { recordAuditLog } from "@/lib/audit"
import { sanitizeText } from "@/lib/sanitize"
import { getSafeErrorMessage } from "@/lib/errors"
import type { FlatActionState } from "./types"

/**
 * Records a Caution / Move-in / Fit-out / Renovation Member Deposit
 */
export async function recordMemberDeposit(
  societyCode: string,
  flatId: string,
  data: {
    personId?: string | null
    depositType: "SECURITY" | "FIT_OUT" | "CORPUS" | "OTHER"
    amount: number
    reference?: string | null
    remarks?: string | null
  }
): Promise<FlatActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, FINANCIAL_ROLES)
    const societyId = context.society.id

    const flat = await prisma.flat.findFirst({
      where: { id: flatId, block: { societyId } },
      include: { block: true },
    })
    if (!flat) return { error: "Flat not found." }

    if (!data.amount || data.amount <= 0) {
      return { error: "Deposit amount must be greater than zero." }
    }

    const deposit = await prisma.memberDeposit.create({
      data: {
        societyId,
        flatId,
        personId: data.personId || null,
        depositType: data.depositType,
        amount: data.amount,
        status: "HELD",
        receivedOn: new Date(),
        reference: data.reference ? sanitizeText(data.reference) : null,
        remarks: data.remarks ? sanitizeText(data.remarks) : null,
      },
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "CREATE",
      entity: "MemberDeposit",
      entityId: deposit.id,
      description: `${context.user.email} recorded ${data.depositType} deposit of ₹${data.amount} for Flat ${flat.block.name}-${flat.number}`,
      newData: { flatId, depositType: data.depositType, amount: data.amount },
    })

    revalidatePath(`/society/${societyCode}/flats/${flatId}`)
    return { success: true, message: "Deposit recorded successfully." }
  } catch (err: unknown) {
    console.error("Failed to record deposit:", err)
    return { error: getSafeErrorMessage(err, "Failed to record deposit.") }
  }
}

/**
 * Marks a held Member Deposit as REFUNDED
 */
export async function refundMemberDeposit(
  societyCode: string,
  flatId: string,
  depositId: string
): Promise<FlatActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, FINANCIAL_ROLES)
    const societyId = context.society.id

    const deposit = await prisma.memberDeposit.findFirst({
      where: { id: depositId, flatId, societyId },
    })
    if (!deposit) return { error: "Deposit record not found." }

    await prisma.memberDeposit.update({
      where: { id: depositId },
      data: {
        status: "REFUNDED",
        refundedOn: new Date(),
      },
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "STATUS_CHANGE",
      entity: "MemberDeposit",
      entityId: depositId,
      description: `${context.user.email} marked ${deposit.depositType} deposit of ₹${deposit.amount} as REFUNDED`,
    })

    revalidatePath(`/society/${societyCode}/flats/${flatId}`)
    return { success: true, message: "Deposit marked as REFUNDED." }
  } catch (err: unknown) {
    console.error("Failed to refund deposit:", err)
    return { error: getSafeErrorMessage(err, "Failed to refund deposit.") }
  }
}

/**
 * Marks a held Member Deposit as FORFEITED (e.g. damages deduction)
 */
export async function forfeitMemberDeposit(
  societyCode: string,
  flatId: string,
  depositId: string
): Promise<FlatActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, FINANCIAL_ROLES)
    const societyId = context.society.id

    const deposit = await prisma.memberDeposit.findFirst({
      where: { id: depositId, flatId, societyId },
    })
    if (!deposit) return { error: "Deposit record not found." }

    await prisma.memberDeposit.update({
      where: { id: depositId },
      data: { status: "FORFEITED" },
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "STATUS_CHANGE",
      entity: "MemberDeposit",
      entityId: depositId,
      description: `${context.user.email} marked ${deposit.depositType} deposit of ₹${deposit.amount} as FORFEITED`,
    })

    revalidatePath(`/society/${societyCode}/flats/${flatId}`)
    return { success: true, message: "Deposit marked as FORFEITED." }
  } catch (err: unknown) {
    console.error("Failed to forfeit deposit:", err)
    return { error: getSafeErrorMessage(err, "Failed to forfeit deposit.") }
  }
}
