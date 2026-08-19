import Link from "next/link"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import type { PaymentMode, ExpenseStatus } from "@/generated/prisma/client"
import {
  AdminPageHeader,
  AdminCard,
  AdminSelect,
  AdminInput,
  AdminTextarea,
  AdminButton,
} from "@/components/admin"

export default async function NewAdminExpensePage() {
  const [societies, categories, accounts, vendors] = await Promise.all([
    prisma.society.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    }),
    prisma.expenseCategory.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, societyId: true },
    }),
    prisma.account.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, societyId: true, currentBalance: true },
    }),
    prisma.vendor.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, companyName: true, societyId: true },
    }),
  ])

  const today = new Date().toISOString().split("T")[0]

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-6 py-8 md:px-8">
      <AdminPageHeader
        eyebrow="Disbursement Setup"
        title="Record Operational Expense"
        description="Post an expenditure voucher for security services, lift maintenance, common power bills, or building repairs."
        action={
          <Link
            href="/admin/expenses"
            className="rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-stone-700 transition hover:bg-stone-100 shadow-sm"
          >
            Cancel
          </Link>
        }
      />

      <form action={createExpense} className="space-y-8">
        {/* 1. Society & Particulars */}
        <AdminCard
          title="Expense Classification & Society"
          description="Select target society, expense title, and category head"
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Housing Society *
              </label>
              <AdminSelect
                name="societyId"
                required
                options={[
                  { label: "Select a housing society...", value: "", disabled: true },
                  ...societies.map((s) => ({
                    label: s.code ? `${s.name} (${s.code})` : s.name,
                    value: s.id,
                  })),
                ]}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Expense Title / Purpose *
              </label>
              <AdminInput
                name="title"
                required
                placeholder="e.g. Monthly Security Agency Charges - August 2026"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Expense Category *
              </label>
              <AdminSelect
                name="categoryId"
                required
                options={[
                  { label: "Select category...", value: "", disabled: true },
                  ...categories.map((c) => ({
                    label: c.name,
                    value: c.id,
                  })),
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Registered Vendor (Optional)
              </label>
              <AdminSelect
                name="vendorId"
                options={[
                  { label: "Direct / Ad-hoc / Select vendor...", value: "" },
                  ...vendors.map((v) => ({
                    label: v.companyName ? `${v.companyName} (${v.name})` : v.name,
                    value: v.id,
                  })),
                ]}
              />
            </div>
          </div>
        </AdminCard>

        {/* 2. Amount, Tax & Bank Details */}
        <AdminCard
          title="Payment & Financial Particulars"
          description="Amount, paying bank account, GST, and TDS deduction"
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Total Amount (₹) *
              </label>
              <AdminInput
                name="amount"
                type="number"
                step="0.01"
                required
                placeholder="e.g. 35000"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                GST Amount Included (₹)
              </label>
              <AdminInput
                name="gstAmount"
                type="number"
                step="0.01"
                defaultValue="0"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                TDS Withheld (₹)
              </label>
              <AdminInput
                name="tdsAmount"
                type="number"
                step="0.01"
                defaultValue="0"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Expense Date *
              </label>
              <AdminInput
                name="expenseDate"
                type="date"
                defaultValue={today}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Paid From Account *
              </label>
              <AdminSelect
                name="accountId"
                required
                options={[
                  { label: "Select bank / cash account...", value: "", disabled: true },
                  ...accounts.map((a) => ({
                    label: `${a.name} (Bal: ₹${Number(a.currentBalance).toLocaleString("en-IN")})`,
                    value: a.id,
                  })),
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Payment Mode *
              </label>
              <AdminSelect
                name="mode"
                defaultValue="BANK"
                options={[
                  { label: "Bank Transfer (NEFT/RTGS/IMPS)", value: "BANK" },
                  { label: "Cheque Payment", value: "CHEQUE" },
                  { label: "UPI / QR", value: "UPI" },
                  { label: "Debit / Credit Card", value: "CARD" },
                  { label: "Cash Disbursement", value: "CASH" },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Vendor Bill / Invoice #
              </label>
              <AdminInput
                name="invoiceNumber"
                placeholder="e.g. INV-8492"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Transaction Reference / UTR / Cheque #
              </label>
              <AdminInput
                name="reference"
                placeholder="e.g. UTR: 3192039201 or Cheque # 045120"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Description / Internal Notes
              </label>
              <AdminTextarea
                name="description"
                rows={2}
                placeholder="Optional notes or remarks regarding this expense"
              />
            </div>
          </div>
        </AdminCard>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/admin/expenses"
            className="rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
          >
            Cancel
          </Link>
          <AdminButton type="submit" variant="primary" size="lg">
            Post & Disburse Expense
          </AdminButton>
        </div>
      </form>
    </div>
  )
}

import { requireSuperAdmin } from "@/lib/auth/requireAuth"
import { recordAuditLog } from "@/lib/audit"

async function createExpense(formData: FormData) {
  "use server"

  const admin = await requireSuperAdmin()

  const societyId = formData.get("societyId")?.toString().trim()
  const title = formData.get("title")?.toString().trim()
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
  const description = formData.get("description")?.toString().trim() || null

  if (!societyId || !title || !categoryId || !rawAmount || !expenseDateStr) {
    throw new Error("Society, title, category, amount, and expense date are required")
  }

  const amount = parseFloat(rawAmount)
  if (isNaN(amount) || amount <= 0) {
    throw new Error("Please enter a valid expense amount")
  }

  const gstAmount = rawGst ? parseFloat(rawGst) : 0
  const tdsAmount = rawTds ? parseFloat(rawTds) : 0

  await prisma.$transaction(async (tx) => {
    // Validate account belongs to this society if specified
    if (accountId) {
      const account = await tx.account.findFirst({
        where: { id: accountId, societyId },
      })
      if (!account) {
        throw new Error("Specified account does not belong to the selected society")
      }
    }

    const expense = await tx.expense.create({
      data: {
        societyId,
        title,
        categoryId,
        vendorId,
        accountId,
        amount,
        gstAmount: !isNaN(gstAmount) ? gstAmount : 0,
        tdsAmount: !isNaN(tdsAmount) ? tdsAmount : 0,
        expenseDate: new Date(expenseDateStr),
        mode: mode as PaymentMode,
        status: "PAID" as ExpenseStatus,
        invoiceNumber,
        reference,
        description,
      },
    })

    if (accountId) {
      await tx.account.update({
        where: { id: accountId },
        data: {
          currentBalance: { decrement: amount },
        },
      })
    }

    await recordAuditLog({
      societyId,
      userId: admin.id,
      action: "CREATE",
      entity: "Expense",
      entityId: expense.id,
      description: `Super Admin ${admin.email} recorded expense ₹${amount} (${title})`,
      newData: { title, amount, categoryId, accountId },
    })
  })

  revalidatePath("/admin/expenses")
  revalidatePath("/admin/accounts")
  revalidatePath(`/society/${societyId}/expenses`)
  revalidatePath(`/society/${societyId}/accounts`)
  redirect("/admin/expenses")
}

