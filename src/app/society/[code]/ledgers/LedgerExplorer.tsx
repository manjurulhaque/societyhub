"use client"

import React, { useState, useMemo } from "react"

export interface LedgerItem {
  id: string
  name: string
  code: string | null
  group: "ASSET" | "LIABILITY" | "INCOME" | "EXPENSE" | "EQUITY"
  description: string | null
  balanceType: "DEBIT" | "CREDIT"
  openingBalance: number
  isSystem: boolean
  parentLedger: { name: string; code: string | null } | null
}

interface LedgerExplorerProps {
  ledgers: LedgerItem[]
}

const GROUP_CONFIG = {
  INCOME: {
    label: "Income Heads (Revenue)",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    headerBg: "bg-emerald-50/60 border-emerald-100",
    accent: "text-emerald-700",
  },
  EXPENSE: {
    label: "Expense Heads (Expenditures)",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
    headerBg: "bg-rose-50/60 border-rose-100",
    accent: "text-rose-700",
  },
  ASSET: {
    label: "Assets (Liquid, Deposits & Fixed)",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    headerBg: "bg-blue-50/60 border-blue-100",
    accent: "text-blue-700",
  },
  LIABILITY: {
    label: "Liabilities & Caution Deposits",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    headerBg: "bg-purple-50/60 border-purple-100",
    accent: "text-purple-700",
  },
  EQUITY: {
    label: "Equity & Capital Reserves",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    headerBg: "bg-amber-50/60 border-amber-100",
    accent: "text-amber-700",
  },
}

