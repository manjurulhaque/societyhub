"use client"

import { useState, useTransition } from "react"
import { AdminModal } from "@/components/admin"
import { createMaintenanceRate } from "./actions"
import type { MaintenanceType, UnitType } from "@/generated/prisma/client"

export type BlockOption = {
  id: string
  name: string
}

interface CreateRateModalProps {
  isOpen: boolean
  onClose: () => void
  societyCode: string
  blocks?: BlockOption[]
}

const UNIT_TYPES: UnitType[] = [
  "STUDIO",
  "RK1",
  "BHK1",
  "BHK2",
  "BHK3",
  "BHK4",
  "BHK5",
  "PENTHOUSE",
  "DUPLEX",
  "VILLA",
  "ROW_HOUSE",
  "SHOP",
  "OFFICE",
  "COMMERCIAL",
  "PLOT",
]

export function CreateRateModal({
  isOpen,
  onClose,
  societyCode,
}: CreateRateModalProps) {
  const [maintenanceType, setMaintenanceType] = useState<MaintenanceType>("PER_SQFT")
  const [ratePerSqft, setRatePerSqft] = useState("")
  const [fixedRate, setFixedRate] = useState("")
  const [unitType, setUnitType] = useState("")
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().split("T")[0])
  const [effectiveUpto, setEffectiveUpto] = useState("")
  const [approvedInMeeting, setApprovedInMeeting] = useState("")
  const [remarks, setRemarks] = useState("")

  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const sqftVal = maintenanceType === "PER_SQFT" && ratePerSqft.trim() ? parseFloat(ratePerSqft) : null
    const fixedVal = maintenanceType === "FIXED" && fixedRate.trim() ? parseFloat(fixedRate) : null

    if (maintenanceType === "PER_SQFT" && (!sqftVal || sqftVal <= 0)) {
      setError("Please enter a valid rate per sq.ft.")
      return
    }

    if (maintenanceType === "FIXED" && (!fixedVal || fixedVal <= 0)) {
      setError("Please enter a valid fixed rate.")
      return
    }

    startTransition(async () => {
      try {
        const res = await createMaintenanceRate(societyCode, {
          maintenanceType,
          ratePerSqft: sqftVal,
          fixedRate: fixedVal,
          unitType: unitType ? (unitType as UnitType) : null,
          effectiveFrom,
          effectiveUpto: effectiveUpto || null,
          approvedInMeeting: approvedInMeeting || null,
          remarks: remarks || null,
        })

        if (res.error) {
          setError(res.error)
        } else {
          onClose()
          setRatePerSqft("")
          setFixedRate("")
          setUnitType("")
          setEffectiveUpto("")
          setApprovedInMeeting("")
          setRemarks("")
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to save tariff rule."
        setError(msg)
      }
    })
  }

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title="Configure Maintenance Tariff Rule"
      description="Define standard monthly maintenance billing rates per sq.ft or fixed charge."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Rate Type */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Billing Rate Formula *</label>
            <select
              value={maintenanceType}
              onChange={(e) => setMaintenanceType(e.target.value as MaintenanceType)}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none font-semibold"
            >
              <option value="PER_SQFT">Rate per Sq. Ft. of Carpet Area (₹/sqft)</option>
              <option value="FIXED">Fixed Equal Rate per Unit (₹/flat)</option>
              <option value="CUSTOM">Custom Surcharge / Hybrid</option>
            </select>
          </div>

          {/* Rate Amount Inputs */}
          {maintenanceType === "PER_SQFT" ? (
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-stone-700">Rate per Sq. Ft. (₹/sqft/month) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={ratePerSqft}
                onChange={(e) => setRatePerSqft(e.target.value)}
                placeholder="e.g. 3.50"
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none font-mono"
              />
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-stone-700">Fixed Monthly Amount (₹/flat) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={fixedRate}
                onChange={(e) => setFixedRate(e.target.value)}
                placeholder="e.g. 2500"
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none font-mono"
              />
            </div>
          )}

          {/* Target Unit Type Scope */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Target Unit Type Scope</label>
            <select
              value={unitType}
              onChange={(e) => setUnitType(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
            >
              <option value="">All Unit Configurations (Society-Wide)</option>
              {UNIT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t} only
                </option>
              ))}
            </select>
          </div>

          {/* Effective From */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Effective From Date *</label>
            <input
              type="date"
              required
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
            />
          </div>

          {/* Effective Upto */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Effective Upto Date (Optional)</label>
            <input
              type="date"
              value={effectiveUpto}
              onChange={(e) => setEffectiveUpto(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
            />
          </div>

          {/* SGM / AGM Resolution */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">AGM / SGM Resolution Approval</label>
            <input
              type="text"
              value={approvedInMeeting}
              onChange={(e) => setApprovedInMeeting(e.target.value)}
              placeholder="e.g. 14th AGM Resolution No. 3"
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
            />
          </div>

          {/* Remarks */}
          <div className="sm:col-span-2 space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Tariff Notes / Surcharge Scope</label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Applicable to all residential apartments; commercial shops charged separately."
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
            />
          </div>
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
            {isPending ? "Saving..." : "Save Tariff Rule"}
          </button>
        </div>
      </form>
    </AdminModal>
  )
}
