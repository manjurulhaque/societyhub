"use server"

import { revalidatePath } from "next/cache"
import { requireCommitteeAccess, FINANCIAL_ROLES } from "@/lib/auth/requireAuth"
import { prisma } from "@/lib/prisma"
import { recordAuditLog } from "@/lib/audit"
import { sanitizeText } from "@/lib/sanitize"
import { getSafeErrorMessage } from "@/lib/errors"
import type { VoucherType } from "@/generated/prisma/client"

export type JournalActionState = {
  success?: boolean
  error?: string
  message?: string
  journalId?: string
}

export type JournalEntryLineInput = {
  ledgerId: string
  debit: number
  credit: number
  narration?: string | null
}

/**
 * Posts a formal balanced double-entry Journal Voucher
 */
export async function postJournalVoucher(
  societyCode: string,
  data: {
    voucherType: VoucherType
    entryDate: string
    narration: string
    reference?: string | null
    entries: JournalEntryLineInput[]
  }
): Promise<JournalActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, FINANCIAL_ROLES)
    const societyId = context.society.id

    if (!data.entries || data.entries.length < 2) {
      return { error: "A double-entry voucher must contain at least 2 ledger lines." }
    }

    const rawNarration = data.narration?.trim()
    const narration = sanitizeText(rawNarration)
    if (!narration) {
      return { error: "Voucher narration is required." }
    }

    // Validate Debits === Credits
    const totalDebits = data.entries.reduce((sum, e) => sum + (Number(e.debit) || 0), 0)
    const totalCredits = data.entries.reduce((sum, e) => sum + (Number(e.credit) || 0), 0)

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      return {
        error: `Unbalanced entry! Total Debits (₹${totalDebits.toFixed(2)}) must equal Total Credits (₹${totalCredits.toFixed(2)}).`,
      }
    }

    if (totalDebits <= 0) {
      return { error: "Voucher total amount must be greater than zero." }
    }

    // Fetch active financial year
    const currentFY = await prisma.financialYear.findFirst({
      where: { societyId, isCurrent: true },
      select: { id: true, isLocked: true },
    })

    if (currentFY?.isLocked) {
      return { error: "Cannot post vouchers to a locked financial year." }
    }

    const entryDate = new Date(data.entryDate)
    const voucherPrefix =
      data.voucherType === "CONTRA"
        ? "CNTR"
        : data.voucherType === "RECEIPT"
          ? "RCPT"
          : data.voucherType === "PAYMENT"
            ? "PMNT"
            : data.voucherType === "DEBIT_NOTE"
              ? "DN"
              : data.voucherType === "CREDIT_NOTE"
                ? "CN"
                : "JV"

    const count = await prisma.journalEntry.count({
      where: { societyId, voucherType: data.voucherType },
    })
    const voucherNumber = `${voucherPrefix}-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`
    const reference = data.reference ? sanitizeText(data.reference) : null

    const journal = await prisma.$transaction(async (tx) => {
      const createdJournal = await tx.journalEntry.create({
        data: {
          societyId,
          financialYearId: currentFY?.id || null,
          voucherNumber,
          voucherType: data.voucherType,
          status: "POSTED",
          entryDate,
          narration,
          reference,
          entries: {
            create: data.entries.map((e) => ({
              ledgerId: e.ledgerId,
              debit: Number(e.debit) || 0,
              credit: Number(e.credit) || 0,
              narration: e.narration ? sanitizeText(e.narration) : null,
            })),
          },
        },
      })

      return createdJournal
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "CREATE",
      entity: "JournalEntry",
      entityId: journal.id,
      description: `${context.user.email} posted ${data.voucherType} voucher #${voucherNumber} for ₹${totalDebits.toFixed(2)} (${narration})`,
      newData: {
        voucherNumber,
        voucherType: data.voucherType,
        totalAmount: totalDebits,
        narration,
      },
    })

    revalidatePath(`/society/${societyCode}/ledgers/vouchers`)
    revalidatePath(`/society/${societyCode}/ledgers`)
    revalidatePath(`/society/${societyCode}/budgets`)
    revalidatePath(`/society/${societyCode}/reports`)

    return {
      success: true,
      message: `Voucher #${voucherNumber} posted successfully.`,
      journalId: journal.id,
    }
  } catch (err: unknown) {
    console.error("Failed to post journal voucher:", err)
    return { error: getSafeErrorMessage(err, "Failed to post voucher.") }
  }
}

/**
 * Voids an existing Journal Voucher
 */
export async function voidJournalVoucher(
  societyCode: string,
  journalId: string
): Promise<JournalActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, FINANCIAL_ROLES)
    const societyId = context.society.id

    const existing = await prisma.journalEntry.findFirst({
      where: { id: journalId, societyId },
    })
    if (!existing) return { error: "Voucher not found." }

    await prisma.journalEntry.update({
      where: { id: journalId },
      data: { status: "VOID" },
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "STATUS_CHANGE",
      entity: "JournalEntry",
      entityId: journalId,
      description: `${context.user.email} VOIDED voucher #${existing.voucherNumber}`,
    })

    revalidatePath(`/society/${societyCode}/ledgers/vouchers`)
    revalidatePath(`/society/${societyCode}/ledgers`)

    return { success: true, message: "Voucher marked as VOID." }
  } catch (err: unknown) {
    console.error("Failed to void voucher:", err)
    return { error: getSafeErrorMessage(err, "Failed to void voucher.") }
  }
}
