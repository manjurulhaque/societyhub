"use client"

import { useState, useTransition } from "react"
import { AdminModal } from "@/components/admin"
import { createServiceLog } from "../actions"
import type { VendorOption } from "../AddAssetModal"

interface AddServiceLogModalProps {
  isOpen: boolean
  onClose: () => void
  societyCode: string
  assetId: string
  assetName: string
  vendors: VendorOption[]
}

export function AddServiceLogModal({
  isOpen,
  onClose,
  societyCode,
  assetId,
  assetName,
  vendors,
}: AddServiceLogModalProps) {
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split("T")[0])
  const [description, setDescription] = useState("")
  const [cost, setCost] = useState("")
  const [vendorId, setVendorId] = useState("")
  const [servicedBy, setServicedBy] = useState("")
  const [nextDueDate, setNextDueDate] = useState("")
  const [remarks, setRemarks] = useState("")

  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      try {
        const costVal = cost.trim() ? parseFloat(cost) : 0
        const res = await createServiceLog(societyCode, assetId, {
          serviceDate,
          description,
          cost: costVal,
          vendorId: vendorId || null,
          servicedBy: servicedBy || null,
          nextDueDate: nextDueDate || null,
          remarks: remarks || null,
        })

        if (res.error) {
          setError(res.error)
        } else {
          onClose()
          setDescription("")
          setCost("")
          setServicedBy("")
          setNextDueDate("")
          setRemarks("")
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to log service record."
        setError(msg)
      }
    })
  }

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title="Log Asset Service / Repair"
      description={`Record maintenance servicing, breakdown repairs, or parts replacement for "${assetName}".`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-stone-700">Service Date *</label>
              <input
                type="date"
                required
                value={serviceDate}
                onChange={(e) => setServiceDate(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-stone-700">Service Cost (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Work Description *</label>
            <textarea
              required
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Quarterly routine lift inspection, brake shoe adjustment, governor check"
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-stone-700">Servicing Vendor</label>
              <select
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
              >
                <option value="">Select vendor (optional)...</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} {v.companyName ? `(${v.companyName})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-stone-700">Technician Name</label>
              <input
                type="text"
                value={servicedBy}
                onChange={(e) => setServicedBy(e.target.value)}
                placeholder="e.g. Ramesh Sharma"
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Next Service Due Date</label>
            <input
              type="date"
              value={nextDueDate}
              onChange={(e) => setNextDueDate(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Remarks / Parts Replaced</label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Replaced leveling sensor; verified emergency alarm."
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
            disabled={isPending || !description.trim()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition disabled:opacity-50"
          >
            {isPending ? "Logging..." : "Log Service Record"}
          </button>
        </div>
      </form>
    </AdminModal>
  )
}
