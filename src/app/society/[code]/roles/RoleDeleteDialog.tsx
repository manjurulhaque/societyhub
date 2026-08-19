"use client"

import { useState, useTransition } from "react"
import { deleteCustomRole } from "./actions"

interface RoleDeleteDialogProps {
  isOpen: boolean
  onClose: () => void
  societyCode: string
  role: {
    id: string
    name: string
    isSystem: boolean
    memberCount: number
  } | null
}

export function RoleDeleteDialog({
  isOpen,
  onClose,
  societyCode,
  role,
}: RoleDeleteDialogProps) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (!isOpen || !role) return null

  const handleDelete = () => {
    setError(null)
    startTransition(async () => {
      try {
        const res = await deleteCustomRole(societyCode, role.id)
        if (res.error) {
          setError(res.error)
        } else {
          onClose()
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to delete role."
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
              Delete Custom Role
            </h3>
            <p className="mt-1 text-xs text-stone-500">
              Are you sure you want to permanently delete the role{" "}
              <strong className="text-stone-900">&quot;{role.name}&quot;</strong>?
            </p>

            {role.memberCount > 0 ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
                <span className="font-semibold">Notice:</span> This role is currently assigned to{" "}
                <strong>{role.memberCount} member(s)</strong>. You must reassign them to another role before deleting.
              </div>
            ) : null}

            {error ? (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                {error}
              </div>
            ) : null}
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
            onClick={handleDelete}
            disabled={isPending || role.memberCount > 0}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-red-700 transition disabled:opacity-50"
          >
            {isPending ? "Deleting..." : "Confirm Delete"}
          </button>
        </div>
      </div>
    </div>
  )
}
