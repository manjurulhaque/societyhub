"use client"

import { useState, useMemo, useTransition } from "react"
import { AdminTable, AdminBadge, AdminStatCard } from "@/components/admin"
import {
  RecordPaymentModal,
  type OutstandingBillOption,
  type ResidentOption,
  type AccountOption,
  type FlatOption,
} from "./RecordPaymentModal"
import { PaymentReceiptModal, type PaymentReceiptData } from "./PaymentReceiptModal"
import { PaymentsVisualAnalytics } from "./PaymentsVisualAnalytics"
import { voidPayment } from "./actions"
import { formatDateInAppTimeZone } from "@/lib/datetime"

export type PaymentListItem = {
  id: string
  receiptNumber: string | null
  amount: number
  mode: string
  status: string
  reference: string | null
  remarks: string | null
  paidOn: string
  createdAt: string
  isAdvance: boolean
  payerName: string
  payerPhone?: string | null
  flatDisplay: string
  billPeriod?: string | null
  billType?: string | null
  accountName?: string | null
}

interface PaymentsClientViewProps {
  societyCode: string
  societyName: string
  payments: PaymentListItem[]
  outstandingBills: OutstandingBillOption[]
  residents: ResidentOption[]
  accounts: AccountOption[]
  flats: FlatOption[]
  canManagePayments: boolean
}

