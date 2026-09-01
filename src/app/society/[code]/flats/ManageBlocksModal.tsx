"use client"

import { toast } from "sonner"

import { useState, useTransition } from "react"
import { AdminBadge } from "@/components/admin"
import { createBlock, updateBlock, deleteBlock, batchUpdateBlockPrefix, getTowerDirectoryData } from "./actions"
import type { BlockOption } from "./AddFlatModal"
import {
  generateTowerDirectoryPDF,
  exportTowerDirectoryCSV,
} from "@/lib/pdf/towerDirectoryPdfGenerator"

export type BlockFinancialScorecard = {
  totalBilled: number
  totalPaid: number
  totalOutstanding: number
  defaultersCount: number
  collectionRate: number
  totalUnits: number
  occupiedUnits: number
  occupancyRate: number
}

export type BlockWithDetails = BlockOption & {
  isActive?: boolean
  flatCount?: number
  financialScorecard?: BlockFinancialScorecard
}

interface ManageBlocksModalProps {
  isOpen: boolean
  onClose: () => void
  societyCode: string
  blocks: BlockWithDetails[]
  onOpenEditSingle?: (block: BlockWithDetails) => void
}

export function ManageBlocksModal({
  isOpen,
  onClose,
  societyCode,
  blocks,
  onOpenEditSingle,
}: ManageBlocksModalProps) {
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [newBlockName, setNewBlockName] = useState("")
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [downloadingBlockId, setDownloadingBlockId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (!isOpen) return null

  const handleExportPDF = async (blockId: string) => {
    try {
      setDownloadingBlockId(blockId)
      const res = await getTowerDirectoryData(societyCode, blockId)
      if (res.error || !res.data) {
        setError(res.error || "Failed to load tower directory.")
        return
      }
      generateTowerDirectoryPDF(res.data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate PDF.")
    } finally {
      setDownloadingBlockId(null)
    }
  }

  const handleExportCSV = async (blockId: string) => {
    try {
      setDownloadingBlockId(blockId)
      const res = await getTowerDirectoryData(societyCode, blockId)
      if (res.error || !res.data) {
        setError(res.error || "Failed to load tower roster.")
        return
      }
      exportTowerDirectoryCSV(res.data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to export CSV.")
    } finally {
      setDownloadingBlockId(null)
    }
  }

  const handleBatchPrefix = (newPrefix: "Wing" | "Tower" | "Block" | "Building") => {
    if (!confirm(`Are you sure you want to change the prefix of all ${blocks.length} block(s) to "${newPrefix}" (e.g. ${newPrefix} A, ${newPrefix} B)?`)) {
      return
    }

    setError(null)
    startTransition(async () => {
      try {
        const res = await batchUpdateBlockPrefix(societyCode, newPrefix)
        if (res.error) {
          setError(res.error)
        } else {
          toast.success("Block updated successfully")
          setSuccessMsg(res.message || `All blocks updated to "${newPrefix}".`)
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to batch update prefixes.")
      }
    })
  }

  const handleStartEdit = (block: BlockWithDetails) => {
    setEditingBlockId(block.id)
    setEditingName(block.name)
    setError(null)
    setSuccessMsg(null)
  }

  const handleCancelEdit = () => {
    setEditingBlockId(null)
    setEditingName("")
    setError(null)
  }

  const handleSaveEdit = (blockId: string) => {
    if (!editingName.trim()) {
      setError("Block name cannot be empty.")
      return
    }

    setError(null)
    startTransition(async () => {
      try {
        const res = await updateBlock(societyCode, blockId, { name: editingName.trim() })
        if (res.error) {
          setError(res.error)
        } else {
          toast.success("Block updated successfully")
          setSuccessMsg(`Block renamed to "${editingName.trim()}" successfully.`)
          setEditingBlockId(null)
          setEditingName("")
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to update block.")
      }
    })
  }

  const handleAddNew = () => {
    if (!newBlockName.trim()) {
      setError("Please provide a name for the new block.")
      return
    }

    setError(null)
    startTransition(async () => {
      try {
        const res = await createBlock(societyCode, { name: newBlockName.trim() })
        if (res.error) {
          setError(res.error)
        } else {
          toast.success("Block updated successfully")
          setSuccessMsg(`Block "${newBlockName.trim()}" created successfully.`)
          setNewBlockName("")
          setIsAddingNew(false)
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to create block.")
      }
    })
  }

  const handleDelete = (block: BlockWithDetails) => {
    const count = block.flatCount ?? 0
    if (count > 0) {
      setError(`Cannot delete "${block.name}" because it contains ${count} flat(s). Please move or delete the flats first.`)
      return
    }

    if (!confirm(`Are you sure you want to delete block "${block.name}"?`)) return

    setError(null)
    startTransition(async () => {
      try {
        const res = await deleteBlock(societyCode, block.id)
        if (res.error) {
          setError(res.error)
        } else {
          toast.success("Block updated successfully")
          setSuccessMsg(`Block "${block.name}" deleted.`)
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to delete block.")
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-stone-950/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl transition-all flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-stone-100 pb-4 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-stone-900 px-2.5 py-0.5 text-xs font-bold text-white">
                {blocks.length} Wing(s) / Tower(s)
              </span>
            </div>
            <h3 className="mt-1 text-lg font-bold text-stone-950">Manage Blocks & Wings</h3>
            <p className="text-xs text-stone-500">
              Create, rename, or manage structural towers and wings for this society.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Feedback Alerts */}
        <div className="py-2 space-y-2 shrink-0">
          {error && (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-red-500 hover:text-red-700 font-bold"
              >
                ✕
              </button>
            </div>
          )}
          {successMsg && (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800">
              <span>{successMsg}</span>
              <button
                type="button"
                onClick={() => setSuccessMsg(null)}
                className="text-emerald-600 hover:text-emerald-800 font-bold"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Action: Add New Block */}
        <div className="pb-3 border-b border-stone-100 shrink-0">
          {!isAddingNew ? (
            <button
              type="button"
              onClick={() => {
                setIsAddingNew(true)
                setError(null)
                setSuccessMsg(null)
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-stone-300 bg-stone-50/70 px-3.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-100 hover:text-stone-950 transition w-full justify-center"
            >
              <span>+ Add New Block / Tower</span>
            </button>
          ) : (
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900 block">Create New Wing / Tower</span>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-stone-400 font-medium mr-1">Prefix:</span>
                  {["Wing", "Tower", "Block", "Building"].map((prefix) => (
                    <button
                      key={prefix}
                      type="button"
                      onClick={() => {
                        const regex = /^(Wing|Tower|Block|Building)\s*/i
                        const remainder = newBlockName.replace(regex, "").trim()
                        setNewBlockName(`${prefix} ${remainder}`.trim())
                      }}
                      className="rounded-md border border-stone-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-stone-600 hover:bg-stone-200 hover:text-stone-900 transition"
                    >
                      {prefix}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newBlockName}
                  onChange={(e) => setNewBlockName(e.target.value)}
                  placeholder="e.g. Tower 4, Wing D, Emerald Block"
                  disabled={isPending}
                  className="flex-1 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleAddNew}
                  disabled={isPending || !newBlockName.trim()}
                  className="rounded-xl bg-stone-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-stone-800 transition disabled:opacity-50"
                >
                  {isPending ? "Adding..." : "Add Block"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNew(false)
                    setNewBlockName("")
                  }}
                  disabled={isPending}
                  className="rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-100 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Batch Prefix Converter */}
        {blocks.length > 0 && (
          <div className="pb-3 border-b border-stone-100 flex items-center justify-between gap-2 flex-wrap text-xs shrink-0">
            <span className="text-stone-500 font-medium">Batch change all prefixes to:</span>
            <div className="flex items-center gap-1.5">
              {(["Wing", "Tower", "Block", "Building"] as const).map((prefix) => (
                <button
                  key={prefix}
                  type="button"
                  onClick={() => handleBatchPrefix(prefix)}
                  disabled={isPending}
                  className="rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-200 px-2 py-1 text-[11px] font-semibold text-stone-700 hover:text-stone-950 transition disabled:opacity-40"
                  title={`Convert all structures to use "${prefix}" prefix`}
                >
                  All &quot;{prefix}&quot;
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Blocks List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2">
          {blocks.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-400">
              No blocks created yet. Click above to add the first block.
            </div>
          ) : (
            blocks.map((block) => {
              const isEditing = editingBlockId === block.id
              const count = block.flatCount ?? 0

              return (
                <div
                  key={block.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-3 hover:border-stone-300 transition"
                >
                  {isEditing ? (
                    <div className="flex flex-1 items-center gap-2">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        disabled={isPending}
                        className="flex-1 rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-900 focus:border-stone-900 focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(block.id)}
                        disabled={isPending || !editingName.trim()}
                        className="rounded-xl bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-stone-800 transition disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        disabled={isPending}
                        className="rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-100 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 text-sm font-bold text-stone-800">
                          🏢
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-stone-950">
                              {block.name}
                            </span>
                            {block.financialScorecard && (
                              <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                                block.financialScorecard.collectionRate >= 90
                                  ? "bg-emerald-50 text-emerald-700"
                                  : block.financialScorecard.collectionRate >= 70
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-red-50 text-red-700"
                              }`}>
                                {block.financialScorecard.collectionRate}% Collected
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-stone-500 block">
                            {count} Unit{count === 1 ? "" : "s"}
                            {block.financialScorecard ? (
                              <>
                                {" • "}
                                <span className={block.financialScorecard.totalOutstanding > 0 ? "text-red-600 font-semibold" : "text-stone-600"}>
                                  ₹{block.financialScorecard.totalOutstanding.toLocaleString("en-IN")} Dues
                                </span>
                                {block.financialScorecard.defaultersCount > 0 && (
                                  <span className="text-red-700 font-bold ml-1">
                                    ({block.financialScorecard.defaultersCount} Overdue)
                                  </span>
                                )}
                              </>
                            ) : null}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <AdminBadge
                          variant={block.isActive !== false ? "success" : "neutral"}
                          size="sm"
                        >
                          {block.isActive !== false ? "Active" : "Inactive"}
                        </AdminBadge>

                        {count > 0 && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleExportPDF(block.id)}
                              disabled={downloadingBlockId === block.id}
                              className="inline-flex items-center gap-1 rounded-xl border border-stone-200 bg-white px-2 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-950 transition disabled:opacity-50"
                              title="Download official PDF Roster"
                            >
                              <span>{downloadingBlockId === block.id ? "⏳" : "📄"}</span>
                              <span>PDF</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleExportCSV(block.id)}
                              disabled={downloadingBlockId === block.id}
                              className="inline-flex items-center gap-1 rounded-xl border border-stone-200 bg-white px-2 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-950 transition disabled:opacity-50"
                              title="Download CSV Spreadsheet"
                            >
                              <span>📊</span>
                              <span>CSV</span>
                            </button>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => handleStartEdit(block)}
                          className="inline-flex items-center gap-1 rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-950 transition"
                          title="Rename Block"
                        >
                          <svg className="h-3.5 w-3.5 text-stone-500" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
                            <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
                          </svg>
                          <span>Rename</span>
                        </button>

                        {count === 0 && (
                          <button
                            type="button"
                            onClick={() => handleDelete(block)}
                            disabled={isPending}
                            className="rounded-xl p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600 transition"
                            title="Delete Block"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path
                                fillRule="evenodd"
                                d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-stone-100 pt-4 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-stone-900 px-5 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
