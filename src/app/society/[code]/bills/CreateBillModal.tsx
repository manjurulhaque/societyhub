"use client"

import { useState, useTransition } from "react"
import { createIndividualBill } from "./actions"
import type { BillType } from "@/generated/prisma/client"

export type FlatOption = {
  id: string
  number: string
  blockName: string
}

interface CreateBillModalProps {
  isOpen: boolean
  onClose: () => void
  societyCode: string
  flats: FlatOption[]
}

const BILL_TYPE_OPTIONS: { value: BillType; label: string }[] = [
  { value: "MAINTENANCE", label: "Monthly Maintenance Demand" },
  { value: "WATER", label: "Water Consumption Charges" },
  { value: "ELECTRICITY", label: "Common / Sub-metered Electricity" },
  { value: "SPECIAL_ASSESSMENT", label: "Special Assessment Fund" },
  { value: "BUILDING_PAINTING", label: "Building Painting & Repair Fund" },
  { value: "PENALTY", label: "Late Interest / Rule Violation Penalty" },
  { value: "EVENT", label: "Society Cultural / Event Contribution" },
]

export function CreateBillModal({
  isOpen,
  onClose,
  societyCode,
  flats,
}: CreateBillModalProps) {
  const now = new Date()
  const [flatId, setFlatId] = useState(flats[0]?.id || "")
  const [billType, setBillType] = useState<BillType>("MAINTENANCE")
  const [amount, setAmount] = useState("")
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [title, setTitle] = useState("")

  const defaultDueDate = new Date(now.getFullYear(), now.getMonth(), 10)
    .toISOString()
    .split("T")[0]
  const [dueDate, setDueDate] = useState(defaultDueDate)

  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (!isOpen) return null

  const handleSave = () => {
    if (!flatId) {
      setError("Please select a target flat.")
      return
    }

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid bill amount.")
      return
    }

    setError(null)

    startTransition(async () => {
      try {
        const res = await createIndividualBill(societyCode, {
          flatId,
          billType,
          amount: parsedAmount,
          month,
          year,
          dueDate,
          title: title.trim() || undefined,
        })

        if (res.error) {
          setError(res.error)
        } else {
          setAmount("")
          setTitle("")
          onClose()
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to create bill."
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

      <div className="relative z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl transition-all">
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between border-b border-stone-100 px-6 py-5">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-stone-950">
              Create Single Bill / Invoice
            </h3>
            <p className="mt-1 text-xs text-stone-500">
              Issue an individual maintenance or utility bill for a specific unit.
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

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
              Target Flat / Unit <span className="text-red-500">*</span>
            </label>
            <select
              value={flatId}
              onChange={(e) => setFlatId(e.target.value)}
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Bill Category <span className="text-red-500">*</span>
              </label>
              <select
                value={billType}
                onChange={(e) => setBillType(e.target.value as BillType)}
                disabled={isPending}
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none"
              >
                {BILL_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Bill Amount (₹) <span className="text-red-500">*</span>
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Billing Month <span className="text-red-500">*</span>
              </label>
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value, 10))}
                disabled={isPending}
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none"
              >
                {[
                  { value: 4, name: "April" },
                  { value: 5, name: "May" },
                  { value: 6, name: "June" },
                  { value: 7, name: "July" },
                  { value: 8, name: "August" },
                  { value: 9, name: "September" },
                  { value: 10, name: "October" },
                  { value: 11, name: "November" },
                  { value: 12, name: "December" },
                  { value: 1, name: "January" },
                  { value: 2, name: "February" },
                  { value: 3, name: "March" },
                ].map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Billing Year <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value, 10))}
                disabled={isPending}
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={isPending}
              className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
              Title / Description (Optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isPending}
              placeholder="e.g. Quarterly Clubhouse Usage Assessment"
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
            {isPending ? "Creating..." : "Create Bill"}
          </button>
        </div>
      </div>
    </div>
  )
}
