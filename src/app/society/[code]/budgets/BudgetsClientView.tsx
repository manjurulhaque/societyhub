"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  AdminCard,
  AdminStatCard,
  AdminSearchBar,
  AdminBadge,
  AdminButton,
  AdminAlert,
} from "@/components/admin"
import { BudgetModal } from "./BudgetModal"
import { BudgetDeleteDialog, type BudgetDeleteTarget } from "./BudgetDeleteDialog"

export interface BudgetItemView {
  id: string
  ledgerId: string
  ledgerName: string
  ledgerCode: string | null
  ledgerGroup: string
  allocatedAmount: number
  actualUtilizedAmount: number
  remainingBalance: number
  utilizationRate: number
  varianceStatus: "WITHIN_BUDGET" | "APPROACHING_LIMIT" | "EXCEEDED_BUDGET"
}

export interface BudgetView {
  id: string
  name: string
  financialYearId: string
  financialYearName: string
  financialYearStartYear: number
  isCurrentFY: boolean
  isLocked: boolean
  totalAllocated: number
  totalUtilized: number
  remainingTotal: number
  utilizationRate: number
  overBudgetCount: number
  createdAt: string
  items: BudgetItemView[]
}

interface BudgetsClientViewProps {
  societyCode: string
  societyName: string
  budgets: BudgetView[]
  financialYears: {
    id: string
    name: string
    isCurrent: boolean
    isLocked: boolean
  }[]
  ledgers: {
    id: string
    name: string
    code: string | null
    group: string
  }[]
  canManage: boolean
}

type StatusFilter = "ALL" | "WITHIN" | "WARNING" | "OVER"

