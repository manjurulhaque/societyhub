"use client"

import { useState, useTransition } from "react"
import { generateBatchBills } from "./actions"

interface BatchBillModalProps {
  isOpen: boolean
  onClose: () => void
  societyCode: string
  totalFlatsCount: number
  maintenanceType: string
  fixedRate: number | null
  ratePerSqft: number | null
  dueDayOfMonth: number | null
}

const MONTH_NAMES = [
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
]

export function BatchBillModal({
  isOpen,
  onClose,
  societyCode,
  totalFlatsCount,
  maintenanceType,
  fixedRate,
  ratePerSqft,
  dueDayOfMonth,
}: BatchBillModalProps) {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  const defaultDueDay = dueDayOfMonth || 10
  const defaultDueDateStr = new Date(year, month - 1, defaultDueDay)
    .toISOString()
    .split("T")[0]

  const [dueDate, setDueDate] = useState(defaultDueDateStr)
  const [error, setError] = useState<string | null>(null)
  const [resultMessage, setResultMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (!isOpen) return null

  const handleGenerate = () => {
    setError(null)
    setResultMessage(null)

    startTransition(async () => {
      try {
        const res = await generateBatchBills(societyCode, {
          month,
          year,
          dueDate,
        })

        if (res.error) {
          setError(res.error)
        } else {
          setResultMessage(res.message || "Batch bill generation completed.")
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to run batch billing."
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
              Batch Generate Monthly Bills
            </h3>
            <p className="mt-1 text-xs text-stone-500">
              Automate maintenance bill generation for all {totalFlatsCount} active flats.
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
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error ? (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
              <svg className="h-4 w-4 shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          ) : null}

          {resultMessage ? (
            <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800">
              <svg className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="font-bold text-emerald-950">Generation Complete</p>
                <p className="mt-0.5 text-emerald-800">{resultMessage}</p>
              </div>
            </div>
          ) : null}

          {/* Billing Period Selector */}
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
                {MONTH_NAMES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
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

          {/* Applicable Financial Year Tag */}
          <div className="flex items-center justify-between rounded-2xl border border-stone-200 bg-stone-50/80 px-4 py-3 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Accounting Period
              </span>
              <p className="font-bold text-stone-900 mt-0.5">
                {month >= 4 ? `FY ${year}-${year + 1}` : `FY ${year - 1}-${year}`}
              </p>
            </div>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
              {MONTH_NAMES.find((m) => m.value === month)?.label} {year}
            </span>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
              Invoice Due Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={isPending}
              className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-stone-500">
              Default is set to the {defaultDueDay}th of the month per society policy.
            </p>
          </div>

          {/* Calculation Policy Card */}
          <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-900">
              Active Billing Policy
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-stone-500">Calculation Method:</div>
              <div className="font-semibold text-stone-900">
                {maintenanceType === "PER_SQFT"
                  ? `₹${ratePerSqft || 0}/sq. ft. rate`
                  : `Fixed ₹${fixedRate || 0} per unit`}
              </div>

              <div className="text-stone-500">Eligible Flats:</div>
              <div className="font-semibold text-stone-900">
                {totalFlatsCount} active units
              </div>

              <div className="text-stone-500">Duplicate Check:</div>
              <div className="font-semibold text-emerald-700">
                Enabled (skips already-billed flats)
              </div>
            </div>
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
            {resultMessage ? "Close" : "Cancel"}
          </button>
          {!resultMessage ? (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isPending || totalFlatsCount === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Generating Bills...</span>
                </>
              ) : (
                <span>Run Batch Generation</span>
              )}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
