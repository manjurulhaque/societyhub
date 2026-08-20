"use server"

import { revalidatePath } from "next/cache"
import { requireCommitteeAccess, FINANCIAL_ROLES } from "@/lib/auth/requireAuth"
import { prisma } from "@/lib/prisma"
import { recordAuditLog } from "@/lib/audit"
import type { PaymentMode, PaymentStatus } from "@/generated/prisma/client"

export type PaymentActionState = {
  success?: boolean
  error?: string
  message?: string
  receiptNumber?: string
  paymentId?: string
}

/**
 * Records an incoming payment against an outstanding bill or as an advance credit.
 */
export async function recordPayment(
  societyCode: string,
  data: {
    billId?: string | null
    flatId?: string | null
    paidById?: string | null
    accountId?: string | null
    amount: number
    mode: PaymentMode
    paidOn?: string | null
    reference?: string | null
    remarks?: string | null
    isAdvance?: boolean
  }
): Promise<PaymentActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, FINANCIAL_ROLES)
    const societyId = context.society.id

    const amount = Number(data.amount)
    if (isNaN(amount) || amount <= 0) {
      return { error: "Please enter a valid payment amount." }
    }

    const paidOn = data.paidOn ? new Date(data.paidOn) : new Date()
    const isAdvance = Boolean(data.isAdvance)

    let targetFlatId = data.flatId || null
    const targetBillId = data.billId || null

    if (!isAdvance && !targetBillId && !targetFlatId) {
      return { error: "Please select an outstanding bill or target flat." }
    }

    // Verify bill if provided
    let bill = null
    if (targetBillId) {
      bill = await prisma.bill.findFirst({
        where: { id: targetBillId, societyId },
        include: {
          flat: {
            include: {
              block: true,
              people: {
                where: { toDate: null },
                include: { person: true },
              },
            },
          },
          payments: {
            where: { status: "SUCCESS" },
          },
        },
      })

      if (!bill) {
        return { error: "Selected bill not found in this society." }
      }

      targetFlatId = bill.flatId
    }

    // Verify flat if advance
    if (isAdvance && targetFlatId) {
      const flat = await prisma.flat.findFirst({
        where: { id: targetFlatId, block: { societyId }, deletedAt: null },
      })
      if (!flat) {
        return { error: "Selected flat is invalid." }
      }
    }

    // Verify account if provided
    if (data.accountId) {
      const account = await prisma.account.findFirst({
        where: { id: data.accountId, societyId, isActive: true },
      })
      if (!account) {
        return { error: "Selected bank/cash account not found." }
      }
    }

    // Generate unique receipt number: REC-YYYYMM-XXXX
    const now = new Date()
    const year = now.getFullYear()
    const monthStr = (now.getMonth() + 1).toString().padStart(2, "0")
    const count = await prisma.payment.count({ where: { societyId } })
    const receiptSeq = (count + 1).toString().padStart(4, "0")
    const receiptNumber = `REC-${year}${monthStr}-${receiptSeq}`

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Payment record
      const payment = await tx.payment.create({
        data: {
          societyId,
          billId: targetBillId,
          flatId: targetFlatId,
          isAdvance,
          paidById: data.paidById || undefined,
          accountId: data.accountId || undefined,
          receiptNumber,
          amount,
          paidOn,
          mode: data.mode,
          status: "SUCCESS" as PaymentStatus,
          reference: data.reference?.trim() || null,
          remarks: data.remarks?.trim() || null,
        },
      })

      // 2. If paid against a bill, check and update bill status
      if (bill) {
        const previousPaid = bill.payments.reduce((acc, p) => acc + Number(p.amount), 0)
        const totalPaid = previousPaid + amount
        const billTotal = Number(bill.amount)

        if (totalPaid >= billTotal) {
          await tx.bill.update({
            where: { id: bill.id },
            data: {
              status: "PAID",
              paidDate: paidOn,
            },
          })
        } else if (totalPaid > 0) {
          await tx.bill.update({
            where: { id: bill.id },
            data: {
              status: "PARTIALLY_PAID",
            },
          })
        }
      }

      // 3. If account selected, increment account currentBalance
      if (data.accountId) {
        await tx.account.update({
          where: { id: data.accountId },
          data: {
            currentBalance: { increment: amount },
          },
        })
      }

      return payment
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "CREATE",
      entity: "Payment",
      entityId: result.id,
      description: `${context.user.email} recorded payment receipt ${receiptNumber} (₹${amount.toLocaleString("en-IN")}) via ${data.mode}${data.reference ? ` [Ref: ${data.reference}]` : ""}`,
      newData: {
        receiptNumber,
        amount,
        mode: data.mode,
        billId: targetBillId,
        flatId: targetFlatId,
        paidById: data.paidById,
        accountId: data.accountId,
      },
    })

    revalidatePath(`/society/${societyCode}/payments`)
    revalidatePath(`/society/${societyCode}/bills`)
    revalidatePath(`/society/${societyCode}/accounts`)
    revalidatePath(`/society/${societyCode}/dashboard`)
    revalidatePath(`/society/${societyCode}/reports`)

    return {
      success: true,
      message: `Payment receipt ${receiptNumber} of ₹${amount.toLocaleString("en-IN")} recorded successfully.`,
      receiptNumber,
      paymentId: result.id,
    }
  } catch (err: unknown) {
    console.error("Failed to record payment:", err)
    const message = err instanceof Error ? err.message : "Failed to record payment."
    return { error: message }
  }
}

