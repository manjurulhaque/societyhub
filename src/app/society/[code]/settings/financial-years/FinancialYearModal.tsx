"use client"

import { useState, useEffect, useTransition } from "react"
import { createFinancialYear, updateFinancialYear } from "./actions"

export interface FinancialYearItem {
  id: string
  name: string
  startYear: number
  endYear: number
  startDate: string
  endDate: string
  isCurrent: boolean
  isLocked: boolean
  isClosed: boolean
  lockedAt: string | null
  lockedBy: string | null
  journalCount: number
  budgetCount: number
  registerCount: number
}

interface FinancialYearModalProps {
  isOpen: boolean
  onClose: () => void
  societyCode: string
  financialYear?: FinancialYearItem | null
}

export function FinancialYearModal({
  isOpen,
  onClose,
  societyCode,
  financialYear,
}: FinancialYearModalProps) {
  const isEdit = Boolean(financialYear)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const currentYear = new Date().getFullYear()

  // Form states
  const [startYear, setStartYear] = useState<number>(currentYear)
  const [endYear, setEndYear] = useState<number>(currentYear + 1)
  const [name, setName] = useState<string>(`FY ${currentYear}-${currentYear + 1}`)
  const [startDate, setStartDate] = useState<string>(`${currentYear}-04-01`)
  const [endDate, setEndDate] = useState<string>(`${currentYear + 1}-03-31`)
  const [isCurrent, setIsCurrent] = useState<boolean>(false)
  const [isAutoName, setIsAutoName] = useState<boolean>(true)

  useEffect(() => {
    if (financialYear) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStartYear(financialYear.startYear)
      setEndYear(financialYear.endYear)
      setName(financialYear.name)
      setStartDate(financialYear.startDate.slice(0, 10))
      setEndDate(financialYear.endDate.slice(0, 10))
      setIsCurrent(financialYear.isCurrent)
      setIsAutoName(false)
    } else {
      const yr = new Date().getFullYear()
      setStartYear(yr)
      setEndYear(yr + 1)
      setName(`FY ${yr}-${yr + 1}`)
      setStartDate(`${yr}-04-01`)
      setEndDate(`${yr + 1}-03-31`)
      setIsCurrent(false)
      setIsAutoName(true)
    }
    setError(null)
  }, [financialYear, isOpen])

  const handleStartYearChange = (newStart: number) => {
    setStartYear(newStart)
    const newEnd = newStart + 1
    setEndYear(newEnd)
    setStartDate(`${newStart}-04-01`)
    setEndDate(`${newEnd}-03-31`)
    if (isAutoName) {
      setName(`FY ${newStart}-${newEnd}`)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError("Financial Year name is required.")
      return
    }

    startTransition(async () => {
      try {
        if (isEdit && financialYear) {
          const res = await updateFinancialYear(societyCode, financialYear.id, {
            name: name.trim(),
            startDate: new Date(startDate).toISOString(),
            endDate: new Date(`${endDate}T23:59:59.999Z`).toISOString(),
          })
          if (res.error) {
            setError(res.error)
          } else {
            onClose()
          }
        } else {
          const res = await createFinancialYear(societyCode, {
            name: name.trim(),
            startYear,
            endYear,
            startDate: new Date(startDate).toISOString(),
            endDate: new Date(`${endDate}T23:59:59.999Z`).toISOString(),
            isCurrent,
          })
          if (res.error) {
            setError(res.error)
          } else {
            onClose()
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "An unexpected error occurred."
        setError(msg)
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
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-950/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl transition-all sm:p-8">
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">
              Accounting Governance
            </span>
            <h2 className="text-lg font-bold text-stone-950">
              {isEdit ? "Edit Financial Year" : "Create New Financial Year"}
            </h2>
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

        {error ? (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            <svg className="h-4 w-4 shrink-0 text-rose-600" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span>{error}</span>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {!isEdit && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                  Start Year *
                </label>
                <input
                  type="number"
                  required
                  min={2000}
                  max={2099}
                  value={startYear}
                  onChange={(e) => handleStartYearChange(parseInt(e.target.value, 10) || 2025)}
                  className="mt-1 block w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3 py-2 text-sm text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                  End Year *
                </label>
                <input
                  type="number"
                  required
                  min={startYear + 1}
                  max={2100}
                  value={endYear}
                  onChange={(e) => {
                    const ey = parseInt(e.target.value, 10) || startYear + 1
                    setEndYear(ey)
                    setEndDate(`${ey}-03-31`)
                    if (isAutoName) setName(`FY ${startYear}-${ey}`)
                  }}
                  className="mt-1 block w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3 py-2 text-sm text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-hidden"
                />
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                Financial Year Label / Name *
              </label>
              {!isEdit && (
                <button
                  type="button"
                  onClick={() => setIsAutoName(!isAutoName)}
                  className="text-[11px] font-medium text-amber-600 hover:text-amber-700"
                >
                  {isAutoName ? "Customize label" : "Auto-format label"}
                </button>
              )}
            </div>
            <input
              type="text"
              required
              placeholder="e.g. FY 2025-2026"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setIsAutoName(false)
              }}
              className="mt-1 block w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                Start Date (Inclusive) *
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3 py-2 text-sm text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                End Date (Inclusive) *
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3 py-2 text-sm text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          {!isEdit && (
            <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-3.5">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={isCurrent}
                  onChange={(e) => setIsCurrent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded-md border-stone-300 text-stone-900 focus:ring-stone-900"
                />
                <div>
                  <span className="text-xs font-semibold text-stone-900">
                    Set as Active Current Financial Year
                  </span>
                  <p className="text-[11px] text-stone-500">
                    Makes this period the active default for batch maintenance generation, general ledgers, and reporting filters.
                  </p>
                </div>
              </label>
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-stone-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition disabled:opacity-50"
            >
              {isPending
                ? isEdit
                  ? "Saving Changes..."
                  : "Creating..."
                : isEdit
                ? "Save Changes"
                : "Create Financial Year"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
