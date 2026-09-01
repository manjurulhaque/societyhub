"use client"

import { toast } from "sonner"

import { useState, useMemo, useTransition } from "react"
import Link from "next/link"
import { AdminTable, AdminBadge } from "@/components/admin"
import { maskPan, maskAadhaar } from "@/lib/masking"
import { RegisterResidentModal, type FlatOption } from "./RegisterResidentModal"
import { EditResidentModal } from "./EditResidentModal"
import { removeResident, toggleResidentKyc } from "./residentActions"
import { EntityAuditDrawer } from "@/components/audit/EntityAuditDrawer"

export type ResidentItem = {
  id: string
  name: string
  phone: string | null
  email: string | null
  panNumber: string | null
  aadhaarNumber: string | null
  passportNumber?: string | null
  voterId?: string | null
  dob?: string | null
  gender?: string | null
  bloodGroup?: string | null
  occupation?: string | null
  permanentAddress?: string | null
  emergencyContactName?: string | null
  emergencyContactPhone?: string | null
  primaryRole: string
  flatsDisplay: string
  kycVerified: boolean
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
  const [editingResident, setEditingResident] = useState<ResidentItem | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRole, setSelectedRole] = useState<string>("ALL")

  const [deletingResident, setDeletingResident] = useState<ResidentItem | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, startDeleteTransition] = useTransition()
  const [isTogglingKyc, startKycTransition] = useTransition()

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
          toast.success("Resident removed successfully")
          setDeletingResident(null)
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to delete resident."
        setDeleteError(message)
      }
    })
  }

  const handleToggleKyc = (residentId: string) => {
    startKycTransition(async () => {
      await toggleResidentKyc(societyCode, residentId)
    })
  }

  const tableHeaders = [
    "Resident Name",
    "Contact Details",
    "Identity / Docs",
    "Assigned Flats",
    "Primary Role",
    "KYC Status",
    "Action",
  ]

  return (
    <div className="space-y-4">
      {/* Search & Actions Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Search residents, flats, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3 py-1.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none sm:w-64"
          />

          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-700 focus:border-stone-900 focus:outline-none"
          >
            <option value="ALL">All Roles</option>
            <option value="OWNER">Owners</option>
            <option value="TENANT">Tenants</option>
            <option value="FAMILY">Family Members</option>
          </select>
        </div>

        {canManageResidents ? (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-stone-900 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            <span>+ Register Resident</span>
          </button>
        ) : null}
      </div>

      {/* Residents Table */}
      {filteredResidents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-200 bg-white p-8 text-center">
          <p className="text-xs text-stone-500">
            {searchQuery || selectedRole !== "ALL"
              ? "No residents match your filter criteria."
              : "No residents registered yet."}
          </p>
        </div>
      ) : (
        <AdminTable
          headers={tableHeaders}
          rows={filteredResidents.map((r) => (
            <tr key={r.id} className="border-t border-stone-100 text-xs hover:bg-stone-50/50 transition">
              <td className="px-4 py-3.5">
                <Link
                  href={`/society/${societyCode}/members/${r.id}`}
                  className="font-bold text-stone-950 hover:text-blue-600 transition block"
                >
                  {r.name}
                </Link>
              </td>
              <td className="px-4 py-3.5">
                <div className="space-y-0.5 text-stone-600">
                  {r.phone ? <p className="font-mono">{r.phone}</p> : null}
                  {r.email ? <p className="text-stone-400">{r.email}</p> : null}
                  {!r.phone && !r.email ? <p className="text-stone-400 italic">No contact</p> : null}
                </div>
              </td>
              <td className="px-4 py-3.5">
                <div className="space-y-0.5 text-[11px] font-mono text-stone-600">
                  {r.panNumber ? <p>PAN: {maskPan(r.panNumber)}</p> : null}
                  {r.aadhaarNumber ? <p>UID: {maskAadhaar(r.aadhaarNumber)}</p> : null}
                  {!r.panNumber && !r.aadhaarNumber ? (
                    <span className="text-stone-400 italic font-sans">—</span>
                  ) : null}
                </div>
              </td>
              <td className="px-4 py-3.5 text-stone-700 font-medium">
                {r.flatsDisplay || <span className="text-stone-400 italic">Unassigned</span>}
              </td>
              <td className="px-4 py-3.5">
                <AdminBadge
                  variant={
                    r.primaryRole === "OWNER"
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
              <td className="px-4 py-3.5 whitespace-nowrap">
                {canManageResidents ? (
                  <button
                    type="button"
                    disabled={isTogglingKyc}
                    onClick={() => handleToggleKyc(r.id)}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold transition border ${
                      r.kycVerified
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                        : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                    }`}
                  >
                    <span>{r.kycVerified ? "✓ KYC VERIFIED" : "⏳ KYC PENDING"}</span>
                  </button>
                ) : (
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                      r.kycVerified
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-amber-50 text-amber-800 border-amber-200"
                    }`}
                  >
                    {r.kycVerified ? "✓ VERIFIED" : "PENDING"}
                  </span>
                )}
              </td>
              <td className="px-4 py-3.5 text-right whitespace-nowrap">
                <div className="flex items-center justify-end gap-1.5">
                  <Link
                    href={`/society/${societyCode}/members/${r.id}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2 py-1 text-[11px] font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition"
                    title="View Resident 360° Profile"
                  >
                    <span>View 360°</span>
                    <span>→</span>
                  </Link>
                  <EntityAuditDrawer
                    entity="Person"
                    entityId={r.id}
                    entityTitle={r.name}
                    buttonVariant="compact"
                  />
                  {canManageResidents && (
                    <>
                      <button
                        type="button"
                        onClick={() => setEditingResident(r)}
                        className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-900 transition"
                        title="Edit Resident Profile"
                        aria-label={`Edit profile for ${r.name}`}
                      >
                        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingResident(r)}
                        className="rounded-lg p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600 transition"
                        title="Remove Resident"
                        aria-label={`Remove ${r.name}`}
                      >
                        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </td>
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

      {/* Edit Resident Modal */}
      {editingResident ? (
        <EditResidentModal
          isOpen={Boolean(editingResident)}
          onClose={() => setEditingResident(null)}
          societyCode={societyCode}
          resident={editingResident}
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
