"use client"

import { toast } from "sonner"

import { useState, useTransition, useMemo } from "react"
import { AdminModal, AdminButton, AdminAlert } from "@/components/admin"
import { createBudget, updateBudget, type BudgetItemInput } from "./actions"

export interface BudgetModalProps {
  isOpen: boolean
  onClose: () => void
  societyCode: string
  budget?: {
    id: string
    name: string
    financialYearId: string
    financialYearName: string
    isLocked: boolean
    items: {
      id?: string
      ledgerId: string
      ledgerName?: string
      allocatedAmount: number
    }[]
  } | null
  financialYears: {
    id: string
    name: string
    isCurrent: boolean
    isLocked: boolean
  }[]
  ledgers: {
    id: string
    name: string
    code: string | null
    group: string
  }[]
  onSuccess: (message: string) => void
}

interface FormBudgetItem {
  id?: string
  ledgerId: string
  allocatedAmount: string
}

function BudgetModalForm({
  onClose,
  societyCode,
  budget,
  financialYears,
  ledgers,
  onSuccess,
}: Omit<BudgetModalProps, "isOpen">) {
  const isEditing = Boolean(budget)

  const [name, setName] = useState<string>(() => budget ? budget.name : "")
  const [financialYearId, setFinancialYearId] = useState<string>(() => {
    if (budget) return budget.financialYearId
    const current = financialYears.find((fy) => fy.isCurrent && !fy.isLocked)
    const fallback = financialYears.find((fy) => !fy.isLocked)
    return current ? current.id : fallback ? fallback.id : ""
  })
  const [items, setItems] = useState<FormBudgetItem[]>(() => {
    if (budget) {
      return budget.items.map((i) => ({
        id: i.id,
        ledgerId: i.ledgerId,
        allocatedAmount: String(i.allocatedAmount),
      }))
    }
    return ledgers.length > 0
      ? [{ ledgerId: ledgers[0].id, allocatedAmount: "" }]
      : []
  })
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Calculate live total sum
  const totalAllocated = useMemo(() => {
    return items.reduce((sum, item) => {
      const val = parseFloat(item.allocatedAmount)
      return isNaN(val) || val < 0 ? sum : sum + val
    }, 0)
  }, [items])

  // Selected ledger IDs to help detect duplicate selections
  const selectedLedgerIds = useMemo(() => {
    return new Set(items.map((i) => i.ledgerId).filter(Boolean))
  }, [items])

  const handleAddItem = () => {
    // Pick the first available unselected ledger if possible
    const available = ledgers.find((l) => !selectedLedgerIds.has(l.id))
    const defaultLedgerId = available ? available.id : ledgers[0]?.id || ""
    setItems((prev) => [...prev, { ledgerId: defaultLedgerId, allocatedAmount: "" }])
  }

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      setError("A budget must have at least one ledger allocation head.")
      return
    }
    setError(null)
    setItems((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleItemChange = (index: number, field: keyof FormBudgetItem, value: string) => {
    setError(null)
    setItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError("Please provide a name for this budget plan.")
      return
    }

    if (!financialYearId) {
      setError("Please select an applicable Financial Year.")
      return
    }

    if (items.length === 0) {
      setError("Please allocate at least one expense/asset ledger head.")
      return
    }

    // Check duplicate ledgers
    const ledgerSet = new Set<string>()
    for (const item of items) {
      if (!item.ledgerId) {
        setError("Please choose a valid ledger head for all rows.")
        return
      }
      if (ledgerSet.has(item.ledgerId)) {
        const ledgerName = ledgers.find((l) => l.id === item.ledgerId)?.name || item.ledgerId
        setError(`"${ledgerName}" has been selected multiple times. Combine amounts into a single row.`)
        return
      }
      ledgerSet.add(item.ledgerId)

      const amt = parseFloat(item.allocatedAmount)
      if (isNaN(amt) || amt < 0) {
        setError("Each allocation amount must be a non-negative number.")
        return
      }
    }

    const payloadItems: BudgetItemInput[] = items.map((i) => ({
      id: i.id,
      ledgerId: i.ledgerId,
      allocatedAmount: parseFloat(i.allocatedAmount) || 0,
    }))

    startTransition(async () => {
      let res
      if (isEditing && budget) {
        res = await updateBudget(societyCode, budget.id, {
          name: name.trim(),
          items: payloadItems,
        })
      } else {
        res = await createBudget(societyCode, {
          name: name.trim(),
          financialYearId,
          items: payloadItems,
        })
      }

      if (res.error) {
        setError(res.error)
      } else {
        toast.success("Budget saved successfully")
        onSuccess(res.message || (isEditing ? "Budget updated successfully." : "Budget created successfully."))
        onClose()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <AdminAlert variant="danger">
          {error}
        </AdminAlert>
      )}

      {/* Basic Information */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
            Budget Plan Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Annual Operating Budget 2026-27"
            className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 shadow-xs focus:border-stone-900 focus:outline-hidden focus:ring-1 focus:ring-stone-900"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
            Financial Year <span className="text-red-500">*</span>
          </label>
          <select
            value={financialYearId}
            onChange={(e) => setFinancialYearId(e.target.value)}
            disabled={isEditing}
            className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 shadow-xs focus:border-stone-900 focus:outline-hidden focus:ring-1 focus:ring-stone-900 disabled:bg-stone-100 disabled:text-stone-500"
            required
          >
            {financialYears.map((fy) => (
              <option key={fy.id} value={fy.id} disabled={fy.isLocked}>
                {fy.name} {fy.isCurrent ? "(Current)" : ""} {fy.isLocked ? "[Frozen]" : ""}
              </option>
            ))}
          </select>
          {isEditing && (
            <p className="mt-1 text-[11px] text-stone-500">
              Financial year cannot be changed on an existing budget plan.
            </p>
          )}
        </div>
      </div>

      {/* Ledger Allocations Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
              Account Head Allocations ({items.length})
            </h3>
            <p className="text-xs text-stone-500">
              Assign annual expenditure caps per Chart of Account head.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddItem}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 hover:border-stone-300 transition"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            Add Ledger Head
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-stone-200 bg-stone-50/50">
          <div className="max-h-72 overflow-y-auto divide-y divide-stone-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-100/80 text-[11px] font-bold uppercase tracking-wider text-stone-600 sticky top-0 z-10">
                <tr>
                  <th className="px-3.5 py-2.5 w-3/5">Account Head / Ledger</th>
                  <th className="px-3.5 py-2.5 w-2/5">Allocated Cap (₹)</th>
                  <th className="px-2 py-2.5 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 bg-white">
                {items.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-stone-50/80 transition-colors">
                    <td className="px-3.5 py-2">
                      <select
                        value={item.ledgerId}
                        onChange={(e) => handleItemChange(idx, "ledgerId", e.target.value)}
                        className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-stone-900 focus:outline-hidden"
                        required
                      >
                        {ledgers.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.code ? `[${l.code}] ` : ""}{l.name} ({l.group})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3.5 py-2">
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-xs text-stone-400 font-medium">
                          ₹
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.allocatedAmount}
                          onChange={(e) => handleItemChange(idx, "allocatedAmount", e.target.value)}
                          placeholder="0.00"
                          className="w-full rounded-lg border border-stone-200 bg-white pl-6 pr-2.5 py-1.5 text-xs font-semibold text-stone-900 focus:border-stone-900 focus:outline-hidden"
                          required
                        />
                      </div>
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length <= 1}
                        className="inline-flex items-center justify-center h-7 w-7 rounded-md text-stone-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-stone-400 transition"
                        title="Remove item"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total Footer Banner */}
          <div className="flex items-center justify-between border-t border-stone-200 bg-stone-100/90 px-4 py-3">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
              Total Budgeted Amount:
            </span>
            <span className="text-base font-extrabold text-stone-950 font-mono">
              ₹{totalAllocated.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Modal Actions */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-stone-100">
        <AdminButton
          type="button"
          variant="secondary"
          onClick={onClose}
          disabled={isPending}
        >
          Cancel
        </AdminButton>
        <AdminButton
          type="submit"
          variant="primary"
          disabled={isPending}
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              Saving...
            </span>
          ) : isEditing ? (
            "Save Changes"
          ) : (
            "Create Budget Plan"
          )}
        </AdminButton>
      </div>
    </form>
  )
}

export function BudgetModal(props: BudgetModalProps) {
  const isEditing = Boolean(props.budget)

  return (
    <AdminModal
      isOpen={props.isOpen}
      onClose={props.onClose}
      title={isEditing ? "Edit Budget Plan" : "Create New Budget Plan"}
      maxWidth="xl"
    >
      {props.isOpen && (
        <BudgetModalForm
          key={props.budget?.id || "new"}
          onClose={props.onClose}
          societyCode={props.societyCode}
          budget={props.budget}
          financialYears={props.financialYears}
          ledgers={props.ledgers}
          onSuccess={props.onSuccess}
        />
      )}
    </AdminModal>
  )
}
