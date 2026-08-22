"use client"

import { useState, useTransition } from "react"
import { AdminModal, AdminTable } from "@/components/admin"
import { createAssetCategory } from "./actions"

export type AssetCategoryItem = {
  id: string
  name: string
  depreciationRate: number | null
  description: string | null
  _count?: {
    assets: number
  }
}

interface AssetCategoriesModalProps {
  isOpen: boolean
  onClose: () => void
  societyCode: string
  categories: AssetCategoryItem[]
}

export function AssetCategoriesModal({
  isOpen,
  onClose,
  societyCode,
  categories,
}: AssetCategoriesModalProps) {
  const [name, setName] = useState("")
  const [depreciationRate, setDepreciationRate] = useState("")
  const [description, setDescription] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      try {
        const rateVal = depreciationRate.trim() ? parseFloat(depreciationRate) : null
        if (rateVal !== null && (isNaN(rateVal) || rateVal < 0 || rateVal > 100)) {
          setError("Depreciation rate must be between 0% and 100%.")
          return
        }

        const res = await createAssetCategory(societyCode, {
          name,
          depreciationRate: rateVal,
          description: description || null,
        })

        if (res.error) {
          setError(res.error)
        } else {
          setName("")
          setDepreciationRate("")
          setDescription("")
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to create category."
        setError(msg)
      }
    })
  }

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title="Asset Categories & Depreciation"
      description="Manage classifications and standard annual depreciation rates for society machinery and equipment."
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Create Form */}
        <form onSubmit={handleSubmit} className="rounded-2xl border border-stone-200 bg-stone-50/60 p-4 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">Add New Category</h4>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[11px] font-semibold text-stone-700">Category Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Elevators & Lifts, Generators"
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-stone-700">Depreciation (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={depreciationRate}
                onChange={(e) => setDepreciationRate(e.target.value)}
                placeholder="e.g. 10.0"
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Description (Optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Society passenger elevators and machine room gear"
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
            />
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isPending || !name.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition disabled:opacity-50"
            >
              {isPending ? "Creating..." : "+ Add Category"}
            </button>
          </div>
        </form>

        {/* Existing Categories Table */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">Configured Categories ({categories.length})</h4>
          {categories.length === 0 ? (
            <p className="text-xs text-stone-500 italic py-3 text-center">No categories configured yet.</p>
          ) : (
            <AdminTable
              headers={["Category Name", "Depreciation Rate", "Description", "Registered Assets"]}
              rows={categories.map((cat) => (
                <tr key={cat.id} className="border-t border-stone-100 text-xs">
                  <td className="px-4 py-3 font-semibold text-stone-950">{cat.name}</td>
                  <td className="px-4 py-3 text-stone-700 font-mono">
                    {cat.depreciationRate !== null ? `${cat.depreciationRate}% p.a.` : "—"}
                  </td>
                  <td className="px-4 py-3 text-stone-500 truncate max-w-xs">{cat.description || "—"}</td>
                  <td className="px-4 py-3 text-stone-900 font-medium">{cat._count?.assets ?? 0} assets</td>
                </tr>
              ))}
            />
          )}
        </div>
      </div>
    </AdminModal>
  )
}
