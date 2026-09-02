"use client"

import { toast } from "sonner"

import { useState, useTransition } from "react"
import { updateFlatDetails } from "./actions/flatActions"
import type { UnitType, OccupancyStatus } from "@/generated/prisma/client"
import type { BlockOption } from "./AddFlatModal"

export type EditableFlat = {
  id: string
  blockId: string
  blockName?: string
  number: string
  floor?: number | null
  unitType?: UnitType | string | null
  status: OccupancyStatus | string
  area?: number | null
  areaUnit?: string
  intercomNumber?: string | null
  parkingSlot?: string | null
}

interface EditFlatModalProps {
  isOpen: boolean
  onClose: () => void
  societyCode: string
  blocks: BlockOption[]
  flat: EditableFlat | null
}

const UNIT_TYPE_OPTIONS: { value: UnitType; label: string }[] = [
  { value: "BHK1", label: "1 BHK" },
  { value: "BHK2", label: "2 BHK" },
  { value: "BHK3", label: "3 BHK" },
  { value: "BHK4", label: "4 BHK" },
  { value: "BHK5", label: "5 BHK" },
  { value: "STUDIO", label: "Studio Apartment" },
  { value: "RK1", label: "1 RK" },
  { value: "PENTHOUSE", label: "Penthouse" },
  { value: "DUPLEX", label: "Duplex" },
  { value: "VILLA", label: "Villa / Row House" },
  { value: "ROW_HOUSE", label: "Row House" },
  { value: "SHOP", label: "Commercial Shop" },
  { value: "OFFICE", label: "Office Unit" },
  { value: "COMMERCIAL", label: "Commercial Space" },
  { value: "PLOT", label: "Open Plot" },
]

const OCCUPANCY_OPTIONS: { value: OccupancyStatus; label: string }[] = [
  { value: "VACANT", label: "Vacant" },
  { value: "OCCUPIED", label: "Occupied" },
  { value: "UNDER_RENOVATION", label: "Under Renovation" },
]

export function EditFlatModal({
  isOpen,
  onClose,
  societyCode,
  blocks,
  flat,
}: EditFlatModalProps) {
  if (!isOpen || !flat) return null

  return (
    <EditFlatDialogContent
      key={flat.id}
      onClose={onClose}
      societyCode={societyCode}
      blocks={blocks}
      flat={flat}
    />
  )
}

function EditFlatDialogContent({
  onClose,
  societyCode,
  blocks,
  flat,
}: {
  onClose: () => void
  societyCode: string
  blocks: BlockOption[]
  flat: EditableFlat
}) {
  const [blockId, setBlockId] = useState(flat.blockId || blocks[0]?.id || "")
  const [number, setNumber] = useState(flat.number || "")
  const [floor, setFloor] = useState(flat.floor !== null && flat.floor !== undefined ? String(flat.floor) : "")
  const [unitType, setUnitType] = useState<UnitType>((flat.unitType as UnitType) || "BHK2")
  const [area, setArea] = useState(flat.area !== null && flat.area !== undefined ? String(flat.area) : "")
  const [areaUnit, setAreaUnit] = useState(flat.areaUnit || "sqft")
  const [status, setStatus] = useState<OccupancyStatus>((flat.status as OccupancyStatus) || "VACANT")
  const [parkingSlot, setParkingSlot] = useState(flat.parkingSlot || "")
  const [intercomNumber, setIntercomNumber] = useState(flat.intercomNumber || "")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const currentBlockName = blocks.find((b) => b.id === flat.blockId)?.name || flat.blockName || "Block"

  const handleSave = () => {
    if (!blockId) {
      setError("Please select a block / wing.")
      return
    }

    if (!number.trim()) {
      setError("Please enter a flat / unit number.")
      return
    }

    setError(null)

    startTransition(async () => {
      try {
        const res = await updateFlatDetails(societyCode, flat.id, {
          blockId,
          number: number.trim(),
          floor: floor.trim() ? parseInt(floor.trim(), 10) : null,
          unitType,
          area: area.trim() ? parseFloat(area.trim()) : null,
          areaUnit: areaUnit.trim() || "sqft",
          status,
          parkingSlot: parkingSlot.trim() || null,
          intercomNumber: intercomNumber.trim() || null,
        })

        if (res.error) {
          setError(res.error)
        } else {
          toast.success("Flat updated successfully")
          onClose()
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to update flat details."
        setError(msg)
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-stone-950/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl transition-all">
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between border-b border-stone-100 px-6 py-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-stone-600">
                {currentBlockName} • Flat {flat.number}
              </span>
            </div>
            <h3 className="mt-1 text-xl font-bold tracking-tight text-stone-950">
              Edit Flat / Unit Details
            </h3>
            <p className="mt-0.5 text-xs text-stone-500">
              Update physical specifications, layout configuration, and occupancy status.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error ? (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
              <svg className="h-4 w-4 shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{error}</span>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Block / Wing */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Block / Wing <span className="text-red-500">*</span>
              </label>
              <select
                value={blockId}
                onChange={(e) => setBlockId(e.target.value)}
                disabled={isPending}
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none disabled:opacity-50"
              >
                {blocks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Flat Number */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Flat Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                disabled={isPending}
                placeholder="e.g. 101, A-402, Shop-1"
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none disabled:opacity-50"
              />
            </div>

            {/* Floor Number */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Floor Number
              </label>
              <input
                type="number"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                disabled={isPending}
                placeholder="e.g. 1 (Ground = 0)"
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none disabled:opacity-50"
              />
            </div>

            {/* Unit Configuration */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Unit Configuration
              </label>
              <select
                value={unitType}
                onChange={(e) => setUnitType(e.target.value as UnitType)}
                disabled={isPending}
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none disabled:opacity-50"
              >
                {UNIT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Carpet Area */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Carpet Area
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  disabled={isPending}
                  placeholder="e.g. 950.00"
                  className="flex-1 rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none disabled:opacity-50"
                />
                <select
                  value={areaUnit}
                  onChange={(e) => setAreaUnit(e.target.value)}
                  disabled={isPending}
                  className="w-24 rounded-xl border border-stone-200 bg-stone-50/50 px-2.5 py-2.5 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none disabled:opacity-50"
                >
                  <option value="sqft">sq. ft.</option>
                  <option value="sqm">sq. m.</option>
                  <option value="sqyd">sq. yd.</option>
                </select>
              </div>
            </div>

            {/* Occupancy Status */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Occupancy Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as OccupancyStatus)}
                disabled={isPending}
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none disabled:opacity-50"
              >
                {OCCUPANCY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Parking Slot */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Parking Slot (Optional)
              </label>
              <input
                type="text"
                value={parkingSlot}
                onChange={(e) => setParkingSlot(e.target.value)}
                disabled={isPending}
                placeholder="e.g. B1-P24, Open-12"
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none disabled:opacity-50"
              />
            </div>

            {/* Intercom Number */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Intercom Extension (Optional)
              </label>
              <input
                type="text"
                value={intercomNumber}
                onChange={(e) => setIntercomNumber(e.target.value)}
                disabled={isPending}
                placeholder="e.g. 1042"
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-stone-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition disabled:opacity-50"
          >
            {isPending ? (
              <>
                <svg
                  className="h-3.5 w-3.5 animate-spin text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Saving Changes...</span>
              </>
            ) : (
              <span>Save Changes</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
