"use client"

import { toast } from "sonner"

import { useState, useTransition } from "react"
import { AdminModal } from "@/components/admin"
import { createAsset } from "./actions"
import type { AssetCategoryItem } from "./AssetCategoriesModal"
import type { AssetStatus } from "@/generated/prisma/client"

export type VendorOption = {
  id: string
  name: string
  companyName: string | null
  phone: string | null
}

interface AddAssetModalProps {
  isOpen: boolean
  onClose: () => void
  societyCode: string
  categories: AssetCategoryItem[]
  vendors: VendorOption[]
}

export function AddAssetModal({
  isOpen,
  onClose,
  societyCode,
  categories,
  vendors,
}: AddAssetModalProps) {
  const [name, setName] = useState("")
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "")
  const [assetCode, setAssetCode] = useState("")
  const [location, setLocation] = useState("")
  const [serialNumber, setSerialNumber] = useState("")
  const [purchaseDate, setPurchaseDate] = useState("")
  const [purchaseCost, setPurchaseCost] = useState("")
  const [currentBookValue, setCurrentBookValue] = useState("")
  const [warrantyExpiresAt, setWarrantyExpiresAt] = useState("")
  const [status, setStatus] = useState<AssetStatus>("ACTIVE")

  // AMC details
  const [hasAmc, setHasAmc] = useState(false)
  const [amcVendorId, setAmcVendorId] = useState("")
  const [amcStartDate, setAmcStartDate] = useState("")
  const [amcEndDate, setAmcEndDate] = useState("")
  const [amcAmount, setAmcAmount] = useState("")

  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      try {
        const costVal = purchaseCost.trim() ? parseFloat(purchaseCost) : null
        const bookVal = currentBookValue.trim() ? parseFloat(currentBookValue) : null
        const amcVal = hasAmc && amcAmount.trim() ? parseFloat(amcAmount) : null

        const res = await createAsset(societyCode, {
          name,
          categoryId,
          assetCode: assetCode || null,
          location: location || null,
          serialNumber: serialNumber || null,
          purchaseDate: purchaseDate || null,
          purchaseCost: costVal,
          currentBookValue: bookVal,
          warrantyExpiresAt: warrantyExpiresAt || null,
          status,
          amcVendorId: hasAmc ? amcVendorId || null : null,
          amcStartDate: hasAmc ? amcStartDate || null : null,
          amcEndDate: hasAmc ? amcEndDate || null : null,
          amcAmount: amcVal,
        })

        if (res.error) {
          setError(res.error)
        } else {
          toast.success("Asset registered successfully")
          onClose()
          // Reset form
          setName("")
          setAssetCode("")
          setLocation("")
          setSerialNumber("")
          setPurchaseDate("")
          setPurchaseCost("")
          setCurrentBookValue("")
          setWarrantyExpiresAt("")
          setHasAmc(false)
          setAmcVendorId("")
          setAmcStartDate("")
          setAmcEndDate("")
          setAmcAmount("")
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to register asset."
        setError(msg)
      }
    })
  }

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title="Register Fixed Asset / Equipment"
      description="Record society machinery, elevators, DG sets, pumps, solar systems, or infrastructure assets into the Dead Stock Register."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Asset Name */}
          <div className="sm:col-span-2 space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Asset Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Schindler Lift 8-Passenger Block A"
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
            />
          </div>

          {/* Category */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Category *</label>
            <select
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.depreciationRate ? `(${c.depreciationRate}% dep.)` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Asset Code */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Asset Tag / Code</label>
            <input
              type="text"
              value={assetCode}
              onChange={(e) => setAssetCode(e.target.value)}
              placeholder="e.g. AST-LIFT-01"
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none uppercase"
            />
          </div>

          {/* Location */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Physical Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Block A Shaft 1, Basement DG Room"
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
            />
          </div>

          {/* Serial Number */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Serial / Model Number</label>
            <input
              type="text"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              placeholder="e.g. SCH-2024-9941"
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
            />
          </div>

          {/* Purchase Date */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Purchase / Installation Date</label>
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
            />
          </div>

          {/* Purchase Cost */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Original Purchase Cost (₹)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={purchaseCost}
              onChange={(e) => {
                setPurchaseCost(e.target.value)
                if (!currentBookValue) setCurrentBookValue(e.target.value)
              }}
              placeholder="e.g. 1200000"
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
            />
          </div>

          {/* Current Book Value */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Current Book Value (₹)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={currentBookValue}
              onChange={(e) => setCurrentBookValue(e.target.value)}
              placeholder="e.g. 1080000"
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
            />
          </div>

          {/* Warranty Expiry */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Warranty Expiry Date</label>
            <input
              type="date"
              value={warrantyExpiresAt}
              onChange={(e) => setWarrantyExpiresAt(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
            />
          </div>

          {/* Status */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Operational Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as AssetStatus)}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
            >
              <option value="ACTIVE">ACTIVE (Operational)</option>
              <option value="UNDER_MAINTENANCE">UNDER MAINTENANCE</option>
              <option value="DISPOSED">DISPOSED (Sold / Decommissioned)</option>
              <option value="WRITTEN_OFF">WRITTEN OFF (Scrapped)</option>
            </select>
          </div>
        </div>

        {/* AMC Section Accordion / Toggle */}
        <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="hasAmcCheck"
                checked={hasAmc}
                onChange={(e) => setHasAmc(e.target.checked)}
                className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
              />
              <label htmlFor="hasAmcCheck" className="text-xs font-bold text-stone-900 cursor-pointer">
                Under Active AMC (Annual Maintenance Contract)
              </label>
            </div>
            <span className="text-[10px] uppercase font-bold text-stone-500">Service Contract</span>
          </div>

          {hasAmc && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-2 border-t border-stone-200">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] font-semibold text-stone-700">AMC Vendor / Contractor</label>
                <select
                  value={amcVendorId}
                  onChange={(e) => setAmcVendorId(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
                >
                  <option value="">Select an existing vendor...</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} {v.companyName ? `(${v.companyName})` : ""} {v.phone ? `— ${v.phone}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-stone-700">AMC Start Date</label>
                <input
                  type="date"
                  value={amcStartDate}
                  onChange={(e) => setAmcStartDate(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-stone-700">AMC End Date</label>
                <input
                  type="date"
                  value={amcEndDate}
                  onChange={(e) => setAmcEndDate(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] font-semibold text-stone-700">Annual AMC Cost (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amcAmount}
                  onChange={(e) => setAmcAmount(e.target.value)}
                  placeholder="e.g. 45000"
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending || !name.trim() || !categoryId}
            className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition disabled:opacity-50"
          >
            {isPending ? "Registering..." : "Register Fixed Asset"}
          </button>
        </div>
      </form>
    </AdminModal>
  )
}
