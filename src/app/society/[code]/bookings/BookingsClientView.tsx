"use client"

import { useState, useMemo, useTransition } from "react"
import Link from "next/link"
import { AdminStatCard, AdminBadge, AdminTable } from "@/components/admin"
import { CreateBookingModal, type AmenityOption, type FlatOption, type PersonOption } from "./CreateBookingModal"
import { updateBookingStatus, refundCautionDeposit } from "./actions"
import { formatDateInAppTimeZone } from "@/lib/datetime"
import type { BookingStatus } from "@/generated/prisma/client"

export type BookingListItem = {
  id: string
  amenityId: string
  amenityName: string
  flatId: string
  flatNumber: string
  blockName: string
  personName: string
  personPhone: string | null
  eventTitle: string | null
  bookingDate: string
  startTime: string | null
  endTime: string | null
  rentAmount: number
  depositAmount: number
  isDepositRefunded: boolean
  depositRefundedOn: string | null
  status: BookingStatus
  receiptNumber: string | null
  paymentMode: string
  remarks: string | null
}

interface BookingsClientViewProps {
  societyCode: string
  currencySymbol: string
  bookings: BookingListItem[]
  amenities: AmenityOption[]
  flats: FlatOption[]
  people: PersonOption[]
  canManage: boolean
}

