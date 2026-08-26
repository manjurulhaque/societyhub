"use client"

import { useState, useTransition, useMemo } from "react"
import Link from "next/link"
import { AdminCard, AdminBadge, AdminStatCard, AdminTable, AdminTabs } from "@/components/admin"
import { maskPan, maskAadhaar } from "@/lib/masking"
import { formatDateInAppTimeZone } from "@/lib/datetime"
import { toggleResidentKyc } from "../residentActions"
import { EditResidentModal, type EditableResident } from "../EditResidentModal"
import { EntityAuditDrawer } from "@/components/audit/EntityAuditDrawer"

export type FlatPortfolioItem = {
  id: string
  flatId: string
  number: string
  floor: number | null
  unitType: string | null
  status: string
  area: number | null
  areaUnit: string
  intercomNumber: string | null
  parkingSlot: string | null
  blockId: string
  blockName: string
  role: string
  isPrimary: boolean
  fromDate: string
  toDate: string | null
  occupants: {
    id: string
    name: string
    role: string
    phone: string | null
    email: string | null
  }[]
  unpaidDues: number
  unpaidBillsCount: number
  shareCertificateNumber: string | null
  hasActiveNomination: boolean
}

export type ResidentBillItem = {
  id: string
  billNumber: string | null
  flatId: string
  flatNumber: string
  blockName: string
  billType: string
  year: number
  month: number
  amount: number
  paidAmount: number
  balanceAmount: number
  status: string
  dueDate: string | null
  createdAt: string
}

export type ResidentPaymentItem = {
  id: string
  receiptNumber: string | null
  flatNumber: string | null
  blockName: string | null
  amount: number
  paidOn: string
  mode: string
  status: string
  referenceNumber: string | null
  remarks: string | null
}

export type ResidentStatutoryData = {
  shareCertificates: {
    id: string
    certificateNumber: string
    sharesCount: number
    distinctiveRange: string | null
    faceValue: number
    issueDate: string
    status: string
    flatNumber: string
    blockName: string
  }[]
  nominations: {
    id: string
    nomineeName: string
    relationship: string
    percentageShare: number
    status: string
    nominationDate: string
    flatNumber: string
    blockName: string
  }[]
  liens: {
    id: string
    bankName: string
    loanAccountNumber: string | null
    sanctionAmount: number | null
    nocReference: string | null
    isCleared: boolean
    flatNumber: string
    blockName: string
  }[]
  ownershipTransfers: {
    id: string
    flatNumber: string
    blockName: string
    transferType: string
    transferDate: string
    isAcquisition: boolean
    counterpartyName: string | null
    registeredDocNumber: string | null
    transferFeePaid: number | null
    nocReference: string | null
  }[]
  deposits: {
    id: string
    depositType: string
    amount: number
    status: string
    receivedOn: string
    refundedOn: string | null
    flatNumber: string | null
    blockName: string | null
  }[]
}

export type ResidentProfileData = {
  id: string
  name: string
  phone: string | null
  email: string | null
  panNumber: string | null
  aadhaarNumber: string | null
  passportNumber: string | null
  voterId: string | null
  dob: string | null
  gender: string | null
  bloodGroup: string | null
  occupation: string | null
  permanentAddress: string | null
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  kycVerified: boolean
  kycVerifiedAt: string | null
  createdAt: string
  userAccount: {
    id: string
    email: string
    appRole: string
    isActive: boolean
    createdAt: string
  } | null
}

interface ResidentProfileClientProps {
  societyCode: string
  societyId: string
  currencySymbol: string
  resident: ResidentProfileData
  flats: FlatPortfolioItem[]
  bills: ResidentBillItem[]
  payments: ResidentPaymentItem[]
  statutory: ResidentStatutoryData
  canManage: boolean
}

