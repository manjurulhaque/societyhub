"use client"

import { useState, useMemo, useTransition } from "react"
import Link from "next/link"
import { AdminStatCard, AdminBadge } from "@/components/admin"
import { CreateAmenityModal } from "./CreateAmenityModal"
import { deleteAmenity } from "./actions"
import type { AmenityType } from "@/generated/prisma/client"

export type AmenityListItem = {
  id: string
  name: string
  type: AmenityType
  description: string | null
  defaultRent: number
  defaultDeposit: number
  capacity: number | null
  isActive: boolean
  totalBookingsCount: number
}

interface AmenitiesClientViewProps {
  societyCode: string
  currencySymbol: string
  amenities: AmenityListItem[]
  totalBookings: number
  totalRevenue: number
  activeCautionHeld: number
  canManage: boolean
}

export function AmenitiesClientView({
  societyCode,
  currencySymbol,
  amenities,
  totalBookings,
  totalRevenue,
  activeCautionHeld,
  canManage,
}: AmenitiesClientViewProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedType, setSelectedType] = useState<string>("ALL")
  const [isPending, startTransition] = useTransition()

  const filteredAmenities = useMemo(() => {
    return amenities.filter((a) => {
      if (selectedType !== "ALL" && a.type !== selectedType) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          a.name.toLowerCase().includes(q) ||
          (a.description || "").toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [amenities, selectedType, searchQuery])

  const handleDelete = (amenityId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete amenity "${name}"?`)) return
    startTransition(async () => {
      await deleteAmenity(societyCode, amenityId)
    })
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          title="Amenities Available"
          value={amenities.length}
          subtitle="Clubhouses, lawns & suites"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />

        <AdminStatCard
          title="Reservations Hosted"
          value={totalBookings}
          subtitle="Events and bookings confirmed"
          icon={
            <svg className="h-5 w-5 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Rental Income"
          value={`${currencySymbol}${totalRevenue.toLocaleString("en-IN")}`}
          subtitle="Net amenity hire revenue"
          icon={
            <svg className="h-5 w-5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Caution Deposits Held"
          value={`${currencySymbol}${activeCautionHeld.toLocaleString("en-IN")}`}
          subtitle="Held security deposits"
          icon={
            <svg className="h-5 w-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
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
              placeholder="Search amenities..."
              className="w-56 sm:w-64 rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2 pl-9 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none"
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
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-700 focus:border-stone-900 focus:outline-none"
          >
            <option value="ALL">All Facility Types</option>
            <option value="CLUBHOUSE">Clubhouses</option>
            <option value="COMMUNITY_HALL">Community Halls</option>
            <option value="PARTY_LAWN">Party Lawns</option>
            <option value="GUEST_ROOM">Guest Suites</option>
            <option value="SWIMMING_POOL">Swimming Pools</option>
            <option value="TENNIS_COURT">Sports Courts</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/society/${societyCode}/bookings`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 shadow-xs transition"
          >
            <svg className="h-4 w-4 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Manage Reservations →</span>
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
              <span>+ Add Amenity</span>
            </button>
          )}
        </div>
      </div>

      {/* Amenity Cards Grid */}
      {filteredAmenities.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-200 bg-white p-12 text-center shadow-xs">
          <p className="text-xs text-stone-500">No amenities found matching your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredAmenities.map((amenity) => (
            <div
              key={amenity.id}
              className="flex flex-col justify-between rounded-3xl border border-stone-200 bg-white p-5 shadow-xs hover:border-stone-300 transition"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <AdminBadge
                    variant={
                      amenity.type === "CLUBHOUSE"
                        ? "purple"
                        : amenity.type === "PARTY_LAWN"
                          ? "success"
                          : amenity.type === "GUEST_ROOM"
                            ? "info"
                            : "neutral"
                    }
                    size="sm"
                  >
                    {amenity.type.replace(/_/g, " ")}
                  </AdminBadge>

                  {amenity.capacity && (
                    <span className="text-[11px] font-semibold text-stone-500">
                      👥 Up to {amenity.capacity} guests
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-base font-bold text-stone-950">{amenity.name}</h3>
                  {amenity.description && (
                    <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                      {amenity.description}
                    </p>
                  )}
                </div>

                {/* Pricing & Deposit */}
                <div className="grid grid-cols-2 gap-2 border-t border-stone-100 pt-3 text-xs">
                  <div>
                    <span className="text-[10px] text-stone-400 font-medium block">Standard Rent</span>
                    <span className="font-mono font-bold text-stone-950">
                      {currencySymbol}{amenity.defaultRent.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-stone-400 font-medium block">Caution Deposit</span>
                    <span className="font-mono font-semibold text-stone-700">
                      {currencySymbol}{amenity.defaultDeposit.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-stone-100 pt-3 text-xs">
                <span className="text-[11px] text-stone-400">
                  {amenity.totalBookingsCount} bookings hosted
                </span>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/society/${societyCode}/bookings`}
                    className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 text-[11px] font-semibold text-stone-700 hover:bg-stone-100 transition"
                  >
                    Bookings →
                  </Link>

                  {canManage && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleDelete(amenity.id, amenity.name)}
                      className="rounded-lg p-1 text-stone-400 hover:bg-red-50 hover:text-red-600 transition"
                      title="Delete Amenity"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <CreateAmenityModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        societyCode={societyCode}
      />
    </div>
  )
}
