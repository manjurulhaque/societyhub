"use client"

import { useState, useTransition } from "react"
import { AdminModal } from "@/components/admin"
import { addFlatPerson } from "../actions"
import type { PersonDirectoryOption } from "./TransferOwnershipModal"
import type { FlatRole } from "@/generated/prisma/client"

interface AddFlatPersonModalProps {
  isOpen: boolean
  onClose: () => void
  societyCode: string
  flatId: string
  flatIdentifier: string
  people: PersonDirectoryOption[]
}

export function AddFlatPersonModal({
  isOpen,
  onClose,
  societyCode,
  flatId,
  flatIdentifier,
  people,
}: AddFlatPersonModalProps) {
  const [personId, setPersonId] = useState("")
  const [role, setRole] = useState<FlatRole>("TENANT")
  const [isPrimary, setIsPrimary] = useState(false)
  const [fromDate, setFromDate] = useState(new Date().toISOString().split("T")[0])

  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!personId) {
      setError("Please select a person from the society directory.")
      return
    }

    startTransition(async () => {
      try {
        const res = await addFlatPerson(societyCode, flatId, {
          personId,
          role,
          isPrimary,
          fromDate,
        })

        if (res.error) {
          setError(res.error)
        } else {
          onClose()
          setPersonId("")
          setRole("TENANT")
          setIsPrimary(false)
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to add resident."
        setError(msg)
      }
    })
  }

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title="Assign Resident / Tenant / Co-Owner"
      description={`Attach an occupant, tenant, or co-owner to Flat ${flatIdentifier}.`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Person *</label>
            <select
              required
              value={personId}
              onChange={(e) => setPersonId(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
            >
              <option value="">Select resident from directory...</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.phone ? `(${p.phone})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Occupancy Role *</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as FlatRole)}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
            >
              <option value="TENANT">TENANT (Rented)</option>
              <option value="JOINT_OWNER">JOINT OWNER (Co-Owner)</option>
              <option value="OWNER">PRIMARY OWNER</option>
              <option value="FAMILY">FAMILY MEMBER</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Occupancy Start Date *</label>
            <input
              type="date"
              required
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isPrimaryCheck"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
            />
            <label htmlFor="isPrimaryCheck" className="text-xs font-medium text-stone-800 cursor-pointer">
              Designate as Primary Point of Contact
            </label>
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
            disabled={isPending || !personId}
            className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition disabled:opacity-50"
          >
            {isPending ? "Assigning..." : "Assign Resident"}
          </button>
        </div>
      </form>
    </AdminModal>
  )
}
