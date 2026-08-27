"use client"

import Link from "next/link"
import { AdminBadge, AdminButton } from "@/components/admin"
import type { FlatListItem } from "./FlatsClientView"

interface FlatQuickDrawerProps {
  isOpen: boolean
  onClose: () => void
  societyCode: string
  flat: FlatListItem | null
  canManage: boolean
  onEditFlat: (flat: FlatListItem) => void
  onAssignResident?: (flat: FlatListItem) => void
  onTransferOwnership?: (flat: FlatListItem) => void
}

export function FlatQuickDrawer({
  isOpen,
  onClose,
  societyCode,
  flat,
  canManage,
  onEditFlat,
  onAssignResident,
  onTransferOwnership,
}: FlatQuickDrawerProps) {
  if (!isOpen || !flat) return null

  const primaryOccupant = flat.occupantDetails?.find((o) => o.isPrimary) || flat.occupantDetails?.[0]

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-950/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="relative w-screen max-w-md bg-white shadow-2xl transition-all border-l border-stone-200 flex flex-col">
          {/* Drawer Header */}
          <div className="flex items-start justify-between border-b border-stone-100 px-6 py-5 bg-stone-50/50">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="rounded-md bg-stone-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-stone-700">
                  {flat.blockName}
                </span>
                <AdminBadge
                  variant={
                    flat.status === "OCCUPIED"
                      ? "success"
                      : flat.status === "UNDER_RENOVATION"
                        ? "warning"
                        : "neutral"
                  }
                  size="sm"
                >
                  {flat.status.replace(/_/g, " ")}
                </AdminBadge>
                {flat.unitType && (
                  <span className="rounded-md bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-700">
                    {flat.unitType.replace(/_/g, " ")}
                  </span>
                )}
              </div>

              <h2 className="mt-2 text-2xl font-bold tracking-tight text-stone-950">
                Flat {flat.number}
              </h2>
              <p className="text-xs text-stone-500">
                {flat.floor !== null ? `Floor ${flat.floor} • ` : ""}
                {flat.blockName}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
              aria-label="Close drawer"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {/* Quick Actions Card */}
            <div className="grid grid-cols-2 gap-2">
              <Link
                href={`/society/${societyCode}/flats/${flat.id}`}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-stone-900 px-3 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition text-center"
              >
                <span>View 360° Profile</span>
                <span>→</span>
              </Link>

              {canManage && (
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    onEditFlat(flat)
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-xs font-semibold text-stone-700 shadow-xs hover:bg-stone-50 hover:text-stone-950 transition"
                >
                  <svg className="h-3.5 w-3.5 text-stone-500" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
                    <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
                  </svg>
                  <span>Edit Details</span>
                </button>
              )}
            </div>

            {/* Financial Health Summary */}
            <div className="rounded-2xl border border-stone-200 bg-stone-50/50 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Maintenance Dues Status
                </span>
                {flat.isDefaulter ? (
                  <span className="rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                    OVERDUE DEFAULTER
                  </span>
                ) : (flat.unpaidDues ?? 0) > 0 ? (
                  <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                    PAYMENT PENDING
                  </span>
                ) : (
                  <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    ALL DUES CLEARED
                  </span>
                )}
              </div>

              <div className="flex items-baseline justify-between pt-1">
                <span className="text-sm font-semibold text-stone-700">Outstanding Balance</span>
                <span
                  className={`text-xl font-bold font-mono ${
                    (flat.unpaidDues ?? 0) > 0 ? "text-red-700" : "text-emerald-700"
                  }`}
                >
                  ₹{(flat.unpaidDues ?? 0).toLocaleString("en-IN")}
                </span>
              </div>
              {(flat.unpaidBillsCount ?? 0) > 0 && (
                <p className="text-[11px] text-stone-500">
                  {flat.unpaidBillsCount} unpaid or overdue invoice(s) pending.
                </p>
              )}
            </div>

            {/* Specifications Card */}
            <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900">
                Unit Specifications
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-stone-400 block text-[11px]">Carpet Area</span>
                  <span className="font-semibold text-stone-900">
                    {flat.area ? `${flat.area} ${flat.areaUnit}` : "—"}
                  </span>
                </div>

                <div>
                  <span className="text-stone-400 block text-[11px]">Floor Level</span>
                  <span className="font-semibold text-stone-900">
                    {flat.floor !== null ? `Floor ${flat.floor}` : "—"}
                  </span>
                </div>

                <div>
                  <span className="text-stone-400 block text-[11px]">Parking Slot</span>
                  <span className="font-mono font-semibold text-stone-900">
                    {flat.parkingSlot ? `🅿️ ${flat.parkingSlot}` : "None allocated"}
                  </span>
                </div>

                <div>
                  <span className="text-stone-400 block text-[11px]">Intercom Extension</span>
                  <span className="font-mono font-semibold text-stone-900">
                    {flat.intercomNumber ? `📞 ${flat.intercomNumber}` : "—"}
                  </span>
                </div>

                {flat.shareCertificateNumber && (
                  <div className="col-span-2 border-t border-stone-100 pt-2">
                    <span className="text-stone-400 block text-[11px]">Share Certificate</span>
                    <span className="font-mono font-semibold text-blue-700">
                      📜 Cert #{flat.shareCertificateNumber}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Active Residents & Occupants */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900">
                  Current Occupants ({flat.occupantDetails?.length || 0})
                </h3>
              </div>

              {flat.occupantDetails && flat.occupantDetails.length > 0 ? (
                <div className="space-y-2">
                  {flat.occupantDetails.map((occ) => (
                    <div
                      key={occ.id}
                      className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/society/${societyCode}/members/${occ.personId}`}
                            className="font-bold text-stone-950 hover:text-blue-600 transition"
                          >
                            {occ.name}
                          </Link>
                          {occ.isPrimary && (
                            <span className="text-[10px] text-blue-700 font-semibold bg-blue-50 border border-blue-200 rounded px-1">
                              Primary
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-stone-500 text-[11px]">
                          {occ.phone && <span className="font-mono">📞 {occ.phone}</span>}
                          {occ.email && <span className="truncate max-w-[140px]">✉️ {occ.email}</span>}
                        </div>
                      </div>

                      <AdminBadge
                        variant={
                          occ.role === "OWNER"
                            ? "purple"
                            : occ.role === "TENANT"
                              ? "info"
                              : "neutral"
                        }
                        size="sm"
                      >
                        {occ.role.replace(/_/g, " ")}
                      </AdminBadge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-stone-200 p-4 text-center">
                  <p className="text-xs text-stone-400">No active residents assigned to this flat.</p>
                </div>
              )}
            </div>
          </div>

          {/* Drawer Footer */}
          <div className="border-t border-stone-100 p-4 bg-stone-50/50 flex items-center justify-between">
            <Link
              href={`/society/${societyCode}/flats/${flat.id}`}
              className="text-xs font-semibold text-stone-700 hover:text-stone-950 transition"
            >
              Open Full 360° Profile ↗
            </Link>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-stone-200 bg-white px-4 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
