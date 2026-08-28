"use client"

import { useState, useMemo, useTransition } from "react"
import { AdminTable, AdminBadge, AdminStatCard } from "@/components/admin"
import { BatchBillModal } from "./BatchBillModal"
import { CreateBillModal, type FlatOption } from "./CreateBillModal"
import { BillsVisualAnalytics } from "./BillsVisualAnalytics"
import { cancelBill } from "./actions"
import { formatDateInAppTimeZone } from "@/lib/datetime"

export type BillListItem = {
  id: string
  billNumber: string | null
  flatId: string
  flatNumber: string
  blockName: string
  month: number
  year: number
  billType: string
  title: string | null
  amount: number
  status: string
  dueDate: string | null
  paidDate: string | null
  createdAt: string
}

interface BillsClientViewProps {
  societyCode: string
  bills: BillListItem[]
  flats: FlatOption[]
  canManageBills: boolean
  maintenanceType: string
  fixedRate: number | null
  ratePerSqft: number | null
  dueDayOfMonth: number | null
}

export function BillsClientView({
  societyCode,
  bills,
  flats,
  canManageBills,
  maintenanceType,
  fixedRate,
  ratePerSqft,
  dueDayOfMonth,
}: BillsClientViewProps) {
  const [isBatchOpen, setIsBatchOpen] = useState(false)
  const [isSingleOpen, setIsSingleOpen] = useState(false)

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL")
  const [selectedType, setSelectedType] = useState<string>("ALL")
  const [selectedMonth, setSelectedMonth] = useState<string>("ALL")

  const [cancellingBill, setCancellingBill] = useState<BillListItem | null>(null)
  const [cancelReason, setCancelReason] = useState("")
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [isCancelling, startCancelTransition] = useTransition()

  // Filtered bills
  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      if (selectedStatus !== "ALL" && b.status !== selectedStatus) return false
      if (selectedType !== "ALL" && b.billType !== selectedType) return false
      if (selectedMonth !== "ALL" && b.month.toString() !== selectedMonth) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchNumber = b.billNumber?.toLowerCase().includes(q) || false
        const matchFlat = b.flatNumber.toLowerCase().includes(q)
        const matchBlock = b.blockName.toLowerCase().includes(q)
        const matchTitle = b.title?.toLowerCase().includes(q) || false
        return matchNumber || matchFlat || matchBlock || matchTitle
      }

      return true
    })
  }, [bills, selectedStatus, selectedType, selectedMonth, searchQuery])

  // KPIs
  const totalBilled = bills.reduce((acc, b) => acc + b.amount, 0)
  const totalPaid = bills
    .filter((b) => b.status === "PAID")
    .reduce((acc, b) => acc + b.amount, 0)
  const totalPending = bills
    .filter((b) => b.status === "PENDING" || b.status === "PARTIALLY_PAID")
    .reduce((acc, b) => acc + b.amount, 0)
  const overdueCount = bills.filter((b) => b.status === "OVERDUE").length

  const handleCancelBill = () => {
    if (!cancellingBill) return
    setCancelError(null)

    startCancelTransition(async () => {
      try {
        const res = await cancelBill(societyCode, cancellingBill.id, cancelReason)
        if (res.error) {
          setCancelError(res.error)
        } else {
          setCancellingBill(null)
          setCancelReason("")
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to cancel bill."
        setCancelError(msg)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          title="Total Invoiced"
          value={`₹${totalBilled.toLocaleString("en-IN")}`}
          subtitle={`${bills.length} total demand invoices`}
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Total Collected"
          value={`₹${totalPaid.toLocaleString("en-IN")}`}
          subtitle={`${bills.filter((b) => b.status === "PAID").length} settled bills`}
          icon={
            <svg className="h-5 w-5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Pending Receivables"
          value={`₹${totalPending.toLocaleString("en-IN")}`}
          subtitle={`${bills.filter((b) => b.status === "PENDING").length} awaiting payment`}
          icon={
            <svg className="h-5 w-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Overdue Bills"
          value={overdueCount}
          subtitle="Past grace period"
          icon={
            <svg className="h-5 w-5 text-red-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />
      </div>

      {/* Interactive Visual Analytics */}
      <BillsVisualAnalytics bills={bills} />

      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Filters and Search */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bill #, flat, block..."
              className="w-56 sm:w-64 rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2 pl-9 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none"
            />
            <svg
              className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-stone-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                clipRule="evenodd"
              />
            </svg>
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 focus:border-stone-900 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PAID">Paid</option>
            <option value="OVERDUE">Overdue</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 focus:border-stone-900 focus:outline-none"
          >
            <option value="ALL">All Types</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="WATER">Water</option>
            <option value="ELECTRICITY">Electricity</option>
            <option value="SPECIAL_ASSESSMENT">Special Assessment</option>
            <option value="BUILDING_PAINTING">Painting & Repair</option>
            <option value="PENALTY">Penalty</option>
          </select>

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 focus:border-stone-900 focus:outline-none"
          >
            <option value="ALL">All Months</option>
            {[
              { value: "4", label: "Apr" },
              { value: "5", label: "May" },
              { value: "6", label: "Jun" },
              { value: "7", label: "Jul" },
              { value: "8", label: "Aug" },
              { value: "9", label: "Sep" },
              { value: "10", label: "Oct" },
              { value: "11", label: "Nov" },
              { value: "12", label: "Dec" },
              { value: "1", label: "Jan" },
              { value: "2", label: "Feb" },
              { value: "3", label: "Mar" },
            ].map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Action Buttons */}
        {canManageBills ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsSingleOpen(true)}
              disabled={flats.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 shadow-xs hover:bg-stone-50 hover:text-stone-900 transition disabled:opacity-50"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              <span>+ Create Single Bill</span>
            </button>

            <button
              type="button"
              onClick={() => setIsBatchOpen(true)}
              disabled={flats.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition disabled:opacity-50"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
              <span>+ Batch Generate Bills</span>
            </button>
          </div>
        ) : null}
      </div>

      {/* Table */}
      {filteredBills.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-200 bg-white p-12 text-center shadow-xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-400">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="mt-3 text-sm font-semibold text-stone-900">No bills found</h3>
          <p className="mt-1 text-xs text-stone-500">
            {bills.length === 0
              ? "Generate monthly bills for all society units using \"+ Batch Generate Bills\"."
              : "No bills match your active filter criteria."}
          </p>
          {canManageBills && bills.length === 0 && flats.length > 0 ? (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setIsBatchOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition"
              >
                + Run First Batch Generation
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <AdminTable
          headers={[
            "Invoice #",
            "Flat / Unit",
            "Billing Period",
            "Category",
            "Amount",
            "Due Date",
            "Status",
            ...(canManageBills ? ["Actions"] : []),
          ]}
          rows={filteredBills.map((bill) => (
            <tr key={bill.id} className="border-t border-stone-100 hover:bg-stone-50/60 transition-colors">
              <td className="px-4 py-3.5 font-mono text-xs font-bold text-stone-900">
                {bill.billNumber || `#${bill.month}/${bill.year}`}
              </td>
              <td className="px-4 py-3.5 text-xs text-stone-900 font-medium">
                {bill.blockName} - {bill.flatNumber}
              </td>
              <td className="px-4 py-3.5 text-xs text-stone-600">
                {bill.month}/{bill.year}
              </td>
              <td className="px-4 py-3.5 text-xs text-stone-600">
                {bill.billType.replace(/_/g, " ")}
              </td>
              <td className="px-4 py-3.5 text-xs font-bold text-stone-950">
                ₹{bill.amount.toLocaleString("en-IN")}
              </td>
              <td className="px-4 py-3.5 text-xs text-stone-600">
                {bill.dueDate ? formatDateInAppTimeZone(new Date(bill.dueDate)) : "—"}
              </td>
              <td className="px-4 py-3.5">
                <AdminBadge
                  variant={
                    bill.status === "PAID"
                      ? "success"
                      : bill.status === "OVERDUE"
                        ? "danger"
                        : bill.status === "CANCELLED"
                          ? "neutral"
                          : "warning"
                  }
                  size="sm"
                  dot
                >
                  {bill.status}
                </AdminBadge>
              </td>
              {canManageBills ? (
                <td className="px-4 py-3.5">
                  {bill.status !== "PAID" && bill.status !== "CANCELLED" ? (
                    <button
                      type="button"
                      onClick={() => setCancellingBill(bill)}
                      className="rounded-lg px-2 py-1 text-[11px] font-semibold text-stone-500 hover:bg-red-50 hover:text-red-600 transition"
                      title="Cancel Bill"
                    >
                      Void / Cancel
                    </button>
                  ) : (
                    <span className="text-[11px] text-stone-400">—</span>
                  )}
                </td>
              ) : null}
            </tr>
          ))}
        />
      )}

      {/* Batch Bill Modal */}
      {isBatchOpen ? (
        <BatchBillModal
          isOpen={isBatchOpen}
          onClose={() => setIsBatchOpen(false)}
          societyCode={societyCode}
          totalFlatsCount={flats.length}
          maintenanceType={maintenanceType}
          fixedRate={fixedRate}
          ratePerSqft={ratePerSqft}
          dueDayOfMonth={dueDayOfMonth}
        />
      ) : null}

      {/* Single Bill Modal */}
      {isSingleOpen ? (
        <CreateBillModal
          isOpen={isSingleOpen}
          onClose={() => setIsSingleOpen(false)}
          societyCode={societyCode}
          flats={flats}
        />
      ) : null}

      {/* Cancel Bill Modal */}
      {cancellingBill ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="fixed inset-0 bg-stone-950/40 backdrop-blur-sm transition-opacity"
            onClick={() => setCancellingBill(null)}
            aria-hidden="true"
          />

          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl transition-all">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-stone-950">
                  Cancel Invoice
                </h3>
                <p className="mt-1 text-xs text-stone-500">
                  Void invoice{" "}
                  <strong className="text-stone-900">
                    {cancellingBill.billNumber || `#${cancellingBill.month}/${cancellingBill.year}`}
                  </strong>{" "}
                  for {cancellingBill.blockName}-{cancellingBill.flatNumber} (₹{cancellingBill.amount.toLocaleString("en-IN")}).
                </p>

                {cancelError ? (
                  <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                    {cancelError}
                  </div>
                ) : null}

                <div className="mt-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                    Reason for Cancellation (Optional)
                  </label>
                  <input
                    type="text"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="e.g. Generated by mistake, superseded"
                    className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-stone-100 pt-4">
              <button
                type="button"
                onClick={() => setCancellingBill(null)}
                disabled={isCancelling}
                className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition disabled:opacity-50"
              >
                Keep Bill
              </button>
              <button
                type="button"
                onClick={handleCancelBill}
                disabled={isCancelling}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-red-700 transition disabled:opacity-50"
              >
                {isCancelling ? "Cancelling..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
