"use client"

import { toast } from "sonner"

import { useState, useTransition } from "react"
import { AdminModal } from "@/components/admin"
import { recordAssessmentInstallmentPayment } from "../actions"

interface RecordInstallmentPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  societyCode: string
  installmentId: string
  installmentNumber: number
  flatIdentifier: string
  amountDue: number
  currencySymbol: string
}

export function RecordInstallmentPaymentModal({
  isOpen,
  onClose,
  societyCode,
  installmentId,
  installmentNumber,
  flatIdentifier,
  amountDue,
  currencySymbol,
}: RecordInstallmentPaymentModalProps) {
  const [amount, setAmount] = useState(amountDue.toString())
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const numVal = parseFloat(amount)
    if (isNaN(numVal) || numVal <= 0) {
      setError("Please enter a valid positive payment amount.")
      return
    }

    startTransition(async () => {
      try {
        const res = await recordAssessmentInstallmentPayment(societyCode, installmentId, numVal)
        if (res.error) {
          setError(res.error)
        } else {
          toast.success("Installment payment recorded")
          onClose()
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to record payment."
        setError(msg)
      }
    })
  }

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Assessment Collection"
      description={`Record collection for Flat ${flatIdentifier} — Installment #${installmentNumber}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-3.5 space-y-1 text-xs">
          <div className="flex justify-between text-stone-600">
            <span>Unit:</span>
            <span className="font-bold text-stone-900">{flatIdentifier}</span>
          </div>
          <div className="flex justify-between text-stone-600">
            <span>Installment Due:</span>
            <span className="font-mono font-bold text-stone-950">
              {currencySymbol}{amountDue.toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-stone-700">Payment Amount Received (₹) *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            max={amountDue}
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none font-mono"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition disabled:opacity-50"
          >
            {isPending ? "Recording..." : "Record Payment"}
          </button>
        </div>
      </form>
    </AdminModal>
  )
}
