import Link from "next/link"
import { notFound } from "next/navigation"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { prisma } from "@/lib/prisma"
import { formatDateInAppTimeZone } from "@/lib/datetime"

const DEFAULT_CATEGORIES = [
  "Security Agency",
  "Lift AMC & Maintenance",
  "Common Electricity Charges",
  "Water Tanker & Supply",
  "Building Repairs & Plumbing",
  "Housekeeping & Waste Disposal",
  "Gardening & Landscaping",
  "Generator Diesel & Maintenance",
  "Staff Salaries & Wages",
  "Auditor & Legal Fees",
  "Office Administration & Printing",
]

export default async function SocietyExpensesPage({
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

  // Auto-provision standard expense categories if none exist
  const existingCategoriesCount = await prisma.expenseCategory.count({
    where: { societyId: society.id },
  })

  if (existingCategoriesCount === 0) {
    for (const catName of DEFAULT_CATEGORIES) {
      await prisma.expenseCategory.create({
        data: {
          societyId: society.id,
          name: catName,
        },
      })
    }
  }

  const [expenses, categories, vendors] = await Promise.all([
    prisma.expense.findMany({
      where: { societyId: society.id },
      orderBy: { expenseDate: "desc" },
      include: {
        category: {
          select: { name: true },
        },
        account: {
          select: { name: true },
        },
        vendor: {
          select: { name: true, companyName: true },
        },
      },
    }),
    prisma.expenseCategory.findMany({
      where: { societyId: society.id, isActive: true, deletedAt: null },
      orderBy: { name: "asc" },
      include: {
        _count: { select: { expenses: true } },
      },
    }),
    prisma.vendor.count({
      where: { societyId: society.id, isActive: true, deletedAt: null },
    }),
  ])

  const totalSpent = expenses.reduce((acc, e) => acc + Number(e.amount), 0)
  const totalGst = expenses.reduce((acc, e) => acc + Number(e.gstAmount), 0)
  const totalTds = expenses.reduce((acc, e) => acc + Number(e.tdsAmount), 0)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="inline-flex items-center rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-stone-600">
            Outflow Management
          </span>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-stone-900 md:text-3xl">
            Operational Expenses
          </h1>
          <p className="text-sm text-stone-500">
            Manage contractor payouts, security bills, lift AMC, utility charges, and repairs for {society.name}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/society/${code}/vendors`}
            className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-4 py-2.5 text-xs font-semibold text-stone-700 shadow-sm transition hover:bg-stone-50"
          >
            Vendors Directory ({vendors})
          </Link>
          <Link
            href={`/society/${code}/expenses/new`}
            className="inline-flex items-center justify-center rounded-full bg-stone-950 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-stone-800"
          >
            + Record Expense
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
            Total Expenditures
          </p>
          <p className="mt-2 text-2xl font-bold text-rose-700">
            ₹{totalSpent.toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            {expenses.length} vouchers recorded
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
            GST Paid on Invoices
          </p>
          <p className="mt-2 text-2xl font-bold text-stone-950">
            ₹{totalGst.toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            Eligible for GST input credit
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
            TDS Withheld
          </p>
          <p className="mt-2 text-2xl font-bold text-amber-700">
            ₹{totalTds.toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            Statutory withholding tax
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
            Expense Categories
          </p>
          <p className="mt-2 text-2xl font-bold text-stone-950">
            {categories.length}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            {vendors} registered vendors
          </p>
        </div>
      </div>

      {/* Expenses Ledger Table */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-stone-200 bg-stone-50 px-6 py-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-stone-900">Expense Vouchers</h2>
          <span className="text-xs text-stone-500">{expenses.length} records</span>
        </div>

        {expenses.length === 0 ? (
          <div className="p-12 text-center text-xs text-stone-500">
            No expenses recorded yet. Click &quot;+ Record Expense&quot; to post your first voucher.
          </div>

        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-stone-200 bg-stone-50/50 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-4 py-3">Expense Title & Date</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Vendor / Payee</th>
                  <th className="px-4 py-3">Paid From</th>
                  <th className="px-4 py-3">Payment Mode</th>
                  <th className="px-4 py-3 text-right">Amount (₹)</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-stone-50/70 transition">
                    <td className="px-4 py-3.5">
                      <span className="font-bold text-stone-950 text-xs block">
                        {e.title}
                      </span>
                      <div className="flex items-center gap-2 text-[10px] text-stone-500">
                        <span>{formatDateInAppTimeZone(e.expenseDate)}</span>
                        {e.invoiceNumber ? (
                          <span className="font-mono text-stone-600">
                            • Bill #{e.invoiceNumber}
                          </span>
                        ) : null}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="inline-flex rounded-full bg-stone-100 px-2.5 py-0.5 text-[10px] font-semibold text-stone-700">
                        {e.category.name}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-stone-800">
                      <p className="font-semibold">
                        {e.vendor?.companyName || e.vendor?.name || e.vendorName || "Direct"}
                      </p>
                      {e.reference ? (
                        <p className="font-mono text-[10px] text-stone-500">
                          Ref: {e.reference}
                        </p>
                      ) : null}
                    </td>

                    <td className="px-4 py-3.5 text-stone-600">
                      {e.account?.name || "—"}
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="font-mono text-[11px] text-stone-700">
                        {e.mode}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-right font-bold text-rose-700">
                      ₹{Number(e.amount).toLocaleString("en-IN")}
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                        {e.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
