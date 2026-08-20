import Link from "next/link"
import { notFound } from "next/navigation"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { canApproveDataEntry, isManagerRole } from "@/lib/auth/requireAuth"
import { prisma } from "@/lib/prisma"
import { formatDateInAppTimeZone } from "@/lib/datetime"
import { approveExpenseAction, rejectExpenseAction } from "./actions"

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
  searchParams,
}: {
  params: Promise<{ code: string }>
  searchParams?: Promise<{ status?: string }>
}) {
  const { code } = await params
  const { status: filterStatus } = (await searchParams) || {}
  const context = await getSocietyAdmin(code)

  if (!context) {
    notFound()
  }

  const { society, designation, isSuperAdmin } = context
  const isApprover = canApproveDataEntry(designation, isSuperAdmin)
  const isManager = isManagerRole(designation, isSuperAdmin)

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

  const [expenses, categories, vendors, currentFY] = await Promise.all([
    prisma.expense.findMany({
      where: {
        societyId: society.id,
        ...(filterStatus && filterStatus !== "ALL"
          ? filterStatus === "PAID"
            ? { status: { in: ["PAID", "APPROVED"] } }
            : { status: filterStatus as "PENDING" | "REJECTED" }
          : {}),
      },
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
    prisma.financialYear.findFirst({
      where: { societyId: society.id, isCurrent: true },
      select: { id: true, name: true, startDate: true, endDate: true, isLocked: true },
    }),
  ])

  // Get total counts across all statuses
  const allExpenses = await prisma.expense.findMany({
    where: { societyId: society.id },
    select: { amount: true, gstAmount: true, tdsAmount: true, status: true },
  })

  const pendingExpenses = allExpenses.filter((e) => e.status === "PENDING")
  const paidExpenses = allExpenses.filter((e) => e.status === "PAID" || e.status === "APPROVED")
  const rejectedExpenses = allExpenses.filter((e) => e.status === "REJECTED")

  const totalSpent = paidExpenses.reduce((acc, e) => acc + Number(e.amount), 0)
  const totalPendingAmount = pendingExpenses.reduce((acc, e) => acc + Number(e.amount), 0)
  const totalGst = paidExpenses.reduce((acc, e) => acc + Number(e.gstAmount), 0)
  const totalTds = paidExpenses.reduce((acc, e) => acc + Number(e.tdsAmount), 0)

  const activeTab = filterStatus || "ALL"

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="inline-flex items-center rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-stone-600">
            Accounts Payable
          </span>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-stone-900 md:text-3xl">
            Expenses & Payables
          </h1>
          <p className="text-sm text-stone-500">
            Manage contractor payouts, security bills, lift AMC, utility charges, and repairs for {society.name}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {pendingExpenses.length > 0 && isApprover ? (
            <Link
              href={`/society/${code}/approvals`}
              className="inline-flex items-center justify-center rounded-full border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-800 shadow-sm transition hover:bg-amber-100"
            >
              <span className="mr-1.5 flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              Approvals Queue ({pendingExpenses.length})
            </Link>
          ) : null}

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

      {/* Active Financial Year Context Bar */}
      {currentFY && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-stone-200 bg-white px-5 py-3.5 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100 shrink-0" />
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Active Financial Year Cycle
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-stone-950">
                  {currentFY.name}
                </span>
                <span className="text-xs text-stone-500 font-medium">
                  ({new Date(currentFY.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} – {new Date(currentFY.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })})
                </span>
                {currentFY.isLocked ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                    AUDIT FROZEN
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    LIVE
                  </span>
                )}
              </div>
            </div>
          </div>
          <Link
            href={`/society/${code}/settings/financial-years`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-stone-700 hover:text-stone-900 transition"
          >
            Manage Accounting Cycles →
          </Link>
        </div>
      )}

      {/* Pending Approval Notice Banner for Approvers */}
      {pendingExpenses.length > 0 && isApprover ? (
        <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-amber-950 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-800 font-bold">
              {pendingExpenses.length}
            </div>
            <div>
              <p className="text-xs font-bold">
                {pendingExpenses.length} Expense Voucher{pendingExpenses.length > 1 ? "s" : ""} Awaiting Approval
              </p>
              <p className="text-xs text-amber-800">
                Submitted by Manager totaling ₹{totalPendingAmount.toLocaleString("en-IN")}. Review and approve below or in the Approvals Queue.
              </p>
            </div>
          </div>
          <Link
            href={`/society/${code}/approvals`}
            className="rounded-full bg-amber-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-800 transition shadow-xs"
          >
            Open Approvals →
          </Link>
        </div>
      ) : null}

      {/* Manager Status Notice */}
      {isManager && pendingExpenses.length > 0 ? (
        <div className="flex items-start gap-3 rounded-2xl border border-stone-200 bg-stone-100/70 p-4 text-stone-800 shadow-sm">
          <svg className="h-5 w-5 shrink-0 text-stone-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs">
            You have <strong className="font-semibold text-stone-900">{pendingExpenses.length} voucher(s)</strong> currently pending review by the Hon. Treasurer or Secretary. Once approved, payment accounts and financial reports will update automatically.
          </p>
        </div>
      ) : null}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
            Realized Expenditures
          </p>
          <p className="mt-2 text-2xl font-bold text-rose-700">
            ₹{totalSpent.toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            {paidExpenses.length} approved & disbursed vouchers
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-amber-700">
            Pending Approval
          </p>
          <p className="mt-2 text-2xl font-bold text-amber-800">
            ₹{totalPendingAmount.toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-xs text-amber-700">
            {pendingExpenses.length} voucher{pendingExpenses.length === 1 ? "" : "s"} submitted by Manager
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
            TDS Withheld: ₹{totalTds.toLocaleString("en-IN")}
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

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 pb-3">
        <Link
          href={`/society/${code}/expenses`}
          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
            activeTab === "ALL"
              ? "bg-stone-950 text-white"
              : "bg-stone-100 text-stone-600 hover:bg-stone-200"
          }`}
        >
          All Vouchers ({allExpenses.length})
        </Link>
        <Link
          href={`/society/${code}/expenses?status=PENDING`}
          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
            activeTab === "PENDING"
              ? "bg-amber-700 text-white"
              : "bg-amber-100/70 text-amber-900 hover:bg-amber-200"
          }`}
        >
          Pending Approval ({pendingExpenses.length})
        </Link>
        <Link
          href={`/society/${code}/expenses?status=PAID`}
          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
            activeTab === "PAID"
              ? "bg-emerald-700 text-white"
              : "bg-emerald-100/70 text-emerald-900 hover:bg-emerald-200"
          }`}
        >
          Approved & Paid ({paidExpenses.length})
        </Link>
        <Link
          href={`/society/${code}/expenses?status=REJECTED`}
          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
            activeTab === "REJECTED"
              ? "bg-rose-700 text-white"
              : "bg-rose-100/70 text-rose-900 hover:bg-rose-200"
          }`}
        >
          Rejected ({rejectedExpenses.length})
        </Link>
      </div>

      {/* Expenses Ledger Table */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-stone-200 bg-stone-50 px-6 py-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-stone-900">
            {activeTab === "PENDING"
              ? "Vouchers Awaiting Treasurer/Secretary Approval"
              : activeTab === "PAID"
                ? "Approved & Disbursed Vouchers"
                : activeTab === "REJECTED"
                  ? "Rejected Vouchers"
                  : "All Expense Vouchers"}
          </h2>
          <span className="text-xs text-stone-500">{expenses.length} records</span>
        </div>

        {expenses.length === 0 ? (
          <div className="p-12 text-center text-xs text-stone-500">
            No expenses found matching the current filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-stone-200 bg-stone-50/50 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-4 py-3">Expense Title & Date</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Vendor / Payee</th>
                  <th className="px-4 py-3">Payment Account</th>
                  <th className="px-4 py-3">Payment Mode</th>
                  <th className="px-4 py-3 text-right">Amount (₹)</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  {isApprover ? (
                    <th className="px-4 py-3 text-center">Officer Action</th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {expenses.map((e) => {
                  const isPending = e.status === "PENDING"
                  const isPaid = e.status === "PAID" || e.status === "APPROVED"
                  const isRejected = e.status === "REJECTED"

                  return (
                    <tr
                      key={e.id}
                      className={`hover:bg-stone-50/70 transition ${
                        isPending ? "bg-amber-50/30" : isRejected ? "bg-rose-50/20" : ""
                      }`}
                    >
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
                        {e.description ? (
                          <p className="mt-1 text-[10px] text-stone-500 line-clamp-1">
                            {e.description}
                          </p>
                        ) : null}
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

                      <td className="px-4 py-3.5 text-right font-bold text-stone-900">
                        <span className={isPaid ? "text-rose-700" : isPending ? "text-amber-800" : "text-stone-500"}>
                          ₹{Number(e.amount).toLocaleString("en-IN")}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            PENDING APPROVAL
                          </span>
                        ) : isPaid ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                            APPROVED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-[10px] font-bold text-rose-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
                            REJECTED
                          </span>
                        )}
                      </td>

                      {isApprover ? (
                        <td className="px-4 py-3.5 text-center">
                          {isPending ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <form action={approveExpenseAction}>
                                <input type="hidden" name="code" value={code} />
                                <input type="hidden" name="expenseId" value={e.id} />
                                <button
                                  type="submit"
                                  title="Approve & Disburse"
                                  className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 transition shadow-xs"
                                >
                                  Approve
                                </button>
                              </form>

                              <form action={rejectExpenseAction}>
                                <input type="hidden" name="code" value={code} />
                                <input type="hidden" name="expenseId" value={e.id} />
                                <button
                                  type="submit"
                                  title="Reject voucher"
                                  className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-50 transition"
                                >
                                  Reject
                                </button>
                              </form>
                            </div>
                          ) : (
                            <span className="text-[11px] text-stone-400">—</span>
                          )}
                        </td>
                      ) : null}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

