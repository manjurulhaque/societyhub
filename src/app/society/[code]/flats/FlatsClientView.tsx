"use client"

import { useState, useMemo, useTransition } from "react"
import Link from "next/link"
import { AdminTable, AdminBadge, AdminStatCard } from "@/components/admin"
import { AddBlockModal } from "./AddBlockModal"
import { AddFlatModal, type BlockOption } from "./AddFlatModal"
import { EditFlatModal } from "./EditFlatModal"
import { BulkCreateFlatsModal } from "./BulkCreateFlatsModal"
import { FlatMatrixView } from "./FlatMatrixView"
import { FlatQuickDrawer } from "./FlatQuickDrawer"
import { deleteFlat } from "./actions"

export type FlatOccupantSummary = {
  id: string
  personId: string
  name: string
  role: string
  phone: string | null
  email: string | null
  isPrimary: boolean
}

export type FlatListItem = {
  id: string
  number: string
  floor: number | null
  unitType: string | null
  status: string
  area: string | null
  areaUnit: string
  blockId: string
  blockName: string
  occupants: string[]
  occupantDetails?: FlatOccupantSummary[]
  unpaidDues?: number
  unpaidBillsCount?: number
  isDefaulter?: boolean
  shareCertificateNumber?: string | null
  parkingSlot?: string | null
  intercomNumber?: string | null
}

interface FlatsClientViewProps {
  societyCode: string
  flats: FlatListItem[]
  blocks: BlockOption[]
  canManageFlats: boolean
}

