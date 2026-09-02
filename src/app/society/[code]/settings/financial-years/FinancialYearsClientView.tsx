"use client"

import { toast } from "sonner"

import { useState, useMemo, useTransition } from "react"
import {
  AdminCard,
  AdminStatCard,
  AdminSearchBar,
  AdminBadge,
} from "@/components/admin"
import {
  FinancialYearModal,
  type FinancialYearItem,
} from "./FinancialYearModal"
import { AuditLockModal } from "./AuditLockModal"
import { FinancialYearDeleteDialog } from "./FinancialYearDeleteDialog"
import { setCurrentFinancialYear, toggleYearClosure } from "./actions"
import { formatFinancialYearDate } from "@/lib/datetime"

interface FinancialYearsClientViewProps {
  societyCode: string
  societyName: string
  financialYears: FinancialYearItem[]
  canManage: boolean
}

type FilterTab = "ALL" | "ACTIVE" | "LOCKED" | "CLOSED"

export function FinancialYearsClientView({
  societyCode,
  societyName,
  financialYears,
  canManage,
}: FinancialYearsClientViewProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [isPending, startTransition] = useTransition()

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [selectedFY, setSelectedFY] = useState<FinancialYearItem | null>(null)

  const [isLockModalOpen, setIsLockModalOpen] = useState<boolean>(false)
  const [lockTargetFY, setLockTargetFY] = useState<FinancialYearItem | null>(null)

  const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false)
  const [deleteTargetFY, setDeleteTargetFY] = useState<FinancialYearItem | null>(null)

  const [actionMessage, setActionMessage] = useState<{ text: string; type: "success" | "error" } | null>(null)

  // Current active FY
  const currentFY = useMemo(
    () => financialYears.find((fy) => fy.isCurrent),
    [financialYears]
  )

  // Filtered list
  const filteredList = useMemo(() => {
    return financialYears.filter((fy) => {
      // Tab filter
      if (activeTab === "ACTIVE" && !fy.isCurrent) return false
      if (activeTab === "LOCKED" && !fy.isLocked) return false
      if (activeTab === "CLOSED" && !fy.isClosed) return false

      // Search filter
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase()
        const matchName = fy.name.toLowerCase().includes(q)
        const matchYear =
          String(fy.startYear).includes(q) || String(fy.endYear).includes(q)
        const matchAuditor = fy.lockedBy?.toLowerCase().includes(q)
        if (!matchName && !matchYear && !matchAuditor) return false
      }

      return true
    })
  }, [financialYears, activeTab, searchQuery])

  // Counts
  const totalCount = financialYears.length
  const lockedCount = financialYears.filter((fy) => fy.isLocked).length
  const closedCount = financialYears.filter((fy) => fy.isClosed).length

  const formatDate = (isoString: string) => {
    try {
      return formatFinancialYearDate(isoString)
    } catch {
      return isoString.slice(0, 10)
    }
  }

  const handleSetCurrent = (fy: FinancialYearItem) => {
    setActionMessage(null)
    startTransition(async () => {
      const res = await setCurrentFinancialYear(societyCode, fy.id)
      if (res.error) {
        toast.error(res.error)
        setActionMessage({ text: res.error, type: "error" })
      } else {
        toast.success(`Active financial year changed to ${fy.name}`)
        setActionMessage({ text: `Active financial year changed to ${fy.name}.`, type: "success" })
      }
    })
  }

  const handleToggleClosure = (fy: FinancialYearItem) => {
    setActionMessage(null)
    startTransition(async () => {
      const res = await toggleYearClosure(societyCode, fy.id, !fy.isClosed)
      if (res.error) {
        toast.error(res.error)
        setActionMessage({ text: res.error, type: "error" })
      } else {
        toast.success(fy.isClosed ? `Reopened ${fy.name}` : `Closed ${fy.name}`)
        setActionMessage({
          text: fy.isClosed ? `Reopened ${fy.name}.` : `Closed ${fy.name}.`,
          type: "success",
        })
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Action Notification Banner */}
      {actionMessage && (
        <div
          className={`flex items-center justify-between rounded-2xl p-4 text-xs font-medium ${
            actionMessage.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border border-rose-200 bg-rose-50 text-rose-900"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === "success" ? (
              <svg className="h-4 w-4 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="h-4 w-4 text-rose-600" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="text-stone-400 hover:text-stone-700"
          >
            ✕
          </button>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Active Current FY Card */}
        <div className="relative overflow-hidden rounded-3xl border border-stone-200 bg-linear-to-br from-stone-900 via-stone-800 to-stone-950 p-5 text-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
              Active Financial Year
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold tracking-tight">
              {currentFY ? currentFY.name : "None Active"}
            </h3>
            <p className="mt-1 text-xs text-stone-300">
              {currentFY
                ? `${formatDate(currentFY.startDate)} — ${formatDate(currentFY.endDate)}`
                : "Configure and set an active year"}
            </p>
          </div>
          {currentFY && (
            <div className="mt-4 flex items-center gap-2 border-t border-stone-700/60 pt-3 text-[11px] text-stone-400">
              <span>{currentFY.journalCount} journal entries</span>
              <span>•</span>
              <span>{currentFY.budgetCount} budgets</span>
            </div>
          )}
        </div>

        <AdminStatCard
          title="Total Configured Years"
          value={totalCount}
          subtitle="Accounting cycles on record"
          icon={
            <svg className="h-5 w-5 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Audit Frozen (Locked)"
          value={lockedCount}
          subtitle="Protected against retrospective edits"
          icon={
            <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Closed Years"
          value={closedCount}
          subtitle="Statutory year-end completed"
          icon={
            <svg className="h-5 w-5 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          }
        />
      </div>

      {/* Main List Section */}
      <AdminCard
        title="Financial Years & Accounting Periods"
        description={`Manage operational accounting cycles, set active billing periods, and freeze audited books for ${societyName}.`}
        action={
          canManage ? (
            <button
              type="button"
              onClick={() => {
                setSelectedFY(null)
                setIsModalOpen(true)
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
              Add Financial Year
            </button>
          ) : undefined
        }
      >
        {/* Controls: Search and Tabs */}
        <div className="flex flex-col gap-3 border-b border-stone-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Tabs */}
          <div className="flex items-center gap-1 rounded-2xl bg-stone-100 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("ALL")}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === "ALL"
                  ? "bg-white text-stone-900 shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              All ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("ACTIVE")}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === "ACTIVE"
                  ? "bg-white text-stone-900 shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("LOCKED")}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === "LOCKED"
                  ? "bg-white text-stone-900 shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Frozen / Locked ({lockedCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("CLOSED")}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === "CLOSED"
                  ? "bg-white text-stone-900 shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Closed ({closedCount})
            </button>
          </div>

          {/* Search */}
          <div className="w-full sm:w-64">
            <AdminSearchBar
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery("")}
              placeholder="Search by year or name..."
            />
          </div>
        </div>

        {/* Empty State */}
        {filteredList.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-400">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="mt-3 text-sm font-semibold text-stone-900">No financial years found</h3>
            <p className="mt-1 text-xs text-stone-500">
              {searchQuery
                ? `No financial years matched "${searchQuery}".`
                : "No financial years configured in this category."}
            </p>
            {canManage && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFY(null)
                    setIsModalOpen(true)
                  }}
                  className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
                >
                  Create New Financial Year
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Table of Financial Years */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-100 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                  <th className="py-3.5 pr-4 pl-1">Financial Year</th>
                  <th className="px-4 py-3.5">Period Dates</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Audit Governance</th>
                  <th className="px-4 py-3.5 text-center">Activity</th>
                  <th className="py-3.5 pr-1 pl-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredList.map((fy) => (
                  <tr
                    key={fy.id}
                    className={`hover:bg-stone-50/70 transition-colors ${
                      fy.isCurrent ? "bg-amber-50/20" : ""
                    }`}
                  >
                    {/* Name & Start/End Year */}
                    <td className="py-4 pr-4 pl-1">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold ${
                            fy.isCurrent
                              ? "bg-amber-100 text-amber-800 font-bold"
                              : "bg-stone-100 text-stone-600"
                          }`}
                        >
                          {fy.startYear.toString().slice(-2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-stone-950 text-sm">
                              {fy.name}
                            </span>
                            {fy.isCurrent && (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-stone-500">
                            Calendar Cycle: {fy.startYear} – {fy.endYear}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Period Dates */}
                    <td className="px-4 py-4">
                      <div className="font-medium text-stone-900">
                        {formatDate(fy.startDate)} — {formatDate(fy.endDate)}
                      </div>
                      <span className="text-[10px] text-stone-400">
                        Indian Financial Year
                      </span>
                    </td>

                    {/* Status Badges */}
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {fy.isClosed ? (
                          <AdminBadge variant="danger">CLOSED</AdminBadge>
                        ) : (
                          <AdminBadge variant="success">OPEN</AdminBadge>
                        )}

                        {fy.isLocked && (
                          <AdminBadge variant="warning">
                            <span className="flex items-center gap-1">
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                              AUDIT FROZEN
                            </span>
                          </AdminBadge>
                        )}
                      </div>
                    </td>

                    {/* Audit Governance */}
                    <td className="px-4 py-4">
                      {fy.isLocked ? (
                        <div>
                          <div className="font-medium text-amber-900">
                            Locked by {fy.lockedBy || "Auditor"}
                          </div>
                          {fy.lockedAt && (
                            <span className="text-[10px] text-stone-500">
                              On {formatDate(fy.lockedAt)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-stone-500">
                          Edits and postings permitted
                        </span>
                      )}
                    </td>

                    {/* Linked Activity Count */}
                    <td className="px-4 py-4 text-center">
                      <div className="inline-flex items-center gap-2 rounded-xl bg-stone-50 px-2.5 py-1 text-[11px] text-stone-600 border border-stone-100">
                        <span><strong>{fy.journalCount}</strong> Journals</span>
                        <span>•</span>
                        <span><strong>{fy.budgetCount}</strong> Budgets</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-4 pr-1 pl-4 text-right">
                      {canManage ? (
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Set Active Button */}
                          {!fy.isCurrent && (
                            <button
                              type="button"
                              onClick={() => handleSetCurrent(fy)}
                              disabled={isPending}
                              title="Set as the active financial year"
                              className="rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-stone-700 hover:bg-stone-100 hover:text-stone-900 transition disabled:opacity-50"
                            >
                              Set Active
                            </button>
                          )}

                          {/* Audit Freeze / Unfreeze Toggle */}
                          <button
                            type="button"
                            onClick={() => {
                              setLockTargetFY(fy)
                              setIsLockModalOpen(true)
                            }}
                            title={fy.isLocked ? "Unfreeze period for edits" : "Freeze period for statutory audit"}
                            className={`rounded-xl p-1.5 transition ${
                              fy.isLocked
                                ? "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                                : "border border-stone-200 bg-white text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                            }`}
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              {fy.isLocked ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                              )}
                            </svg>
                          </button>

                          {/* Close / Reopen Toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggleClosure(fy)}
                            disabled={isPending}
                            title={fy.isClosed ? "Reopen financial year" : "Close financial year"}
                            className={`rounded-xl px-2 py-1.5 text-[11px] font-semibold transition ${
                              fy.isClosed
                                ? "text-stone-600 hover:bg-stone-100"
                                : "text-stone-500 hover:bg-stone-100 hover:text-stone-800"
                            }`}
                          >
                            {fy.isClosed ? "Reopen" : "Close"}
                          </button>

                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFY(fy)
                              setIsModalOpen(true)
                            }}
                            disabled={fy.isLocked}
                            title={fy.isLocked ? "Cannot edit locked period" : "Edit dates/name"}
                            className="rounded-xl border border-stone-200 bg-white p-1.5 text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition disabled:opacity-40"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteTargetFY(fy)
                              setIsDeleteOpen(true)
                            }}
                            disabled={
                              fy.isCurrent ||
                              fy.journalCount > 0 ||
                              fy.budgetCount > 0 ||
                              fy.registerCount > 0
                            }
                            title={
                              fy.isCurrent
                                ? "Active year cannot be deleted"
                                : fy.journalCount > 0
                                ? "Linked records exist"
                                : "Delete financial year"
                            }
                            className="rounded-xl border border-stone-200 bg-white p-1.5 text-stone-400 hover:bg-rose-50 hover:text-rose-600 transition disabled:opacity-30"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-stone-400">View Only</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>

      {/* Modals & Dialogs */}
      <FinancialYearModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedFY(null)
        }}
        societyCode={societyCode}
        financialYear={selectedFY}
      />

      <AuditLockModal
        isOpen={isLockModalOpen}
        onClose={() => {
          setIsLockModalOpen(false)
          setLockTargetFY(null)
        }}
        societyCode={societyCode}
        financialYear={lockTargetFY}
      />

      <FinancialYearDeleteDialog
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false)
          setDeleteTargetFY(null)
        }}
        societyCode={societyCode}
        financialYear={deleteTargetFY}
      />
    </div>
  )
}
