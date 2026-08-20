"use client"

import { useState, useTransition } from "react"
import { toggleAuditLock } from "./actions"
import type { FinancialYearItem } from "./FinancialYearModal"

interface AuditLockModalProps {
  isOpen: boolean
  onClose: () => void
  societyCode: string
  financialYear: FinancialYearItem | null
}

export function AuditLockModal({
  isOpen,
  onClose,
  societyCode,
  financialYear,
}: AuditLockModalProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (!isOpen || !financialYear) return null

  const isLocking = !financialYear.isLocked

  const handleToggle = () => {
    setError(null)
    startTransition(async () => {
      try {
        const res = await toggleAuditLock(societyCode, financialYear.id, isLocking)
        if (res.error) {
          setError(res.error)
        } else {
          onClose()
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to toggle audit lock."
        setError(msg)
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-stone-950/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl transition-all sm:p-7">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
              isLocking
                ? "bg-amber-100 text-amber-700"
                : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {isLocking ? (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                />
              </svg>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
              Statutory Audit Freeze
            </span>
            <h3 className="text-base font-bold text-stone-950">
              {isLocking ? "Freeze Accounting Period" : "Unfreeze Accounting Period"}
            </h3>
            <p className="mt-1.5 text-xs text-stone-600 leading-relaxed">
              {isLocking ? (
                <>
                  Freezing <strong className="text-stone-900">&quot;{financialYear.name}&quot;</strong> will lock this accounting period against any modifications or retrospective edits, recording it as formally audited.
                </>
              ) : (
                <>
                  Unfreezing <strong className="text-stone-900">&quot;{financialYear.name}&quot;</strong> will permit authorized committee officers to post adjustment journal entries to this past period.
                </>
              )}
            </p>

            {financialYear.isLocked && financialYear.lockedBy && (
              <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50 p-2.5 text-[11px] text-stone-600">
                <span className="font-semibold text-stone-900">Locked By:</span> {financialYear.lockedBy}
                {financialYear.lockedAt && (
                  <span className="block text-stone-500 text-[10px] mt-0.5">
                    On {new Date(financialYear.lockedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                )}
              </div>
            )}

            {error && (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800">
                {error}
              </div>
            )}
          </div>
        </div>

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
            type="button"
            onClick={handleToggle}
            disabled={isPending}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-xs transition disabled:opacity-50 ${
              isLocking
                ? "bg-amber-600 hover:bg-amber-700"
                : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {isPending
              ? "Processing..."
              : isLocking
              ? "Confirm Audit Freeze"
              : "Confirm Period Unfreeze"}
          </button>
        </div>
      </div>
    </div>
  )
}
