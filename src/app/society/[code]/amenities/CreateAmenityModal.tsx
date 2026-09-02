"use client"

import { toast } from "sonner"

import { useState, useTransition } from "react"
import { AdminModal } from "@/components/admin"
import { createAmenity } from "./actions"
import type { AmenityType } from "@/generated/prisma/client"

interface CreateAmenityModalProps {
  isOpen: boolean
  onClose: () => void
  societyCode: string
}

export function CreateAmenityModal({
  isOpen,
  onClose,
  societyCode,
}: CreateAmenityModalProps) {
  const [name, setName] = useState("")
  const [type, setType] = useState<AmenityType>("CLUBHOUSE")
  const [description, setDescription] = useState("")
  const [defaultRent, setDefaultRent] = useState("")
  const [defaultDeposit, setDefaultDeposit] = useState("")
  const [capacity, setCapacity] = useState("")

  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError("Please provide an amenity name.")
      return
    }

    startTransition(async () => {
      try {
        const rentVal = defaultRent.trim() ? parseFloat(defaultRent) : 0
        const depositVal = defaultDeposit.trim() ? parseFloat(defaultDeposit) : 0
        const capVal = capacity.trim() ? parseInt(capacity) : null

        const res = await createAmenity(societyCode, {
          name,
          type,
          description: description || null,
          defaultRent: rentVal,
          defaultDeposit: depositVal,
          capacity: capVal,
        })

        if (res.error) {
          setError(res.error)
        } else {
          toast.success("Amenity created successfully")
          onClose()
          setName("")
          setType("CLUBHOUSE")
          setDescription("")
          setDefaultRent("")
          setDefaultDeposit("")
          setCapacity("")
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to create amenity."
        setError(msg)
      }
    })
  }

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Community Amenity / Facility"
      description="Define a rentable clubhouse hall, lawn, guest room, or sports facility with pricing rules."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Amenity Name */}
          <div className="sm:col-span-2 space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Amenity Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Grand Clubhouse Hall / Air-Conditioned Guest Suite"
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
            />
          </div>

          {/* Type */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Facility Classification *</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AmenityType)}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
            >
              <option value="CLUBHOUSE">Clubhouse Banquet Hall</option>
              <option value="COMMUNITY_HALL">Community / Multi-purpose Hall</option>
              <option value="PARTY_LAWN">Open-air Party Lawn / Garden</option>
              <option value="GUEST_ROOM">Furnished Guest Room / Suite</option>
              <option value="SWIMMING_POOL">Swimming Pool & Deck Area</option>
              <option value="TENNIS_COURT">Tennis / Badminton Sports Court</option>
              <option value="TERRACE">Rooftop Gazebo / Terrace</option>
              <option value="OTHER">Other Facility</option>
            </select>
          </div>

          {/* Max Capacity */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Maximum Guest Capacity</label>
            <input
              type="number"
              min="1"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="e.g. 150 persons"
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none font-mono"
            />
          </div>

          {/* Default Rent Fee */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Standard Rental Fee (₹)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={defaultRent}
              onChange={(e) => setDefaultRent(e.target.value)}
              placeholder="e.g. 5000"
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none font-mono"
            />
          </div>

          {/* Default Caution Deposit */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Refundable Caution Deposit (₹)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={defaultDeposit}
              onChange={(e) => setDefaultDeposit(e.target.value)}
              placeholder="e.g. 2000"
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none font-mono"
            />
          </div>

          {/* Description */}
          <div className="sm:col-span-2 space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Facility Description & Booking Rules</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Air conditioned hall with 10 round tables, 80 chairs, food counter, and attached washroom. Music allowed until 10:00 PM."
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none resize-none"
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
            disabled={isPending || !name.trim()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition disabled:opacity-50"
          >
            {isPending ? "Creating..." : "Save Amenity"}
          </button>
        </div>
      </form>
    </AdminModal>
  )
}