export function BookingsClientView({
  societyCode,
  currencySymbol,
  bookings,
  amenities,
  flats,
  people,
  canManage,
}: BookingsClientViewProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL")
  const [selectedAmenity, setSelectedAmenity] = useState<string>("ALL")

  const [isPending, startTransition] = useTransition()

  // Statistics
  const totalRentCollected = bookings.reduce((sum, b) => sum + (b.status !== "CANCELLED" ? b.rentAmount : 0), 0)
  const cautionHeld = bookings
    .filter((b) => !b.isDepositRefunded && b.status !== "CANCELLED")
    .reduce((sum, b) => sum + b.depositAmount, 0)
  const confirmedCount = bookings.filter((b) => b.status === "CONFIRMED").length
  const completedCount = bookings.filter((b) => b.status === "COMPLETED").length

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (selectedStatus !== "ALL" && b.status !== selectedStatus) return false
      if (selectedAmenity !== "ALL" && b.amenityId !== selectedAmenity) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          (b.eventTitle || "").toLowerCase().includes(q) ||
          b.amenityName.toLowerCase().includes(q) ||
          b.personName.toLowerCase().includes(q) ||
          b.flatNumber.toLowerCase().includes(q) ||
          (b.receiptNumber || "").toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [bookings, selectedStatus, selectedAmenity, searchQuery])

  const handleStatusChange = (bookingId: string, status: BookingStatus) => {
    startTransition(async () => {
      await updateBookingStatus(societyCode, bookingId, status)
    })
  }

  const handleRefund = (bookingId: string) => {
    if (!confirm("Are you sure you want to mark this caution deposit as refunded?")) return
    startTransition(async () => {
      await refundCautionDeposit(societyCode, bookingId)
    })
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          title="Facility Rental Revenue"
          value={`${currencySymbol}${totalRentCollected.toLocaleString("en-IN")}`}
          subtitle="Net revenue from amenities"
          icon={
            <svg className="h-5 w-5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Caution Deposits Held"
          value={`${currencySymbol}${cautionHeld.toLocaleString("en-IN")}`}
          subtitle="Active security deposits held"
          icon={
            <svg className="h-5 w-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Confirmed Bookings"
          value={confirmedCount}
          subtitle="Upcoming booked slots"
          icon={
            <svg className="h-5 w-5 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Completed Events"
          value={completedCount}
          subtitle="Events successfully hosted"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bookings or flat..."
              className="w-52 sm:w-60 rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2 pl-9 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none"
            />
            <svg
              className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-stone-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <select
            value={selectedAmenity}
            onChange={(e) => setSelectedAmenity(e.target.value)}
            className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-700 focus:border-stone-900 focus:outline-none"
          >
            <option value="ALL">All Amenities ({amenities.length})</option>
            {amenities.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-700 focus:border-stone-900 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="REQUESTED">REQUESTED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/society/${societyCode}/amenities`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 shadow-xs transition"
          >
            <span>← Amenity Catalogue</span>
          </Link>

          {canManage && (
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              <span>+ Reserve Facility</span>
            </button>
          )}
        </div>
      </div>

      {/* Bookings Table */}
      {filteredBookings.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-200 bg-white p-12 text-center shadow-xs">
          <p className="text-xs text-stone-500">No facility reservations match your filter.</p>
        </div>
      ) : (
        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs">
          <AdminTable
            headers={[
              "Date & Slot",
              "Amenity & Event",
              "Resident / Flat",
              "Rent Fee",
              "Caution Deposit",
              "Status",
              ...(canManage ? ["Action"] : []),
            ]}
            rows={filteredBookings.map((b) => (
              <tr key={b.id} className="border-t border-stone-100 text-xs hover:bg-stone-50/60 transition">
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <span className="font-bold text-stone-950 block">
                    {formatDateInAppTimeZone(b.bookingDate)}
                  </span>
                  <span className="text-[10px] text-stone-500 block">
                    {b.startTime && b.endTime
                      ? `${b.startTime.slice(11, 16)} – ${b.endTime.slice(11, 16)}`
                      : "Full Day"}
                  </span>
                </td>

                <td className="px-4 py-3.5">
                  <span className="font-bold text-stone-900 block">{b.amenityName}</span>
                  <span className="text-[11px] text-stone-500 block">{b.eventTitle || "Private Event"}</span>
                </td>

                <td className="px-4 py-3.5">
                  <span className="font-semibold text-stone-900 block">
                    {b.blockName}-{b.flatNumber}
                  </span>
                  <span className="text-[11px] text-stone-500 block">{b.personName}</span>
                </td>

                <td className="px-4 py-3.5 font-mono font-bold text-stone-950">
                  {currencySymbol}{b.rentAmount.toLocaleString("en-IN")}
                </td>

                <td className="px-4 py-3.5 font-mono">
                  <span className="font-semibold text-stone-800 block">
                    {currencySymbol}{b.depositAmount.toLocaleString("en-IN")}
                  </span>
                  {b.depositAmount > 0 ? (
                    b.isDepositRefunded ? (
                      <span className="text-[10px] text-emerald-700 font-semibold">
                        ✓ Refunded {b.depositRefundedOn ? formatDateInAppTimeZone(b.depositRefundedOn) : ""}
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-amber-700 font-semibold">Held</span>
                        {canManage && b.status !== "CANCELLED" && (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleRefund(b.id)}
                            className="rounded bg-amber-100 hover:bg-amber-200 px-1.5 py-0.5 text-[9px] font-bold text-amber-900"
                          >
                            Refund
                          </button>
                        )}
                      </div>
                    )
                  ) : (
                    <span className="text-[10px] text-stone-400">None</span>
                  )}
                </td>

                <td className="px-4 py-3.5">
                  <AdminBadge
                    variant={
                      b.status === "CONFIRMED"
                        ? "success"
                        : b.status === "COMPLETED"
                          ? "info"
                          : b.status === "CANCELLED"
                            ? "neutral"
                            : "warning"
                    }
                    size="sm"
                  >
                    {b.status}
                  </AdminBadge>
                </td>

                {canManage && (
                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {b.status === "CONFIRMED" && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleStatusChange(b.id, "COMPLETED")}
                          className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-[11px] font-semibold text-stone-700 hover:bg-emerald-50 hover:text-emerald-700 transition"
                        >
                          Mark Completed
                        </button>
                      )}

                      {b.status !== "CANCELLED" && b.status !== "COMPLETED" && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleStatusChange(b.id, "CANCELLED")}
                          className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-[11px] font-semibold text-stone-500 hover:bg-red-50 hover:text-red-700 transition"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          />
        </div>
      )}

      {/* Create Reservation Modal */}
      <CreateBookingModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        societyCode={societyCode}
        amenities={amenities}
        flats={flats}
        people={people}
      />
    </div>
  )
}
