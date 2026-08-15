import Link from "next/link"
import { notFound } from "next/navigation"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { prisma } from "@/lib/prisma"
import type { PaymentMode, ExpenseStatus } from "@/generated/prisma/client"

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

  const { society } = context

  const [categories, accounts, vendors] = await Promise.all([
    prisma.expenseCategory.findMany({
      where: { societyId: society.id, isActive: true, deletedAt: null },
      orderBy: { name: "asc" },
    }),
    prisma.account.findMany({
      where: { societyId: society.id, isActive: true, deletedAt: null },
      orderBy: { name: "asc" },
    }),
    prisma.vendor.findMany({
      where: { societyId: society.id, isActive: true, deletedAt: null },
      orderBy: { name: "asc" },
    }),
  ])

  const today = new Date().toISOString().split("T")[0]

  async function createSocietyExpense(formData: FormData) {
    "use server"

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

    if (!title || !categoryId || !rawAmount || !expenseDateStr) {
      throw new Error("Title, category, amount, and expense date are required")
    }

    const amount = parseFloat(rawAmount)
    if (isNaN(amount) || amount <= 0) {
      throw new Error("Please enter a valid expense amount")
    }

    const gstAmount = rawGst ? parseFloat(rawGst) : 0
    const tdsAmount = rawTds ? parseFloat(rawTds) : 0

    await prisma.$transaction(async (tx) => {
      await tx.expense.create({
        data: {
          societyId: society.id,
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
    })

    revalidatePath(`/society/${code}/expenses`)
    revalidatePath(`/society/${code}/accounts`)
    revalidatePath("/admin/expenses")
    redirect(`/society/${code}/expenses`)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <span className="inline-flex items-center rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-stone-600">
            Disbursement Entry
          </span>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-stone-900 md:text-3xl">
            Record Society Expense
          </h1>
          <p className="text-sm text-stone-500">
            Post an operating expenditure for {society.name}.
          </p>
        </div>

        <Link
          href={`/society/${code}/expenses`}
          className="rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-stone-700 transition hover:bg-stone-100"
        >
          Cancel
        </Link>
      </div>

      <form action={createSocietyExpense} className="space-y-6">
        {/* Particulars Card */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-stone-950">Expense Particulars</h2>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
              Expense Title / Purpose *
            </label>
            <input
              type="text"
              name="title"
              required
              placeholder="e.g. Monthly Security Agency Charges - August 2026"
              className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                Expense Category *
              </label>
              <select
                name="categoryId"
                required
                className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
              >
                <option value="">Select category...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                Registered Vendor (Optional)
              </label>
              <select
                name="vendorId"
                className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
              >
                <option value="">Direct / Ad-hoc / Select vendor...</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.companyName ? `${v.companyName} (${v.name})` : v.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Financial Details Card */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-stone-950">Payment & Account Particulars</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                Total Amount (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                name="amount"
                required
                placeholder="e.g. 28000"
                className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm font-bold text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                GST Included (₹)
              </label>
              <input
                type="number"
                step="0.01"
                name="gstAmount"
                defaultValue="0"
                className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                TDS Withheld (₹)
              </label>
              <input
                type="number"
                step="0.01"
                name="tdsAmount"
                defaultValue="0"
                className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                Expense Date *
              </label>
              <input
                type="date"
                name="expenseDate"
                defaultValue={today}
                required
                className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                Paid From Account *
              </label>
              <select
                name="accountId"
                required
                className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
              >
                <option value="">Select bank account...</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} (Bal: ₹{Number(a.currentBalance).toLocaleString("en-IN")})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                Payment Mode *
              </label>
              <select
                name="mode"
                defaultValue="BANK"
                className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
              >
                <option value="BANK">Bank Transfer (NEFT/RTGS/IMPS)</option>
                <option value="CHEQUE">Cheque Payment</option>
                <option value="UPI">UPI / QR</option>
                <option value="CARD">Debit / Credit Card</option>
                <option value="CASH">Cash Disbursement</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                Bill / Invoice Number
              </label>
              <input
                type="text"
                name="invoiceNumber"
                placeholder="e.g. INV-8491"
                className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                Transaction Reference / UTR
              </label>
              <input
                type="text"
                name="reference"
                placeholder="e.g. UTR: 3192039201 or Cheque # 045120"
                className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
              />
            </div>

            <div className="sm:col-span-3 space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                Notes / Purpose Remarks
              </label>
              <textarea
                name="description"
                rows={2}
                placeholder="Optional notes or remarks regarding this expense"
                className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href={`/society/${code}/expenses`}
            className="rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="rounded-full bg-stone-950 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-800"
          >
            Post Expense Voucher
          </button>
        </div>
      </form>
    </div>
  )
}
