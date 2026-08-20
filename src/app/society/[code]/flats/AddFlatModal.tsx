"use client"

import { useState, useTransition } from "react"
import { createFlat } from "./actions"
import type { UnitType, OccupancyStatus } from "@/generated/prisma/client"

export type BlockOption = {
  id: string
  name: string
}

interface AddFlatModalProps {
  isOpen: boolean
  onClose: () => void
  societyCode: string
  blocks: BlockOption[]
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
  { value: "SHOP", label: "Commercial Shop" },
  { value: "OFFICE", label: "Office Unit" },
]

const OCCUPANCY_OPTIONS: { value: OccupancyStatus; label: string }[] = [
  { value: "VACANT", label: "Vacant" },
  { value: "OCCUPIED", label: "Occupied" },
  { value: "UNDER_RENOVATION", label: "Under Renovation" },
]

export function AddFlatModal({
  isOpen,
  onClose,
  societyCode,
  blocks,
}: AddFlatModalProps) {
  const [blockId, setBlockId] = useState(blocks[0]?.id || "")
  const [number, setNumber] = useState("")
  const [floor, setFloor] = useState("")
  const [unitType, setUnitType] = useState<UnitType>("BHK2")
  const [area, setArea] = useState("")
  const [status, setStatus] = useState<OccupancyStatus>("VACANT")
  const [parkingSlot, setParkingSlot] = useState("")
  const [intercomNumber, setIntercomNumber] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (!isOpen) return null

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
        const res = await createFlat(societyCode, {
          blockId,
          number: number.trim(),
          floor: floor.trim() ? parseInt(floor.trim(), 10) : null,
          unitType,
          area: area.trim() ? parseFloat(area.trim()) : null,
          status,
          parkingSlot: parkingSlot.trim() || undefined,
          intercomNumber: intercomNumber.trim() || undefined,
        })

        if (res.error) {
          setError(res.error)
        } else {
          setNumber("")
          setFloor("")
          setArea("")
          setParkingSlot("")
          setIntercomNumber("")
          onClose()
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to create flat."
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
        <div className="flex shrink-0 items-start justify-between border-b border-stone-100 px-6 py-5">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-stone-950">Add Flat / Unit</h3>
            <p className="mt-1 text-xs text-stone-500">
              Register a new residential flat or commercial unit in this society.
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

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error ? (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
              <svg className="h-4 w-4 shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Block / Tower <span className="text-red-500">*</span>
              </label>
              <select
                value={blockId}
                onChange={(e) => setBlockId(e.target.value)}
                disabled={isPending}
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none"
              >
                {blocks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

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
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none"
              />
            </div>

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
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Unit Configuration
              </label>
              <select
                value={unitType}
                onChange={(e) => setUnitType(e.target.value as UnitType)}
                disabled={isPending}
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none"
              >
                {UNIT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Carpet Area (sq. ft.)
              </label>
              <input
                type="number"
                step="0.01"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                disabled={isPending}
                placeholder="e.g. 950.00"
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Occupancy Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as OccupancyStatus)}
                disabled={isPending}
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none"
              >
                {OCCUPANCY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Parking Slot (Optional)
              </label>
              <input
                type="text"
                value={parkingSlot}
                onChange={(e) => setParkingSlot(e.target.value)}
                disabled={isPending}
                placeholder="e.g. B1-P24, Covered-12"
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Intercom Extension (Optional)
              </label>
              <input
                type="text"
                value={intercomNumber}
                onChange={(e) => setIntercomNumber(e.target.value)}
                disabled={isPending}
                placeholder="e.g. 101"
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-stone-100 bg-stone-50/50 px-6 py-4">
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
            {isPending ? "Creating..." : "Create Flat"}
          </button>
        </div>
      </div>
    </div>
  )
}
