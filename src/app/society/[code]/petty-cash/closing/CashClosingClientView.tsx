"use client"

import { useState, useMemo, useTransition } from "react"
import Link from "next/link"
import { AdminStatCard, AdminBadge, AdminTable } from "@/components/admin"
import { CashClosingModal } from "./CashClosingModal"
import { formatDateInAppTimeZone } from "@/lib/datetime"

export type CashClosingLogItem = {
  id: string
  closingDate: string
  openingBalance: number
  totalReceipts: number
  totalPayments: number
  calculatedBalance: number
  actualPhysicalCash: number
  difference: number
  verifiedBy: string | null
  notes: string | null
  createdAt: string
}

interface CashClosingClientViewProps {
  societyCode: string
  currencySymbol: string
  currentFloatBalance: number
  closingLogs: CashClosingLogItem[]
  canManage: boolean
}

export function CashClosingClientView({
  societyCode,
  currencySymbol,
  currentFloatBalance,
  closingLogs,
  canManage,
}: CashClosingClientViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // Statistics
  const totalAudits = closingLogs.length
  const lastAudit = closingLogs[0]
  const unreconciledCount = closingLogs.filter(
    (l) => Math.abs(l.difference) >= 0.01
  ).length

  const filteredLogs = useMemo(() => {
    return closingLogs.filter((l) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          (l.notes || "").toLowerCase().includes(q) ||
          (l.verifiedBy || "").toLowerCase().includes(q) ||
          l.closingDate.includes(q)
        )
      }
      return true
    })
  }, [closingLogs, searchQuery])

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={`/society/${societyCode}/petty-cash`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900 transition"
        >
          <span>←</span>
          <span>Back to Petty Cash Book</span>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          title="Current System Float"
          value={`${currencySymbol}${currentFloatBalance.toLocaleString("en-IN")}`}
          subtitle="System recorded cashbook balance"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Last Physical Count"
          value={lastAudit ? `${currencySymbol}${lastAudit.actualPhysicalCash.toLocaleString("en-IN")}` : "No Audits"}
          subtitle={lastAudit ? `As of ${formatDateInAppTimeZone(lastAudit.closingDate)}` : "Pending first cash count"}
          icon={
            <svg className="h-5 w-5 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Verifications Completed"
          value={totalAudits}
          subtitle="Physical cash count sessions"
          icon={
            <svg className="h-5 w-5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          }
        />

        <AdminStatCard
          title="Variances Recorded"
          value={unreconciledCount}
          subtitle="Days with surplus/deficit"
          icon={
            <svg className="h-5 w-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search closing logs..."
            className="w-56 sm:w-64 rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2 pl-9 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none"
          />
          <svg
            className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-stone-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            <span>+ Perform Physical Cash Count</span>
          </button>
        )}
      </div>

      {/* Closing Logs Table */}
      {filteredLogs.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-200 bg-white p-12 text-center shadow-xs">
          <p className="text-xs text-stone-500">No cash count logs recorded yet.</p>
          {canManage && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                + Record First Physical Cash Count
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs">
          <AdminTable
            headers={[
              "Audit Date",
              "Physical Count",
              "System Balance",
              "Variance / Discrepancy",
              "Status",
              "Verified By",
              "Notes & Remarks",
            ]}
            rows={filteredLogs.map((log) => {
              const isMatch = Math.abs(log.difference) < 0.01

              return (
                <tr key={log.id} className="border-t border-stone-100 text-xs hover:bg-stone-50/60 transition">
                  <td className="px-4 py-3.5 font-bold text-stone-950">
                    {formatDateInAppTimeZone(log.closingDate)}
                  </td>

                  <td className="px-4 py-3.5 font-mono font-bold text-stone-900">
                    {currencySymbol}{log.actualPhysicalCash.toLocaleString("en-IN")}
                  </td>

                  <td className="px-4 py-3.5 font-mono font-semibold text-stone-700">
                    {currencySymbol}{log.calculatedBalance.toLocaleString("en-IN")}
                  </td>

                  <td className="px-4 py-3.5 font-mono font-bold">
                    {isMatch ? (
                      <span className="text-emerald-700">₹0.00 Match</span>
                    ) : log.difference > 0 ? (
                      <span className="text-blue-700">+{currencySymbol}{log.difference.toLocaleString("en-IN")} Surplus</span>
                    ) : (
                      <span className="text-red-700">-{currencySymbol}{Math.abs(log.difference).toLocaleString("en-IN")} Deficit</span>
                    )}
                  </td>

                  <td className="px-4 py-3.5">
                    <AdminBadge
                      variant={isMatch ? "success" : "warning"}
                      size="sm"
                      dot
                    >
                      {isMatch ? "VERIFIED MATCH" : "DISCREPANCY"}
                    </AdminBadge>
                  </td>

                  <td className="px-4 py-3.5 text-stone-700 font-medium">
                    {log.verifiedBy || "—"}
                  </td>

                  <td className="px-4 py-3.5 text-stone-600 max-w-xs truncate">
                    {log.notes || "—"}
                  </td>
                </tr>
              )
            })}
          />
        </div>
      )}

      {/* Cash Closing Modal */}
      <CashClosingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        societyCode={societyCode}
        currentFloatBalance={currentFloatBalance}
        currencySymbol={currencySymbol}
      />
    </div>
  )
}
