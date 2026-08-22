"use client"

import { useState, useTransition } from "react"
import { AdminModal } from "@/components/admin"
import { transferFlatOwnership } from "../actions"
import type { TransferType } from "@/generated/prisma/client"

export type PersonDirectoryOption = {
  id: string
  name: string
  phone: string | null
  email: string | null
}

interface TransferOwnershipModalProps {
  isOpen: boolean
  onClose: () => void
  societyCode: string
  flatId: string
  flatIdentifier: string
  currentOwnerName?: string | null
  people: PersonDirectoryOption[]
}

export function TransferOwnershipModal({
  isOpen,
  onClose,
  societyCode,
  flatId,
  flatIdentifier,
  currentOwnerName,
  people,
}: TransferOwnershipModalProps) {
  const [toPersonId, setToPersonId] = useState("")
  const [transferType, setTransferType] = useState<TransferType>("RESALE_PURCHASE")
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split("T")[0])
  const [registeredDocNumber, setRegisteredDocNumber] = useState("")
  const [registrationDate, setRegistrationDate] = useState("")
  const [transferFeePaid, setTransferFeePaid] = useState("")
  const [nocReference, setNocReference] = useState("")
  const [nocIssuedDate, setNocIssuedDate] = useState("")
  const [resolutionNumber, setResolutionNumber] = useState("")
  const [committeeApprovalDate, setCommitteeApprovalDate] = useState("")
  const [remarks, setRemarks] = useState("")
  const [updatePrimaryOccupant, setUpdatePrimaryOccupant] = useState(true)

  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!toPersonId) {
      setError("Please select the new owner (transferee).")
      return
    }

    startTransition(async () => {
      try {
        const feeVal = transferFeePaid.trim() ? parseFloat(transferFeePaid) : 0
        const res = await transferFlatOwnership(societyCode, flatId, {
          toPersonId,
          transferType,
          transferDate,
          registeredDocNumber: registeredDocNumber || null,
          registrationDate: registrationDate || null,
          transferFeePaid: feeVal,
          nocReference: nocReference || null,
          nocIssuedDate: nocIssuedDate || null,
          resolutionNumber: resolutionNumber || null,
          committeeApprovalDate: committeeApprovalDate || null,
          remarks: remarks || null,
          updatePrimaryOccupant,
        })

        if (res.error) {
          setError(res.error)
        } else {
          onClose()
          setRegisteredDocNumber("")
          setTransferFeePaid("")
          setResolutionNumber("")
          setRemarks("")
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to transfer ownership."
        setError(msg)
      }
    })
  }

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title="Transfer Flat Ownership & Deed Execution"
      description={`Record formal transfer of title, deed registration, and Managing Committee approval for Flat ${flatIdentifier}.`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        {/* Existing Owner Callout */}
        <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-3.5 flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-stone-500 block">Current Registered Owner</span>
            <span className="font-bold text-stone-900 text-sm">{currentOwnerName || "Builder Direct / Unassigned"}</span>
          </div>
          <span className="text-xs font-semibold text-stone-500">→ Transferring To</span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* New Owner Selection */}
          <div className="sm:col-span-2 space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">New Owner (Transferee) *</label>
            <select
              required
              value={toPersonId}
              onChange={(e) => setToPersonId(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
            >
              <option value="">Select person from society directory...</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.phone ? `(${p.phone})` : ""} {p.email ? `• ${p.email}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Transfer Type */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Transfer Classification *</label>
            <select
              value={transferType}
              onChange={(e) => setTransferType(e.target.value as TransferType)}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
            >
              <option value="RESALE_PURCHASE">Resale Purchase (Agreement to Sale)</option>
              <option value="INHERITANCE">Inheritance / Nominee Transfer (Form X)</option>
              <option value="GIFT_DEED">Gift Deed / Family Settlement</option>
              <option value="BUILDER_ALLOTMENT">Builder Direct Allotment</option>
              <option value="TRANSMISSION">Transmission of Shares</option>
              <option value="COURT_ORDER">Court Order / Probate</option>
              <option value="OTHER">Other Transfer</option>
            </select>
          </div>

          {/* Transfer Date */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Deed Execution Date *</label>
            <input
              type="date"
              required
              value={transferDate}
              onChange={(e) => setTransferDate(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
            />
          </div>

          {/* Registered Deed Document No */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Sub-Registrar Doc / Index II No.</label>
            <input
              type="text"
              value={registeredDocNumber}
              onChange={(e) => setRegisteredDocNumber(e.target.value)}
              placeholder="e.g. BDR-4/12450/2026"
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
            />
          </div>

          {/* Registration Date */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Registration Date</label>
            <input
              type="date"
              value={registrationDate}
              onChange={(e) => setRegistrationDate(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
            />
          </div>

          {/* Society Transfer Fee Paid */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Society Transfer Premium Fee (₹)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={transferFeePaid}
              onChange={(e) => setTransferFeePaid(e.target.value)}
              placeholder="e.g. 25000"
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
            />
          </div>

          {/* Society NOC Reference */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Society NOC Reference No.</label>
            <input
              type="text"
              value={nocReference}
              onChange={(e) => setNocReference(e.target.value)}
              placeholder="e.g. SOC/NOC/2026/042"
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
            />
          </div>

          {/* MCM Resolution No */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">MCM Approval Resolution No.</label>
            <input
              type="text"
              value={resolutionNumber}
              onChange={(e) => setResolutionNumber(e.target.value)}
              placeholder="e.g. MCM Res. No. 4(b)"
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
            />
          </div>

          {/* Committee Approval Date */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Committee Approval Date</label>
            <input
              type="date"
              value={committeeApprovalDate}
              onChange={(e) => setCommitteeApprovalDate(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
            />
          </div>

          {/* Remarks */}
          <div className="sm:col-span-2 space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Transfer Remarks / Notes</label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Share certificate submitted for endorsement; all past dues cleared."
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
            />
          </div>
        </div>

        {/* Update primary resident checkbox */}
        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="updateOccupantCheck"
            checked={updatePrimaryOccupant}
            onChange={(e) => setUpdatePrimaryOccupant(e.target.checked)}
            className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
          />
          <label htmlFor="updateOccupantCheck" className="text-xs font-semibold text-stone-800 cursor-pointer">
            Automatically set new owner as Primary Resident and update flat status to Occupied
          </label>
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
            disabled={isPending || !toPersonId}
            className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition disabled:opacity-50"
          >
            {isPending ? "Executing Transfer..." : "Execute Ownership Transfer"}
          </button>
        </div>
      </form>
    </AdminModal>
  )
}
