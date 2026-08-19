"use client"

import { useState, useMemo, useTransition } from "react"
import { AdminTable, AdminBadge } from "@/components/admin"
import { RegisterResidentModal, type FlatOption } from "./RegisterResidentModal"
import { removeResident } from "./residentActions"

export type ResidentItem = {
  id: string
  name: string
  phone: string | null
  email: string | null
  panNumber: string | null
  aadhaarNumber: string | null
  primaryRole: string
  flatsDisplay: string
}

interface ResidentsDirectoryClientProps {
  societyCode: string
  residents: ResidentItem[]
  availableFlats: FlatOption[]
  canManageResidents: boolean
}

export function ResidentsDirectoryClient({
  societyCode,
  residents,
  availableFlats,
  canManageResidents,
}: ResidentsDirectoryClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRole, setSelectedRole] = useState<string>("ALL")

  const [deletingResident, setDeletingResident] = useState<ResidentItem | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, startDeleteTransition] = useTransition()

  const filteredResidents = useMemo(() => {
    return residents.filter((r) => {
      if (selectedRole !== "ALL" && r.primaryRole !== selectedRole) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = r.name.toLowerCase().includes(q)
        const matchPhone = r.phone?.toLowerCase().includes(q) || false
        const matchEmail = r.email?.toLowerCase().includes(q) || false
        const matchFlats = r.flatsDisplay.toLowerCase().includes(q)
        return matchName || matchPhone || matchEmail || matchFlats
      }

      return true
    })
  }, [residents, selectedRole, searchQuery])

  const handleDeleteResident = () => {
    if (!deletingResident) return
    setDeleteError(null)

    startDeleteTransition(async () => {
      try {
        const res = await removeResident(societyCode, deletingResident.id)
        if (res.error) {
          setDeleteError(res.error)
        } else {
          setDeletingResident(null)
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to remove resident."
        setDeleteError(msg)
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Header Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-bold text-stone-900">
            Registered Residents & People ({residents.length})
          </h3>
          <p className="text-xs text-stone-500">
            Property owners, co-owners, tenants, and family members residing in this society.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canManageResidents ? (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              <span>+ Register Resident</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, flat, phone..."
            className="w-56 sm:w-64 rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-1.5 pl-8 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none"
          />
          <svg
            className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-stone-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 focus:border-stone-900 focus:outline-none"
        >
          <option value="ALL">All Roles</option>
          <option value="OWNER">Owners</option>
          <option value="JOINT_OWNER">Joint Owners</option>
          <option value="TENANT">Tenants</option>
          <option value="FAMILY">Family</option>
        </select>
      </div>

      {/* Table */}
      {filteredResidents.length === 0 ? (
        <p className="py-8 text-center text-xs text-stone-500 border border-dashed border-stone-200 rounded-2xl">
          {searchQuery || selectedRole !== "ALL"
            ? "No residents match your filter."
            : "No residents registered in this society yet. Click \"+ Register Resident\" to add one."}
        </p>
      ) : (
        <AdminTable
          headers={[
            "Name",
            "Phone",
            "Email",
            "Associated Flat(s)",
            "Occupancy Role",
            ...(canManageResidents ? ["Actions"] : []),
          ]}
          rows={filteredResidents.map((r) => (
            <tr key={r.id} className="border-t border-stone-100 hover:bg-stone-50/60 transition-colors">
              <td className="px-4 py-3.5 text-xs font-semibold text-stone-950">
                {r.name}
              </td>
              <td className="px-4 py-3.5 text-xs text-stone-600 font-mono">
                {r.phone || "—"}
              </td>
              <td className="px-4 py-3.5 text-xs text-stone-600">
                {r.email || "—"}
              </td>
              <td className="px-4 py-3.5 text-xs text-stone-800">
                {r.flatsDisplay ? (
                  <span className="font-medium text-stone-900">{r.flatsDisplay}</span>
                ) : (
                  <span className="text-stone-400">None assigned</span>
                )}
              </td>
              <td className="px-4 py-3.5">
                <AdminBadge
                  variant={
                    r.primaryRole === "OWNER" || r.primaryRole === "JOINT_OWNER"
                      ? "info"
                      : r.primaryRole === "TENANT"
                        ? "warning"
                        : "neutral"
                  }
                  size="sm"
                >
                  {r.primaryRole.replace(/_/g, " ")}
                </AdminBadge>
              </td>
              {canManageResidents ? (
                <td className="px-4 py-3.5">
                  <button
                    type="button"
                    onClick={() => setDeletingResident(r)}
                    className="rounded-lg p-1 text-stone-400 hover:bg-red-50 hover:text-red-600 transition"
                    title="Remove Resident"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </td>
              ) : null}
            </tr>
          ))}
        />
      )}

      {/* Register Resident Modal */}
      {isModalOpen ? (
        <RegisterResidentModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          societyCode={societyCode}
          availableFlats={availableFlats}
        />
      ) : null}

      {/* Delete Resident Dialog */}
      {deletingResident ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="fixed inset-0 bg-stone-950/40 backdrop-blur-sm transition-opacity"
            onClick={() => setDeletingResident(null)}
            aria-hidden="true"
          />

          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl transition-all">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-stone-950">
                  Remove Resident
                </h3>
                <p className="mt-1 text-xs text-stone-500">
                  Are you sure you want to remove{" "}
                  <strong className="text-stone-900">{deletingResident.name}</strong> from the society directory?
                </p>

                {deleteError ? (
                  <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                    {deleteError}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-stone-100 pt-4">
              <button
                type="button"
                onClick={() => setDeletingResident(null)}
                disabled={isDeleting}
                className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteResident}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-red-700 transition disabled:opacity-50"
              >
                {isDeleting ? "Removing..." : "Remove Resident"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
