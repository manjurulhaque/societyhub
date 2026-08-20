"use client"

import { useState, useTransition } from "react"
import { recordPayment } from "./actions"
import type { PaymentMode } from "@/generated/prisma/client"

export type OutstandingBillOption = {
  id: string
  billNumber: string | null
  month: number
  year: number
  amount: number
  billType: string
  flatId: string
  flatNumber: string
  blockName: string
  residentName?: string | null
  residentId?: string | null
}

export type ResidentOption = {
  id: string
  name: string
  phone?: string | null
}

export type AccountOption = {
  id: string
  name: string
  accountNumber?: string | null
  type: string
}

export type FlatOption = {
  id: string
  number: string
  blockName: string
  occupants: { id: string; name: string }[]
}

interface RecordPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  societyCode: string
  outstandingBills: OutstandingBillOption[]
  residents: ResidentOption[]
  accounts: AccountOption[]
  flats: FlatOption[]
}

const PAYMENT_MODES: { value: PaymentMode; label: string }[] = [
  { value: "UPI", label: "UPI / QR Code" },
  { value: "BANK", label: "Bank Transfer (NEFT / RTGS / IMPS)" },
  { value: "CHEQUE", label: "Bank Cheque" },
  { value: "CASH", label: "Cash in Hand" },
  { value: "CARD", label: "Debit / Credit Card" },
  { value: "APP", label: "Resident Mobile App" },
]

export function RecordPaymentModal({
  isOpen,
  onClose,
  societyCode,
  outstandingBills,
  residents,
  accounts,
  flats,
}: RecordPaymentModalProps) {
  const [paymentType, setPaymentType] = useState<"BILL" | "ADVANCE">(
    outstandingBills.length > 0 ? "BILL" : "ADVANCE"
  )

  // Bill selection state
  const [selectedBillId, setSelectedBillId] = useState(outstandingBills[0]?.id || "")

  // Advance selection state
  const [selectedFlatId, setSelectedFlatId] = useState(flats[0]?.id || "")
  const [selectedResidentId, setSelectedResidentId] = useState("")

  const [amount, setAmount] = useState(
    outstandingBills[0] ? outstandingBills[0].amount.toString() : ""
  )
  const [mode, setMode] = useState<PaymentMode>("UPI")
  const [accountId, setAccountId] = useState(accounts[0]?.id || "")
  const [reference, setReference] = useState("")
  const [paidOn, setPaidOn] = useState(new Date().toISOString().split("T")[0])
  const [remarks, setRemarks] = useState("")

  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (!isOpen) return null

  // Handle bill change to auto-fill amount and payer
  const handleBillChange = (billId: string) => {
    setSelectedBillId(billId)
    const bill = outstandingBills.find((b) => b.id === billId)
    if (bill) {
      setAmount(bill.amount.toString())
      if (bill.residentId) {
        setSelectedResidentId(bill.residentId)
      }
    }
  }

  // Handle flat change in advance mode
  const handleFlatChange = (flatId: string) => {
    setSelectedFlatId(flatId)
    const flat = flats.find((f) => f.id === flatId)
    if (flat && flat.occupants[0]) {
      setSelectedResidentId(flat.occupants[0].id)
    }
  }

  const handleSave = () => {
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid payment amount.")
      return
    }

    if (paymentType === "BILL" && !selectedBillId) {
      setError("Please select an outstanding bill to settle.")
      return
    }

    if (paymentType === "ADVANCE" && !selectedFlatId) {
      setError("Please select a flat unit for the advance collection.")
      return
    }

    setError(null)

    startTransition(async () => {
      try {
        const isAdvance = paymentType === "ADVANCE"
        const res = await recordPayment(societyCode, {
          billId: isAdvance ? null : selectedBillId,
          flatId: isAdvance ? selectedFlatId : null,
          paidById: selectedResidentId || null,
          accountId: accountId || null,
          amount: numAmount,
          mode,
          paidOn,
          reference: reference.trim() || undefined,
          remarks: remarks.trim() || undefined,
          isAdvance,
        })

        if (res.error) {
          setError(res.error)
        } else {
          setAmount("")
          setReference("")
          setRemarks("")
          onClose()
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to record payment."
        setError(msg)
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-stone-950/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl transition-all">
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between border-b border-stone-100 px-6 py-5">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-stone-950">Record Payment</h3>
            <p className="mt-1 text-xs text-stone-500">
              Acknowledge resident collections, UPI payments, bank transfers, or cheques.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-stone-100 bg-stone-50/50 px-6 pt-3">
          <button
            type="button"
            onClick={() => setPaymentType("BILL")}
            className={`pb-2.5 text-xs font-bold border-b-2 px-3 transition-colors ${
              paymentType === "BILL"
                ? "border-stone-900 text-stone-950"
                : "border-transparent text-stone-500 hover:text-stone-700"
            }`}
          >
            Settle Outstanding Bill ({outstandingBills.length})
          </button>
          <button
            type="button"
            onClick={() => setPaymentType("ADVANCE")}
            className={`pb-2.5 text-xs font-bold border-b-2 px-3 transition-colors ${
              paymentType === "ADVANCE"
                ? "border-stone-900 text-stone-950"
                : "border-transparent text-stone-500 hover:text-stone-700"
            }`}
          >
            Advance Collection
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error ? (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
              <svg className="h-4 w-4 shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          ) : null}

          {paymentType === "BILL" ? (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Outstanding Bill / Assessment <span className="text-red-500">*</span>
              </label>
              {outstandingBills.length === 0 ? (
                <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50 p-3 text-xs text-stone-500">
                  No outstanding pending bills found. You can record an Advance Payment instead.
                </div>
              ) : (
                <select
                  value={selectedBillId}
                  onChange={(e) => handleBillChange(e.target.value)}
                  disabled={isPending}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none"
                >
                  {outstandingBills.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.blockName}-{b.flatNumber} | {b.billType} ({b.month}/{b.year}) — ₹{b.amount.toLocaleString("en-IN")}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Target Flat / Unit <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedFlatId}
                  onChange={(e) => handleFlatChange(e.target.value)}
                  disabled={isPending}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none"
                >
                  {flats.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.blockName} - {f.number}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Paid By (Resident)
                </label>
                <select
                  value={selectedResidentId}
                  onChange={(e) => setSelectedResidentId(e.target.value)}
                  disabled={isPending}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none"
                >
                  <option value="">Select resident (optional)</option>
                  {residents.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} {r.phone ? `(${r.phone})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Amount Received (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isPending}
                placeholder="e.g. 2500"
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Payment Mode <span className="text-red-500">*</span>
              </label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as PaymentMode)}
                disabled={isPending}
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none"
              >
                {PAYMENT_MODES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Deposit Account (Bank / Cash)
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                disabled={isPending}
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none"
              >
                <option value="">No account specified</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={paidOn}
                onChange={(e) => setPaidOn(e.target.value)}
                disabled={isPending}
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
              Reference / UTR / Cheque Number
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              disabled={isPending}
              placeholder="e.g. UPI Ref 324901928392 or Cheque #492810"
              className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
              Remarks (Optional)
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              disabled={isPending}
              placeholder="e.g. Paid in full via GPay"
              className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-stone-100 bg-stone-50/50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition disabled:opacity-50"
          >
            {isPending ? "Recording..." : "Record Payment Receipt"}
          </button>
        </div>
      </div>
    </div>
  )
}
