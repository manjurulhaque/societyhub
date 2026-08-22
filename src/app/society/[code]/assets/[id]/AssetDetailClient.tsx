"use client"

import { useState, useTransition } from "react"
import { AdminCard, AdminBadge, AdminTable } from "@/components/admin"
import { AddServiceLogModal } from "./AddServiceLogModal"
import { deleteServiceLog } from "../actions"
import { formatDateInAppTimeZone } from "@/lib/datetime"
import type { VendorOption } from "../AddAssetModal"
import type { AssetCategoryItem } from "../AssetCategoriesModal"

export type AssetDetailData = {
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
  amcVendorPhone: string | null
  amcVendorEmail: string | null
  amcStartDate: string | null
  amcEndDate: string | null
  amcAmount: number | null
}

export type ServiceLogItem = {
  id: string
  serviceDate: string
  description: string
  cost: number
  servicedBy: string | null
  vendorName: string | null
  nextDueDate: string | null
  remarks: string | null
}

interface AssetDetailClientProps {
  societyCode: string
  currencySymbol: string
  asset: AssetDetailData
  serviceLogs: ServiceLogItem[]
  categories: AssetCategoryItem[]
  vendors: VendorOption[]
  canManage: boolean
}

export function AssetDetailClient({
  societyCode,
  currencySymbol,
  asset,
  serviceLogs,
  vendors,
  canManage,
}: AssetDetailClientProps) {
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false)
  const [isDeletingLogId, setIsDeletingLogId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleDeleteLog = (logId: string) => {
    if (!confirm("Are you sure you want to delete this service record?")) return

    setIsDeletingLogId(logId)
    startTransition(async () => {
      try {
        await deleteServiceLog(societyCode, asset.id, logId)
      } finally {
        setIsDeletingLogId(null)
      }
    })
  }

  const now = new Date()
  const isAmcActive = asset.amcEndDate && new Date(asset.amcEndDate) >= now

  return (
    <div className="space-y-6">
      {/* Specifications and AMC Cards Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Technical & Depreciation Specs */}
        <AdminCard
          title="Technical Specifications & Valuation"
          description="Hardware identification and balance sheet valuation"
        >
          <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 text-xs pt-1">
            <div>
              <dt className="text-stone-400 font-medium">Asset Category</dt>
              <dd className="font-semibold text-stone-900 mt-0.5">{asset.categoryName}</dd>
            </div>

            <div>
              <dt className="text-stone-400 font-medium">Asset Identification Tag</dt>
              <dd className="font-mono font-semibold text-stone-900 mt-0.5">{asset.assetCode || "None"}</dd>
            </div>

            <div>
              <dt className="text-stone-400 font-medium">Serial / Model Number</dt>
              <dd className="font-mono text-stone-800 mt-0.5">{asset.serialNumber || "—"}</dd>
            </div>

            <div>
              <dt className="text-stone-400 font-medium">Physical Location</dt>
              <dd className="text-stone-800 mt-0.5">{asset.location || "—"}</dd>
            </div>

            <div>
              <dt className="text-stone-400 font-medium">Installation / Purchase Date</dt>
              <dd className="text-stone-800 mt-0.5">
                {asset.purchaseDate ? formatDateInAppTimeZone(asset.purchaseDate) : "—"}
              </dd>
            </div>

            <div>
              <dt className="text-stone-400 font-medium">Original Capitalization Cost</dt>
              <dd className="font-mono font-semibold text-stone-900 mt-0.5">
                {asset.purchaseCost !== null ? `${currencySymbol}${asset.purchaseCost.toLocaleString("en-IN")}` : "—"}
              </dd>
            </div>

            <div>
              <dt className="text-stone-400 font-medium">Annual Depreciation Rate</dt>
              <dd className="font-mono text-stone-800 mt-0.5">
                {asset.depreciationRate !== null ? `${asset.depreciationRate}% per annum` : "—"}
              </dd>
            </div>

            <div>
              <dt className="text-stone-400 font-medium">Current Book Value</dt>
              <dd className="font-mono font-bold text-emerald-700 mt-0.5">
                {asset.currentBookValue !== null ? `${currencySymbol}${asset.currentBookValue.toLocaleString("en-IN")}` : "—"}
              </dd>
            </div>
          </dl>
        </AdminCard>

        {/* AMC & Warranty Contract Details */}
        <AdminCard
          title="Maintenance Contract & Warranty"
          description="Vendor service level agreement (SLA) & warranty period"
        >
          <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 text-xs pt-1">
            <div className="sm:col-span-2">
              <dt className="text-stone-400 font-medium">AMC Contractor / Servicing Agency</dt>
              <dd className="font-semibold text-stone-900 mt-0.5">
                {asset.amcVendorName ? (
                  <div className="flex items-center gap-2">
                    <span>{asset.amcVendorName}</span>
                    {asset.amcVendorPhone && (
                      <span className="text-[11px] text-stone-500 font-normal">📞 {asset.amcVendorPhone}</span>
                    )}
                  </div>
                ) : (
                  <span className="text-stone-400 italic">No AMC Contractor assigned</span>
                )}
              </dd>
            </div>

            <div>
              <dt className="text-stone-400 font-medium">AMC Contract Validity</dt>
              <dd className="text-stone-800 mt-0.5 font-medium">
                {asset.amcStartDate && asset.amcEndDate ? (
                  <span>
                    {formatDateInAppTimeZone(asset.amcStartDate)} to {formatDateInAppTimeZone(asset.amcEndDate)}
                  </span>
                ) : (
                  "—"
                )}
              </dd>
            </div>

            <div>
              <dt className="text-stone-400 font-medium">Annual AMC Amount</dt>
              <dd className="font-mono font-semibold text-stone-900 mt-0.5">
                {asset.amcAmount !== null ? `${currencySymbol}${asset.amcAmount.toLocaleString("en-IN")}` : "—"}
              </dd>
            </div>

            <div>
              <dt className="text-stone-400 font-medium">AMC Status</dt>
              <dd className="mt-0.5">
                {isAmcActive ? (
                  <AdminBadge variant="success" size="sm">
                    Active SLA
                  </AdminBadge>
                ) : asset.amcEndDate ? (
                  <AdminBadge variant="danger" size="sm">
                    Contract Expired
                  </AdminBadge>
                ) : (
                  <AdminBadge variant="neutral" size="sm">
                    No AMC
                  </AdminBadge>
                )}
              </dd>
            </div>

            <div>
              <dt className="text-stone-400 font-medium">OEM Warranty Expiry</dt>
              <dd className="text-stone-800 mt-0.5">
                {asset.warrantyExpiresAt ? formatDateInAppTimeZone(asset.warrantyExpiresAt) : "—"}
              </dd>
            </div>
          </dl>
        </AdminCard>
      </div>

      {/* Service & Breakdown Maintenance History */}
      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Maintenance Logbook</span>
            <h3 className="text-base font-bold text-stone-950">Servicing, Inspections & Repair History</h3>
            <p className="text-xs text-stone-500">
              Statutory service records, parts replacements, breakdown tickets, and technician visits.
            </p>
          </div>

          {canManage && (
            <button
              type="button"
              onClick={() => setIsServiceModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition self-start sm:self-auto"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              <span>+ Log Service / Repair</span>
            </button>
          )}
        </div>

        {serviceLogs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/50 p-8 text-center">
            <p className="text-xs text-stone-500 font-medium">No service records logged yet for this asset.</p>
            {canManage && (
              <button
                type="button"
                onClick={() => setIsServiceModalOpen(true)}
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                + Record first maintenance visit
              </button>
            )}
          </div>
        ) : (
          <AdminTable
            headers={[
              "Service Date",
              "Description of Work / Parts Replaced",
              "Servicing Vendor / Technician",
              "Cost (₹)",
              "Next Due Date",
              ...(canManage ? ["Action"] : []),
            ]}
            rows={serviceLogs.map((log) => (
              <tr key={log.id} className="border-t border-stone-100 text-xs">
                <td className="px-4 py-3.5 font-semibold text-stone-900 whitespace-nowrap">
                  {formatDateInAppTimeZone(log.serviceDate)}
                </td>

                <td className="px-4 py-3.5 text-stone-800 max-w-md">
                  <p className="font-medium text-stone-950">{log.description}</p>
                  {log.remarks && (
                    <p className="text-[11px] text-stone-500 mt-0.5 italic">{log.remarks}</p>
                  )}
                </td>

                <td className="px-4 py-3.5 text-stone-600">
                  {log.vendorName || log.servicedBy ? (
                    <div>
                      {log.vendorName && <span className="font-medium text-stone-900 block">{log.vendorName}</span>}
                      {log.servicedBy && <span className="text-[11px] text-stone-500">Tech: {log.servicedBy}</span>}
                    </div>
                  ) : (
                    "—"
                  )}
                </td>

                <td className="px-4 py-3.5 font-mono font-semibold text-stone-950 whitespace-nowrap">
                  {currencySymbol}{log.cost.toLocaleString("en-IN")}
                </td>

                <td className="px-4 py-3.5 text-stone-700 whitespace-nowrap">
                  {log.nextDueDate ? (
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                      <span>{formatDateInAppTimeZone(log.nextDueDate)}</span>
                    </div>
                  ) : (
                    "—"
                  )}
                </td>

                {canManage && (
                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    <button
                      type="button"
                      disabled={isPending && isDeletingLogId === log.id}
                      onClick={() => handleDeleteLog(log.id)}
                      className="text-stone-400 hover:text-red-600 transition disabled:opacity-50"
                      title="Delete service log"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                )}
              </tr>
            ))}
          />
        )}
      </div>

      {/* Add Service Log Modal */}
      <AddServiceLogModal
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        societyCode={societyCode}
        assetId={asset.id}
        assetName={asset.name}
        vendors={vendors}
      />
    </div>
  )
}