export function PaymentsClientView({
  societyCode,
  societyName,
  payments,
  outstandingBills,
  residents,
  accounts,
  flats,
  canManagePayments,
}: PaymentsClientViewProps) {
  const [isRecordOpen, setIsRecordOpen] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentReceiptData | null>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedMode, setSelectedMode] = useState<string>("ALL")
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL")

  const [voidingPayment, setVoidingPayment] = useState<PaymentListItem | null>(null)
  const [voidReason, setVoidReason] = useState("")
  const [voidError, setVoidError] = useState<string | null>(null)
  const [isVoiding, startVoidTransition] = useTransition()

  // Filtered payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (selectedMode !== "ALL" && p.mode !== selectedMode) return false
      if (selectedStatus !== "ALL" && p.status !== selectedStatus) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchReceipt = p.receiptNumber?.toLowerCase().includes(q) || false
        const matchPayer = p.payerName.toLowerCase().includes(q)
        const matchFlat = p.flatDisplay.toLowerCase().includes(q)
        const matchRef = p.reference?.toLowerCase().includes(q) || false
        return matchReceipt || matchPayer || matchFlat || matchRef
      }

      return true
    })
  }, [payments, selectedMode, selectedStatus, searchQuery])

  // KPIs
  const totalCollected = payments
    .filter((p) => p.status === "SUCCESS")
    .reduce((acc, p) => acc + p.amount, 0)

  const upiCollected = payments
    .filter((p) => p.status === "SUCCESS" && (p.mode === "UPI" || p.mode === "APP"))
    .reduce((acc, p) => acc + p.amount, 0)

  const bankCollected = payments
    .filter(
      (p) =>
        p.status === "SUCCESS" &&
        (p.mode === "BANK" || p.mode === "CHEQUE" || p.mode === "CARD")
    )
    .reduce((acc, p) => acc + p.amount, 0)

  const cashCollected = payments
    .filter((p) => p.status === "SUCCESS" && p.mode === "CASH")
    .reduce((acc, p) => acc + p.amount, 0)

  const handleOpenReceipt = (p: PaymentListItem) => {
    setSelectedReceipt({
      receiptNumber: p.receiptNumber || `#${p.id.slice(0, 8)}`,
      societyName,
      societyCode,
      payerName: p.payerName,
      payerPhone: p.payerPhone,
      flatDisplay: p.flatDisplay,
      billPeriod: p.billPeriod,
      billType: p.billType,
      amount: p.amount,
      mode: p.mode,
      reference: p.reference,
      paidOn: p.paidOn,
      remarks: p.remarks,
      accountName: p.accountName,
    })
  }

  const handleVoidPayment = () => {
    if (!voidingPayment) return
    setVoidError(null)

    startVoidTransition(async () => {
      try {
        const res = await voidPayment(societyCode, voidingPayment.id, voidReason)
        if (res.error) {
          setVoidError(res.error)
        } else {
          setVoidingPayment(null)
          setVoidReason("")
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to void payment."
        setVoidError(msg)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          title="Total Collections"
          value={`₹${totalCollected.toLocaleString("en-IN")}`}
          subtitle={`${payments.filter((p) => p.status === "SUCCESS").length} confirmed receipts`}
          icon={
            <svg className="h-5 w-5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <AdminStatCard
          title="UPI & Online"
          value={`₹${upiCollected.toLocaleString("en-IN")}`}
          subtitle="Instant QR & Gateway payments"
          icon={
            <svg className="h-5 w-5 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Bank Transfer & Cheque"
          value={`₹${bankCollected.toLocaleString("en-IN")}`}
          subtitle="NEFT / RTGS / Cheques"
          icon={
            <svg className="h-5 w-5 text-indigo-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Cash Collections"
          value={`₹${cashCollected.toLocaleString("en-IN")}`}
          subtitle="Physical cash in hand"
          icon={
            <svg className="h-5 w-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />
      </div>

      {/* Interactive Visual Analytics */}
      <PaymentsVisualAnalytics payments={payments} />

      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search receipt #, payer, flat, UTR..."
              className="w-64 sm:w-72 rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2 pl-9 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none"
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
            value={selectedMode}
            onChange={(e) => setSelectedMode(e.target.value)}
            className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 focus:border-stone-900 focus:outline-none"
          >
            <option value="ALL">All Modes</option>
            <option value="UPI">UPI / QR</option>
            <option value="BANK">Bank Transfer (NEFT/RTGS/IMPS)</option>
            <option value="CHEQUE">Cheque</option>
            <option value="CASH">Cash</option>
            <option value="CARD">Card</option>
            <option value="APP">Mobile App</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 focus:border-stone-900 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUCCESS">Success</option>
            <option value="REFUNDED">Voided / Refunded</option>
          </select>
        </div>

        {/* Actions */}
        {canManagePayments ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsRecordOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              <span>+ Record Payment</span>
            </button>
          </div>
        ) : null}
      </div>

      {/* Table */}
      {filteredPayments.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-200 bg-white p-12 text-center shadow-xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-400">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="mt-3 text-sm font-semibold text-stone-900">No payments found</h3>
          <p className="mt-1 text-xs text-stone-500">
            {payments.length === 0
              ? "Record payments collected from residents using \"+ Record Payment\"."
              : "No payments match your filter criteria."}
          </p>
        </div>
      ) : (
        <AdminTable
          headers={[
            "Receipt #",
            "Paid By",
            "Flat / Unit",
            "Bill Period",
            "Mode",
            "Reference / UTR",
            "Amount",
            "Date",
            "Status",
            "Actions",
          ]}
          rows={filteredPayments.map((p) => (
            <tr key={p.id} className="border-t border-stone-100 hover:bg-stone-50/60 transition-colors">
              <td className="px-4 py-3.5 font-mono text-xs font-bold text-stone-900">
                {p.receiptNumber || `#${p.id.slice(0, 8)}`}
              </td>
              <td className="px-4 py-3.5 text-xs font-semibold text-stone-950">
                {p.payerName}
              </td>
              <td className="px-4 py-3.5 text-xs text-stone-800">
                {p.flatDisplay}
              </td>
              <td className="px-4 py-3.5 text-xs text-stone-600">
                {p.isAdvance ? (
                  <AdminBadge variant="info" size="sm">ADVANCE</AdminBadge>
                ) : p.billPeriod ? (
                  p.billPeriod
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-3.5">
                <AdminBadge variant="neutral" size="sm">
                  {p.mode}
                </AdminBadge>
              </td>
              <td className="px-4 py-3.5 font-mono text-xs text-stone-600">
                {p.reference || "—"}
              </td>
              <td className="px-4 py-3.5 text-xs font-bold text-emerald-700">
                ₹{p.amount.toLocaleString("en-IN")}
              </td>
              <td className="px-4 py-3.5 text-xs text-stone-500">
                {formatDateInAppTimeZone(new Date(p.paidOn))}
              </td>
              <td className="px-4 py-3.5">
                <AdminBadge
                  variant={p.status === "SUCCESS" ? "success" : "danger"}
                  size="sm"
                  dot
                >
                  {p.status}
                </AdminBadge>
              </td>
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenReceipt(p)}
                    className="rounded-lg p-1 text-stone-500 hover:bg-stone-100 hover:text-stone-900 transition"
                    title="View / Print Receipt Slip"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>

                  {canManagePayments && p.status === "SUCCESS" ? (
                    <button
                      type="button"
                      onClick={() => setVoidingPayment(p)}
                      className="rounded-lg px-1.5 py-0.5 text-[11px] font-semibold text-stone-400 hover:bg-red-50 hover:text-red-600 transition"
                      title="Void / Refund Payment"
                    >
                      Void
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        />
      )}

      {/* Record Payment Modal */}
      {isRecordOpen ? (
        <RecordPaymentModal
          isOpen={isRecordOpen}
          onClose={() => setIsRecordOpen(false)}
          societyCode={societyCode}
          outstandingBills={outstandingBills}
          residents={residents}
          accounts={accounts}
          flats={flats}
        />
      ) : null}

      {/* Payment Receipt Modal */}
      {selectedReceipt ? (
        <PaymentReceiptModal
          isOpen={Boolean(selectedReceipt)}
          onClose={() => setSelectedReceipt(null)}
          receipt={selectedReceipt}
        />
      ) : null}

      {/* Void Payment Confirmation */}
      {voidingPayment ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="fixed inset-0 bg-stone-950/40 backdrop-blur-sm transition-opacity"
            onClick={() => setVoidingPayment(null)}
            aria-hidden="true"
          />

          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl transition-all">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600">
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
                  Void Payment Receipt
                </h3>
                <p className="mt-1 text-xs text-stone-500">
                  Are you sure you want to void receipt{" "}
                  <strong className="text-stone-900">
                    {voidingPayment.receiptNumber || voidingPayment.id}
                  </strong>{" "}
                  of ₹{voidingPayment.amount.toLocaleString("en-IN")}? The related invoice status and account balance will be reversed.
                </p>

                {voidError ? (
                  <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                    {voidError}
                  </div>
                ) : null}

                <div className="mt-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                    Reason for Voiding
                  </label>
                  <input
                    type="text"
                    value={voidReason}
                    onChange={(e) => setVoidReason(e.target.value)}
                    placeholder="e.g. Cheque bounced, Duplicate entry"
                    className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-stone-100 pt-4">
              <button
                type="button"
                onClick={() => setVoidingPayment(null)}
                disabled={isVoiding}
                className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition disabled:opacity-50"
              >
                Keep Receipt
              </button>
              <button
                type="button"
                onClick={handleVoidPayment}
                disabled={isVoiding}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-red-700 transition disabled:opacity-50"
              >
                {isVoiding ? "Voiding..." : "Confirm Void"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
