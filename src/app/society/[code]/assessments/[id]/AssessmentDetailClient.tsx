"use client"

import { useState, useMemo, useTransition } from "react"
import { AdminCard, AdminBadge, AdminTable } from "@/components/admin"
import { RecordInstallmentPaymentModal } from "./RecordInstallmentPaymentModal"
import { updateAssessmentStatus } from "../actions"
import { formatDateInAppTimeZone } from "@/lib/datetime"
import type { AssessmentStatus } from "@/generated/prisma/client"

export type FlatAllocationItem = {
  id: string
  flatId: string
  flatNumber: string
  blockName: string
  residentName: string
  area: number | null
  areaUnit: string
  totalAmount: number
  paidAmount: number
  balanceAmount: number
  status: string
  installments: {
    id: string
    installmentNumber: number
    amount: number
    dueDate: string
    paidAmount: number
    status: string
    paidOn: string | null
  }[]
}

export type AssessmentDetailData = {
  id: string
  title: string
  description: string | null
  totalTargetAmount: number | null
  calculationType: string
  ratePerSqft: number | null
  fixedAmountPerFlat: number | null
  paymentPlan: string
  numberOfInstallments: number
  startDate: string
  dueDate: string | null
  status: AssessmentStatus
  approvedInMeeting: string | null
  remarks: string | null
  totalAllocated: number
  totalCollected: number
  totalOutstanding: number
  realizationRate: number
}

interface AssessmentDetailClientProps {
  societyCode: string
  currencySymbol: string
  campaign: AssessmentDetailData
  allocations: FlatAllocationItem[]
  blocks: string[]
  canManage: boolean
}