export function LedgerExplorer({ ledgers }: LedgerExplorerProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedGroup, setSelectedGroup] = useState<string>("ALL")
  const [typeFilter, setTypeFilter] = useState<"ALL" | "STANDARD" | "CUSTOM">("ALL")

  const filteredLedgers = useMemo(() => {
    return ledgers.filter((l) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.code && l.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (l.description && l.description.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesGroup = selectedGroup === "ALL" || l.group === selectedGroup

      const matchesType =
        typeFilter === "ALL" ||
        (typeFilter === "STANDARD" && l.isSystem) ||
        (typeFilter === "CUSTOM" && !l.isSystem)

      return matchesSearch && matchesGroup && matchesType
    })
  }, [ledgers, searchQuery, selectedGroup, typeFilter])

  const groups: Array<"INCOME" | "EXPENSE" | "ASSET" | "LIABILITY" | "EQUITY"> = [
    "INCOME",
    "EXPENSE",
    "ASSET",
    "LIABILITY",
    "EQUITY",
  ]

  const activeGroups = groups.filter((g) => {
    if (selectedGroup !== "ALL" && selectedGroup !== g) return false
    return filteredLedgers.some((l) => l.group === g)
  })

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ledgers by code, name, or description (e.g. 1110, Lift, GST, Solar)..."
            className="w-full rounded-xl border border-stone-200 bg-stone-50/50 py-2 pl-9 pr-4 text-xs text-stone-900 outline-none transition focus:border-stone-950 focus:bg-white focus:ring-1 focus:ring-stone-950"
          />
          <svg
            className="absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Group Filter Tabs */}
          <div className="flex rounded-xl bg-stone-100 p-1 text-[11px] font-semibold text-stone-600">
            <button
              type="button"
              onClick={() => setSelectedGroup("ALL")}
              className={`rounded-lg px-2.5 py-1 transition ${
                selectedGroup === "ALL"
                  ? "bg-white text-stone-950 shadow-xs font-bold"
                  : "hover:text-stone-950"
              }`}
            >
              All ({ledgers.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedGroup("INCOME")}
              className={`rounded-lg px-2.5 py-1 transition ${
                selectedGroup === "INCOME"
                  ? "bg-emerald-600 text-white shadow-xs font-bold"
                  : "hover:text-emerald-700"
              }`}
            >
              Income
            </button>
            <button
              type="button"
              onClick={() => setSelectedGroup("EXPENSE")}
              className={`rounded-lg px-2.5 py-1 transition ${
                selectedGroup === "EXPENSE"
                  ? "bg-rose-600 text-white shadow-xs font-bold"
                  : "hover:text-rose-700"
              }`}
            >
              Expenses
            </button>
            <button
              type="button"
              onClick={() => setSelectedGroup("ASSET")}
              className={`rounded-lg px-2.5 py-1 transition ${
                selectedGroup === "ASSET"
                  ? "bg-blue-600 text-white shadow-xs font-bold"
                  : "hover:text-blue-700"
              }`}
            >
              Assets
            </button>
            <button
              type="button"
              onClick={() => setSelectedGroup("LIABILITY")}
              className={`rounded-lg px-2.5 py-1 transition ${
                selectedGroup === "LIABILITY"
                  ? "bg-purple-600 text-white shadow-xs font-bold"
                  : "hover:text-purple-700"
              }`}
            >
              Liabilities
            </button>
            <button
              type="button"
              onClick={() => setSelectedGroup("EQUITY")}
              className={`rounded-lg px-2.5 py-1 transition ${
                selectedGroup === "EQUITY"
                  ? "bg-amber-600 text-white shadow-xs font-bold"
                  : "hover:text-amber-700"
              }`}
            >
              Equity
            </button>
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-[11px] font-semibold text-stone-700 outline-none focus:border-stone-950 focus:bg-white"
          >
            <option value="ALL">All Types</option>
            <option value="STANDARD">Standard Seeded</option>
            <option value="CUSTOM">Custom Created</option>
          </select>
        </div>
      </div>

      {/* Results Count Banner if filtering */}
      {(searchQuery.trim() !== "" || selectedGroup !== "ALL" || typeFilter !== "ALL") && (
        <div className="flex items-center justify-between text-xs text-stone-500 px-1">
          <p>
            Showing <span className="font-bold text-stone-900">{filteredLedgers.length}</span> of{" "}
            <span className="font-bold text-stone-900">{ledgers.length}</span> ledgers
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("")
              setSelectedGroup("ALL")
              setTypeFilter("ALL")
            }}
            className="text-[11px] font-semibold text-blue-600 hover:underline"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Group Tables */}
      {activeGroups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-12 text-center">
          <p className="text-sm font-semibold text-stone-700">No ledgers match your filter</p>
          <p className="mt-1 text-xs text-stone-400">
            Try adjusting your search keyword or selected category tab.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {activeGroups.map((groupKey) => {
            const groupLedgers = filteredLedgers.filter((l) => l.group === groupKey)
            const config = GROUP_CONFIG[groupKey]

            return (
              <div
                key={groupKey}
                className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
              >
                <div
                  className={`flex items-center justify-between border-b px-6 py-3.5 ${config.headerBg}`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        groupKey === "INCOME"
                          ? "bg-emerald-500"
                          : groupKey === "EXPENSE"
                          ? "bg-rose-500"
                          : groupKey === "ASSET"
                          ? "bg-blue-500"
                          : groupKey === "LIABILITY"
                          ? "bg-purple-500"
                          : "bg-amber-500"
                      }`}
                    />
                    <h3 className="text-sm font-bold text-stone-950">{config.label}</h3>
                  </div>
                  <span className="rounded-full bg-white/80 px-2.5 py-0.5 text-[11px] font-bold text-stone-700 border border-stone-200/60">
                    {groupLedgers.length} ledgers
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-xs">
                    <thead className="border-b border-stone-100 bg-stone-50/50 text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                      <tr>
                        <th className="px-4 py-2.5">Code</th>
                        <th className="px-4 py-2.5">Ledger Name & Description</th>
                        <th className="px-4 py-2.5">Parent Classification</th>
                        <th className="px-4 py-2.5 text-right">Opening Bal.</th>
                        <th className="px-4 py-2.5 text-center">Dr / Cr</th>
                        <th className="px-4 py-2.5 text-center">Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {groupLedgers.map((l) => (
                        <tr key={l.id} className="transition hover:bg-stone-50/60">
                          <td className="px-4 py-3 font-mono text-xs font-bold text-stone-800">
                            {l.code ? (
                              <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-stone-700">
                                {l.code}
                              </span>
                            ) : (
                              <span className="text-stone-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-stone-950">{l.name}</div>
                            {l.description ? (
                              <div className="text-[11px] text-stone-500 mt-0.5">
                                {l.description}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-stone-600">
                            {l.parentLedger ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-700">
                                <span className="text-stone-400">↳</span>
                                {l.parentLedger.code ? `[${l.parentLedger.code}] ` : ""}
                                {l.parentLedger.name}
                              </span>
                            ) : (
                              <span className="rounded-md bg-stone-50 px-2 py-0.5 text-[10px] font-semibold text-stone-400 border border-stone-100">
                                Top-Level Head
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-xs font-medium text-stone-800">
                            {l.openingBalance > 0
                              ? `₹${Number(l.openingBalance).toLocaleString("en-IN")}`
                              : "₹0.00"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`rounded-md px-1.5 py-0.5 text-[10px] font-mono font-bold ${
                                l.balanceType === "DEBIT"
                                  ? "bg-blue-50 text-blue-700"
                                  : "bg-purple-50 text-purple-700"
                              }`}
                            >
                              {l.balanceType}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {l.isSystem ? (
                              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[9px] font-bold tracking-wider text-stone-600">
                                STANDARD
                              </span>
                            ) : (
                              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-bold tracking-wider text-blue-700 border border-blue-200">
                                CUSTOM
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
