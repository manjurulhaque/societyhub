"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { createExpenseCategoryAction } from "../actions"

interface CategoryOption {
  id: string
  name: string
  code?: string | null
  description?: string | null
}

interface AccountOption {
  id: string
  name: string
  currentBalance: number | string
}

interface VendorOption {
  id: string
  name: string
  companyName?: string | null
}

interface RecordExpenseFormProps {
  code: string
  societyName: string
  initialCategories: CategoryOption[]
  accounts: AccountOption[]
  vendors: VendorOption[]
  isManager: boolean
  isApprover: boolean
  designation: string
  onSubmitAction: (formData: FormData) => Promise<void>
}

export function RecordExpenseForm({
  code,
  societyName,
  initialCategories,
  accounts,
  vendors,
  isManager,
  isApprover,
  designation,
  onSubmitAction,
}: RecordExpenseFormProps) {
  const [categories, setCategories] = useState<CategoryOption[]>(initialCategories)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("")
  const [showAddCatModal, setShowAddCatModal] = useState(false)
  const [newCatName, setNewCatName] = useState("")
  const [newCatDesc, setNewCatDesc] = useState("")
  const [catError, setCatError] = useState<string | null>(null)
  const [isCatPending, startCatTransition] = useTransition()

  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const today = new Date().toISOString().split("T")[0]

  const handleQuickAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCatName.trim()) return

    setCatError(null)
    const formData = new FormData()
    formData.append("code", code)
    formData.append("name", newCatName.trim())
    if (newCatDesc.trim()) {
      formData.append("description", newCatDesc.trim())
    }

    startCatTransition(async () => {
      try {
        const result = await createExpenseCategoryAction(formData)
        if (result?.category) {
          const newCat: CategoryOption = {
            id: result.category.id,
            name: result.category.name,
            description: newCatDesc.trim() || null,
          }
          const updated = [...categories, newCat].sort((a, b) =>
            a.name.localeCompare(b.name)
          )
          setCategories(updated)
          setSelectedCategoryId(newCat.id)
          setNewCatName("")
          setNewCatDesc("")
          setShowAddCatModal(false)
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Failed to create category"
        setCatError(errorMsg)
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormError(null)
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    try {
      await onSubmitAction(formData)
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "An unexpected error occurred while saving expense"
      setFormError(errorMsg)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="inline-flex items-center rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-stone-600">
            Disbursement Entry
          </span>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-stone-900 md:text-3xl">
            Record Society Expense
          </h1>
          <p className="text-sm text-stone-500">
            Post an operating expenditure for {societyName}.
          </p>
        </div>

        <Link
          href={`/society/${code}/expenses`}
          className="rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-stone-700 transition hover:bg-stone-100 shadow-2xs"
        >
          Cancel
        </Link>
      </div>

      {/* Role Notice Banner */}
      {isManager ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-sm">
          <svg className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-xs space-y-0.5">
            <p className="font-bold text-amber-950">Manager Data Entry — Approval Required</p>
            <p className="text-amber-800">
              As Estate Manager, this expense voucher will be submitted in <strong className="font-semibold">Pending</strong> status. It will require approval from the <strong className="font-semibold">Treasurer</strong> or <strong className="font-semibold">Secretary</strong> before bank account funds are disbursed and reflected in official books.
            </p>
          </div>
        </div>
      ) : isApprover ? (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 shadow-sm">
          <svg className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-xs space-y-0.5">
            <p className="font-bold text-emerald-950">Executive Authorization ({designation})</p>
            <p className="text-emerald-800">
              As an authorized officer ({designation}), submitting this voucher will immediately post and debit the selected account balance.
            </p>
          </div>
        </div>
      ) : null}

      {/* Error Alert */}
      {formError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800 shadow-sm flex items-center justify-between">
          <span>{formError}</span>
          <button type="button" onClick={() => setFormError(null)} className="font-bold text-rose-900 ml-3">✕</button>
        </div>
      )}

      {/* Main Expense Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Particulars Card */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-stone-950">Expense Particulars</h2>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
              Expense Title / Purpose *
            </label>
            <input
              type="text"
              name="title"
              required
              placeholder="e.g. Monthly Security Agency Charges - August 2026"
              className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                  Expense Category *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCatModal(true)
                    setCatError(null)
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-950 hover:text-stone-700 underline underline-offset-2 transition"
                >
                  <span>+</span> New Category
                </button>
              </div>

              <select
                name="categoryId"
                required
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950 bg-white"
              >
                <option value="">Select category ({categories.length} available)...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code ? `[${c.code}] ` : ""}{c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                Registered Vendor (Optional)
              </label>
              <select
                name="vendorId"
                className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950 bg-white"
              >
                <option value="">Direct / Ad-hoc / Select vendor...</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.companyName ? `${v.companyName} (${v.name})` : v.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Financial Details Card */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-stone-950">Payment & Account Particulars</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                Total Amount (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                name="amount"
                required
                placeholder="e.g. 28000"
                className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm font-bold text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                GST Included (₹)
              </label>
              <input
                type="number"
                step="0.01"
                name="gstAmount"
                defaultValue="0"
                className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                TDS Withheld (₹)
              </label>
              <input
                type="number"
                step="0.01"
                name="tdsAmount"
                defaultValue="0"
                className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                Expense Date *
              </label>
              <input
                type="date"
                name="expenseDate"
                defaultValue={today}
                required
                className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                Disbursement Account
              </label>
              <select
                name="accountId"
                className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950 bg-white"
              >
                <option value="">Select bank / cash account...</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} (Bal: ₹{Number(a.currentBalance).toLocaleString("en-IN")})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                Payment Mode *
              </label>
              <select
                name="mode"
                defaultValue="BANK"
                className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950 bg-white"
              >
                <option value="BANK">Bank Transfer (NEFT/RTGS/IMPS)</option>
                <option value="CHEQUE">Cheque Payment</option>
                <option value="UPI">UPI / QR Payment</option>
                <option value="CARD">Debit / Credit Card</option>
                <option value="CASH">Cash Disbursement</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                Vendor Bill / Invoice #
              </label>
              <input
                type="text"
                name="invoiceNumber"
                placeholder="e.g. INV-2026-089"
                className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                Transaction Reference / Cheque #
              </label>
              <input
                type="text"
                name="reference"
                placeholder="e.g. UTR-938201849 or Cheque # 049212"
                className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
              Description / Remarks
            </label>
            <textarea
              name="description"
              rows={3}
              placeholder="Provide any additional particulars, warranty details, or work completion notes..."
              className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href={`/society/${code}/expenses`}
            className="rounded-full border border-stone-300 bg-white px-5 py-2.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-100"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-stone-950 px-6 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-stone-800 disabled:opacity-50"
          >
            {isSubmitting
              ? "Saving Voucher..."
              : isApprover
              ? "Post & Disburse Expense"
              : "Submit for Approval"}
          </button>
        </div>
      </form>

      {/* Quick Add Category Modal */}
      {showAddCatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <h3 className="text-base font-bold text-stone-900">Add New Expense Category</h3>
                <p className="text-xs text-stone-500">Create a custom operational category for this society.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCatModal(false)}
                className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                ✕
              </button>
            </div>

            {catError && (
              <div className="mt-3 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
                {catError}
              </div>
            )}

            <form onSubmit={handleQuickAddCategory} className="mt-4 space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Swimming Pool Chemical Treatment"
                  className="w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  placeholder="e.g. Monthly chlorine and algaecide supply"
                  className="w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCatModal(false)}
                  className="rounded-xl border border-stone-300 px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCatPending || !newCatName.trim()}
                  className="rounded-xl bg-stone-950 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
                >
                  {isCatPending ? "Adding..." : "Add & Select"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
