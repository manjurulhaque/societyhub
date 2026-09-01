"use client"

import { toast } from "sonner"

import { useState, useMemo, useTransition } from "react"
import { AdminModal } from "@/components/admin"
import { recordCashClosing } from "./actions"

interface CashClosingModalProps {
  isOpen: boolean
  onClose: () => void
  societyCode: string
  currentFloatBalance: number
  currencySymbol: string
}

export function CashClosingModal({
  isOpen,
  onClose,
  societyCode,
  currentFloatBalance,
  currencySymbol,
}: CashClosingModalProps) {
  const [closingDate, setClosingDate] = useState(new Date().toISOString().split("T")[0])
  const [notes, setNotes] = useState("")

  // Denominations
  const [c500, setC500] = useState(0)
  const [c200, setC200] = useState(0)
  const [c100, setC100] = useState(0)
  const [c50, setC50] = useState(0)
  const [c20, setC20] = useState(0)
  const [c10, setC10] = useState(0)
  const [coins, setCoins] = useState(0)

  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Compute total physical cash
  const physicalTotal = useMemo(() => {
    return (
      c500 * 500 +
      c200 * 200 +
      c100 * 100 +
      c50 * 50 +
      c20 * 20 +
      c10 * 10 +
      (coins || 0)
    )
  }, [c500, c200, c100, c50, c20, c10, coins])

  const discrepancy = Math.round((physicalTotal - currentFloatBalance) * 100) / 100

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      try {
        const res = await recordCashClosing(societyCode, {
          closingDate,
          openingBalance: currentFloatBalance,
          totalReceipts: 0,
          totalPayments: 0,
          calculatedBalance: currentFloatBalance,
          actualPhysicalCash: physicalTotal,
          difference: discrepancy,
          note500: c500,
          note200: c200,
          note100: c100,
          note50: c50,
          note20: c20,
          note10: c10,
          coins,
          notes: notes || null,
        })

        if (res.error) {
          setError(res.error)
        } else {
          toast.success("Cash closing recorded")
          onClose()
          setC500(0)
          setC200(0)
          setC100(0)
          setC50(0)
          setC20(0)
          setC10(0)
          setCoins(0)
          setNotes("")
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to record cash closing."
        setError(msg)
      }
    })
  }

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title="Physical Cash Verification & Daily Closing"
      description="Perform a physical cashbox audit with currency denomination counting."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Closing Date */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Closing / Audit Date *</label>
            <input
              type="date"
              required
              value={closingDate}
              onChange={(e) => setClosingDate(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
            />
          </div>

          {/* System Float Balance Card */}
          <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-3 flex flex-col justify-center text-xs">
            <span className="text-[10px] uppercase font-bold text-stone-500">System Imprest Balance</span>
            <span className="font-mono font-bold text-stone-950 text-base">
              {currencySymbol}{currentFloatBalance.toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        {/* Currency Denomination Counter */}
        <div className="rounded-2xl border border-stone-200 bg-stone-50/40 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-stone-200 pb-2">
            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
              Denomination Breakdown
            </h4>
            <span className="text-[11px] font-mono font-bold text-stone-950">
              Total Counted: {currencySymbol}{physicalTotal.toLocaleString("en-IN")}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
            {/* 500 */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-stone-600">₹500 Notes</label>
              <input
                type="number"
                min="0"
                value={c500 || ""}
                onChange={(e) => setC500(parseInt(e.target.value) || 0)}
                placeholder="0"
                className="w-full rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-stone-900 focus:outline-none font-mono"
              />
              <span className="text-[10px] text-stone-400 font-mono block text-right">
                = ₹{(c500 * 500).toLocaleString("en-IN")}
              </span>
            </div>

            {/* 200 */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-stone-600">₹200 Notes</label>
              <input
                type="number"
                min="0"
                value={c200 || ""}
                onChange={(e) => setC200(parseInt(e.target.value) || 0)}
                placeholder="0"
                className="w-full rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-stone-900 focus:outline-none font-mono"
              />
              <span className="text-[10px] text-stone-400 font-mono block text-right">
                = ₹{(c200 * 200).toLocaleString("en-IN")}
              </span>
            </div>

            {/* 100 */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-stone-600">₹100 Notes</label>
              <input
                type="number"
                min="0"
                value={c100 || ""}
                onChange={(e) => setC100(parseInt(e.target.value) || 0)}
                placeholder="0"
                className="w-full rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-stone-900 focus:outline-none font-mono"
              />
              <span className="text-[10px] text-stone-400 font-mono block text-right">
                = ₹{(c100 * 100).toLocaleString("en-IN")}
              </span>
            </div>

            {/* 50 */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-stone-600">₹50 Notes</label>
              <input
                type="number"
                min="0"
                value={c50 || ""}
                onChange={(e) => setC50(parseInt(e.target.value) || 0)}
                placeholder="0"
                className="w-full rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-stone-900 focus:outline-none font-mono"
              />
              <span className="text-[10px] text-stone-400 font-mono block text-right">
                = ₹{(c50 * 50).toLocaleString("en-IN")}
              </span>
            </div>

            {/* 20 */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-stone-600">₹20 Notes</label>
              <input
                type="number"
                min="0"
                value={c20 || ""}
                onChange={(e) => setC20(parseInt(e.target.value) || 0)}
                placeholder="0"
                className="w-full rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-stone-900 focus:outline-none font-mono"
              />
              <span className="text-[10px] text-stone-400 font-mono block text-right">
                = ₹{(c20 * 20).toLocaleString("en-IN")}
              </span>
            </div>

            {/* 10 */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-stone-600">₹10 Notes</label>
              <input
                type="number"
                min="0"
                value={c10 || ""}
                onChange={(e) => setC10(parseInt(e.target.value) || 0)}
                placeholder="0"
                className="w-full rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-stone-900 focus:outline-none font-mono"
              />
              <span className="text-[10px] text-stone-400 font-mono block text-right">
                = ₹{(c10 * 10).toLocaleString("en-IN")}
              </span>
            </div>

            {/* Coins Total */}
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[10px] font-semibold text-stone-600">Coins Value Total (₹)</label>
              <input
                type="number"
                min="0"
                value={coins || ""}
                onChange={(e) => setCoins(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-stone-900 focus:outline-none font-mono"
              />
            </div>
          </div>
        </div>

        {/* Reconciliation Status Callout */}
        <div className="rounded-2xl border p-3 flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-stone-500 block">Verification Variance</span>
            {Math.abs(discrepancy) < 0.01 ? (
              <span className="text-emerald-700 font-bold text-sm">✓ Perfect Match (₹0.00)</span>
            ) : discrepancy > 0 ? (
              <span className="text-blue-700 font-bold text-sm">Surplus of +₹{discrepancy.toLocaleString("en-IN")}</span>
            ) : (
              <span className="text-red-700 font-bold text-sm">Deficit of -₹{Math.abs(discrepancy).toLocaleString("en-IN")}</span>
            )}
          </div>

          <div className="text-right">
            <span className="text-[10px] text-stone-400 block">Physical Count</span>
            <span className="font-mono font-bold text-stone-950 text-sm">
              {currencySymbol}{physicalTotal.toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-stone-700">Verification Notes / Custodian Sign-off</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Physical count verified by Treasurer in presence of Estate Manager."
            className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
          />
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
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition disabled:opacity-50"
          >
            {isPending ? "Recording..." : "Log Physical Cash Count"}
          </button>
        </div>
      </form>
    </AdminModal>
  )
}
