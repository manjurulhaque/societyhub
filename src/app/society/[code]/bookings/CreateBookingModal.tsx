"use client"

import { useState, useTransition } from "react"
import { AdminModal } from "@/components/admin"
import { createBooking } from "./actions"
import type { PaymentMode } from "@/generated/prisma/client"

export type AmenityOption = {
  id: string
  name: string
  defaultRent: number
  defaultDeposit: number
}

export type FlatOption = {
  id: string
  number: string
  blockName: string
}

export type PersonOption = {
  id: string
  name: string
}

interface CreateBookingModalProps {
  isOpen: boolean
  onClose: () => void
  societyCode: string
  amenities: AmenityOption[]
  flats: FlatOption[]
  people: PersonOption[]
}

export function CreateBookingModal({
  isOpen,
  onClose,
  societyCode,
  amenities,
  flats,
  people,
}: CreateBookingModalProps) {
  const [amenityId, setAmenityId] = useState(amenities[0]?.id || "")
  const [flatId, setFlatId] = useState(flats[0]?.id || "")
  const [personId, setPersonId] = useState(people[0]?.id || "")
  const [eventTitle, setEventTitle] = useState("")
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split("T")[0])
  const [startTime, setStartTime] = useState("10:00")
  const [endTime, setEndTime] = useState("22:00")
  const [rentAmount, setRentAmount] = useState(amenities[0]?.defaultRent.toString() || "0")
  const [depositAmount, setDepositAmount] = useState(amenities[0]?.defaultDeposit.toString() || "0")
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("BANK")
  const [receiptNumber, setReceiptNumber] = useState("")
  const [remarks, setRemarks] = useState("")

  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleAmenityChange = (selectedId: string) => {
    setAmenityId(selectedId)
    const selected = amenities.find((a) => a.id === selectedId)
    if (selected) {
      setRentAmount(selected.defaultRent.toString())
      setDepositAmount(selected.defaultDeposit.toString())
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!amenityId || !flatId || !personId || !bookingDate) {
      setError("Please fill all required reservation fields.")
      return
    }

    startTransition(async () => {
      try {
        const rentVal = parseFloat(rentAmount) || 0
        const depVal = parseFloat(depositAmount) || 0

        const res = await createBooking(societyCode, {
          amenityId,
          flatId,
          personId,
          eventTitle: eventTitle || null,
          bookingDate,
          startTime: startTime || null,
          endTime: endTime || null,
          rentAmount: rentVal,
          depositAmount: depVal,
          paymentMode,
          receiptNumber: receiptNumber || null,
          remarks: remarks || null,
        })

        if (res.error) {
          setError(res.error)
        } else {
          onClose()
          setEventTitle("")
          setRemarks("")
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to record reservation."
        setError(msg)
      }
    })
  }

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Facility Reservation"
      description="Book a clubhouse, party lawn, guest suite, or community facility for a resident."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Facility / Amenity Selection */}
          <div className="sm:col-span-2 space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Select Amenity *</label>
            <select
              required
              value={amenityId}
              onChange={(e) => handleAmenityChange(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none font-semibold"
            >
              {amenities.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} (Rent: ₹{a.defaultRent.toLocaleString("en-IN")} • Deposit: ₹{a.defaultDeposit.toLocaleString("en-IN")})
                </option>
              ))}
            </select>
          </div>

          {/* Resident Flat */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Resident Flat / Unit *</label>
            <select
              required
              value={flatId}
              onChange={(e) => setFlatId(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
            >
              {flats.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.blockName}-{f.number}
                </option>
              ))}
            </select>
          </div>

          {/* Resident Person */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Applicant / Member *</label>
            <select
              required
              value={personId}
              onChange={(e) => setPersonId(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
            >
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Event Title */}
          <div className="sm:col-span-2 space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Event Purpose / Title</label>
            <input
              type="text"
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              placeholder="e.g. Birthday Celebration / Griha Pravesh Dinner"
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
            />
          </div>

          {/* Booking Date */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Reservation Date *</label>
            <input
              type="date"
              required
              value={bookingDate}
              onChange={(e) => setBookingDate(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
            />
          </div>

          {/* Slot Timings */}
          <div className="space-y-1">
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <label className="text-[11px] font-semibold text-stone-700">From</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
                />
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-[11px] font-semibold text-stone-700">To</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Rent Fee */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Facility Rental Fee (₹) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={rentAmount}
              onChange={(e) => setRentAmount(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none font-mono"
            />
          </div>

          {/* Caution Deposit */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Refundable Caution Deposit (₹) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none font-mono"
            />
          </div>

          {/* Payment Mode */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Payment Collection Mode *</label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
            >
              <option value="BANK">Bank Transfer / NEFT / IMPS</option>
              <option value="UPI">UPI / QR Code</option>
              <option value="CASH">Cash in Hand</option>
              <option value="APP">Society App Gateway</option>
            </select>
          </div>

          {/* Receipt Number */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Payment Receipt Number</label>
            <input
              type="text"
              value={receiptNumber}
              onChange={(e) => setReceiptNumber(e.target.value)}
              placeholder="e.g. RCP-FAC-00124"
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none font-mono"
            />
          </div>

          {/* Remarks */}
          <div className="sm:col-span-2 space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Booking Notes / Contractor Setup</label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Caterer entry permitted from 4 PM; security deposit to be refunded post-inspection."
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
            disabled={isPending || !amenityId || !flatId || !personId}
            className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition disabled:opacity-50"
          >
            {isPending ? "Confirming..." : "Confirm Reservation"}
          </button>
        </div>
      </form>
    </AdminModal>
  )
}