export function BudgetsClientView({
  societyCode,
  societyName,
  budgets,
  financialYears,
  ledgers,
  canManage,
}: BudgetsClientViewProps) {
  const [selectedFYId, setSelectedFYId] = useState<string>("ALL")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [expandedBudgetIds, setExpandedBudgetIds] = useState<Record<string, boolean>>(() => {
    // Expand the current or first budget by default
    const init: Record<string, boolean> = {}
    const current = budgets.find((b) => b.isCurrentFY) || budgets[0]
    if (current) init[current.id] = true
    return init
  })

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<BudgetView | null>(null)
  const [deletingBudget, setDeletingBudget] = useState<BudgetDeleteTarget | null>(null)
  const [actionMessage, setActionMessage] = useState<{ text: string; type: "success" | "danger" } | null>(null)

  // Toggle expansion of a budget card
  const toggleExpand = (id: string) => {
    setExpandedBudgetIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // Filtered Budgets
  const filteredBudgets = useMemo(() => {
    return budgets.filter((b) => {
      // FY Filter
      if (selectedFYId !== "ALL" && b.financialYearId !== selectedFYId) {
        return false
      }

      // Status Filter
      if (statusFilter === "OVER" && b.overBudgetCount === 0) return false
      if (statusFilter === "WARNING" && !b.items.some((i) => i.varianceStatus === "APPROACHING_LIMIT")) return false
      if (statusFilter === "WITHIN" && b.overBudgetCount > 0) return false

      // Search Query
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase()
        const matchName = b.name.toLowerCase().includes(q)
        const matchFY = b.financialYearName.toLowerCase().includes(q)
        const matchLedger = b.items.some(
          (item) =>
            item.ledgerName.toLowerCase().includes(q) ||
            (item.ledgerCode && item.ledgerCode.toLowerCase().includes(q))
        )
        if (!matchName && !matchFY && !matchLedger) return false
      }

      return true
    })
  }, [budgets, selectedFYId, statusFilter, searchQuery])

  // Summary Metrics for the current filter scope
  const { totalAllocatedSum, totalUtilizedSum, totalOverBudgetHeads } = useMemo(() => {
    let allocated = 0
    let utilized = 0
    let overCount = 0

    for (const b of filteredBudgets) {
      allocated += b.totalAllocated
      utilized += b.totalUtilized
      overCount += b.overBudgetCount
    }

    return {
      totalAllocatedSum: allocated,
      totalUtilizedSum: utilized,
      totalOverBudgetHeads: overCount,
    }
  }, [filteredBudgets])

  const overallRate = totalAllocatedSum > 0 ? (totalUtilizedSum / totalAllocatedSum) * 100 : 0

  const formatCurrency = (val: number) => {
    return `₹${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {actionMessage && (
        <AdminAlert
          variant={actionMessage.type}
        >
          {actionMessage.text}
        </AdminAlert>
      )}

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-stone-950 sm:text-3xl">
              Budgets & Planning
            </h1>
            <AdminBadge variant="neutral" size="sm">
              {budgets.length} {budgets.length === 1 ? "Plan" : "Plans"}
            </AdminBadge>
          </div>
          <p className="mt-1 text-sm text-stone-500">
            Manage AGM-approved annual budget caps and track expenditure variance for {societyName}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href={`/society/${societyCode}/reports`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 shadow-xs hover:border-stone-400 hover:bg-stone-50 transition"
          >
            <svg className="h-4 w-4 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Variance Report ↗
          </Link>

          {canManage && (
            <AdminButton
              variant="primary"
              onClick={() => setIsCreateOpen(true)}
              className="shadow-xs"
            >
              <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              Create Budget Plan
            </AdminButton>
          )}
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          title="Total Budget Allocated"
          value={formatCurrency(totalAllocatedSum)}
          subtitle={`${filteredBudgets.length} budget plan(s)`}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Actual Utilized Expenditure"
          value={formatCurrency(totalUtilizedSum)}
          subtitle="Posted ledger disbursements"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Overall Budget Utilization"
          value={`${overallRate.toFixed(1)}%`}
          subtitle={
            overallRate > 100
              ? "Exceeded budget limit"
              : overallRate >= 85
              ? "Nearing approved allocation"
              : "Healthy spending pace"
          }
          trend={{
            value: `${overallRate.toFixed(1)}%`,
            direction: overallRate > 100 ? "down" : overallRate >= 85 ? "neutral" : "up",
            label: overallRate > 100 ? "Over Budget" : overallRate >= 85 ? "Near Limit" : "On Track",
          }}
        />

        <AdminStatCard
          title="Exceeded Account Heads"
          value={totalOverBudgetHeads}
          subtitle={
            totalOverBudgetHeads > 0
              ? "Require committee review / reallocation"
              : "All ledger heads within budget caps"
          }
          icon={
            <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />
      </div>

      {/* Filter and Search Bar */}
      <AdminCard className="p-4 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* FY Filter Dropdown */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Financial Year:
            </span>
            <select
              value={selectedFYId}
              onChange={(e) => setSelectedFYId(e.target.value)}
              className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-800 focus:border-stone-900 focus:outline-hidden"
            >
              <option value="ALL">All Financial Years ({financialYears.length})</option>
              {financialYears.map((fy) => (
                <option key={fy.id} value={fy.id}>
                  {fy.name} {fy.isCurrent ? "⭐ (Current)" : ""} {fy.isLocked ? "🔒 [Frozen]" : ""}
                </option>
              ))}
            </select>

            {/* Status Filter Badges */}
            <div className="flex items-center gap-1 pl-2 border-l border-stone-200">
              {(
                [
                  { id: "ALL", label: "All Heads" },
                  { id: "WITHIN", label: "On Track" },
                  { id: "WARNING", label: "Near Cap (≥85%)" },
                  { id: "OVER", label: "Over Budget" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                    statusFilter === tab.id
                      ? "bg-stone-900 text-white font-semibold"
                      : "text-stone-600 hover:bg-stone-100"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Input */}
          <div className="w-full lg:w-72">
            <AdminSearchBar
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery("")}
              placeholder="Search budget or ledger head..."
            />
          </div>
        </div>
      </AdminCard>

      {/* Budget Plans List */}
      {filteredBudgets.length === 0 ? (
        <AdminCard className="p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-stone-100 text-stone-400">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
            </svg>
          </div>
          <h3 className="mt-4 text-base font-bold text-stone-900">
            {budgets.length === 0 ? "No budget plans created yet" : "No matching budget plans found"}
          </h3>
          <p className="mt-1 text-xs text-stone-500 max-w-md mx-auto">
            {budgets.length === 0
              ? "Establish AGM-approved budget ceilings for common electricity, security, housekeeping, and capital repairs."
              : "Try clearing your search query or selecting a different Financial Year filter."}
          </p>
          {canManage && budgets.length === 0 && (
            <div className="mt-6">
              <AdminButton variant="primary" onClick={() => setIsCreateOpen(true)}>
                Create First Budget Plan
              </AdminButton>
            </div>
          )}
        </AdminCard>
      ) : (
        <div className="space-y-4">
          {filteredBudgets.map((budget) => {
            const isExpanded = Boolean(expandedBudgetIds[budget.id])
            const rate = budget.utilizationRate

            return (
              <AdminCard key={budget.id} className="overflow-hidden border border-stone-200/90 shadow-xs">
                {/* Budget Header Card */}
                <div className="p-5 bg-gradient-to-r from-white via-stone-50/40 to-stone-100/30">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-bold text-stone-950 tracking-tight">
                          {budget.name}
                        </h2>
                        <AdminBadge variant={budget.isCurrentFY ? "info" : "neutral"} size="sm">
                          {budget.financialYearName}
                        </AdminBadge>
                        {budget.isCurrentFY && (
                          <AdminBadge variant="success" size="sm">
                            Active FY
                          </AdminBadge>
                        )}
                        {budget.isLocked && (
                          <AdminBadge variant="warning" size="sm">
                            🔒 Frozen
                          </AdminBadge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-stone-500">
                        <span>
                          <strong>{budget.items.length}</strong> allocated heads
                        </span>
                        <span>•</span>
                        <span>
                          Total Cap: <strong className="text-stone-900 font-mono">{formatCurrency(budget.totalAllocated)}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Utilized: <strong className={`font-mono ${budget.totalUtilized > budget.totalAllocated ? "text-red-600" : "text-stone-900"}`}>{formatCurrency(budget.totalUtilized)}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Progress Gauge & Action Buttons */}
                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <div className="text-right">
                        <span className="text-xs font-semibold text-stone-500 block">
                          Utilization
                        </span>
                        <span
                          className={`text-base font-extrabold font-mono ${
                            rate > 100
                              ? "text-red-600"
                              : rate >= 85
                              ? "text-amber-600"
                              : "text-emerald-600"
                          }`}
                        >
                          {rate.toFixed(1)}%
                        </span>
                      </div>

                      {/* Expand / Collapse Button */}
                      <button
                        onClick={() => toggleExpand(budget.id)}
                        className="inline-flex items-center gap-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
                        title={isExpanded ? "Collapse Line Items" : "Expand Line Items"}
                      >
                        <span>{isExpanded ? "Hide Heads" : "View Heads"}</span>
                        <svg
                          className={`h-4 w-4 text-stone-400 transition-transform duration-200 ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {/* Edit / Delete Actions */}
                      {canManage && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingBudget(budget)}
                            disabled={budget.isLocked}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-600 hover:border-stone-400 hover:text-stone-900 disabled:opacity-40 disabled:hover:border-stone-200 transition"
                            title={budget.isLocked ? "Cannot edit a locked financial year budget" : "Edit budget allocations"}
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>

                          <button
                            onClick={() =>
                              setDeletingBudget({
                                id: budget.id,
                                name: budget.name,
                                financialYearName: budget.financialYearName,
                                isLocked: budget.isLocked,
                                itemCount: budget.items.length,
                              })
                            }
                            disabled={budget.isLocked}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-400 hover:border-red-300 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:hover:border-stone-200 disabled:hover:bg-white disabled:hover:text-stone-400 transition"
                            title={budget.isLocked ? "Cannot delete a locked financial year budget" : "Delete budget"}
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Visual Overall Budget Bar */}
                  <div className="mt-3">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-stone-200/80">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          rate > 100
                            ? "bg-red-500"
                            : rate >= 85
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.min(rate, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Collapsible Line Items Table */}
                {isExpanded && (
                  <div className="border-t border-stone-200 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-stone-100/90 text-[11px] font-bold uppercase tracking-wider text-stone-600">
                        <tr>
                          <th className="px-5 py-3">Account Head / Ledger</th>
                          <th className="px-5 py-3">Group</th>
                          <th className="px-5 py-3 text-right">Allocated Cap</th>
                          <th className="px-5 py-3 text-right">Actual Spent</th>
                          <th className="px-5 py-3 text-right">Remaining</th>
                          <th className="px-5 py-3 w-40 text-center">Utilization</th>
                          <th className="px-5 py-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200 bg-white">
                        {budget.items.map((item) => {
                          const itemRate = item.utilizationRate
                          return (
                            <tr key={item.id} className="hover:bg-stone-50/70 transition-colors">
                              <td className="px-5 py-3.5 font-medium text-stone-950">
                                <div className="flex items-center gap-2">
                                  {item.ledgerCode ? (
                                    <span className="font-mono text-[10px] font-bold text-stone-500 bg-stone-100 rounded px-1.5 py-0.5">
                                      {item.ledgerCode}
                                    </span>
                                  ) : null}
                                  <span>{item.ledgerName}</span>
                                </div>
                              </td>

                              <td className="px-5 py-3.5">
                                <span className="inline-flex rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-600">
                                  {item.ledgerGroup}
                                </span>
                              </td>

                              <td className="px-5 py-3.5 text-right font-mono font-semibold text-stone-900">
                                {formatCurrency(item.allocatedAmount)}
                              </td>

                              <td className="px-5 py-3.5 text-right font-mono font-semibold text-stone-900">
                                {formatCurrency(item.actualUtilizedAmount)}
                              </td>

                              <td className="px-5 py-3.5 text-right font-mono">
                                <span
                                  className={`font-semibold ${
                                    item.remainingBalance < 0
                                      ? "text-red-600"
                                      : "text-stone-700"
                                  }`}
                                >
                                  {item.remainingBalance < 0
                                    ? `- ${formatCurrency(Math.abs(item.remainingBalance))}`
                                    : formatCurrency(item.remainingBalance)}
                                </span>
                              </td>

                              <td className="px-5 py-3.5">
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-[10px] font-bold text-stone-500">
                                    <span>{itemRate.toFixed(1)}%</span>
                                  </div>
                                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                                    <div
                                      className={`h-full rounded-full transition-all ${
                                        itemRate > 100
                                          ? "bg-red-500"
                                          : itemRate >= 85
                                          ? "bg-amber-500"
                                          : "bg-emerald-500"
                                      }`}
                                      style={{ width: `${Math.min(itemRate, 100)}%` }}
                                    />
                                  </div>
                                </div>
                              </td>

                              <td className="px-5 py-3.5 text-center">
                                {item.varianceStatus === "EXCEEDED_BUDGET" ? (
                                  <AdminBadge variant="danger" size="sm" dot>
                                    Over Budget
                                  </AdminBadge>
                                ) : item.varianceStatus === "APPROACHING_LIMIT" ? (
                                  <AdminBadge variant="warning" size="sm" dot>
                                    Nearing Cap
                                  </AdminBadge>
                                ) : (
                                  <AdminBadge variant="success" size="sm" dot>
                                    On Track
                                  </AdminBadge>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </AdminCard>
            )
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {(isCreateOpen || editingBudget) && (
        <BudgetModal
          isOpen={isCreateOpen || Boolean(editingBudget)}
          onClose={() => {
            setIsCreateOpen(false)
            setEditingBudget(null)
          }}
          societyCode={societyCode}
          budget={editingBudget}
          financialYears={financialYears}
          ledgers={ledgers}
          onSuccess={(msg) => setActionMessage({ text: msg, type: "success" })}
        />
      )}

      {/* Delete Dialog */}
      {deletingBudget && (
        <BudgetDeleteDialog
          isOpen={Boolean(deletingBudget)}
          onClose={() => setDeletingBudget(null)}
          societyCode={societyCode}
          budget={deletingBudget}
          onSuccess={(msg) => setActionMessage({ text: msg, type: "success" })}
        />
      )}
    </div>
  )
}
