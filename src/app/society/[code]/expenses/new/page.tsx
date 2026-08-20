import { notFound } from "next/navigation"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { requireCommitteeAccess, FINANCIAL_ROLES, canApproveDataEntry, isManagerRole } from "@/lib/auth/requireAuth"
import { recordAuditLog } from "@/lib/audit"
import { sanitizeText } from "@/lib/sanitize"
import { prisma } from "@/lib/prisma"
import { ensureStandardExpenseCategories } from "@/lib/expenseCategories"
import type { PaymentMode, ExpenseStatus } from "@/generated/prisma/client"
import { RecordExpenseForm } from "./RecordExpenseForm"

export default async function NewSocietyExpensePage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const context = await getSocietyAdmin(code)

  if (!context) {
    notFound()
  }

  const { society, designation, isSuperAdmin } = context
  const isManager = isManagerRole(designation, isSuperAdmin)
  const isApprover = canApproveDataEntry(designation, isSuperAdmin)

  // Ensure all standard categories exist and fetch all active categories
  const [categories, accounts, vendors] = await Promise.all([
    ensureStandardExpenseCategories(society.id),
    prisma.account.findMany({
      where: { societyId: society.id, isActive: true, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, currentBalance: true },
    }),
    prisma.vendor.findMany({
      where: { societyId: society.id, isActive: true, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, companyName: true },
    }),
  ])

  async function createSocietyExpense(formData: FormData) {
    "use server"

    const authContext = await requireCommitteeAccess(code, FINANCIAL_ROLES)
    const verifiedSocietyId = authContext.society.id

    const title = sanitizeText(formData.get("title")?.toString())
    const categoryId = formData.get("categoryId")?.toString().trim()
    const vendorId = formData.get("vendorId")?.toString().trim() || null
    const rawAmount = formData.get("amount")?.toString().trim()
    const rawGst = formData.get("gstAmount")?.toString().trim()
    const rawTds = formData.get("tdsAmount")?.toString().trim()
    const expenseDateStr = formData.get("expenseDate")?.toString().trim()
    const accountId = formData.get("accountId")?.toString().trim() || null
    const mode = formData.get("mode")?.toString().trim() || "BANK"
    const invoiceNumber = formData.get("invoiceNumber")?.toString().trim() || null
    const reference = formData.get("reference")?.toString().trim() || null
    const description = formData.get("description") ? sanitizeText(formData.get("description")?.toString()) : null

    if (!title || !categoryId || !rawAmount || !expenseDateStr) {
      throw new Error("Title, category, amount, and expense date are required")
    }

    const amount = parseFloat(rawAmount)
    if (isNaN(amount) || amount <= 0) {
      throw new Error("Please enter a valid expense amount")
    }

    const gstAmount = rawGst ? parseFloat(rawGst) : 0
    const tdsAmount = rawTds ? parseFloat(rawTds) : 0

    // Determine approval requirement based on caller role
    const hasAutoApproveAuthority = canApproveDataEntry(authContext.designation, authContext.isSuperAdmin)
    const initialStatus: ExpenseStatus = hasAutoApproveAuthority ? "PAID" : "PENDING"

    await prisma.$transaction(async (tx) => {
      // Validate category belongs to this society
      const category = await tx.expenseCategory.findFirst({
        where: { id: categoryId, societyId: verifiedSocietyId },
      })
      if (!category) {
        throw new Error("Invalid expense category for this society")
      }

      // Validate account belongs to this society if selected
      if (accountId) {
        const account = await tx.account.findFirst({
          where: { id: accountId, societyId: verifiedSocietyId },
        })
        if (!account) {
          throw new Error("Invalid payment account for this society")
        }
      }

      // Validate vendor belongs to this society if selected
      if (vendorId) {
        const vendor = await tx.vendor.findFirst({
          where: { id: vendorId, societyId: verifiedSocietyId },
        })
        if (!vendor) {
          throw new Error("Invalid vendor for this society")
        }
      }

      const expense = await tx.expense.create({
        data: {
          societyId: verifiedSocietyId,
          title,
          categoryId,
          vendorId,
          accountId,
          amount,
          gstAmount: !isNaN(gstAmount) ? gstAmount : 0,
          tdsAmount: !isNaN(tdsAmount) ? tdsAmount : 0,
          expenseDate: new Date(expenseDateStr),
          mode: mode as PaymentMode,
          status: initialStatus,
          invoiceNumber,
          reference,
          description,
        },
      })

      // If created by executive with direct approval authority, immediately debit account
      if (hasAutoApproveAuthority && accountId) {
        await tx.account.update({
          where: { id: accountId },
          data: {
            currentBalance: { decrement: amount },
          },
        })
      }

      const auditDescription = hasAutoApproveAuthority
        ? `${authContext.user.email} (${authContext.designation}) posted & approved expense voucher ₹${amount} (${title})`
        : `${authContext.user.email} (${authContext.designation}) submitted expense voucher ₹${amount} (${title}) for Treasurer/Secretary approval`

      await recordAuditLog({
        societyId: verifiedSocietyId,
        userId: authContext.user.id,
        action: "CREATE",
        entity: "Expense",
        entityId: expense.id,
        description: auditDescription,
        newData: { title, amount, categoryId, accountId, status: initialStatus },
      })
    })

    revalidatePath(`/society/${code}/expenses`)
    revalidatePath(`/society/${code}/accounts`)
    revalidatePath(`/society/${code}/approvals`)
    revalidatePath(`/society/${code}/reports`)
    revalidatePath(`/society/${code}/dashboard`)
    revalidatePath("/admin/expenses")
    redirect(`/society/${code}/expenses`)
  }

  return (
    <RecordExpenseForm
      code={code}
      societyName={society.name}
      initialCategories={categories.map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        description: c.description,
      }))}
      accounts={accounts.map((a) => ({
        id: a.id,
        name: a.name,
        currentBalance: Number(a.currentBalance),
      }))}
      vendors={vendors.map((v) => ({
        id: v.id,
        name: v.name,
        companyName: v.companyName,
      }))}
      isManager={isManager}
      isApprover={isApprover}
      designation={designation}
      onSubmitAction={createSocietyExpense}
    />
  )
}