/**
 * Voids an existing payment receipt and reverts related balances.
 */
export async function voidPayment(
  societyCode: string,
  paymentId: string,
  reason?: string
): Promise<PaymentActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, FINANCIAL_ROLES)
    const societyId = context.society.id

    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, societyId },
      include: {
        bill: {
          include: {
            payments: true,
          },
        },
      },
    })

    if (!payment) {
      return { error: "Payment record not found." }
    }

    if (payment.status === "REFUNDED") {
      return { error: "This payment has already been voided." }
    }

    await prisma.$transaction(async (tx) => {
      // 1. Mark payment as REFUNDED
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: "REFUNDED" as PaymentStatus,
          remarks: payment.remarks
            ? `${payment.remarks} [Voided: ${reason || "Cancelled by admin"}]`
            : `Voided: ${reason || "Cancelled by admin"}`,
        },
      })

      // 2. If linked to an account, decrement currentBalance
      if (payment.accountId) {
        await tx.account.update({
          where: { id: payment.accountId },
          data: {
            currentBalance: { decrement: payment.amount },
          },
        })
      }

      // 3. If linked to a bill, recalculate remaining payments and revert status
      if (payment.bill) {
        const otherPayments = payment.bill.payments
          .filter((p) => p.id !== paymentId && p.status === "SUCCESS")
          .reduce((acc, p) => acc + Number(p.amount), 0)

        const billTotal = Number(payment.bill.amount)

        if (otherPayments >= billTotal) {
          await tx.bill.update({
            where: { id: payment.bill.id },
            data: { status: "PAID" },
          })
        } else if (otherPayments > 0) {
          await tx.bill.update({
            where: { id: payment.bill.id },
            data: { status: "PARTIALLY_PAID", paidDate: null },
          })
        } else {
          await tx.bill.update({
            where: { id: payment.bill.id },
            data: { status: "PENDING", paidDate: null },
          })
        }
      }
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "STATUS_CHANGE",
      entity: "Payment",
      entityId: paymentId,
      description: `${context.user.email} voided payment receipt ${payment.receiptNumber || paymentId}${reason ? `: ${reason}` : ""}`,
      newData: { status: "REFUNDED", reason },
    })

    revalidatePath(`/society/${societyCode}/payments`)
    revalidatePath(`/society/${societyCode}/bills`)
    revalidatePath(`/society/${societyCode}/accounts`)
    revalidatePath(`/society/${societyCode}/dashboard`)

    return {
      success: true,
      message: `Receipt ${payment.receiptNumber || paymentId} has been voided.`,
    }
  } catch (err: unknown) {
    console.error("Failed to void payment:", err)
    const message = err instanceof Error ? err.message : "Failed to void payment."
    return { error: message }
  }
}
