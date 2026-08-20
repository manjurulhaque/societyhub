"use client"

import { useState, useTransition } from "react"
import { AdminModal, AdminButton, AdminAlert } from "@/components/admin"
import { deleteBudget } from "./actions"

export interface BudgetDeleteTarget {
  id: string
  name: string
  financialYearName: string
  isLocked: boolean
  itemCount: number
}

export interface BudgetDeleteDialogProps {
  isOpen: boolean
  onClose: () => void
  societyCode: string
  budget: BudgetDeleteTarget | null
  onSuccess: (message: string) => void
}

export function BudgetDeleteDialog({
  isOpen,
  onClose,
  societyCode,
  budget,
  onSuccess,
}: BudgetDeleteDialogProps) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (!budget) return null

  const handleDelete = () => {
    setError(null)
    startTransition(async () => {
      const res = await deleteBudget(societyCode, budget.id)
      if (res.error) {
        setError(res.error)
      } else {
        onSuccess(res.message || "Budget plan deleted successfully.")
        onClose()
      }
    })
  }

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Budget Plan"
      maxWidth="md"
    >
      <div className="space-y-4">
        {error && (
          <AdminAlert variant="danger">
            {error}
          </AdminAlert>
        )}

        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/50 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-stone-900">
              Are you sure you want to delete this budget?
            </h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              This will permanently delete the budget plan <strong className="text-stone-900">&quot;{budget.name}&quot;</strong> ({budget.financialYearName}) along with its <strong>{budget.itemCount} ledger allocations</strong>.
            </p>
          </div>
        </div>

        {budget.isLocked && (
          <AdminAlert variant="warning">
            This budget belongs to a <strong>locked/frozen</strong> Financial Year and cannot be deleted.
          </AdminAlert>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <AdminButton
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </AdminButton>
          <AdminButton
            type="button"
            variant="danger"
            onClick={handleDelete}
            disabled={isPending || budget.isLocked}
          >
            {isPending ? "Deleting..." : "Confirm Delete"}
          </AdminButton>
        </div>
      </div>
    </AdminModal>
  )
}
