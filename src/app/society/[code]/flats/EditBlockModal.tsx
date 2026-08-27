"use client"

import { useState, useEffect, useTransition } from "react"
import { updateBlock, deleteBlock } from "./actions"
import type { BlockOption } from "./AddFlatModal"

interface EditBlockModalProps {
  isOpen: boolean
  onClose: () => void
  societyCode: string
  block: (BlockOption & { isActive?: boolean; flatCount?: number }) | null
  onDeleted?: (blockId: string) => void
}

export function EditBlockModal({
  isOpen,
  onClose,
  societyCode,
  block,
  onDeleted,
}: EditBlockModalProps) {
  const [name, setName] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (block) {
      setName(block.name)
      setIsActive(block.isActive ?? true)
      setError(null)
    }
  }, [block])

  if (!isOpen || !block) return null

  const flatCount = block.flatCount ?? 0

  const handleSave = () => {
    if (!name.trim()) {
      setError("Please provide a block or wing name.")
      return
    }

    setError(null)

    startTransition(async () => {
      try {
        const res = await updateBlock(societyCode, block.id, {
          name: name.trim(),
          isActive,
        })
        if (res.error) {
          setError(res.error)
        } else {
          onClose()
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to update block."
        setError(msg)
      }
    })
  }

  const handleDelete = () => {
    if (flatCount > 0) {
      setError(`Cannot delete "${block.name}" because it contains ${flatCount} flat(s). Please move or remove those flats first.`)
      return
    }

    if (!confirm(`Are you sure you want to delete block "${block.name}"?`)) return

    setIsDeleting(true)
    setError(null)

    startTransition(async () => {
      try {
        const res = await deleteBlock(societyCode, block.id)
        if (res.error) {
          setError(res.error)
        } else {
          onDeleted?.(block.id)
          onClose()
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to delete block."
        setError(msg)
      } finally {
        setIsDeleting(false)
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

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-stone-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-stone-700">
                Block #{block.id.slice(0, 6)}
              </span>
              {flatCount > 0 && (
                <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                  {flatCount} Unit(s)
                </span>
              )}
            </div>
            <h3 className="mt-1 text-lg font-bold text-stone-950">Edit Block / Wing</h3>
            <p className="text-xs text-stone-500">
              Update structural wing name or configuration.
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

        {/* Content */}
        <div className="mt-4 space-y-4">
          {error ? (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
              <svg className="h-4 w-4 shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          ) : null}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                Structure / Wing Name <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-stone-400 font-medium mr-1">Prefix:</span>
                {["Wing", "Tower", "Block", "Building"].map((prefix) => (
                  <button
                    key={prefix}
                    type="button"
                    onClick={() => {
                      const regex = /^(Wing|Tower|Block|Building)\s*/i
                      const remainder = name.replace(regex, "").trim()
                      setName(`${prefix} ${remainder}`.trim())
                    }}
                    className="rounded-md border border-stone-200 bg-stone-50 px-1.5 py-0.5 text-[10px] font-semibold text-stone-600 hover:bg-stone-200 hover:text-stone-900 transition"
                  >
                    {prefix}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
              placeholder="e.g. Wing A, Tower 1, Sapphire Block"
              className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none disabled:bg-stone-100"
            />
          </div>

          <div className="rounded-2xl border border-stone-100 bg-stone-50/60 p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-stone-900 block">Active Structural Status</span>
                <span className="text-[11px] text-stone-500 block">
                  Inactive blocks will be hidden from new unit creation menus.
                </span>
              </div>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={isPending}
                className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
              />
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="mt-6 flex items-center justify-between border-t border-stone-100 pt-4">
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending || isDeleting}
            className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800 transition disabled:opacity-40"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Delete Block</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-5 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition disabled:opacity-50"
            >
              {isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
