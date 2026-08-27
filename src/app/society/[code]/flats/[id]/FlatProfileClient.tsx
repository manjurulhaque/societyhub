"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { AdminCard, AdminBadge, AdminTable, AdminStatCard } from "@/components/admin"
import { TransferOwnershipModal, type PersonDirectoryOption } from "./TransferOwnershipModal"
import { AddFlatPersonModal } from "./AddFlatPersonModal"
import { EditFlatModal } from "../EditFlatModal"
import type { BlockOption } from "../AddFlatModal"
import { removeFlatPerson, refundMemberDeposit, forfeitMemberDeposit } from "../actions"
import { formatDateInAppTimeZone } from "@/lib/datetime"
import { maskBankAccount } from "@/lib/masking"
import { EntityAuditDrawer } from "@/components/audit/EntityAuditDrawer"

export type FlatDetailData = {
  id: string
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
}

export type FlatOccupantItem = {
  id: string
  personId: string
  personName: string
  personPhone: string | null
  personEmail: string | null
  role: string
  isPrimary: boolean
  fromDate: string
  toDate: string | null
  isActive: boolean
}

export type OwnershipHistoryItem = {
  id: string
  fromPersonName: string | null
  toPersonName: string
  transferType: string
  transferDate: string
  fromDate: string
  toDate: string | null
  isCurrentOwner: boolean
  registeredDocNumber: string | null
  registrationDate: string | null
  transferFeePaid: number | null
  nocReference: string | null
  nocIssuedDate: string | null
  resolutionNumber: string | null
  committeeApprovalDate: string | null
  remarks: string | null
}

export type StatutoryData = {
  shareCertificate: {
    certificateNumber: string
    sharesCount: number
    distinctiveRange: string | null
    faceValue: number
    issueDate: string
    status: string
  } | null
  nominations: {
    id: string
    nomineeName: string
    relationship: string
    percentageShare: number
    status: string
    nominationDate: string
  }[]
  liens: {
    id: string
    bankName: string
    loanAccountNumber: string | null
    sanctionAmount: number | null
    nocReference: string | null
    nocIssuedDate: string | null
    isCleared: boolean
  }[]
}

export type FinancialData = {
  bills: {
    id: string
    billNumber: string | null
    year: number
    month: number
    amount: number
    status: string
    dueDate: string | null
  }[]
  payments: {
    id: string
    receiptNumber: string | null
    amount: number
    paidOn: string
    mode: string
    status: string
  }[]
  deposits: {
    id: string
    depositType: string
    amount: number
    status: string
    receivedOn: string
    refundedOn: string | null
  }[]
}

interface FlatProfileClientProps {
  societyCode: string
  societyId: string
  currencySymbol: string
  flat: FlatDetailData
  blocks: BlockOption[]
  occupants: FlatOccupantItem[]
  ownershipHistory: OwnershipHistoryItem[]
  statutory: StatutoryData
  financial: FinancialData
  people: PersonDirectoryOption[]
  unpaidDues: number
  unpaidBillsCount: number
  activeDepositsTotal: number
  canManage: boolean
}

