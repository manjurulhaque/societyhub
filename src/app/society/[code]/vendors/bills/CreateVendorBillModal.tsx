"use client"

import { useState, useMemo, useTransition } from "react"
import { AdminModal } from "@/components/admin"
import { createVendorBill } from "./actions"
import { maskPan } from "@/lib/masking"

export type VendorOption = {
  id: string
  name: string
  companyName: string | null
  panNumber: string | null
}

interface CreateVendorBillModalProps {
  isOpen: boolean
  onClose: () => void
  societyCode: string
  vendors: VendorOption[]
  currencySymbol: string
}

export function CreateVendorBillModal({
  isOpen,
  onClose,
  societyCode,
  vendors,
  currencySymbol,
}: CreateVendorBillModalProps) {
  const [vendorId, setVendorId] = useState(vendors[0]?.id || "")
  const [billNumber, setBillNumber] = useState("")
  const [billDate, setBillDate] = useState(new Date().toISOString().split("T")[0])
  const [dueDate, setDueDate] = useState("")
  const [amount, setAmount] = useState("")
  const [gstAmount, setGstAmount] = useState("")
  const [tdsRate, setTdsRate] = useState<number>(2) // Default 2% Section 194C
  const [customTds, setCustomTds] = useState<string>("")
  const [reference, setReference] = useState("")
  const [notes, setNotes] = useState("")

  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const numAmount = parseFloat(amount) || 0
  const numGst = parseFloat(gstAmount) || 0

  const calculatedTds = useMemo(() => {
    if (customTds.trim() !== "") {
      return parseFloat(customTds) || 0
    }
    return Math.round((numAmount * tdsRate) / 100 * 100) / 100
  }, [numAmount, tdsRate, customTds])

  const netPayable = Math.max(0, numAmount + numGst - calculatedTds)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!vendorId || !billNumber.trim() || numAmount <= 0) {
      setError("Please fill all required invoice fields.")
      return
    }

    startTransition(async () => {
      try {
        const res = await createVendorBill(societyCode, {
          vendorId,
          billNumber: billNumber.trim(),
          billDate,
          dueDate: dueDate || null,
          amount: numAmount,
          gstAmount: numGst,
          tdsAmount: calculatedTds,
          reference: reference || null,
          notes: notes || null,
        })

        if (res.error) {
          setError(res.error)
        } else {
          onClose()
          setBillNumber("")
          setAmount("")
          setGstAmount("")
          setCustomTds("")
          setReference("")
          setNotes("")
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to record vendor bill."
        setError(msg)
      }
    })
  }

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Vendor Invoice & TDS"
      description="Enter supplier/contractor bill with statutory TDS deduction calculation."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Vendor Selection */}
          <div className="sm:col-span-2 space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Select Vendor / Contractor *</label>
            <select
              required
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none font-semibold"
            >
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} {v.companyName ? `(${v.companyName})` : ""} {v.panNumber ? `• PAN: ${maskPan(v.panNumber)}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Bill Number */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Vendor Invoice / Bill No. *</label>
            <input
              type="text"
              required
              value={billNumber}
              onChange={(e) => setBillNumber(e.target.value)}
              placeholder="e.g. INV-2026-904"
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none font-mono"
            />
          </div>

          {/* Work Order / PO Reference */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Work Order / PO Ref</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. WO-LIFT-AMC-2026"
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none font-mono"
            />
          </div>

          {/* Bill Date */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Invoice Date *</label>
            <input
              type="date"
              required
              value={billDate}
              onChange={(e) => setBillDate(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
            />
          </div>

          {/* Due Date */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Payment Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
            />
          </div>

          {/* Taxable Amount */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Taxable Bill Amount (₹) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none font-mono"
            />
          </div>

          {/* GST Amount */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">GST / Tax Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={gstAmount}
              onChange={(e) => setGstAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none font-mono"
            />
          </div>

          {/* TDS Rate Selection */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Statutory TDS Deduction Rate</label>
            <select
              value={tdsRate}
              onChange={(e) => {
                setTdsRate(parseFloat(e.target.value))
                setCustomTds("")
              }}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
            >
              <option value={0}>0% — No TDS Applicable</option>
              <option value={1}>1% — Section 194C (Individual / HUF Contractor)</option>
              <option value={2}>2% — Section 194C (Company / Partnership Contractor)</option>
              <option value={5}>5% — Section 194J (Technical Services)</option>
              <option value={10}>10% — Section 194J (Professional / Legal Fees)</option>
            </select>
          </div>

          {/* Calculated TDS Amount */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">TDS Deducted Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={customTds || calculatedTds || ""}
              onChange={(e) => setCustomTds(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none font-mono"
            />
          </div>

          {/* Net Payable Banner */}
          <div className="sm:col-span-2 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-800 block">Net Payable to Contractor</span>
              <span className="text-[11px] text-emerald-700">
                (Base: {currencySymbol}{numAmount.toLocaleString("en-IN")} + GST: {currencySymbol}{numGst.toLocaleString("en-IN")} – TDS: {currencySymbol}{calculatedTds.toLocaleString("en-IN")})
              </span>
            </div>
            <div className="font-mono font-bold text-emerald-950 text-base">
              {currencySymbol}{netPayable.toLocaleString("en-IN")}
            </div>
          </div>

          {/* Notes */}
          <div className="sm:col-span-2 space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Bill Description / Service Details</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Monthly lift AMC servicing for Blocks A & B for February 2026."
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
            disabled={isPending || !billNumber.trim() || numAmount <= 0}
            className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition disabled:opacity-50"
          >
            {isPending ? "Recording..." : "Record Vendor Bill"}
          </button>
        </div>
      </form>
    </AdminModal>
  )
}
