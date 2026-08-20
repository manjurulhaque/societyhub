"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireApprovalAccess, requireCommitteeAccess, FINANCIAL_ROLES } from "@/lib/auth/requireAuth"
import { recordAuditLog } from "@/lib/audit"
import { sanitizeText } from "@/lib/sanitize"
import { createCustomExpenseCategory, ensureStandardExpenseCategories } from "@/lib/expenseCategories"
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

export async function createExpenseCategoryAction(formData: FormData) {
  const code = formData.get("code")?.toString().trim()
  const name = formData.get("name")?.toString().trim()
  const description = formData.get("description") ? sanitizeText(formData.get("description")?.toString()) : null

  if (!code || !name) {
    throw new Error("Society code and category name are required")
  }

  const authContext = await requireCommitteeAccess(code, FINANCIAL_ROLES)
  const societyId = authContext.society.id

  const sanitizedName = sanitizeText(name)
  if (!sanitizedName) {
    throw new Error("Invalid category name")
  }

  const category = await createCustomExpenseCategory(societyId, sanitizedName, description)

  await recordAuditLog({
    societyId,
    userId: authContext.user.id,
    action: "CREATE",
    entity: "ExpenseCategory",
    entityId: category.id,
    description: `${authContext.user.email} (${authContext.designation}) created new expense category: ${sanitizedName}`,
    newData: { name: sanitizedName, description },
  })

  revalidatePath(`/society/${code}/expenses`)
  revalidatePath(`/society/${code}/expenses/new`)
  return { success: true, category: { id: category.id, name: category.name } }
}

export async function syncStandardExpenseCategoriesAction(formData: FormData) {
  const code = formData.get("code")?.toString().trim()

  if (!code) {
    throw new Error("Society code is required")
  }

  const authContext = await requireCommitteeAccess(code, FINANCIAL_ROLES)
  const societyId = authContext.society.id

  await ensureStandardExpenseCategories(societyId)

  await recordAuditLog({
    societyId,
    userId: authContext.user.id,
    action: "UPDATE",
    entity: "ExpenseCategory",
    entityId: societyId,
    description: `${authContext.user.email} (${authContext.designation}) synced standard expense categories`,
  })

  revalidatePath(`/society/${code}/expenses`)
  revalidatePath(`/society/${code}/expenses/new`)
  return { success: true }
}

