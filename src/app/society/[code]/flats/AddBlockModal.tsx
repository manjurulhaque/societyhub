"use client"

import { toast } from "sonner"

import { useState, useTransition } from "react"
import { createBlock } from "./actions/blockActions"

interface AddBlockModalProps {
  isOpen: boolean
  onClose: () => void
  societyCode: string
}

export function AddBlockModal({
  isOpen,
  onClose,
  societyCode,
}: AddBlockModalProps) {
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (!isOpen) return null

  const handleSave = () => {
    if (!name.trim()) {
      setError("Please provide a block or wing name.")
      return
    }

    setError(null)

    startTransition(async () => {
      try {
        const res = await createBlock(societyCode, { name: name.trim() })
        if (res.error) {
          setError(res.error)
        } else {
          toast.success("Block created successfully")
          setName("")
          onClose()
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to create block."
        setError(msg)
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
        className="fixed inset-0 bg-stone-950/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl transition-all">
        <div className="flex items-start justify-between gap-4 border-b border-stone-100 pb-4">
          <div>
            <h3 className="text-lg font-bold text-stone-950">Add Block / Tower</h3>
            <p className="mt-1 text-xs text-stone-500">
              Create a new structural building, wing, or tower for this society.
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
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-stone-100 pt-4">
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
            {isPending ? "Creating..." : "Create Block"}
          </button>
        </div>
      </div>
    </div>
  )
}
