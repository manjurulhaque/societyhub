"use client"

import { toast } from "sonner"

import { useState, useTransition } from "react"
import { AdminModal } from "@/components/admin"
import { postJournalVoucher, type JournalEntryLineInput } from "./actions"
import type { VoucherType } from "@/generated/prisma/client"

export type LedgerOption = {
  id: string
  name: string
  code: string | null
  group: string
}

interface CreateJournalVoucherModalProps {
  isOpen: boolean
  onClose: () => void
  societyCode: string
  ledgers: LedgerOption[]
  currencySymbol: string
}

type FormLine = {
  id: string
  ledgerId: string
  debit: string
  credit: string
  narration: string
}

export function CreateJournalVoucherModal({
  isOpen,
  onClose,
  societyCode,
  ledgers,
  currencySymbol,
}: CreateJournalVoucherModalProps) {
  const [voucherType, setVoucherType] = useState<VoucherType>("JOURNAL")
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0])
  const [reference, setReference] = useState("")
  const [narration, setNarration] = useState("")

  const [lines, setLines] = useState<FormLine[]>([
    { id: "1", ledgerId: ledgers[0]?.id || "", debit: "", credit: "", narration: "" },
    { id: "2", ledgerId: ledgers[1]?.id || ledgers[0]?.id || "", debit: "", credit: "", narration: "" },
  ])

  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      { id: String(Date.now()), ledgerId: ledgers[0]?.id || "", debit: "", credit: "", narration: "" },
    ])
  }

  const removeLine = (id: string) => {
    if (lines.length <= 2) return
    setLines((prev) => prev.filter((l) => l.id !== id))
  }

  const updateLine = (id: string, field: keyof FormLine, value: string) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l
        if (field === "debit" && value !== "") {
          return { ...l, debit: value, credit: "" }
        }
        if (field === "credit" && value !== "") {
          return { ...l, credit: value, debit: "" }
        }
        return { ...l, [field]: value }
      })
    )
  }

  const totalDebits = lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0)
  const totalCredits = lines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0)
  const difference = Math.round(Math.abs(totalDebits - totalCredits) * 100) / 100
  const isBalanced = totalDebits > 0 && difference === 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!isBalanced) {
      setError(`Voucher must be balanced! Total Debits must equal Total Credits.`)
      return
    }

    if (!narration.trim()) {
      setError("Please enter a master narration for the journal voucher.")
      return
    }

    const payloadLines: JournalEntryLineInput[] = lines
      .filter((l) => (parseFloat(l.debit) || 0) > 0 || (parseFloat(l.credit) || 0) > 0)
      .map((l) => ({
        ledgerId: l.ledgerId,
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0,
        narration: l.narration || null,
      }))

    startTransition(async () => {
      try {
        const res = await postJournalVoucher(societyCode, {
          voucherType,
          entryDate,
          narration: narration.trim(),
          reference: reference || null,
          entries: payloadLines,
        })

        if (res.error) {
          setError(res.error)
        } else {
          toast.success("Journal voucher created")
          onClose()
          setReference("")
          setNarration("")
          setLines([
            { id: "1", ledgerId: ledgers[0]?.id || "", debit: "", credit: "", narration: "" },
            { id: "2", ledgerId: ledgers[1]?.id || ledgers[0]?.id || "", debit: "", credit: "", narration: "" },
          ])
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to post journal voucher."
        setError(msg)
      }
    })
  }

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title="Post Double-Entry Journal Voucher"
      description="Create manual adjusting journal entries, contra transfers, debit notes, or credit notes."
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Voucher Type */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Voucher Type *</label>
            <select
              value={voucherType}
              onChange={(e) => setVoucherType(e.target.value as VoucherType)}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none font-semibold"
            >
              <option value="JOURNAL">JV — Journal Voucher (Adjustments / Depreciation)</option>
              <option value="CONTRA">CONTRA — Bank to Cash / Inter-Bank Transfer</option>
              <option value="DEBIT_NOTE">DN — Debit Note</option>
              <option value="CREDIT_NOTE">CN — Credit Note</option>
              <option value="PAYMENT">PMNT — Direct Payment Voucher</option>
              <option value="RECEIPT">RCPT — Direct Receipt Voucher</option>
            </select>
          </div>

          {/* Voucher Date */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Voucher Date *</label>
            <input
              type="date"
              required
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
            />
          </div>

          {/* Reference */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Reference / Doc Ref</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. Chq #004128 / AGM Res #4"
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none font-mono"
            />
          </div>
        </div>

        {/* Multi-Line Double-Entry Table */}
        <div className="rounded-2xl border border-stone-200 bg-stone-50/50 p-3.5 space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-stone-200 text-[10px] font-bold uppercase tracking-wider text-stone-500">
            <span>Double-Entry Account Breakdown</span>
            <button
              type="button"
              onClick={addLine}
              className="text-stone-900 hover:text-blue-600 font-bold"
            >
              + Add Line
            </button>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {lines.map((line) => (
              <div key={line.id} className="grid grid-cols-12 gap-2 items-center text-xs">
                {/* Ledger Selection */}
                <div className="col-span-5">
                  <select
                    value={line.ledgerId}
                    onChange={(e) => updateLine(line.id, "ledgerId", e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
                  >
                    {ledgers.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} ({l.group})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Debit */}
                <div className="col-span-3">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Debit (₹)"
                    value={line.debit}
                    onChange={(e) => updateLine(line.id, "debit", e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-stone-900 focus:outline-none font-mono text-right"
                  />
                </div>

                {/* Credit */}
                <div className="col-span-3">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Credit (₹)"
                    value={line.credit}
                    onChange={(e) => updateLine(line.id, "credit", e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-stone-900 focus:outline-none font-mono text-right"
                  />
                </div>

                {/* Remove */}
                <div className="col-span-1 text-center">
                  {lines.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeLine(line.id)}
                      className="p-1 text-stone-400 hover:text-red-600 transition"
                      title="Remove Row"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Balanced Indicator Footer */}
          <div className="flex items-center justify-between border-t border-stone-200 pt-2.5 text-xs">
            <div className="flex items-center gap-2">
              {isBalanced ? (
                <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg text-[11px]">
                  ✓ Balanced (₹{totalDebits.toLocaleString("en-IN")})
                </span>
              ) : (
                <span className="text-red-700 font-bold bg-red-50 border border-red-200 px-2 py-0.5 rounded-lg text-[11px]">
                  ⚠️ Unbalanced Diff: {currencySymbol}{difference.toLocaleString("en-IN")}
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 font-mono font-bold text-stone-900 text-xs">
              <span>Dr: {currencySymbol}{totalDebits.toLocaleString("en-IN")}</span>
              <span>Cr: {currencySymbol}{totalCredits.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>

        {/* Master Narration */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-stone-700">Master Narration / Being Note *</label>
          <input
            type="text"
            required
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
            placeholder="e.g. Being cash withdrawn from HDFC Bank and deposited into Petty Cash imprest float."
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
            disabled={isPending || !isBalanced || !narration.trim()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition disabled:opacity-50"
          >
            {isPending ? "Posting..." : "Post Journal Voucher"}
          </button>
        </div>
      </form>
    </AdminModal>
  )
}
