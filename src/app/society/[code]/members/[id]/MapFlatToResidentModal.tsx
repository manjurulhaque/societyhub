"use client"

import { useState, useTransition, useMemo } from "react"
import { AdminModal } from "@/components/admin"
import { addFlatPerson } from "../../flats/actions"
import type { FlatRole } from "@/generated/prisma/client"

export type AvailableFlatOption = {
  id: string
  number: string
  floor: number | null
  status: string
  blockName: string
}

interface MapFlatToResidentModalProps {
  isOpen: boolean
  onClose: () => void
  societyCode: string
  personId: string
  personName: string
  allSocietyFlats: AvailableFlatOption[]
  alreadyMappedFlatIds: string[]
}

export function MapFlatToResidentModal({
  isOpen,
  onClose,
  societyCode,
  personId,
  personName,
  allSocietyFlats,
  alreadyMappedFlatIds,
}: MapFlatToResidentModalProps) {
  const [selectedFlatId, setSelectedFlatId] = useState("")
  const [role, setRole] = useState<FlatRole>("OWNER")
  const [isPrimary, setIsPrimary] = useState(false)
  const [fromDate, setFromDate] = useState(new Date().toISOString().split("T")[0])
  const [searchQuery, setSearchQuery] = useState("")

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Filter out already mapped units and apply search filter
  const unmappedFlats = useMemo(() => {
    return allSocietyFlats.filter((f) => !alreadyMappedFlatIds.includes(f.id))
  }, [allSocietyFlats, alreadyMappedFlatIds])

  const filteredFlats = useMemo(() => {
    if (!searchQuery.trim()) return unmappedFlats
    const q = searchQuery.toLowerCase()
    return unmappedFlats.filter(
      (f) =>
        f.number.toLowerCase().includes(q) ||
        f.blockName.toLowerCase().includes(q) ||
        `${f.blockName}-${f.number}`.toLowerCase().includes(q)
    )
  }, [unmappedFlats, searchQuery])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!selectedFlatId) {
      setError("Please select a flat to map to this resident.")
      return
    }

    startTransition(async () => {
      try {
        const res = await addFlatPerson(societyCode, selectedFlatId, {
          personId,
          role,
          isPrimary,
          fromDate,
        })

        if (res.error) {
          setError(res.error)
        } else {
          setSuccess(res.message || "Flat mapped successfully.")
          setTimeout(() => {
            onClose()
            setSelectedFlatId("")
            setRole("OWNER")
            setIsPrimary(false)
          }, 1200)
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to map flat.")
      }
    })
  }

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title="Map Flat to Resident Portfolio"
      description={`Link an additional unit to ${personName}'s portfolio as Owner, Joint Owner, Tenant, or Family.`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 font-semibold">
            ✓ {success}
          </div>
        )}

        <div className="space-y-3.5">
          {/* Flat Selection with quick search */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-stone-700">
                Select Society Flat *
              </label>
              <span className="text-[10px] text-stone-400">
                {unmappedFlats.length} available unit(s)
              </span>
            </div>

            {unmappedFlats.length > 8 && (
              <input
                type="text"
                placeholder="Type to filter flats (e.g. A-101)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-stone-50/70 px-3 py-1.5 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none mb-1"
              />
            )}

            <select
              required
              value={selectedFlatId}
              onChange={(e) => setSelectedFlatId(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
            >
              <option value="">Choose a flat from the list...</option>
              {filteredFlats.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.blockName} - Flat {f.number} {f.floor !== null ? `(Floor ${f.floor})` : ""} • [{f.status}]
                </option>
              ))}
            </select>
          </div>

          {/* Role Selection */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">
              Tenure / Ownership Role *
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as FlatRole)}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-900 focus:border-stone-900 focus:outline-none"
            >
              <option value="OWNER">PRIMARY OWNER (Sole / Main Owner)</option>
              <option value="JOINT_OWNER">JOINT OWNER (Co-Owner)</option>
              <option value="TENANT">TENANT (Rental Lease)</option>
              <option value="FAMILY">FAMILY MEMBER</option>
            </select>
          </div>

          {/* Start Date */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">
              Occupancy / Effective Start Date *
            </label>
            <input
              type="date"
              required
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
            />
          </div>

          {/* Primary contact checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isPrimaryFlatContact"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
            />
            <label
              htmlFor="isPrimaryFlatContact"
              className="text-xs font-medium text-stone-800 cursor-pointer"
            >
              Mark as Primary Contact for this Flat (Receives bills & notices)
            </label>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending || !selectedFlatId}
            className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition disabled:opacity-50"
          >
            {isPending ? "Mapping Flat..." : "Link Flat to Portfolio"}
          </button>
        </div>
      </form>
    </AdminModal>
  )
}
