"use client"

import { toast } from "sonner"

import { useState, useTransition } from "react"
import { AdminModal } from "@/components/admin"
import { createAssessmentCampaign } from "./actions"
import type { MaintenanceType, PaymentPlan } from "@/generated/prisma/client"

interface CreateAssessmentModalProps {
  isOpen: boolean
  onClose: () => void
  societyCode: string
  totalFlatsCount: number
}

export function CreateAssessmentModal({
  isOpen,
  onClose,
  societyCode,
  totalFlatsCount,
}: CreateAssessmentModalProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [totalTargetAmount, setTotalTargetAmount] = useState("")
  const [calculationType, setCalculationType] = useState<MaintenanceType>("FIXED")
  const [ratePerSqft, setRatePerSqft] = useState("")
  const [fixedAmountPerFlat, setFixedAmountPerFlat] = useState("")
  const [paymentPlan, setPaymentPlan] = useState<PaymentPlan>("ONE_TIME_ONLY")
  const [numberOfInstallments, setNumberOfInstallments] = useState(1)
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0])
  const [dueDate, setDueDate] = useState("")
  const [approvedInMeeting, setApprovedInMeeting] = useState("")
  const [remarks, setRemarks] = useState("")

  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      try {
        const targetVal = totalTargetAmount.trim() ? parseFloat(totalTargetAmount) : null
        const sqftVal = calculationType === "PER_SQFT" && ratePerSqft.trim() ? parseFloat(ratePerSqft) : null
        const flatVal = calculationType === "FIXED" && fixedAmountPerFlat.trim() ? parseFloat(fixedAmountPerFlat) : null

        const res = await createAssessmentCampaign(societyCode, {
          title,
          description: description || null,
          totalTargetAmount: targetVal,
          calculationType,
          ratePerSqft: sqftVal,
          fixedAmountPerFlat: flatVal,
          paymentPlan,
          numberOfInstallments: paymentPlan === "ONE_TIME_ONLY" ? 1 : numberOfInstallments,
          startDate,
          dueDate: dueDate || null,
          approvedInMeeting: approvedInMeeting || null,
          remarks: remarks || null,
        })

        if (res.error) {
          setError(res.error)
        } else {
          toast.success("Assessment created successfully")
          onClose()
          setTitle("")
          setDescription("")
          setTotalTargetAmount("")
          setRatePerSqft("")
          setFixedAmountPerFlat("")
          setApprovedInMeeting("")
          setRemarks("")
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to launch campaign."
        setError(msg)
      }
    })
  }

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title="Launch Special Assessment / Capital Fund Campaign"
      description="Create a targeted capital improvement or emergency fund drive (e.g. Building Painting, Lift Replacement, Sinking Fund boost)."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-3 flex items-center justify-between text-xs text-blue-900">
          <span>
            ℹ️ Allocations will automatically be computed for all <strong>{totalFlatsCount} active flats</strong> in the society.
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Campaign Title */}
          <div className="sm:col-span-2 space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Campaign / Fund Drive Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 2026 Building Exterior Painting & Waterproofing"
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
            />
          </div>

          {/* Description */}
          <div className="sm:col-span-2 space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Purpose / Scope of Work</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Comprehensive exterior wall plastering, Asian Paints Apex Ultima coating, terrace waterproofing"
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none resize-none"
            />
          </div>

          {/* Total Target Budget */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Total Target Budget (₹)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={totalTargetAmount}
              onChange={(e) => setTotalTargetAmount(e.target.value)}
              placeholder="e.g. 1500000"
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
            />
          </div>

          {/* Calculation Method */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Assessment Calculation Formula *</label>
            <select
              value={calculationType}
              onChange={(e) => setCalculationType(e.target.value as MaintenanceType)}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
            >
              <option value="FIXED">Equal Fixed Amount per Flat</option>
              <option value="PER_SQFT">Pro-Rata Rate per Sq. Ft. of Carpet Area</option>
            </select>
          </div>

          {/* Formula Inputs */}
          {calculationType === "FIXED" ? (
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-stone-700">Fixed Amount per Flat (₹) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={fixedAmountPerFlat}
                onChange={(e) => setFixedAmountPerFlat(e.target.value)}
                placeholder="e.g. 25000"
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
              />
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-stone-700">Rate per Sq. Ft. (₹/sqft) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={ratePerSqft}
                onChange={(e) => setRatePerSqft(e.target.value)}
                placeholder="e.g. 35.00"
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
              />
            </div>
          )}

          {/* Payment Plan */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Payment Plan *</label>
            <select
              value={paymentPlan}
              onChange={(e) => {
                const plan = e.target.value as PaymentPlan
                setPaymentPlan(plan)
                if (plan === "ONE_TIME_ONLY") setNumberOfInstallments(1)
                else if (numberOfInstallments === 1) setNumberOfInstallments(3)
              }}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
            >
              <option value="ONE_TIME_ONLY">One-Time Lump Sum Payment</option>
              <option value="INSTALLMENTS">Installment Scheme (Multiple Tranches)</option>
            </select>
          </div>

          {/* Number of Installments */}
          {paymentPlan === "INSTALLMENTS" && (
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-stone-700">Number of Installments (2 – 12)</label>
              <input
                type="number"
                min="2"
                max="12"
                value={numberOfInstallments}
                onChange={(e) => setNumberOfInstallments(parseInt(e.target.value) || 2)}
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
              />
            </div>
          )}

          {/* Start Date */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Collection Start Date *</label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
            />
          </div>

          {/* Due Date */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">First Installment / Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
            />
          </div>

          {/* Approval Resolution */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">SGM / AGM Resolution Reference</label>
            <input
              type="text"
              value={approvedInMeeting}
              onChange={(e) => setApprovedInMeeting(e.target.value)}
              placeholder="e.g. SGM Res. No. 3 dated 15-Feb-2026"
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
            />
          </div>

          {/* Remarks */}
          <div className="sm:col-span-2 space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">General Notes / Contractor Info</label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Contract awarded to Apex Infra; 50% advance upon mobilization."
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending || !title.trim()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition disabled:opacity-50"
          >
            {isPending ? "Creating Allocations..." : "Launch Special Assessment"}
          </button>
        </div>
      </form>
    </AdminModal>
  )
}
