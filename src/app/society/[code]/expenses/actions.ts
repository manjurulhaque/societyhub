"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireApprovalAccess } from "@/lib/auth/requireAuth"
import { recordAuditLog } from "@/lib/audit"
import { sanitizeText } from "@/lib/sanitize"
import type { ExpenseStatus } from "@/generated/prisma/client"

export async function approveExpenseAction(formData: FormData) {
  const code = formData.get("code")?.toString().trim()
  const expenseId = formData.get("expenseId")?.toString().trim()

  if (!code || !expenseId) {
    throw new Error("Society code and expense ID are required")
  }

  const authContext = await requireApprovalAccess(code)
  const societyId = authContext.society.id

  await prisma.$transaction(async (tx) => {
    const expense = await tx.expense.findFirst({
      where: { id: expenseId, societyId },
      include: {
        account: true,
      },
    })

    if (!expense) {
      throw new Error("Expense record not found in this society")
    }

    if (expense.status === "PAID" || expense.status === "APPROVED") {
      throw new Error("This expense has already been approved and disbursed")
    }

    const amountNum = Number(expense.amount)

    // If payment account is associated, deduct the balance upon approval
    if (expense.accountId) {
      await tx.account.update({
        where: { id: expense.accountId },
        data: {
          currentBalance: { decrement: amountNum },
        },
      })
    }

    const updatedExpense = await tx.expense.update({
      where: { id: expenseId },
      data: {
        status: "PAID" as ExpenseStatus,
      },
    })

    await recordAuditLog({
      societyId,
      userId: authContext.user.id,
      action: "STATUS_CHANGE",
      entity: "Expense",
      entityId: expense.id,
      description: `${authContext.user.email} (${authContext.designation}) approved expense voucher ₹${amountNum} (${expense.title})`,
      oldData: { status: expense.status },
      newData: { status: updatedExpense.status, approvedBy: authContext.user.email, designation: authContext.designation },
    })
  })

  revalidatePath(`/society/${code}/expenses`)
  revalidatePath(`/society/${code}/accounts`)
  revalidatePath(`/society/${code}/approvals`)
  revalidatePath(`/society/${code}/reports`)
  revalidatePath(`/society/${code}/dashboard`)
}

export async function rejectExpenseAction(formData: FormData) {
  const code = formData.get("code")?.toString().trim()
  const expenseId = formData.get("expenseId")?.toString().trim()
  const rawReason = formData.get("rejectionReason")?.toString().trim()
  const rejectionReason = rawReason ? sanitizeText(rawReason) : "Rejected by committee officer"

  if (!code || !expenseId) {
    throw new Error("Society code and expense ID are required")
  }

  const authContext = await requireApprovalAccess(code)
  const societyId = authContext.society.id

  await prisma.$transaction(async (tx) => {
    const expense = await tx.expense.findFirst({
      where: { id: expenseId, societyId },
    })

    if (!expense) {
      throw new Error("Expense record not found in this society")
    }

    const noteAppend = `\n[REJECTED by ${authContext.designation} (${authContext.user.email}) on ${new Date().toISOString().split("T")[0]}: ${rejectionReason}]`
    const updatedDescription = expense.description ? `${expense.description} ${noteAppend}` : noteAppend.trim()

    const updatedExpense = await tx.expense.update({
      where: { id: expenseId },
      data: {
        status: "REJECTED" as ExpenseStatus,
        description: updatedDescription,
      },
    })

    await recordAuditLog({
      societyId,
      userId: authContext.user.id,
      action: "STATUS_CHANGE",
      entity: "Expense",
      entityId: expense.id,
      description: `${authContext.user.email} (${authContext.designation}) rejected expense voucher ₹${Number(expense.amount)} (${expense.title}): ${rejectionReason}`,
      oldData: { status: expense.status },
      newData: { status: updatedExpense.status, rejectionReason },
    })
  })

  revalidatePath(`/society/${code}/expenses`)
  revalidatePath(`/society/${code}/accounts`)
  revalidatePath(`/society/${code}/approvals`)
  revalidatePath(`/society/${code}/reports`)
  revalidatePath(`/society/${code}/dashboard`)
}