export function ResidentProfileClient({
  societyCode,
  societyId,
  currencySymbol,
  resident,
  flats,
  bills,
  payments,
  statutory,
  canManage,
}: ResidentProfileClientProps) {
  const [activeTab, setActiveTab] = useState<string>("flats")
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isTogglingKyc, startKycTransition] = useTransition()
  const [showFullKyc, setShowFullKyc] = useState(false)

  // Bill filters
  const [billFlatFilter, setBillFlatFilter] = useState<string>("ALL")
  const [billStatusFilter, setBillStatusFilter] = useState<string>("ALL")

  // Payment filters
  const [paymentModeFilter, setPaymentModeFilter] = useState<string>("ALL")

  const handleToggleKyc = () => {
    startKycTransition(async () => {
      await toggleResidentKyc(societyCode, resident.id)
    })
  }

  // Filtered bills
  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      if (billFlatFilter !== "ALL" && b.flatId !== billFlatFilter) return false
      if (billStatusFilter === "PENDING" && b.status !== "PENDING" && b.status !== "OVERDUE" && b.status !== "PARTIALLY_PAID") return false
      if (billStatusFilter === "PAID" && b.status !== "PAID") return false
      return true
    })
  }, [bills, billFlatFilter, billStatusFilter])

  // Filtered payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (paymentModeFilter !== "ALL" && p.mode !== paymentModeFilter) return false
      return true
    })
  }, [payments, paymentModeFilter])

  // Aggregate stats
  const ownedFlatsCount = flats.filter((f) => f.role === "OWNER" || f.role === "JOINT_OWNER").length
  const tenantFlatsCount = flats.filter((f) => f.role === "TENANT").length
  const totalCombinedArea = flats.reduce((acc, f) => acc + (f.area || 0), 0)
  const totalUnpaidDues = flats.reduce((acc, f) => acc + f.unpaidDues, 0)
  const totalActiveDeposits = statutory.deposits
    .filter((d) => d.status === "HELD")
    .reduce((acc, d) => acc + d.amount, 0)

  const editableResident: EditableResident = {
    id: resident.id,
    name: resident.name,
    phone: resident.phone,
    email: resident.email,
    panNumber: resident.panNumber,
    aadhaarNumber: resident.aadhaarNumber,
    passportNumber: resident.passportNumber,
    voterId: resident.voterId,
    dob: resident.dob,
    gender: resident.gender,
    bloodGroup: resident.bloodGroup,
    occupation: resident.occupation,
    permanentAddress: resident.permanentAddress,
    emergencyContactName: resident.emergencyContactName,
    emergencyContactPhone: resident.emergencyContactPhone,
    kycVerified: resident.kycVerified,
  }

  const tabItems = [
    {
      id: "flats",
      label: "Properties & Flats Portfolio",
      count: flats.length,
    },
    {
      id: "bills",
      label: "Consolidated Bills & Dues",
      count: bills.length,
    },
    {
      id: "payments",
      label: "Payment Ledger",
      count: payments.length,
    },
    {
      id: "statutory",
      label: "Statutory & KYC Records",
      count: statutory.shareCertificates.length + statutory.nominations.length,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Header */}
      <div>
        <Link
          href={`/society/${societyCode}/members`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900 transition mb-3"
        >
          <span>←</span>
          <span>Back to Members & Residents Directory</span>
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                Resident 360° Profile
              </span>
              <AdminBadge
                variant={
                  ownedFlatsCount > 0
                    ? "info"
                    : tenantFlatsCount > 0
                      ? "warning"
                      : "neutral"
                }
                size="sm"
              >
                {ownedFlatsCount > 0 ? "PROPERTY OWNER" : tenantFlatsCount > 0 ? "TENANT" : "RESIDENT"}
              </AdminBadge>

              {resident.kycVerified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                  <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                  </svg>
                  <span>KYC VERIFIED</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                  <span>⏳ KYC PENDING</span>
                </span>
              )}

              {resident.userAccount && (
                <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600">
                  App Account: {resident.userAccount.email}
                </span>
              )}
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-stone-950 sm:text-3xl">
              {resident.name}
            </h1>

            <p className="text-xs text-stone-500">
              {resident.phone ? `📞 ${resident.phone} • ` : ""}
              {resident.email ? `✉️ ${resident.email} • ` : ""}
              {resident.occupation ? `💼 ${resident.occupation} • ` : ""}
              {flats.length > 0 ? `🏢 ${flats.length} Associated Unit(s)` : "No Flats Linked"}
            </p>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-2">
            <EntityAuditDrawer
              entity="Person"
              entityId={resident.id}
              entityTitle={resident.name}
              societyId={societyId}
              buttonVariant="outline"
            />

            {canManage && (
              <>
                <button
                  type="button"
                  onClick={handleToggleKyc}
                  disabled={isTogglingKyc}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold shadow-xs transition disabled:opacity-50 ${
                    resident.kycVerified
                      ? "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100"
                      : "border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
                  }`}
                >
                  {isTogglingKyc
                    ? "Updating..."
                    : resident.kycVerified
                      ? "Revoke KYC"
                      : "Verify KYC"}
                </button>

                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition"
                >
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                  <span>Edit Profile</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          title="Flats / Portfolio Units"
          value={flats.length}
          subtitle={
            ownedFlatsCount > 0
              ? `${ownedFlatsCount} Owned (${totalCombinedArea.toLocaleString("en-IN")} sqft)`
              : tenantFlatsCount > 0
                ? `${tenantFlatsCount} Rented Unit(s)`
                : "No units mapped"
          }
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />

        <AdminStatCard
          title="Consolidated Pending Dues"
          value={`${currencySymbol}${totalUnpaidDues.toLocaleString("en-IN")}`}
          subtitle={
            totalUnpaidDues > 0
              ? `Across ${flats.filter((f) => f.unpaidDues > 0).length} property unit(s)`
              : "All flat dues cleared"
          }
          icon={
            <svg
              className={`h-5 w-5 ${totalUnpaidDues > 0 ? "text-red-700" : "text-emerald-700"}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Active Member Deposits"
          value={`${currencySymbol}${totalActiveDeposits.toLocaleString("en-IN")}`}
          subtitle="Held security & fit-out deposits"
          icon={
            <svg className="h-5 w-5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Share Certificates & Form X"
          value={statutory.shareCertificates.length}
          subtitle={`${statutory.nominations.length} active nomination(s) registered`}
          icon={
            <svg className="h-5 w-5 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />
      </div>

      {/* Tabs Navigation */}
      <AdminTabs
        items={tabItems}
        activeId={activeTab}
        onChange={setActiveTab}
      />

      {/* TAB 1: PROPERTIES & FLATS PORTFOLIO */}
      {activeTab === "flats" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-stone-900">
              Owned & Occupied Flat Portfolio ({flats.length})
            </h2>
            <span className="text-xs text-stone-500">
              Complete view of all apartments, commercial shops, and units registered under {resident.name}
            </span>
          </div>

          {flats.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-stone-200 bg-white p-12 text-center shadow-xs">
              <p className="text-xs text-stone-500">
                No flats are currently mapped to this resident.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {flats.map((flat) => (
                <div
                  key={flat.id}
                  className="group relative flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-5 shadow-xs transition hover:border-stone-400 hover:shadow-sm"
                >
                  <div className="space-y-3">
                    {/* Card Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                          {flat.blockName}
                        </span>
                        <h3 className="text-lg font-bold text-stone-950 flex items-center gap-2">
                          <span>Flat {flat.number}</span>
                          {flat.unitType && (
                            <span className="rounded bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-700">
                              {flat.unitType}
                            </span>
                          )}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        <AdminBadge
                          variant={
                            flat.role === "OWNER"
                              ? "info"
                              : flat.role === "TENANT"
                                ? "warning"
                                : "neutral"
                          }
                          size="sm"
                        >
                          {flat.role.replace(/_/g, " ")}
                        </AdminBadge>
                        <AdminBadge
                          variant={
                            flat.status === "OCCUPIED"
                              ? "success"
                              : flat.status === "UNDER_RENOVATION"
                                ? "warning"
                                : "neutral"
                          }
                          size="sm"
                          dot
                        >
                          {flat.status.replace(/_/g, " ")}
                        </AdminBadge>
                      </div>
                    </div>

                    {/* Metadata specs */}
                    <div className="grid grid-cols-2 gap-2 rounded-xl bg-stone-50/80 p-3 text-xs text-stone-700 sm:grid-cols-4">
                      <div>
                        <span className="text-[10px] text-stone-400 block uppercase">Floor</span>
                        <span className="font-semibold">{flat.floor !== null ? `Floor ${flat.floor}` : "—"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-400 block uppercase">Carpet Area</span>
                        <span className="font-semibold">{flat.area ? `${flat.area} ${flat.areaUnit}` : "—"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-400 block uppercase">Parking</span>
                        <span className="font-semibold">{flat.parkingSlot || "—"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-400 block uppercase">Intercom</span>
                        <span className="font-semibold">{flat.intercomNumber || "—"}</span>
                      </div>
                    </div>

                    {/* Occupancy info */}
                    <div className="space-y-1 text-xs">
                      <span className="text-[11px] font-semibold text-stone-500">
                        Current Occupants & Residents:
                      </span>
                      {flat.occupants.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {flat.occupants.map((occ) => (
                            <span
                              key={occ.id}
                              className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2 py-1 text-[11px] font-medium text-stone-800"
                            >
                              <span className="font-semibold">{occ.name}</span>
                              <span className="text-[10px] text-stone-400">({occ.role})</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-stone-400 italic">No occupants registered</p>
                      )}
                    </div>

                    {/* Financial & Statutory status pills */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-bold ${
                          flat.unpaidDues > 0
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        {flat.unpaidDues > 0
                          ? `Dues: ${currencySymbol}${flat.unpaidDues.toLocaleString("en-IN")} (${flat.unpaidBillsCount} unpaid)`
                          : "✓ Dues Up-to-Date"}
                      </span>

                      {flat.shareCertificateNumber && (
                        <span className="inline-flex rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                          Share Cert #{flat.shareCertificateNumber}
                        </span>
                      )}

                      {flat.hasActiveNomination && (
                        <span className="inline-flex rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                          Form X Nominated
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3">
                    <span className="text-[10px] text-stone-400">
                      Residency since {flat.fromDate ? flat.fromDate.split("T")[0] : "—"}
                    </span>
                    <Link
                      href={`/society/${societyCode}/flats/${flat.flatId}`}
                      className="inline-flex items-center gap-1 rounded-xl bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition"
                    >
                      <span>Open Flat 360°</span>
                      <span>→</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CONSOLIDATED BILLS & DUES */}
      {activeTab === "bills" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={billFlatFilter}
                onChange={(e) => setBillFlatFilter(e.target.value)}
                className="rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 focus:border-stone-900 focus:outline-none"
              >
                <option value="ALL">All Properties ({flats.length})</option>
                {flats.map((f) => (
                  <option key={f.flatId} value={f.flatId}>
                    {f.blockName} - Flat {f.number}
                  </option>
                ))}
              </select>

              <select
                value={billStatusFilter}
                onChange={(e) => setBillStatusFilter(e.target.value)}
                className="rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 focus:border-stone-900 focus:outline-none"
              >
                <option value="ALL">All Billing Statuses</option>
                <option value="PENDING">Pending / Overdue</option>
                <option value="PAID">Fully Paid</option>
              </select>
            </div>

            <div className="text-xs text-stone-500">
              Showing <strong className="text-stone-900">{filteredBills.length}</strong> bill(s)
            </div>
          </div>

          {filteredBills.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-stone-200 bg-white p-12 text-center shadow-xs">
              <p className="text-xs text-stone-500">
                No bills found for the selected filter criteria.
              </p>
            </div>
          ) : (
            <AdminTable
              headers={[
                "Bill # / Period",
                "Property Unit",
                "Bill Type",
                "Total Amount",
                "Paid Amount",
                "Balance Due",
                "Due Date",
                "Status",
              ]}
              rows={filteredBills.map((b) => (
                <tr key={b.id} className="border-t border-stone-100 hover:bg-stone-50/60 transition-colors text-xs">
                  <td className="px-4 py-3.5">
                    <span className="font-mono font-bold text-stone-950 block">
                      {b.billNumber || "—"}
                    </span>
                    <span className="text-[10px] text-stone-500">
                      Period: {b.month}/{b.year}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-stone-900">
                    <Link
                      href={`/society/${societyCode}/flats/${b.flatId}`}
                      className="hover:text-blue-600 transition"
                    >
                      {b.blockName} - {b.flatNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 text-stone-700 font-medium">
                    {b.billType.replace(/_/g, " ")}
                  </td>
                  <td className="px-4 py-3.5 font-bold text-stone-950">
                    {currencySymbol}{b.amount.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3.5 text-emerald-700 font-semibold">
                    {currencySymbol}{b.paidAmount.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3.5 font-bold text-red-700">
                    {b.balanceAmount > 0 ? `${currencySymbol}${b.balanceAmount.toLocaleString("en-IN")}` : "—"}
                  </td>
                  <td className="px-4 py-3.5 text-stone-600">
                    {b.dueDate ? formatDateInAppTimeZone(b.dueDate) : "—"}
                  </td>
                  <td className="px-4 py-3.5">
                    <AdminBadge
                      variant={
                        b.status === "PAID"
                          ? "success"
                          : b.status === "OVERDUE"
                            ? "danger"
                            : b.status === "PARTIALLY_PAID"
                              ? "warning"
                              : "neutral"
                      }
                      size="sm"
                    >
                      {b.status.replace(/_/g, " ")}
                    </AdminBadge>
                  </td>
                </tr>
              ))}
            />
          )}
        </div>
      )}

      {/* TAB 3: PAYMENT LEDGER */}
      {activeTab === "payments" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <select
                value={paymentModeFilter}
                onChange={(e) => setPaymentModeFilter(e.target.value)}
                className="rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 focus:border-stone-900 focus:outline-none"
              >
                <option value="ALL">All Payment Modes</option>
                <option value="UPI">UPI</option>
                <option value="BANK">Bank Transfer (NEFT/RTGS)</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CASH">Cash</option>
                <option value="APP">In-App Gateway</option>
              </select>
            </div>

            <div className="text-xs text-stone-500">
              Showing <strong className="text-stone-900">{filteredPayments.length}</strong> payment receipt(s)
            </div>
          </div>

          {filteredPayments.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-stone-200 bg-white p-12 text-center shadow-xs">
              <p className="text-xs text-stone-500">
                No payment receipts found for this resident.
              </p>
            </div>
          ) : (
            <AdminTable
              headers={[
                "Receipt # & Date",
                "Property Unit",
                "Amount Paid",
                "Payment Mode",
                "Reference # / Txn",
                "Status",
                "Remarks",
              ]}
              rows={filteredPayments.map((p) => (
                <tr key={p.id} className="border-t border-stone-100 hover:bg-stone-50/60 transition-colors text-xs">
                  <td className="px-4 py-3.5">
                    <span className="font-mono font-bold text-stone-950 block">
                      {p.receiptNumber || "—"}
                    </span>
                    <span className="text-[10px] text-stone-500">
                      {formatDateInAppTimeZone(p.paidOn)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-stone-900">
                    {p.blockName && p.flatNumber ? `${p.blockName} - ${p.flatNumber}` : "General / Account"}
                  </td>
                  <td className="px-4 py-3.5 font-bold text-emerald-700">
                    {currencySymbol}{p.amount.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3.5 font-medium text-stone-700">
                    <AdminBadge variant="neutral" size="sm">
                      {p.mode}
                    </AdminBadge>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-stone-600 text-[11px]">
                    {p.referenceNumber || "—"}
                  </td>
                  <td className="px-4 py-3.5">
                    <AdminBadge
                      variant={p.status === "SUCCESS" ? "success" : p.status === "REFUNDED" ? "warning" : "danger"}
                      size="sm"
                    >
                      {p.status}
                    </AdminBadge>
                  </td>
                  <td className="px-4 py-3.5 text-stone-500 italic max-w-xs truncate">
                    {p.remarks || "—"}
                  </td>
                </tr>
              ))}
            />
          )}
        </div>
      )}

      {/* TAB 4: STATUTORY & KYC RECORDS */}
      {activeTab === "statutory" && (
        <div className="space-y-6">
          {/* Identity & KYC Card */}
          <AdminCard
            title="Identity & Statutory KYC"
            description="Official statutory identification documents, permanent address, and contact records"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                  PAN Number
                </span>
                <p className="mt-1 font-mono font-bold text-stone-900">
                  {showFullKyc
                    ? resident.panNumber || "—"
                    : maskPan(resident.panNumber)}
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                  Aadhaar (UID)
                </span>
                <p className="mt-1 font-mono font-bold text-stone-900">
                  {showFullKyc
                    ? resident.aadhaarNumber || "—"
                    : maskAadhaar(resident.aadhaarNumber)}
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                  Voter ID / Passport
                </span>
                <p className="mt-1 font-mono font-semibold text-stone-900">
                  {resident.voterId || resident.passportNumber || "—"}
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                  Date of Birth & Gender
                </span>
                <p className="mt-1 font-semibold text-stone-900">
                  {resident.dob ? resident.dob.split("T")[0] : "—"}{" "}
                  {resident.gender ? `(${resident.gender})` : ""}
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                  Blood Group & Occupation
                </span>
                <p className="mt-1 font-semibold text-stone-900">
                  {resident.bloodGroup || "—"} • {resident.occupation || "—"}
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                  Emergency Contact
                </span>
                <p className="mt-1 font-semibold text-stone-900">
                  {resident.emergencyContactName || "—"}{" "}
                  {resident.emergencyContactPhone ? `(${resident.emergencyContactPhone})` : ""}
                </p>
              </div>

              <div className="sm:col-span-2 lg:col-span-3 rounded-2xl border border-stone-200 bg-stone-50/60 p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                  Permanent Address
                </span>
                <p className="mt-1 text-xs text-stone-800 leading-relaxed">
                  {resident.permanentAddress || "No permanent address registered"}
                </p>
              </div>
            </div>

            {canManage && (
              <div className="mt-4 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setShowFullKyc(!showFullKyc)}
                  className="text-xs font-semibold text-stone-700 hover:text-stone-950 underline transition"
                >
                  {showFullKyc ? "Hide Full Numbers" : "Reveal Full KYC Numbers"}
                </button>
              </div>
            )}
          </AdminCard>

          {/* Form I: Share Certificates */}
          <AdminCard
            title='Form "I" Share Certificates'
            description="Statutory share certificate leaves issued for flats owned in this society"
          >
            {statutory.shareCertificates.length === 0 ? (
              <p className="text-xs text-stone-500 italic">No share certificates issued to this member yet.</p>
            ) : (
              <AdminTable
                headers={[
                  "Certificate #",
                  "Property Unit",
                  "Shares Count",
                  "Distinctive Range",
                  "Face Value",
                  "Issue Date",
                  "Status",
                ]}
                rows={statutory.shareCertificates.map((s) => (
                  <tr key={s.id} className="border-t border-stone-100 text-xs">
                    <td className="px-4 py-3 font-mono font-bold text-stone-950">{s.certificateNumber}</td>
                    <td className="px-4 py-3 font-semibold text-stone-900">{s.blockName} - {s.flatNumber}</td>
                    <td className="px-4 py-3 font-bold text-stone-950">{s.sharesCount} shares</td>
                    <td className="px-4 py-3 font-mono text-stone-600">{s.distinctiveRange || "—"}</td>
                    <td className="px-4 py-3 font-bold text-emerald-700">{currencySymbol}{s.faceValue.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 text-stone-600">{formatDateInAppTimeZone(s.issueDate)}</td>
                    <td className="px-4 py-3">
                      <AdminBadge variant={s.status === "ACTIVE" ? "success" : "neutral"} size="sm">
                        {s.status}
                      </AdminBadge>
                    </td>
                  </tr>
                ))}
              />
            )}
          </AdminCard>

          {/* Form X: Nominations */}
          <AdminCard
            title='Form "X" Nomination Register'
            description="Active nomination filings and percentage share allotments recorded for inheritance"
          >
            {statutory.nominations.length === 0 ? (
              <p className="text-xs text-stone-500 italic">No Form X nominations registered for this member yet.</p>
            ) : (
              <AdminTable
                headers={[
                  "Nominee Name",
                  "Relationship",
                  "Percentage Share",
                  "Property Unit",
                  "Nomination Date",
                  "Status",
                ]}
                rows={statutory.nominations.map((n) => (
                  <tr key={n.id} className="border-t border-stone-100 text-xs">
                    <td className="px-4 py-3 font-bold text-stone-950">{n.nomineeName}</td>
                    <td className="px-4 py-3 font-medium text-stone-700">{n.relationship}</td>
                    <td className="px-4 py-3 font-bold text-emerald-700">{n.percentageShare}%</td>
                    <td className="px-4 py-3 font-semibold text-stone-900">{n.blockName} - {n.flatNumber}</td>
                    <td className="px-4 py-3 text-stone-600">{formatDateInAppTimeZone(n.nominationDate)}</td>
                    <td className="px-4 py-3">
                      <AdminBadge variant={n.status === "ACTIVE" ? "success" : "neutral"} size="sm">
                        {n.status}
                      </AdminBadge>
                    </td>
                  </tr>
                ))}
              />
            )}
          </AdminCard>

          {/* Form M: Property Liens & Mortgages */}
          <AdminCard
            title='Form "M" Bank Mortgages & Liens'
            description="Home loan liens, bank NOC references, and sanction amounts"
          >
            {statutory.liens.length === 0 ? (
              <p className="text-xs text-stone-500 italic">No bank mortgage liens on properties owned by this resident.</p>
            ) : (
              <AdminTable
                headers={[
                  "Lending Bank",
                  "Loan Account #",
                  "Sanction Amount",
                  "Property Unit",
                  "Society NOC Ref",
                  "Lien Status",
                ]}
                rows={statutory.liens.map((l) => (
                  <tr key={l.id} className="border-t border-stone-100 text-xs">
                    <td className="px-4 py-3 font-bold text-stone-950">{l.bankName}</td>
                    <td className="px-4 py-3 font-mono text-stone-700">{l.loanAccountNumber || "—"}</td>
                    <td className="px-4 py-3 font-bold text-emerald-700">
                      {l.sanctionAmount ? `${currencySymbol}${l.sanctionAmount.toLocaleString("en-IN")}` : "—"}
                    </td>
                    <td className="px-4 py-3 font-semibold text-stone-900">{l.blockName} - {l.flatNumber}</td>
                    <td className="px-4 py-3 text-stone-600">{l.nocReference || "—"}</td>
                    <td className="px-4 py-3">
                      <AdminBadge variant={l.isCleared ? "success" : "warning"} size="sm">
                        {l.isCleared ? "Discharged" : "Active Lien"}
                      </AdminBadge>
                    </td>
                  </tr>
                ))}
              />
            )}
          </AdminCard>

          {/* Ownership Transfers History */}
          <AdminCard
            title="Ownership Transfer Register"
            description="Historical acquisition, allotment, and resale transfer records"
          >
            {statutory.ownershipTransfers.length === 0 ? (
              <p className="text-xs text-stone-500 italic">No transfer records found.</p>
            ) : (
              <AdminTable
                headers={[
                  "Transfer Date",
                  "Property Unit",
                  "Transfer Type",
                  "Acquisition / Sale",
                  "Counterparty",
                  "Registered Doc #",
                  "Transfer Fee",
                ]}
                rows={statutory.ownershipTransfers.map((t) => (
                  <tr key={t.id} className="border-t border-stone-100 text-xs">
                    <td className="px-4 py-3 text-stone-600">{formatDateInAppTimeZone(t.transferDate)}</td>
                    <td className="px-4 py-3 font-semibold text-stone-900">{t.blockName} - {t.flatNumber}</td>
                    <td className="px-4 py-3 font-medium text-stone-800">{t.transferType.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3">
                      <AdminBadge variant={t.isAcquisition ? "success" : "neutral"} size="sm">
                        {t.isAcquisition ? "Acquired" : "Transferred Out"}
                      </AdminBadge>
                    </td>
                    <td className="px-4 py-3 text-stone-700 font-medium">{t.counterpartyName || "—"}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-stone-600">{t.registeredDocNumber || "—"}</td>
                    <td className="px-4 py-3 text-emerald-700 font-semibold">
                      {t.transferFeePaid ? `${currencySymbol}${t.transferFeePaid.toLocaleString("en-IN")}` : "—"}
                    </td>
                  </tr>
                ))}
              />
            )}
          </AdminCard>
        </div>
      )}

      {/* Edit Resident Modal */}
      {isEditModalOpen ? (
        <EditResidentModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          societyCode={societyCode}
          resident={editableResident}
        />
      ) : null}
    </div>
  )
}