export function AssessmentDetailClient({
  societyCode,
  currencySymbol,
  campaign,
  allocations,
  blocks,
  canManage,
}: AssessmentDetailClientProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedBlock, setSelectedBlock] = useState("ALL")
  const [selectedStatus, setSelectedStatus] = useState("ALL")
  const [expandedAllocationId, setExpandedAllocationId] = useState<string | null>(null)

  // Payment modal state
  const [paymentModal, setPaymentModal] = useState<{
    installmentId: string
    installmentNumber: number
    flatIdentifier: string
    amountDue: number
  } | null>(null)

  const [isPending, startTransition] = useTransition()

  const handleStatusChange = (newStatus: AssessmentStatus) => {
    startTransition(async () => {
      await updateAssessmentStatus(societyCode, campaign.id, newStatus)
    })
  }

  const filteredAllocations = useMemo(() => {
    return allocations.filter((a) => {
      if (selectedBlock !== "ALL" && a.blockName !== selectedBlock) return false
      if (selectedStatus !== "ALL" && a.status !== selectedStatus) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          a.flatNumber.toLowerCase().includes(q) ||
          a.blockName.toLowerCase().includes(q) ||
          a.residentName.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [allocations, selectedBlock, selectedStatus, searchQuery])

  return (
    <div className="space-y-6">
      {/* Campaign Details Card & Controls */}
      <AdminCard
        title="Campaign Configuration & Scope"
        description="Formula, payment plan, and statutory resolution details"
        action={
          canManage ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-500 font-semibold">Status:</span>
              <select
                value={campaign.status}
                disabled={isPending}
                onChange={(e) => handleStatusChange(e.target.value as AssessmentStatus)}
                className="rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-900 focus:border-stone-900 focus:outline-none"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="PAUSED">PAUSED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
          ) : undefined
        }
      >
        <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4 text-xs pt-1">
          <div>
            <dt className="text-stone-400 font-medium">Calculation Method</dt>
            <dd className="font-semibold text-stone-900 mt-0.5">
              {campaign.calculationType === "PER_SQFT"
                ? `₹${campaign.ratePerSqft} / sq.ft carpet`
                : `₹${campaign.fixedAmountPerFlat?.toLocaleString("en-IN")} flat fee`}
            </dd>
          </div>

          <div>
            <dt className="text-stone-400 font-medium">Payment Plan</dt>
            <dd className="font-semibold text-stone-900 mt-0.5">
              {campaign.paymentPlan === "ONE_TIME_ONLY"
                ? "Lump Sum (1 Payment)"
                : `${campaign.numberOfInstallments} Monthly Installments`}
            </dd>
          </div>

          <div>
            <dt className="text-stone-400 font-medium">Collection Period</dt>
            <dd className="text-stone-800 mt-0.5 font-medium">
              {formatDateInAppTimeZone(campaign.startDate)} {campaign.dueDate ? `to ${formatDateInAppTimeZone(campaign.dueDate)}` : ""}
            </dd>
          </div>

          <div>
            <dt className="text-stone-400 font-medium">SGM / AGM Resolution</dt>
            <dd className="text-stone-800 mt-0.5">{campaign.approvedInMeeting || "—"}</dd>
          </div>

          {campaign.description && (
            <div className="sm:col-span-2 lg:col-span-4 border-t border-stone-100 pt-2.5">
              <dt className="text-stone-400 font-medium">Scope of Work</dt>
              <dd className="text-stone-700 mt-0.5 leading-relaxed">{campaign.description}</dd>
            </div>
          )}
        </dl>
      </AdminCard>

      {/* Flat Allocations Table */}
      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Unit-by-Unit Ledger</span>
            <h3 className="text-base font-bold text-stone-950">Flat Assessment Allocations</h3>
            <p className="text-xs text-stone-500">
              Allocated share, collection breakdown, and installment tracking for all {allocations.length} society units.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search flat or owner..."
              className="w-48 sm:w-56 rounded-xl border border-stone-200 bg-stone-50/50 px-3 py-1.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
            />

            <select
              value={selectedBlock}
              onChange={(e) => setSelectedBlock(e.target.value)}
              className="rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-700 focus:border-stone-900 focus:outline-none"
            >
              <option value="ALL">All Blocks ({blocks.length})</option>
              {blocks.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-700 focus:border-stone-900 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="PAID">PAID</option>
              <option value="PARTIALLY_PAID">PARTIAL</option>
              <option value="PENDING">PENDING</option>
            </select>
          </div>
        </div>

        {filteredAllocations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 p-8 text-center">
            <p className="text-xs text-stone-500">No unit allocations match your filter criteria.</p>
          </div>
        ) : (
          <AdminTable
            headers={[
              "Unit / Flat",
              "Owner / Resident",
              "Carpet Area",
              "Total Assessed",
              "Paid (Collected)",
              "Balance Due",
              "Status",
              "Installment Schedule",
            ]}
            rows={filteredAllocations.map((alloc) => {
              const isExpanded = expandedAllocationId === alloc.id

              return (
                <tr key={alloc.id} className="border-t border-stone-100 text-xs">
                  <td className="px-4 py-3.5 font-bold text-stone-950">
                    {alloc.blockName}-{alloc.flatNumber}
                  </td>

                  <td className="px-4 py-3.5 text-stone-800 font-medium">
                    {alloc.residentName}
                  </td>

                  <td className="px-4 py-3.5 text-stone-600">
                    {alloc.area ? `${alloc.area} ${alloc.areaUnit}` : "—"}
                  </td>

                  <td className="px-4 py-3.5 font-mono font-semibold text-stone-900">
                    {currencySymbol}{alloc.totalAmount.toLocaleString("en-IN")}
                  </td>

                  <td className="px-4 py-3.5 font-mono font-semibold text-emerald-700">
                    {currencySymbol}{alloc.paidAmount.toLocaleString("en-IN")}
                  </td>

                  <td className="px-4 py-3.5 font-mono font-bold text-amber-700">
                    {currencySymbol}{alloc.balanceAmount.toLocaleString("en-IN")}
                  </td>

                  <td className="px-4 py-3.5">
                    <AdminBadge
                      variant={
                        alloc.status === "PAID"
                          ? "success"
                          : alloc.status === "PARTIALLY_PAID"
                            ? "warning"
                            : "danger"
                      }
                      size="sm"
                    >
                      {alloc.status.replace("_", " ")}
                    </AdminBadge>
                  </td>

                  <td className="px-4 py-3.5">
                    <button
                      type="button"
                      onClick={() => setExpandedAllocationId(isExpanded ? null : alloc.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 text-[11px] font-semibold text-stone-700 hover:bg-stone-100 transition"
                    >
                      <span>{alloc.installments.length} Installments</span>
                      <span>{isExpanded ? "▲" : "▼"}</span>
                    </button>

                    {/* Expandable Installments Drawer */}
                    {isExpanded && (
                      <div className="mt-3 rounded-2xl border border-stone-200 bg-stone-50/80 p-3 space-y-2 text-xs">
                        <div className="font-bold text-stone-900 pb-1 border-b border-stone-200">
                          Installment Schedule for {alloc.blockName}-{alloc.flatNumber}
                        </div>
                        {alloc.installments.map((inst) => {
                          const instBalance = Math.max(0, inst.amount - inst.paidAmount)
                          const isInstPaid = inst.status === "PAID"

                          return (
                            <div
                              key={inst.id}
                              className="flex items-center justify-between bg-white rounded-xl p-2.5 border border-stone-200 text-[11px]"
                            >
                              <div>
                                <span className="font-semibold text-stone-900">
                                  Tranche #{inst.installmentNumber}
                                </span>
                                <span className="text-stone-500 block">
                                  Due: {formatDateInAppTimeZone(inst.dueDate)}
                                </span>
                              </div>

                              <div className="text-right">
                                <span className="font-mono font-semibold text-stone-900">
                                  {currencySymbol}{inst.amount.toLocaleString("en-IN")}
                                </span>
                                <span className="text-[10px] text-stone-500 block">
                                  Paid: {currencySymbol}{inst.paidAmount.toLocaleString("en-IN")}
                                </span>
                              </div>

                              <div>
                                <AdminBadge
                                  variant={isInstPaid ? "success" : "warning"}
                                  size="sm"
                                >
                                  {inst.status.replace("_", " ")}
                                </AdminBadge>
                              </div>

                              {canManage && !isInstPaid && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPaymentModal({
                                      installmentId: inst.id,
                                      installmentNumber: inst.installmentNumber,
                                      flatIdentifier: `${alloc.blockName}-${alloc.flatNumber}`,
                                      amountDue: instBalance,
                                    })
                                  }
                                  className="rounded-lg bg-stone-900 px-2 py-1 text-[10px] font-bold text-white hover:bg-stone-800"
                                >
                                  Record Pay
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          />
        )}
      </div>

      {/* Payment Record Modal */}
      {paymentModal && (
        <RecordInstallmentPaymentModal
          isOpen={Boolean(paymentModal)}
          onClose={() => setPaymentModal(null)}
          societyCode={societyCode}
          installmentId={paymentModal.installmentId}
          installmentNumber={paymentModal.installmentNumber}
          flatIdentifier={paymentModal.flatIdentifier}
          amountDue={paymentModal.amountDue}
          currencySymbol={currencySymbol}
        />
      )}
    </div>
  )
}
