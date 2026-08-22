"use client"

import { useState, useMemo, useTransition } from "react"
import Link from "next/link"
import { AdminStatCard, AdminBadge, AdminTable } from "@/components/admin"
import { AddAssetModal, type VendorOption } from "./AddAssetModal"
import { AssetCategoriesModal, type AssetCategoryItem } from "./AssetCategoriesModal"
import { updateAssetStatus } from "./actions"
import { formatDateInAppTimeZone } from "@/lib/datetime"

export type FixedAssetListItem = {
  id: string
  name: string
  assetCode: string | null
  location: string | null
  serialNumber: string | null
  purchaseDate: string | null
  purchaseCost: number | null
  currentBookValue: number | null
  warrantyExpiresAt: string | null
  status: string
  categoryId: string
  categoryName: string
  depreciationRate: number | null
  amcVendorId: string | null
  amcVendorName: string | null
  amcStartDate: string | null
  amcEndDate: string | null
  amcAmount: number | null
  serviceLogsCount: number
}

interface AssetsClientViewProps {
  societyCode: string
  currencySymbol: string
  assets: FixedAssetListItem[]
  categories: AssetCategoryItem[]
  vendors: VendorOption[]
  canManageAssets: boolean
  currentDateIso?: string
}

export function AssetsClientView({
  societyCode,
  currencySymbol,
  assets,
  categories,
  vendors,
  canManageAssets,
  currentDateIso = "2026-01-01T00:00:00.000Z",
}: AssetsClientViewProps) {
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [, startTransition] = useTransition()

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategoryId, setSelectedCategoryId] = useState("ALL")
  const [selectedStatus, setSelectedStatus] = useState("ALL")
  const [selectedAmcFilter, setSelectedAmcFilter] = useState("ALL")

  const nowTimestamp = useMemo(() => new Date(currentDateIso).getTime(), [currentDateIso])

  // Calculate statistics
  const totalAssets = assets.length
  const totalCost = assets.reduce((sum, a) => sum + (a.purchaseCost || 0), 0)
  const totalBookValue = assets.reduce((sum, a) => sum + (a.currentBookValue || a.purchaseCost || 0), 0)
  
  const activeAmcCount = assets.filter((a) => {
    if (!a.amcEndDate) return false
    return new Date(a.amcEndDate).getTime() >= nowTimestamp
  }).length

  const expiringWarrantyCount = assets.filter((a) => {
    if (!a.warrantyExpiresAt) return false
    const exp = new Date(a.warrantyExpiresAt)
    const diffDays = Math.ceil((exp.getTime() - nowTimestamp) / (1000 * 60 * 60 * 24))
    return diffDays >= 0 && diffDays <= 60
  }).length

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      if (selectedCategoryId !== "ALL" && asset.categoryId !== selectedCategoryId) return false
      if (selectedStatus !== "ALL" && asset.status !== selectedStatus) return false

      if (selectedAmcFilter === "ACTIVE_AMC") {
        if (!asset.amcEndDate || new Date(asset.amcEndDate).getTime() < nowTimestamp) return false
      } else if (selectedAmcFilter === "EXPIRED_AMC") {
        if (!asset.amcEndDate || new Date(asset.amcEndDate).getTime() >= nowTimestamp) return false
      } else if (selectedAmcFilter === "NO_AMC") {
        if (asset.amcEndDate) return false
      } else if (selectedAmcFilter === "UNDER_WARRANTY") {
        if (!asset.warrantyExpiresAt || new Date(asset.warrantyExpiresAt).getTime() < nowTimestamp) return false
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = asset.name.toLowerCase().includes(q)
        const matchCode = (asset.assetCode || "").toLowerCase().includes(q)
        const matchSerial = (asset.serialNumber || "").toLowerCase().includes(q)
        const matchLoc = (asset.location || "").toLowerCase().includes(q)
        const matchVendor = (asset.amcVendorName || "").toLowerCase().includes(q)
        const matchCat = asset.categoryName.toLowerCase().includes(q)
        return matchName || matchCode || matchSerial || matchLoc || matchVendor || matchCat
      }

      return true
    })
  }, [assets, selectedCategoryId, selectedStatus, selectedAmcFilter, searchQuery, nowTimestamp])

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          title="Total Fixed Assets"
          value={totalAssets}
          subtitle="Machinery & infrastructure items"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />

        <AdminStatCard
          title="Current Book Value"
          value={`${currencySymbol}${totalBookValue.toLocaleString("en-IN")}`}
          subtitle={`Orig. Cost: ${currencySymbol}${totalCost.toLocaleString("en-IN")}`}
          icon={
            <svg className="h-5 w-5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Active AMCs"
          value={activeAmcCount}
          subtitle="Under active maintenance contract"
          icon={
            <svg className="h-5 w-5 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Warranty Status"
          value={expiringWarrantyCount > 0 ? `${expiringWarrantyCount} Expiring` : "All Healthy"}
          subtitle="Warranties expiring within 60 days"
          icon={
            <svg className="h-5 w-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />
      </div>

      {/* Toolbar & Filters */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search asset, tag, serial, vendor..."
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
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-700 focus:border-stone-900 focus:outline-none"
          >
            <option value="ALL">All Categories ({categories.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-700 focus:border-stone-900 focus:outline-none"
          >
            <option value="ALL">All Operational Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="UNDER_MAINTENANCE">UNDER MAINTENANCE</option>
            <option value="DISPOSED">DISPOSED</option>
            <option value="WRITTEN_OFF">WRITTEN OFF</option>
          </select>

          <select
            value={selectedAmcFilter}
            onChange={(e) => setSelectedAmcFilter(e.target.value)}
            className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-700 focus:border-stone-900 focus:outline-none"
          >
            <option value="ALL">All AMC / Warranty</option>
            <option value="ACTIVE_AMC">Active AMC Contract</option>
            <option value="EXPIRED_AMC">Expired AMC</option>
            <option value="UNDER_WARRANTY">Under OEM Warranty</option>
            <option value="NO_AMC">No AMC</option>
          </select>
        </div>

        {canManageAssets && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 shadow-xs hover:bg-stone-50 transition"
            >
              <svg className="h-4 w-4 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span>Asset Categories</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddAssetOpen(true)}
              disabled={categories.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition disabled:opacity-50"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              <span>+ Register Fixed Asset</span>
            </button>
          </div>
        )}
      </div>

      {/* Assets Table */}
      {filteredAssets.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-200 bg-white p-12 text-center shadow-xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-400">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="mt-3 text-sm font-semibold text-stone-900">No fixed assets registered</h3>
          <p className="mt-1 text-xs text-stone-500">
            {categories.length === 0
              ? "Start by adding an Asset Category (e.g. Elevators, DG Sets, Pumps)."
              : "No assets match your search and filter criteria."}
          </p>
          {canManageAssets && categories.length === 0 ? (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition"
              >
                + Create First Category
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <AdminTable
          headers={[
            "Asset Name & Code",
            "Category",
            "Location",
            "Purchase Cost",
            "Book Value",
            "AMC / Service Status",
            "Status",
            "Action",
          ]}
          rows={filteredAssets.map((asset) => {
            const hasAmcActive = asset.amcEndDate ? new Date(asset.amcEndDate).getTime() >= nowTimestamp : false
            const isWarrantyActive = asset.warrantyExpiresAt ? new Date(asset.warrantyExpiresAt).getTime() >= nowTimestamp : false

            return (
              <tr key={asset.id} className="border-t border-stone-100 hover:bg-stone-50/60 transition-colors">
                <td className="px-4 py-3.5">
                  <Link
                    href={`/society/${societyCode}/assets/${asset.id}`}
                    className="font-bold text-stone-950 text-xs hover:text-blue-600 transition block"
                  >
                    {asset.name}
                  </Link>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {asset.assetCode && (
                      <span className="font-mono text-[10px] font-semibold text-stone-500 bg-stone-100 rounded px-1.5 py-0.5">
                        {asset.assetCode}
                      </span>
                    )}
                    {asset.serialNumber && (
                      <span className="text-[10px] text-stone-400">
                        S/N: {asset.serialNumber}
                      </span>
                    )}
                  </div>
                </td>

                <td className="px-4 py-3.5 text-stone-700 text-xs font-medium">
                  {asset.categoryName}
                </td>

                <td className="px-4 py-3.5 text-stone-600 text-xs">
                  {asset.location || "—"}
                </td>

                <td className="px-4 py-3.5 text-stone-800 text-xs font-mono">
                  {asset.purchaseCost !== null
                    ? `${currencySymbol}${asset.purchaseCost.toLocaleString("en-IN")}`
                    : "—"}
                </td>

                <td className="px-4 py-3.5 text-stone-950 text-xs font-mono font-semibold">
                  {asset.currentBookValue !== null
                    ? `${currencySymbol}${asset.currentBookValue.toLocaleString("en-IN")}`
                    : "—"}
                </td>

                <td className="px-4 py-3.5">
                  {hasAmcActive ? (
                    <div className="space-y-0.5">
                      <AdminBadge variant="success" size="sm">
                        Active AMC
                      </AdminBadge>
                      <p className="text-[10px] text-stone-500 truncate max-w-[140px]">
                        {asset.amcVendorName || "Contractor"} • Till {formatDateInAppTimeZone(asset.amcEndDate!)}
                      </p>
                    </div>
                  ) : isWarrantyActive ? (
                    <AdminBadge variant="info" size="sm">
                      Under Warranty
                    </AdminBadge>
                  ) : asset.amcEndDate ? (
                    <AdminBadge variant="danger" size="sm">
                      AMC Expired
                    </AdminBadge>
                  ) : (
                    <span className="text-xs text-stone-400">—</span>
                  )}
                </td>

                <td className="px-4 py-3.5">
                  <AdminBadge
                    variant={
                      asset.status === "ACTIVE"
                        ? "success"
                        : asset.status === "UNDER_MAINTENANCE"
                          ? "warning"
                          : asset.status === "DISPOSED" || asset.status === "WRITTEN_OFF"
                            ? "danger"
                            : "neutral"
                    }
                    size="sm"
                  >
                    {asset.status.replace("_", " ")}
                  </AdminBadge>
                </td>

                <td className="px-4 py-3.5 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5">
                    {canManageAssets && asset.status === "ACTIVE" && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Mark "${asset.name}" as DISPOSED?`)) {
                            startTransition(async () => {
                              await updateAssetStatus(societyCode, asset.id, "DISPOSED")
                            })
                          }
                        }}
                        className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-[11px] font-semibold text-stone-500 hover:bg-red-50 hover:text-red-700 transition"
                      >
                        Dispose
                      </button>
                    )}

                    <Link
                      href={`/society/${societyCode}/assets/${asset.id}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition"
                    >
                      <span>360° Log</span>
                      <span>→</span>
                    </Link>
                  </div>
                </td>
              </tr>
            )
          })}
        />
      )}

      {/* Add Asset Modal */}
      <AddAssetModal
        isOpen={isAddAssetOpen}
        onClose={() => setIsAddAssetOpen(false)}
        societyCode={societyCode}
        categories={categories}
        vendors={vendors}
      />

      {/* Asset Categories Modal */}
      <AssetCategoriesModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        societyCode={societyCode}
        categories={categories}
      />
    </div>
  )
}
