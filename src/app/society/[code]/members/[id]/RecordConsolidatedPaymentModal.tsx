"use client"

import { useState, useTransition, useMemo } from "react"
import { recordConsolidatedPayment, type ConsolidatedBillAllocation } from "@/app/society/[code]/payments/actions"
import type { PaymentMode } from "@/generated/prisma/client"
import type { ResidentBillItem, FlatPortfolioItem } from "./ResidentProfileClient"

export type AccountOption = {
  id: string
  name: string
  accountType: string
  bankName?: string | null
  isDefault: boolean
}

interface RecordConsolidatedPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  societyCode: string
  personId: string
  personName: string
  currencySymbol: string
  bills: ResidentBillItem[]
  flats: FlatPortfolioItem[]
  accounts: AccountOption[]
}

export function RecordConsolidatedPaymentModal({
  isOpen,
  onClose,
  societyCode,
  personId,
  personName,
  currencySymbol,
  bills,
  flats,
  accounts,
}: RecordConsolidatedPaymentModalProps) {
  // Only unpaid or partially paid bills
  const unpaidBills = useMemo(() => {
    return bills.filter(
      (b) => b.status === "PENDING" || b.status === "OVERDUE" || b.status === "PARTIALLY_PAID"
    )
  }, [bills])

  const totalOutstanding = useMemo(() => {
    return unpaidBills.reduce((acc, b) => acc + (b.balanceAmount > 0 ? b.balanceAmount : b.amount - b.paidAmount), 0)
  }, [unpaidBills])

  const [totalAmount, setTotalAmount] = useState<string>(totalOutstanding > 0 ? totalOutstanding.toString() : "0")
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("UPI")
  const [accountId, setAccountId] = useState<string>(
    accounts.find((a) => a.isDefault)?.id || accounts[0]?.id || ""
  )
  const [paidOn, setPaidOn] = useState<string>(new Date().toISOString().split("T")[0])
  const [reference, setReference] = useState<string>("")
  const [remarks, setRemarks] = useState<string>("")

  // Map of billId -> allocated amount
  const [allocations, setAllocations] = useState<Record<string, number>>(() => {
    // Initial auto-allocation
    const initialMap: Record<string, number> = {}
    let remaining = totalOutstanding
    for (const bill of unpaidBills) {
      const due = bill.balanceAmount > 0 ? bill.balanceAmount : bill.amount - bill.paidAmount
      const alloc = Math.min(remaining, due)
      initialMap[bill.id] = alloc
      remaining -= alloc
    }
    return initialMap
  })

  const [advanceFlatId, setAdvanceFlatId] = useState<string>(flats[0]?.flatId || "")
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Calculate totals
  const totalAllocated = useMemo(() => {
    return Object.values(allocations).reduce((sum, val) => sum + (val || 0), 0)
  }, [allocations])

  const parsedTotal = parseFloat(totalAmount) || 0
  const advanceAmount = Math.max(0, parsedTotal - totalAllocated)
  const isAllocationMismatched = parsedTotal > 0 && parsedTotal < totalAllocated

  // Auto-allocate FIFO
  const handleAutoAllocate = (amountToDistribute: number) => {
    let remaining = amountToDistribute
    const newAlloc: Record<string, number> = {}

    // Sort bills oldest first (year asc, month asc)
    const sorted = [...unpaidBills].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year
      return a.month - b.month
    })

    for (const bill of sorted) {
      const due = bill.balanceAmount > 0 ? bill.balanceAmount : bill.amount - bill.paidAmount
      const alloc = Math.min(remaining, due)
      newAlloc[bill.id] = alloc
      remaining -= alloc
    }

    setAllocations(newAlloc)
  }

  const handleTotalAmountChange = (val: string) => {
    setTotalAmount(val)
    const num = parseFloat(val) || 0
    handleAutoAllocate(num)
  }

  const handleBillAllocationChange = (billId: string, val: string) => {
    const num = Math.max(0, parseFloat(val) || 0)
    setAllocations((prev) => ({
      ...prev,
      [billId]: num,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)

    if (parsedTotal <= 0) {
      setError("Please enter a valid payment amount.")
      return
    }

    if (isAllocationMismatched) {
      setError("Allocated bill amounts exceed the total payment amount.")
      return
    }

    const payloadAllocations: ConsolidatedBillAllocation[] = Object.entries(allocations)
      .filter(([_, amount]) => amount > 0)
      .map(([billId, amount]) => {
        const bill = unpaidBills.find((b) => b.id === billId)
        return {
          billId,
          flatId: bill?.flatId || "",
          amount,
        }
      })

    startTransition(async () => {
      try {
        const res = await recordConsolidatedPayment(societyCode, {
          personId,
          totalAmount: parsedTotal,
          mode: paymentMode,
          accountId: accountId || null,
          paidOn,
          reference: reference || null,
          remarks: remarks || null,
          allocations: payloadAllocations,
          advanceAmount: advanceAmount > 0 ? advanceAmount : undefined,
          advanceFlatId: advanceAmount > 0 ? advanceFlatId : undefined,
        })

        if (res.error) {
          setError(res.error)
        } else {
          setSuccessMessage(res.message || "Payment successfully recorded.")
          setTimeout(() => {
            onClose()
          }, 1500)
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to record payment.")
      }
    })
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-stone-950/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-stone-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                Multi-Flat Collection
              </span>
              <span className="text-xs text-stone-500">Owner Settlement</span>
            </div>
            <h3 className="mt-1 text-lg font-bold text-stone-950">
              Collect Payment • {personName}
            </h3>
            <p className="text-xs text-stone-500">
              Record a single lump-sum payment and distribute across outstanding bills.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 font-semibold">
            ✓ {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Top Form Fields */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Total Payment Amount */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                Total Payment Received ({currencySymbol}) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={totalAmount}
                  onChange={(e) => handleTotalAmountChange(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm font-bold font-mono text-stone-900 focus:border-stone-950 focus:outline-none focus:ring-1 focus:ring-stone-950"
                />
              </div>

              {totalOutstanding > 0 && (
                <div className="mt-1.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleTotalAmountChange(totalOutstanding.toString())}
                    className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 underline"
                  >
                    Pay Total Due ({currencySymbol}{totalOutstanding.toLocaleString("en-IN")})
                  </button>
                </div>
              )}
            </div>

            {/* Payment Mode */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                Payment Mode *
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs font-medium text-stone-900 focus:border-stone-950 focus:outline-none focus:ring-1 focus:ring-stone-950"
              >
                <option value="UPI">UPI (Google Pay / PhonePe / QR)</option>
                <option value="BANK">Bank Transfer (NEFT / RTGS / IMPS)</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CASH">Cash</option>
                <option value="APP">Online App Gateway</option>
              </select>
            </div>

            {/* Destination Account */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                Deposit Account
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 focus:border-stone-950 focus:outline-none focus:ring-1 focus:ring-stone-950"
              >
                <option value="">No account (Record only)</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.accountType})
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Date */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                Payment Date *
              </label>
              <input
                type="date"
                required
                value={paidOn}
                onChange={(e) => setPaidOn(e.target.value)}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 focus:border-stone-950 focus:outline-none focus:ring-1 focus:ring-stone-950"
              />
            </div>

            {/* Reference Number */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                UTR / Cheque / Txn Ref #
              </label>
              <input
                type="text"
                placeholder="e.g. UTR492810924 or Cheque 00412"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs font-mono text-stone-900 focus:border-stone-950 focus:outline-none focus:ring-1 focus:ring-stone-950"
              />
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                Remarks / Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Q2 Maintenance consolidated"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 focus:border-stone-950 focus:outline-none focus:ring-1 focus:ring-stone-950"
              />
            </div>
          </div>

          {/* Allocation Table Section */}
          <div className="rounded-2xl border border-stone-200 bg-stone-50/50 p-4 space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-900">
                  Bill-by-Bill Allocation ({unpaidBills.length} Unpaid Bills)
                </h4>
                <p className="text-[11px] text-stone-500">
                  Specify how much of the {currencySymbol}{parsedTotal.toLocaleString("en-IN")} goes to each flat.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleAutoAllocate(parsedTotal)}
                className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-700 hover:bg-stone-100 transition shadow-2xs"
              >
                <span>⚡ Auto-Allocate FIFO</span>
              </button>
            </div>

            {unpaidBills.length === 0 ? (
              <div className="rounded-xl border border-dashed border-stone-200 bg-white p-4 text-center">
                <p className="text-xs text-stone-500">
                  No unpaid bills. The payment will be credited entirely as an advance balance.
                </p>
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto rounded-xl border border-stone-200 bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-stone-100 bg-stone-50/80 text-[10px] font-bold uppercase text-stone-500">
                    <tr>
                      <th className="px-3 py-2">Flat</th>
                      <th className="px-3 py-2">Period / Bill</th>
                      <th className="px-3 py-2">Due Balance</th>
                      <th className="px-3 py-2 text-right">Allocate ({currencySymbol})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {unpaidBills.map((b) => {
                      const due = b.balanceAmount > 0 ? b.balanceAmount : b.amount - b.paidAmount
                      const currentAlloc = allocations[b.id] || 0
                      const isFullySettled = currentAlloc >= due

                      return (
                        <tr key={b.id} className="hover:bg-stone-50/60">
                          <td className="px-3 py-2 font-bold text-stone-900">
                            {b.blockName} - {b.flatNumber}
                          </td>
                          <td className="px-3 py-2 text-stone-600">
                            <span className="block font-medium">{b.billType.replace(/_/g, " ")}</span>
                            <span className="text-[10px] text-stone-400">
                              {b.month}/{b.year}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-bold font-mono text-red-700">
                            {currencySymbol}{due.toLocaleString("en-IN")}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isFullySettled && (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                  ✓ Cleared
                                </span>
                              )}
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max={due}
                                value={currentAlloc}
                                onChange={(e) => handleBillAllocationChange(b.id, e.target.value)}
                                className="w-24 rounded-lg border border-stone-200 px-2 py-1 text-right font-mono font-bold text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
                              />
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Allocation Summary Footer */}
            <div className="flex flex-col gap-2 rounded-xl bg-stone-100/70 p-3 text-xs sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-stone-600">Total Allocated to Bills:</span>
                  <span className="font-bold text-stone-950 font-mono">
                    {currencySymbol}{totalAllocated.toLocaleString("en-IN")}
                  </span>
                </div>
                {advanceAmount > 0 && (
                  <div className="flex items-center gap-2 text-blue-700">
                    <span>Surplus (Advance Credit):</span>
                    <span className="font-bold font-mono">
                      +{currencySymbol}{advanceAmount.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
              </div>

              {advanceAmount > 0 && flats.length > 1 && (
                <div className="flex items-center gap-1.5">
                  <label className="text-[11px] text-stone-600">Credit advance to:</label>
                  <select
                    value={advanceFlatId}
                    onChange={(e) => setAdvanceFlatId(e.target.value)}
                    className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-[11px] font-medium text-stone-800"
                  >
                    {flats.map((f) => (
                      <option key={f.flatId} value={f.flatId}>
                        {f.blockName} - Flat {f.number}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 border-t border-stone-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || parsedTotal <= 0 || isAllocationMismatched}
              className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition disabled:opacity-50"
            >
              {isPending ? "Recording Payment..." : `Confirm Payment of ${currencySymbol}${parsedTotal.toLocaleString("en-IN")}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