export function FlatProfileClient({
  societyCode,
  societyId,
  currencySymbol,
  flat,
  blocks,
  occupants,
  ownershipHistory,
  statutory,
  financial,
  people,
  unpaidDues,
  unpaidBillsCount,
  activeDepositsTotal,
  canManage,
}: FlatProfileClientProps) {
  const [activeTab, setActiveTab] = useState<"occupants" | "ownership" | "statutory" | "financial">("occupants")
  const [isEditFlatOpen, setIsEditFlatOpen] = useState(false)
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  const [isAddPersonModalOpen, setIsAddPersonModalOpen] = useState(false)
  const [isEndingTenancyId, setIsEndingTenancyId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const currentOwner =
    ownershipHistory.find((h) => h.isCurrentOwner)?.toPersonName ||
    occupants.find((o) => o.role === "OWNER" && o.isActive)?.personName ||
    "Unassigned"

  const handleEndTenancy = (flatPersonId: string) => {
    if (!confirm("Are you sure you want to end this residency/tenancy?")) return

    setIsEndingTenancyId(flatPersonId)
    startTransition(async () => {
      try {
        await removeFlatPerson(societyCode, flatPersonId, flat.id)
      } finally {
        setIsEndingTenancyId(null)
      }
    })
  }

  const tabs = [
    { id: "occupants", label: `Residents & Occupancy (${occupants.filter((o) => o.isActive).length})` },
    { id: "ownership", label: `Ownership Chain (${ownershipHistory.length})` },
    { id: "statutory", label: "Statutory Registers & Liens" },
    { id: "financial", label: "Ledger & Billing Snapshot" },
  ] as const

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div>
        <Link
          href={`/society/${societyCode}/flats`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900 transition mb-3"
        >
          <span>←</span>
          <span>Back to Blocks & Flats</span>
        </Link>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
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

            <h1 className="text-xl font-bold tracking-tight text-stone-950 sm:text-2xl">
              Flat {flat.number}
            </h1>

            <p className="text-xs text-stone-500">
              {flat.floor !== null ? `Floor ${flat.floor} • ` : ""}
              {flat.area ? `${flat.area} ${flat.areaUnit} • ` : ""}
              {flat.parkingSlot ? `🚗 Parking: ${flat.parkingSlot} • ` : ""}
              {flat.intercomNumber ? `📞 Intercom: ${flat.intercomNumber}` : ""}
            </p>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-2">
            {canManage && (
              <button
                type="button"
                onClick={() => setIsEditFlatOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 shadow-xs hover:bg-stone-50 hover:text-stone-900 transition"
              >
                <svg className="h-4 w-4 text-stone-500" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
                  <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
                </svg>
                <span>Edit Flat</span>
              </button>
            )}

            <EntityAuditDrawer
              entity="Flat"
              entityId={flat.id}
              entityTitle={`Flat ${flat.blockName}-${flat.number}`}
              societyId={societyId}
              relatedEntityIds={[
                ...occupants.map((p) => p.id),
                ...(statutory.shareCertificate ? [flat.id] : []),
                ...statutory.liens.map((l) => l.id),
                ...statutory.nominations.map((n) => n.id),
              ]}
              buttonVariant="outline"
            />
          </div>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          title="Registered Owner"
          value={currentOwner}
          subtitle={`Tenure since ${ownershipHistory[0] ? ownershipHistory[0].transferDate.split("T")[0] : "Allotment"}`}
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Outstanding Maintenance"
          value={`${currencySymbol}${unpaidDues.toLocaleString("en-IN")}`}
          subtitle={unpaidBillsCount > 0 ? `${unpaidBillsCount} unpaid bill(s)` : "All dues cleared"}
          icon={
            <svg className="h-5 w-5 text-red-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Active Member Deposits"
          value={`${currencySymbol}${activeDepositsTotal.toLocaleString("en-IN")}`}
          subtitle="Held security / fitout deposits"
          icon={
            <svg className="h-5 w-5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Share Certificate"
          value={statutory.shareCertificate?.certificateNumber || "Not Issued"}
          subtitle={
            statutory.shareCertificate
              ? `${statutory.shareCertificate.sharesCount} shares (${statutory.shareCertificate.status})`
              : "Form I register pending"
          }
          icon={
            <svg className="h-5 w-5 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-stone-200 gap-6 overflow-x-auto text-xs font-semibold">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 transition-colors border-b-2 whitespace-nowrap ${
              activeTab === tab.id
                ? "border-stone-900 text-stone-950 font-bold"
                : "border-transparent text-stone-400 hover:text-stone-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Occupants & Residents */}
      {activeTab === "occupants" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-stone-950">Active Residents, Co-Owners & Tenants</h3>
              <p className="text-xs text-stone-500">People currently or historically residing in this flat.</p>
            </div>

            {canManage && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddPersonModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition"
                >
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                  </svg>
                  <span>+ Assign Resident / Tenant</span>
                </button>
              </div>
            )}
          </div>

          {occupants.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-200 bg-white p-8 text-center">
              <p className="text-xs text-stone-500">No occupants currently assigned to this unit.</p>
            </div>
          ) : (
            <AdminTable
              headers={[
                "Resident Name",
                "Occupancy Role",
                "Contact Phone",
                "Email",
                "Tenancy Period",
                "Status",
                ...(canManage ? ["Action"] : []),
              ]}
              rows={occupants.map((occ) => (
                <tr key={occ.id} className="border-t border-stone-100 text-xs">
                  <td className="px-4 py-3.5">
                    <Link
                      href={`/society/${societyCode}/members/${occ.personId}`}
                      className="font-bold text-stone-950 hover:text-blue-600 transition block"
                    >
                      {occ.personName}
                    </Link>
                    {occ.isPrimary && (
                      <span className="text-[10px] text-blue-700 font-semibold bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5 mt-0.5 inline-block">
                        Primary Point of Contact
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3.5">
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
                  </td>

                  <td className="px-4 py-3.5 text-stone-700 font-mono">
                    {occ.personPhone || "—"}
                  </td>

                  <td className="px-4 py-3.5 text-stone-600 truncate max-w-xs">
                    {occ.personEmail || "—"}
                  </td>

                  <td className="px-4 py-3.5 text-stone-700 whitespace-nowrap">
                    {formatDateInAppTimeZone(occ.fromDate)} {occ.toDate ? `to ${formatDateInAppTimeZone(occ.toDate)}` : "— Present"}
                  </td>

                  <td className="px-4 py-3.5">
                    <AdminBadge variant={occ.isActive ? "success" : "neutral"} size="sm">
                      {occ.isActive ? "Active" : "Historical"}
                    </AdminBadge>
                  </td>

                  {canManage && (
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      {occ.isActive && (
                        <button
                          type="button"
                          disabled={isPending && isEndingTenancyId === occ.id}
                          onClick={() => handleEndTenancy(occ.id)}
                          className="rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-700 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition disabled:opacity-50"
                        >
                          End Tenancy
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            />
          )}
        </div>
      )}

      {/* Tab 2: Ownership History & Chain of Title */}
      {activeTab === "ownership" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-stone-950">Statutory Chain of Ownership & Deeds</h3>
              <p className="text-xs text-stone-500">
                Official chronological record of title transfers, registered sale deeds, and committee approvals.
              </p>
            </div>

            {canManage && (
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                <span>Transfer Ownership</span>
              </button>
            )}
          </div>

          {ownershipHistory.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-200 bg-white p-8 text-center">
              <p className="text-xs text-stone-500">No ownership transfer records found for this flat.</p>
              {canManage && (
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(true)}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  + Record Initial Owner / Deed
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {ownershipHistory.map((item, idx) => (
                <div
                  key={item.id}
                  className={`rounded-2xl border p-4.5 text-xs transition ${
                    item.isCurrentOwner
                      ? "border-emerald-200 bg-emerald-50/40 shadow-xs"
                      : "border-stone-200 bg-white"
                  }`}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-stone-100 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[10px] font-bold uppercase text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                        Tenure #{ownershipHistory.length - idx}
                      </span>
                      <AdminBadge variant={item.isCurrentOwner ? "success" : "neutral"} size="sm">
                        {item.isCurrentOwner ? "CURRENT ACTIVE OWNER" : "PREVIOUS OWNER"}
                      </AdminBadge>
                      <span className="font-semibold text-stone-700">
                        {item.transferType.replace(/_/g, " ")}
                      </span>
                    </div>

                    <div className="text-[11px] text-stone-500">
                      Deed Date: <strong className="text-stone-900">{formatDateInAppTimeZone(item.transferDate)}</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 pt-3">
                    <div>
                      <span className="text-[10px] text-stone-400 font-medium block">Owner / Transferee</span>
                      <span className="font-bold text-stone-950 text-sm">{item.toPersonName}</span>
                      {item.fromPersonName && (
                        <span className="text-[10px] text-stone-500 block">From: {item.fromPersonName}</span>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] text-stone-400 font-medium block">Sub-Registrar Doc Number</span>
                      <span className="font-mono font-semibold text-stone-800">
                        {item.registeredDocNumber || "—"}
                      </span>
                      {item.registrationDate && (
                        <span className="text-[10px] text-stone-500 block">
                          Reg: {formatDateInAppTimeZone(item.registrationDate)}
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] text-stone-400 font-medium block">MCM Resolution Approval</span>
                      <span className="font-semibold text-stone-800">{item.resolutionNumber || "—"}</span>
                      {item.committeeApprovalDate && (
                        <span className="text-[10px] text-stone-500 block">
                          Approved: {formatDateInAppTimeZone(item.committeeApprovalDate)}
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] text-stone-400 font-medium block">Society Transfer Premium Fee</span>
                      <span className="font-mono font-semibold text-stone-950">
                        {item.transferFeePaid !== null ? `${currencySymbol}${item.transferFeePaid.toLocaleString("en-IN")}` : "₹0"}
                      </span>
                      {item.nocReference && (
                        <span className="text-[10px] text-stone-500 block">NOC: {item.nocReference}</span>
                      )}
                    </div>
                  </div>

                  {item.remarks && (
                    <div className="mt-3 rounded-xl bg-stone-50 p-2.5 text-[11px] text-stone-600">
                      <strong>Remarks:</strong> {item.remarks}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Statutory Registers & Liens */}
      {activeTab === "statutory" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Share Certificate Card */}
          <AdminCard title="Share Certificate (Form I Register)" description="Official cooperative society shares issued">
            {statutory.shareCertificate ? (
              <div className="space-y-3 text-xs pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Certificate Number</span>
                  <span className="font-mono font-bold text-stone-950 text-sm">
                    {statutory.shareCertificate.certificateNumber}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Number of Shares</span>
                  <span className="font-bold text-stone-900">{statutory.shareCertificate.sharesCount} shares</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Distinctive Numbers</span>
                  <span className="font-mono text-stone-800">{statutory.shareCertificate.distinctiveRange || "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Face Value Total</span>
                  <span className="font-mono font-semibold text-stone-950">
                    {currencySymbol}{statutory.shareCertificate.faceValue.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Issue Date</span>
                  <span className="text-stone-800 font-medium">
                    {formatDateInAppTimeZone(statutory.shareCertificate.issueDate)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Status</span>
                  <AdminBadge variant="success" size="sm">
                    {statutory.shareCertificate.status}
                  </AdminBadge>
                </div>
              </div>
            ) : (
              <p className="text-xs text-stone-500 italic py-4">No Share Certificate issued for this flat yet.</p>
            )}
          </AdminCard>

          {/* Form X Nominations */}
          <AdminCard title="Nomination Register (Form X / J)" description="Registered nominees for transmission of shares">
            {statutory.nominations.length === 0 ? (
              <p className="text-xs text-stone-500 italic py-4">No Form X nominations recorded.</p>
            ) : (
              <div className="space-y-2 text-xs pt-1">
                {statutory.nominations.map((nom) => (
                  <div key={nom.id} className="flex items-center justify-between border-b border-stone-100 pb-2">
                    <div>
                      <span className="font-bold text-stone-900 block">{nom.nomineeName}</span>
                      <span className="text-[11px] text-stone-500">{nom.relationship}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-emerald-700">{nom.percentageShare}% Share</span>
                      <span className="text-[10px] text-stone-400 block">{formatDateInAppTimeZone(nom.nominationDate)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AdminCard>

          {/* Bank Mortgages / Property Liens */}
          <div className="lg:col-span-2">
            <AdminCard title="Property Mortgages & Bank NOCs (M Register)" description="Bank liens and home loan charge notes">
              {statutory.liens.length === 0 ? (
                <p className="text-xs text-stone-500 italic py-4">No active or historical bank liens recorded on this property.</p>
              ) : (
                <AdminTable
                  headers={["Financial Institution / Bank", "Loan Account No.", "Sanction Amount", "NOC Ref", "Status"]}
                  rows={statutory.liens.map((lien) => (
                    <tr key={lien.id} className="border-t border-stone-100 text-xs">
                      <td className="px-4 py-3 font-semibold text-stone-950">{lien.bankName}</td>
                      <td className="px-4 py-3 text-stone-800 font-mono">{lien.loanAccountNumber ? maskBankAccount(lien.loanAccountNumber) : "—"}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-stone-900">
                        {lien.sanctionAmount !== null ? `${currencySymbol}${lien.sanctionAmount.toLocaleString("en-IN")}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-stone-600">{lien.nocReference || "—"}</td>
                      <td className="px-4 py-3">
                        <AdminBadge variant={lien.isCleared ? "success" : "danger"} size="sm">
                          {lien.isCleared ? "DISCHARGED / CLEARED" : "ACTIVE LIEN"}
                        </AdminBadge>
                      </td>
                    </tr>
                  ))}
                />
              )}
            </AdminCard>
          </div>
        </div>
      )}

      {/* Tab 4: Financial Ledger & Invoices */}
      {activeTab === "financial" && (
        <div className="space-y-6">
          {/* Held Member Deposits */}
          <AdminCard title="Held Member Deposits" description="Move-in, fitout, renovation, or tenant security deposits">
            {financial.deposits.length === 0 ? (
              <p className="text-xs text-stone-500 italic py-2">No security deposits held for this flat.</p>
            ) : (
              <AdminTable
                headers={[
                  "Deposit Type",
                  "Amount Held",
                  "Received Date",
                  "Status",
                  "Refund Date",
                  ...(canManage ? ["Action"] : []),
                ]}
                rows={financial.deposits.map((dep) => (
                  <tr key={dep.id} className="border-t border-stone-100 text-xs">
                    <td className="px-4 py-3 font-semibold text-stone-900">{dep.depositType}</td>
                    <td className="px-4 py-3 font-mono font-bold text-stone-950">
                      {currencySymbol}{dep.amount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-stone-700">{formatDateInAppTimeZone(dep.receivedOn)}</td>
                    <td className="px-4 py-3">
                      <AdminBadge
                        variant={
                          dep.status === "HELD"
                            ? "warning"
                            : dep.status === "REFUNDED"
                              ? "success"
                              : "danger"
                        }
                        size="sm"
                      >
                        {dep.status}
                      </AdminBadge>
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {dep.refundedOn ? formatDateInAppTimeZone(dep.refundedOn) : "—"}
                    </td>

                    {canManage && (
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {dep.status === "HELD" ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm("Mark this deposit as refunded?")) {
                                  startTransition(async () => {
                                    await refundMemberDeposit(societyCode, flat.id, dep.id)
                                  })
                                }
                              }}
                              className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 transition"
                            >
                              Refund
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm("Mark this deposit as forfeited (e.g. damages)?")) {
                                  startTransition(async () => {
                                    await forfeitMemberDeposit(societyCode, flat.id, dep.id)
                                  })
                                }
                              }}
                              className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-[11px] font-semibold text-stone-400 hover:bg-red-50 hover:text-red-700 transition"
                            >
                              Forfeit
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-stone-400">Settled</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              />
            )}
          </AdminCard>

          {/* Recent Invoices & Payments */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <AdminCard title="Recent Maintenance Invoices" description="Recent bills generated for this unit">
              {financial.bills.length === 0 ? (
                <p className="text-xs text-stone-500 italic py-3">No bills generated yet.</p>
              ) : (
                <div className="space-y-2 text-xs pt-1">
                  {financial.bills.slice(0, 5).map((b) => (
                    <div key={b.id} className="flex items-center justify-between border-b border-stone-100 pb-2">
                      <div>
                        <span className="font-semibold text-stone-950 block">Bill #{b.billNumber || b.id.slice(0, 8)}</span>
                        <span className="text-[11px] text-stone-500">{b.month}/{b.year}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-stone-950">{currencySymbol}{b.amount.toLocaleString("en-IN")}</span>
                        <div className="mt-0.5">
                          <AdminBadge variant={b.status === "PAID" ? "success" : "danger"} size="sm">
                            {b.status}
                          </AdminBadge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AdminCard>

            <AdminCard title="Recent Payment Receipts" description="Collections received from this flat">
              {financial.payments.length === 0 ? (
                <p className="text-xs text-stone-500 italic py-3">No payments recorded yet.</p>
              ) : (
                <div className="space-y-2 text-xs pt-1">
                  {financial.payments.slice(0, 5).map((p) => (
                    <div key={p.id} className="flex items-center justify-between border-b border-stone-100 pb-2">
                      <div>
                        <span className="font-semibold text-stone-950 block">Receipt #{p.receiptNumber || p.id.slice(0, 8)}</span>
                        <span className="text-[11px] text-stone-500">{formatDateInAppTimeZone(p.paidOn)} • {p.mode}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-emerald-700">{currencySymbol}{p.amount.toLocaleString("en-IN")}</span>
                        <div className="mt-0.5">
                          <AdminBadge variant="success" size="sm">{p.status}</AdminBadge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AdminCard>
          </div>
        </div>
      )}

      {/* Edit Flat Modal */}
      <EditFlatModal
        isOpen={isEditFlatOpen}
        onClose={() => setIsEditFlatOpen(false)}
        societyCode={societyCode}
        blocks={blocks}
        flat={{
          id: flat.id,
          blockId: flat.blockId,
          blockName: flat.blockName,
          number: flat.number,
          floor: flat.floor,
          unitType: flat.unitType,
          status: flat.status,
          area: flat.area,
          areaUnit: flat.areaUnit,
          parkingSlot: flat.parkingSlot,
          intercomNumber: flat.intercomNumber,
        }}
      />

      {/* Transfer Ownership Modal */}
      <TransferOwnershipModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        societyCode={societyCode}
        flatId={flat.id}
        flatIdentifier={`${flat.blockName}-${flat.number}`}
        currentOwnerName={currentOwner}
        people={people}
      />

      {/* Add Flat Person Modal */}
      <AddFlatPersonModal
        isOpen={isAddPersonModalOpen}
        onClose={() => setIsAddPersonModalOpen(false)}
        societyCode={societyCode}
        flatId={flat.id}
        flatIdentifier={`${flat.blockName}-${flat.number}`}
        people={people}
      />
    </div>
  )
}
