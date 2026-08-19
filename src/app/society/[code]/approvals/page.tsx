import Link from "next/link"
import { notFound } from "next/navigation"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { canApproveDataEntry, isManagerRole } from "@/lib/auth/requireAuth"
import { prisma } from "@/lib/prisma"
import { formatDateInAppTimeZone } from "@/lib/datetime"
import { approveExpenseAction, rejectExpenseAction } from "../expenses/actions"

export default async function SocietyApprovalsPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>
  searchParams?: Promise<{ tab?: string }>
}) {
  const { code } = await params
  const { tab: activeTab = "PENDING" } = (await searchParams) || {}
  const context = await getSocietyAdmin(code)

  if (!context) {
    notFound()
  }

  const { society, designation, isSuperAdmin } = context
  const isApprover = canApproveDataEntry(designation, isSuperAdmin)
  const isManager = isManagerRole(designation, isSuperAdmin)

  // Fetch all expenses with category, account, and vendor
  const allExpenses = await prisma.expense.findMany({
    where: { societyId: society.id },
    orderBy: { expenseDate: "desc" },
    include: {
      category: { select: { name: true } },
      account: { select: { name: true, currentBalance: true } },
      vendor: { select: { name: true, companyName: true } },
    },
  })

  const pendingExpenses = allExpenses.filter((e) => e.status === "PENDING")
  const approvedExpenses = allExpenses.filter((e) => e.status === "PAID" || e.status === "APPROVED")
  const rejectedExpenses = allExpenses.filter((e) => e.status === "REJECTED")

  const totalPendingAmount = pendingExpenses.reduce((acc, e) => acc + Number(e.amount), 0)
  const totalApprovedAmount = approvedExpenses.reduce((acc, e) => acc + Number(e.amount), 0)
  const totalRejectedAmount = rejectedExpenses.reduce((acc, e) => acc + Number(e.amount), 0)

  // Filter display based on tab
  const displayExpenses =
    activeTab === "PENDING"
      ? pendingExpenses
      : activeTab === "APPROVED"
        ? approvedExpenses
        : activeTab === "REJECTED"
          ? rejectedExpenses
          : allExpenses

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-800">
              Governance & Oversight
            </span>
            <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600">
              Role: {designation}
            </span>
          </div>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-stone-900 md:text-3xl">
            Manager Data Entry Approvals
          </h1>
          <p className="text-sm text-stone-500">
            Verify and authorize operational disbursements and vouchers entered by the Estate Manager for {society.name}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/society/${code}/expenses`}
            className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-4 py-2.5 text-xs font-semibold text-stone-700 shadow-sm transition hover:bg-stone-50"
          >
            All Expenses Ledger
          </Link>
          <Link
            href={`/society/${code}/expenses/new`}
            className="inline-flex items-center justify-center rounded-full bg-stone-950 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-stone-800"
          >
            + Record Expense
          </Link>
        </div>
      </div>

      {/* Role Explanation Card */}
      {isApprover ? (
        <div className="rounded-2xl border border-stone-200 bg-linear-to-r from-stone-900 to-stone-800 p-6 text-white shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-400"></span>
                <p className="text-xs font-bold uppercase tracking-wider text-stone-300">
                  Officer Signing Authority ({designation})
                </p>
              </div>
              <h2 className="text-lg font-bold">Fiduciary Verification & Release of Funds</h2>
              <p className="text-xs text-stone-300 max-w-2xl">
                As an authorized officer, approving an expense voucher debits the designated bank account, posts the transaction to the general ledger, and reflects it in official financial reports.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-white/10 px-4 py-2.5 backdrop-blur-xs text-center">
                <p className="text-[10px] uppercase font-bold text-stone-400">Pending Review</p>
                <p className="text-xl font-extrabold text-amber-300">{pendingExpenses.length}</p>
              </div>
              <div className="rounded-xl bg-white/10 px-4 py-2.5 backdrop-blur-xs text-center">
                <p className="text-[10px] uppercase font-bold text-stone-400">Pending Value</p>
                <p className="text-xl font-extrabold text-white">₹{totalPendingAmount.toLocaleString("en-IN")}</p>
              </div>
            </div>
          </div>
        </div>
      ) : isManager ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-xs space-y-1">
              <p className="font-bold text-amber-950">Manager Submissions Status</p>
              <p className="text-amber-800">
                You are logged in as Estate Manager. Entries you create are queued below in <strong className="font-semibold">Pending</strong> status until verified by the Hon. Treasurer or Secretary. You cannot approve your own submissions.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-amber-800">
              Awaiting Approval
            </p>
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-900">
            {pendingExpenses.length} <span className="text-xs font-normal text-amber-700">Vouchers</span>
          </p>
          <p className="mt-1 text-xs font-semibold text-amber-800">
            ₹{totalPendingAmount.toLocaleString("en-IN")} total pending disbursement
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
            Approved & Disbursed
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">
            {approvedExpenses.length} <span className="text-xs font-normal text-stone-500">Vouchers</span>
          </p>
          <p className="mt-1 text-xs text-stone-500">
            ₹{totalApprovedAmount.toLocaleString("en-IN")} authorized to date
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
            Rejected Vouchers
          </p>
          <p className="mt-2 text-2xl font-bold text-rose-700">
            {rejectedExpenses.length} <span className="text-xs font-normal text-stone-500">Vouchers</span>
          </p>
          <p className="mt-1 text-xs text-stone-500">
            ₹{totalRejectedAmount.toLocaleString("en-IN")} disallowed
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 pb-3">
        <Link
          href={`/society/${code}/approvals?tab=PENDING`}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition ${
            activeTab === "PENDING"
              ? "bg-amber-600 text-white shadow-xs"
              : "bg-stone-100 text-stone-700 hover:bg-stone-200"
          }`}
        >
          Pending Review ({pendingExpenses.length})
        </Link>
        <Link
          href={`/society/${code}/approvals?tab=APPROVED`}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition ${
            activeTab === "APPROVED"
              ? "bg-emerald-700 text-white shadow-xs"
              : "bg-stone-100 text-stone-700 hover:bg-stone-200"
          }`}
        >
          Approved History ({approvedExpenses.length})
        </Link>
        <Link
          href={`/society/${code}/approvals?tab=REJECTED`}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition ${
            activeTab === "REJECTED"
              ? "bg-rose-700 text-white shadow-xs"
              : "bg-stone-100 text-stone-700 hover:bg-stone-200"
          }`}
        >
          Rejected ({rejectedExpenses.length})
        </Link>
        <Link
          href={`/society/${code}/approvals?tab=ALL`}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition ${
            activeTab === "ALL"
              ? "bg-stone-900 text-white shadow-xs"
              : "bg-stone-100 text-stone-700 hover:bg-stone-200"
          }`}
        >
          All Items ({allExpenses.length})
        </Link>
      </div>

      {/* Approvals Table */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-stone-200 bg-stone-50 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-stone-900">
              {activeTab === "PENDING"
                ? "Data Entries Awaiting Action"
                : activeTab === "APPROVED"
                  ? "Approved & Disbursed Entries"
                  : activeTab === "REJECTED"
                    ? "Rejected Submissions"
                    : "All Entry Records"}
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              {displayExpenses.length} item(s) in this view
            </p>
          </div>
        </div>

        {displayExpenses.length === 0 ? (
          <div className="p-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-stone-400">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="mt-3 text-sm font-bold text-stone-900">
              {activeTab === "PENDING" ? "No pending approvals" : "No items found"}
            </h3>
            <p className="mt-1 text-xs text-stone-500 max-w-sm mx-auto">
              {activeTab === "PENDING"
                ? "All data entered by the manager has been reviewed and processed."
                : "No records found matching this category filter."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-stone-200 bg-stone-50/50 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-5 py-3.5">Particulars & Date</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Vendor / Payee</th>
                  <th className="px-4 py-3.5">Payment Account</th>
                  <th className="px-4 py-3.5 text-right">Amount (₹)</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-center">
                    {isApprover ? "Officer Action" : "Verification Status"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {displayExpenses.map((e) => {
                  const isPending = e.status === "PENDING"
                  const isPaid = e.status === "PAID" || e.status === "APPROVED"

                  return (
                    <tr
                      key={e.id}
                      className={`hover:bg-stone-50/70 transition ${
                        isPending ? "bg-amber-50/40" : ""
                      }`}
                    >
                      <td className="px-5 py-4">
                        <span className="font-bold text-stone-950 text-xs block">
                          {e.title}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-stone-500 mt-0.5">
                          <span>{formatDateInAppTimeZone(e.expenseDate)}</span>
                          {e.invoiceNumber ? (
                            <span className="font-mono text-stone-600">
                              • Bill #{e.invoiceNumber}
                            </span>
                          ) : null}
                          <span className="font-mono uppercase text-stone-500">
                            • {e.mode}
                          </span>
                        </div>
                        {e.description ? (
                          <p className="mt-1 text-[10px] text-stone-600 bg-stone-50 rounded-lg p-1.5 border border-stone-200/60 max-w-md">
                            {e.description}
                          </p>
                        ) : null}
                      </td>

                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full bg-stone-100 px-2.5 py-0.5 text-[10px] font-semibold text-stone-700">
                          {e.category.name}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-stone-800">
                        <p className="font-semibold">
                          {e.vendor?.companyName || e.vendor?.name || e.vendorName || "Direct"}
                        </p>
                        {e.reference ? (
                          <p className="font-mono text-[10px] text-stone-500">
                            Ref: {e.reference}
                          </p>
                        ) : null}
                      </td>

                      <td className="px-4 py-4 text-stone-700">
                        <p className="font-medium">{e.account?.name || "—"}</p>
                        {e.account ? (
                          <p className="text-[10px] text-stone-500">
                            Avail Bal: ₹{Number(e.account.currentBalance).toLocaleString("en-IN")}
                          </p>
                        ) : null}
                      </td>

                      <td className="px-4 py-4 text-right">
                        <p className="font-bold text-sm text-stone-950">
                          ₹{Number(e.amount).toLocaleString("en-IN")}
                        </p>
                        {Number(e.gstAmount) > 0 || Number(e.tdsAmount) > 0 ? (
                          <p className="text-[10px] text-stone-500">
                            GST: ₹{Number(e.gstAmount)} | TDS: ₹{Number(e.tdsAmount)}
                          </p>
                        ) : null}
                      </td>

                      <td className="px-4 py-4 text-center">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-[10px] font-bold text-amber-900">
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

                      <td className="px-5 py-4 text-center">
                        {isPending && isApprover ? (
                          <div className="flex items-center justify-center gap-2">
                            <form action={approveExpenseAction}>
                              <input type="hidden" name="code" value={code} />
                              <input type="hidden" name="expenseId" value={e.id} />
                              <button
                                type="submit"
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                                Approve
                              </button>
                            </form>

                            <form action={rejectExpenseAction} className="inline-block">
                              <input type="hidden" name="code" value={code} />
                              <input type="hidden" name="expenseId" value={e.id} />
                              <input
                                type="hidden"
                                name="rejectionReason"
                                value="Disallowed by reviewing committee officer"
                              />
                              <button
                                type="submit"
                                className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 transition"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Reject
                              </button>
                            </form>
                          </div>
                        ) : isPending ? (
                          <span className="text-[11px] text-amber-700 font-medium italic">
                            Awaiting Officer Review
                          </span>
                        ) : isPaid ? (
                          <span className="text-[11px] text-emerald-700 font-medium">
                            Disbursed
                          </span>
                        ) : (
                          <span className="text-[11px] text-rose-600 font-medium">
                            Rejected
                          </span>
                        )}
                      </td>
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