export function FlatsClientView({
  societyCode,
  flats,
  blocks,
  canManageFlats,
}: FlatsClientViewProps) {
  const [viewMode, setViewMode] = useState<"table" | "matrix">("matrix")
  const [quickPreviewFlat, setQuickPreviewFlat] = useState<FlatListItem | null>(null)

  const [isAddBlockOpen, setIsAddBlockOpen] = useState(false)
  const [isAddFlatOpen, setIsAddFlatOpen] = useState(false)
  const [isBulkCreateOpen, setIsBulkCreateOpen] = useState(false)
  const [editingFlat, setEditingFlat] = useState<FlatListItem | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedBlockId, setSelectedBlockId] = useState<string>("ALL")
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL")

  const [deletingFlat, setDeletingFlat] = useState<FlatListItem | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, startDeleteTransition] = useTransition()

  // Filtered flats
  const filteredFlats = useMemo(() => {
    return flats.filter((f) => {
      if (selectedBlockId !== "ALL" && f.blockId !== selectedBlockId) return false
      if (selectedStatus !== "ALL" && f.status !== selectedStatus) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchNumber = f.number.toLowerCase().includes(q)
        const matchBlock = f.blockName.toLowerCase().includes(q)
        const matchOccupants = f.occupants.some((name) => name.toLowerCase().includes(q))
        return matchNumber || matchBlock || matchOccupants
      }

      return true
    })
  }, [flats, selectedBlockId, selectedStatus, searchQuery])

  // Stats
  const totalFlats = flats.length
  const occupiedCount = flats.filter((f) => f.status === "OCCUPIED").length
  const vacantCount = flats.filter((f) => f.status === "VACANT").length
  const totalBlocks = blocks.length

  const handleDeleteFlat = () => {
    if (!deletingFlat) return
    setDeleteError(null)

    startDeleteTransition(async () => {
      try {
        const res = await deleteFlat(societyCode, deletingFlat.id)
        if (res.error) {
          setDeleteError(res.error)
        } else {
          setDeletingFlat(null)
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to delete flat."
        setDeleteError(msg)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          title="Total Flats / Units"
          value={totalFlats}
          subtitle="Configured residential/commercial units"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />

        <AdminStatCard
          title="Occupied Units"
          value={occupiedCount}
          subtitle="Active owner/tenant residencies"
          icon={
            <svg className="h-5 w-5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          }
        />

        <AdminStatCard
          title="Vacant Units"
          value={vacantCount}
          subtitle="Available for possession or rent"
          icon={
            <svg className="h-5 w-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Total Blocks / Wings"
          value={totalBlocks}
          subtitle="Configured towers and blocks"
          icon={
            <svg className="h-5 w-5 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search and Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-xl border border-stone-200 bg-stone-100/80 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode("matrix")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                viewMode === "matrix"
                  ? "bg-white text-stone-950 font-bold shadow-xs"
                  : "text-stone-500 hover:text-stone-900"
              }`}
            >
              <span>🏢</span>
              <span>Tower Matrix</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                viewMode === "table"
                  ? "bg-white text-stone-950 font-bold shadow-xs"
                  : "text-stone-500 hover:text-stone-900"
              }`}
            >
              <span>📋</span>
              <span>Table List</span>
            </button>
          </div>

          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search flat, block, resident, parking..."
              className="w-56 sm:w-64 rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2 pl-9 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none"
            />
            <svg
              className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-stone-400"
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

          {viewMode === "table" && blocks.length > 0 ? (
            <select
              value={selectedBlockId}
              onChange={(e) => setSelectedBlockId(e.target.value)}
              className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 focus:border-stone-900 focus:outline-none"
            >
              <option value="ALL">All Blocks ({blocks.length})</option>
              {blocks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          ) : null}

          {viewMode === "table" && (
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 focus:border-stone-900 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="OCCUPIED">Occupied</option>
              <option value="VACANT">Vacant</option>
              <option value="UNDER_RENOVATION">Under Renovation</option>
            </select>
          )}
        </div>

        {/* Action Buttons */}
        {canManageFlats ? (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsAddBlockOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 shadow-xs hover:bg-stone-50 hover:text-stone-900 transition"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              <span>+ Add Block / Wing</span>
            </button>

            <button
              type="button"
              onClick={() => setIsBulkCreateOpen(true)}
              disabled={blocks.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-800 shadow-xs hover:bg-stone-50 hover:text-stone-950 transition disabled:opacity-50"
            >
              <span className="text-amber-600 font-bold">⚡</span>
              <span>Bulk Add / Import</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddFlatOpen(true)}
              disabled={blocks.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition disabled:opacity-50"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              <span>+ Add Flat / Unit</span>
            </button>
          </div>
        ) : null}
      </div>

      {/* Main Content: Matrix View or Table View */}
      {viewMode === "matrix" ? (
        <FlatMatrixView
          societyCode={societyCode}
          flats={flats}
          blocks={blocks}
          searchQuery={searchQuery}
          onSelectFlat={(f) => setQuickPreviewFlat(f)}
        />
      ) : filteredFlats.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-200 bg-white p-12 text-center shadow-xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-400">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="mt-3 text-sm font-semibold text-stone-900">No flats found</h3>
          <p className="mt-1 text-xs text-stone-500">
            {blocks.length === 0
              ? "Start by adding a Block/Wing (e.g. Wing A), then add flats."
              : "No flats match your filter criteria."}
          </p>
          {canManageFlats && blocks.length === 0 ? (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setIsAddBlockOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition"
              >
                + Create First Block
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <AdminTable
          headers={[
            "Flat Number",
            "Block / Wing",
            "Floor",
            "Configuration",
            "Carpet Area",
            "Occupancy",
            "Current Occupants",
            "Action",
          ]}
          rows={filteredFlats.map((flat) => (
            <tr key={flat.id} className="border-t border-stone-100 hover:bg-stone-50/60 transition-colors">
              <td className="px-4 py-3.5 font-bold text-stone-950 text-xs">
                <button
                  type="button"
                  onClick={() => setQuickPreviewFlat(flat)}
                  className="hover:text-blue-600 font-bold transition text-left"
                >
                  {flat.number}
                </button>
              </td>
              <td className="px-4 py-3.5 text-stone-700 text-xs font-medium">
                {flat.blockName}
              </td>
              <td className="px-4 py-3.5 text-stone-600 text-xs">
                {flat.floor !== null ? `Floor ${flat.floor}` : "—"}
              </td>
              <td className="px-4 py-3.5 text-stone-600 text-xs">
                {flat.unitType || "—"}
              </td>
              <td className="px-4 py-3.5 text-stone-600 text-xs">
                {flat.area ? `${flat.area} ${flat.areaUnit}` : "—"}
              </td>
              <td className="px-4 py-3.5">
                <AdminBadge
                  variant={
                    flat.status === "OCCUPIED"
                      ? "success"
                      : flat.status === "UNDER_RENOVATION"
                        ? "warning"
                        : "neutral"
                  }
                  size="sm"
                  dot
                >
                  {flat.status.replace(/_/g, " ")}
                </AdminBadge>
              </td>
              <td className="px-4 py-3.5 text-stone-700 text-xs">
                {flat.occupants.length > 0 ? (
                  <span className="font-medium text-stone-900">
                    {flat.occupants.join(", ")}
                  </span>
                ) : (
                  <span className="text-stone-400">None assigned</span>
                )}
              </td>
              <td className="px-4 py-3.5 text-right whitespace-nowrap">
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setQuickPreviewFlat(flat)}
                    className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2 py-1 text-[11px] font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition"
                  >
                    <span>Quick View</span>
                    <span>→</span>
                  </button>

                  <Link
                    href={`/society/${societyCode}/flats/${flat.id}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2 py-1 text-[11px] font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition"
                  >
                    <span>360°</span>
                  </Link>

                  {canManageFlats && (
                    <>
                      <button
                        type="button"
                        onClick={() => setEditingFlat(flat)}
                        className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2 py-1 text-[11px] font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition"
                        title="Edit Flat Details"
                      >
                        <svg className="h-3.5 w-3.5 text-stone-500" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
                          <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
                        </svg>
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeletingFlat(flat)}
                        className="rounded-lg p-1 text-stone-400 hover:bg-red-50 hover:text-red-600 transition"
                        title="Delete Flat"
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

      {/* Add Block Modal */}
      {isAddBlockOpen ? (
        <AddBlockModal
          isOpen={isAddBlockOpen}
          onClose={() => setIsAddBlockOpen(false)}
          societyCode={societyCode}
        />
      ) : null}

      {/* Add Flat Modal */}
      {isAddFlatOpen ? (
        <AddFlatModal
          isOpen={isAddFlatOpen}
          onClose={() => setIsAddFlatOpen(false)}
          societyCode={societyCode}
          blocks={blocks}
        />
      ) : null}

      {/* Bulk Create Flats Modal */}
      {isBulkCreateOpen ? (
        <BulkCreateFlatsModal
          isOpen={isBulkCreateOpen}
          onClose={() => setIsBulkCreateOpen(false)}
          societyCode={societyCode}
          blocks={blocks}
        />
      ) : null}

      {/* Edit Flat Modal */}
      {editingFlat ? (
        <EditFlatModal
          isOpen={Boolean(editingFlat)}
          onClose={() => setEditingFlat(null)}
          societyCode={societyCode}
          blocks={blocks}
          flat={{
            id: editingFlat.id,
            blockId: editingFlat.blockId,
            blockName: editingFlat.blockName,
            number: editingFlat.number,
            floor: editingFlat.floor,
            unitType: editingFlat.unitType,
            status: editingFlat.status,
            area: editingFlat.area ? parseFloat(editingFlat.area) : null,
            areaUnit: editingFlat.areaUnit,
            parkingSlot: editingFlat.parkingSlot || null,
            intercomNumber: editingFlat.intercomNumber || null,
          }}
        />
      ) : null}

      {/* Quick Flat 360 Drawer */}
      <FlatQuickDrawer
        isOpen={Boolean(quickPreviewFlat)}
        onClose={() => setQuickPreviewFlat(null)}
        societyCode={societyCode}
        flat={quickPreviewFlat}
        canManage={canManageFlats}
        onEditFlat={(flat) => {
          setEditingFlat(flat)
        }}
      />

      {/* Delete Flat Confirmation */}
      {deletingFlat ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="fixed inset-0 bg-stone-950/40 backdrop-blur-sm transition-opacity"
            onClick={() => setDeletingFlat(null)}
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
                  Delete Flat
                </h3>
                <p className="mt-1 text-xs text-stone-500">
                  Are you sure you want to remove Flat{" "}
                  <strong className="text-stone-900">
                    {deletingFlat.blockName}-{deletingFlat.number}
                  </strong>
                  ?
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
                onClick={() => setDeletingFlat(null)}
                disabled={isDeleting}
                className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteFlat}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-red-700 transition disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete Flat"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
