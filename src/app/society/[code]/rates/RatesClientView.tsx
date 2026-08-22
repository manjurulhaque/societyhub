"use client"

import { useState, useMemo, useTransition } from "react"
import { AdminStatCard, AdminBadge, AdminTable } from "@/components/admin"
import { CreateRateModal, type BlockOption } from "./CreateRateModal"
import { deleteMaintenanceRate } from "./actions"
import { formatDateInAppTimeZone } from "@/lib/datetime"
import type { MaintenanceType, UnitType } from "@/generated/prisma/client"

export type MaintenanceRateItem = {
  id: string
  maintenanceType: MaintenanceType
  ratePerSqft: number | null
  fixedRate: number | null
  unitType: UnitType | null
  effectiveFrom: string
  effectiveUpto: string | null
  isCurrent: boolean
  approvedInMeeting: string | null
  remarks: string | null
}

interface RatesClientViewProps {
  societyCode: string
  currencySymbol: string
  rates: MaintenanceRateItem[]
  blocks?: BlockOption[]
  canManage: boolean
}

export function RatesClientView({
  societyCode,
  currencySymbol,
  rates,
  canManage,
}: RatesClientViewProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedType, setSelectedType] = useState<string>("ALL")
  const [isPending, startTransition] = useTransition()

  // Statistics
  const activeRates = rates.filter((r) => r.isCurrent)
  const sqftRates = activeRates.filter((r) => r.maintenanceType === "PER_SQFT")
  const fixedRates = activeRates.filter((r) => r.maintenanceType === "FIXED")

  const filteredRates = useMemo(() => {
    return rates.filter((r) => {
      if (selectedType !== "ALL" && r.maintenanceType !== selectedType) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          (r.remarks || "").toLowerCase().includes(q) ||
          (r.approvedInMeeting || "").toLowerCase().includes(q) ||
          (r.unitType || "").toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [rates, selectedType, searchQuery])

  const handleDelete = (rateId: string) => {
    if (!confirm("Are you sure you want to delete this maintenance tariff rule?")) return
    startTransition(async () => {
      await deleteMaintenanceRate(societyCode, rateId)
    })
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          title="Active Tariff Rules"
          value={activeRates.length}
          subtitle="Currently active rate policies"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Base Carpet Rate"
          value={sqftRates.length > 0 && sqftRates[0].ratePerSqft !== null ? `${currencySymbol}${sqftRates[0].ratePerSqft}/sqft` : "Not Set"}
          subtitle="Pro-rata monthly rate"
          icon={
            <svg className="h-5 w-5 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          }
        />

        <AdminStatCard
          title="Base Fixed Rate"
          value={fixedRates.length > 0 && fixedRates[0].fixedRate !== null ? `${currencySymbol}${fixedRates[0].fixedRate.toLocaleString("en-IN")}` : "Not Set"}
          subtitle="Equal charge per flat"
          icon={
            <svg className="h-5 w-5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Unit Surcharges"
          value={activeRates.filter((r) => r.unitType !== null).length}
          subtitle="Configuration overrides"
          icon={
            <svg className="h-5 w-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tariff rules..."
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

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-700 focus:border-stone-900 focus:outline-none"
          >
            <option value="ALL">All Rate Formulas</option>
            <option value="PER_SQFT">Rate per Sq. Ft.</option>
            <option value="FIXED">Fixed Equal Rate</option>
            <option value="CUSTOM">Custom Formula</option>
          </select>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            <span>+ Add Tariff Rule</span>
          </button>
        )}
      </div>

      {/* Rates Table */}
      {filteredRates.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-200 bg-white p-12 text-center shadow-xs">
          <p className="text-xs text-stone-500">No maintenance tariff rules configured yet.</p>
          {canManage && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                + Define Base Society Maintenance Rate
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs">
          <AdminTable
            headers={[
              "Scope / Target",
              "Billing Formula",
              "Tariff Rate",
              "Effective Validity",
              "Policy Status",
              "AGM Reference / Notes",
              ...(canManage ? ["Action"] : []),
            ]}
            rows={filteredRates.map((r) => (
              <tr key={r.id} className="border-t border-stone-100 text-xs hover:bg-stone-50/60 transition">
                <td className="px-4 py-3.5">
                  <span className="font-bold text-stone-950 block">
                    {r.unitType ? `Unit Config: ${r.unitType}` : "Society-Wide (All Units)"}
                  </span>
                </td>

                <td className="px-4 py-3.5">
                  <AdminBadge
                    variant={
                      r.maintenanceType === "PER_SQFT"
                        ? "info"
                        : r.maintenanceType === "FIXED"
                          ? "purple"
                          : "neutral"
                    }
                    size="sm"
                  >
                    {r.maintenanceType === "PER_SQFT" ? "PER SQ. FT." : r.maintenanceType}
                  </AdminBadge>
                </td>

                <td className="px-4 py-3.5 font-mono font-bold text-stone-950 text-sm">
                  {r.maintenanceType === "PER_SQFT"
                    ? `${currencySymbol}${r.ratePerSqft} / sqft`
                    : `${currencySymbol}${r.fixedRate?.toLocaleString("en-IN")} / flat`}
                </td>

                <td className="px-4 py-3.5 whitespace-nowrap text-stone-700">
                  {formatDateInAppTimeZone(r.effectiveFrom)} {r.effectiveUpto ? `to ${formatDateInAppTimeZone(r.effectiveUpto)}` : "— Current"}
                </td>

                <td className="px-4 py-3.5">
                  <AdminBadge variant={r.isCurrent ? "success" : "neutral"} size="sm" dot>
                    {r.isCurrent ? "CURRENT TARIFF" : "HISTORICAL"}
                  </AdminBadge>
                </td>

                <td className="px-4 py-3.5 text-stone-600 max-w-xs truncate">
                  {r.approvedInMeeting ? `Resolution: ${r.approvedInMeeting}` : r.remarks || "—"}
                </td>

                {canManage && (
                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleDelete(r.id)}
                      className="rounded-lg p-1 text-stone-400 hover:bg-red-50 hover:text-red-600 transition"
                      title="Delete Rule"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </td>
                )}
              </tr>
            ))}
          />
        </div>
      )}

      {/* Create Modal */}
      <CreateRateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        societyCode={societyCode}
      />
    </div>
  )
}
