"use client"

import { useState, useTransition } from "react"
import { createExpenseCategoryAction, syncStandardExpenseCategoriesAction } from "./actions"

export interface ExpenseCategoryItem {
  id: string
  name: string
  code?: string | null
  description?: string | null
  isActive: boolean
  _count?: {
    expenses: number
  }
}

interface ExpenseCategoriesModalProps {
  code: string
  categories: ExpenseCategoryItem[]
  triggerText?: string
  triggerClassName?: string
}

export function ExpenseCategoriesModal({
  code,
  categories,
  triggerText = "Manage Categories",
  triggerClassName,
}: ExpenseCategoriesModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [showAddForm, setShowAddForm] = useState(false)
  const [newCatName, setNewCatName] = useState("")
  const [newCatDesc, setNewCatDesc] = useState("")
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.code && c.code.toLowerCase().includes(search.toLowerCase())) ||
    (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
  )

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCatName.trim()) return

    setMessage(null)
    const formData = new FormData()
    formData.append("code", code)
    formData.append("name", newCatName.trim())
    if (newCatDesc.trim()) {
      formData.append("description", newCatDesc.trim())
    }

    startTransition(async () => {
      try {
        await createExpenseCategoryAction(formData)
        setNewCatName("")
        setNewCatDesc("")
        setShowAddForm(false)
        setMessage({ type: "success", text: `Category "${newCatName.trim()}" added successfully!` })
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Failed to add category"
        setMessage({ type: "error", text: errorMsg })
      }
    })
  }

  const handleSyncCategories = async () => {
    setMessage(null)
    const formData = new FormData()
    formData.append("code", code)

    startTransition(async () => {
      try {
        await syncStandardExpenseCategoriesAction(formData)
        setMessage({
          type: "success",
          text: "Standard expense categories synced successfully!",
        })
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Failed to sync categories"
        setMessage({ type: "error", text: errorMsg })
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true)
          setMessage(null)
        }}
        className={
          triggerClassName ||
          "inline-flex items-center justify-center gap-1.5 rounded-full border border-stone-300 bg-white px-4 py-2.5 text-xs font-semibold text-stone-700 shadow-sm transition hover:bg-stone-50"
        }
      >
        <svg className="h-4 w-4 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <span>{triggerText}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border border-stone-200 bg-white shadow-2xl overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-100 px-6 py-5 bg-stone-50/80">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Accounts & Ledgers
                </span>
                <h2 className="text-lg font-bold text-stone-900">
                  Expense Categories Catalog
                </h2>
                <p className="text-xs text-stone-500">
                  {categories.length} operational heads configured for expense recording and vendor disbursements.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-2 text-stone-400 hover:bg-stone-200 hover:text-stone-700 transition"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Notification Banner */}
            {message && (
              <div
                className={`mx-6 mt-4 flex items-center justify-between rounded-xl px-4 py-2.5 text-xs font-medium ${
                  message.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                <span>{message.text}</span>
                <button
                  type="button"
                  onClick={() => setMessage(null)}
                  className="font-bold ml-2 text-stone-500 hover:text-stone-800"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Actions Bar */}
            <div className="px-6 pt-4 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <svg
                  className="absolute left-3 top-2.5 h-4 w-4 text-stone-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search categories..."
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 pl-9 pr-4 py-2 text-xs text-stone-900 outline-none focus:border-stone-900 focus:bg-white focus:ring-1 focus:ring-stone-900 transition"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSyncCategories}
                  disabled={isPending}
                  title="Provision all standard Indian Housing Society operational heads"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-50 transition shadow-2xs"
                >
                  <svg className={`h-3.5 w-3.5 text-stone-600 ${isPending ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Sync Standard Categories
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="inline-flex items-center gap-1 rounded-xl bg-stone-950 px-3.5 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition shadow-2xs"
                >
                  <span>+</span> Add Custom
                </button>
              </div>
            </div>

            {/* Inline Add Category Form */}
            {showAddForm && (
              <form
                onSubmit={handleAddCategory}
                className="mx-6 mb-3 rounded-2xl border border-stone-200 bg-stone-50/70 p-4 space-y-3 animate-in fade-in duration-100"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-stone-900">New Custom Expense Head</h3>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="text-xs text-stone-500 hover:text-stone-800"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                      Category Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      placeholder="e.g. Swimming Pool Chemical Treatment"
                      className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                      Description (Optional)
                    </label>
                    <input
                      type="text"
                      value={newCatDesc}
                      onChange={(e) => setNewCatDesc(e.target.value)}
                      placeholder="e.g. Chlorine, algaecide, and filtration maintenance"
                      className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isPending || !newCatName.trim()}
                    className="rounded-xl bg-stone-950 px-4 py-1.5 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-50 transition shadow-2xs"
                  >
                    {isPending ? "Creating..." : "Save Category"}
                  </button>
                </div>
              </form>
            )}

            {/* Categories Scrollable List */}
            <div className="flex-1 overflow-y-auto px-6 py-2 divide-y divide-stone-100">
              {filteredCategories.length === 0 ? (
                <div className="py-12 text-center text-xs text-stone-500">
                  No expense categories found matching &quot;{search}&quot;.
                </div>
              ) : (
                filteredCategories.map((c) => (
                  <div key={c.id} className="py-3 flex items-start justify-between gap-4 group">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        {c.code && (
                          <span className="font-mono text-[10px] font-bold text-stone-700 bg-stone-100 border border-stone-200 px-1.5 py-0.5 rounded">
                            [{c.code}]
                          </span>
                        )}
                        <span className="text-xs font-bold text-stone-900 group-hover:text-stone-950">
                          {c.name}
                        </span>
                        <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.2 text-[10px] font-semibold text-emerald-700">
                          Active
                        </span>
                      </div>
                      {c.description ? (
                        <p className="text-[11px] text-stone-500 leading-relaxed">
                          {c.description}
                        </p>
                      ) : null}
                    </div>

                    <div className="shrink-0 text-right">
                      <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-[10px] font-semibold text-stone-600">
                        {c._count?.expenses ?? 0} voucher{(c._count?.expenses ?? 0) === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-stone-100 px-6 py-3.5 bg-stone-50 flex items-center justify-between text-xs text-stone-500">
              <span>Showing {filteredCategories.length} of {categories.length} categories</span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full border border-stone-300 bg-white px-4 py-1.5 font-medium text-stone-700 hover:bg-stone-100 transition shadow-2xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
