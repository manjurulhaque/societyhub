"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { AdminStatCard, AdminBadge } from "@/components/admin"
import { CreateAssessmentModal } from "./CreateAssessmentModal"

export type AssessmentCampaignItem = {
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
  status: string
  approvedInMeeting: string | null
  remarks: string | null
  totalAllocated: number
  totalCollected: number
  totalOutstanding: number
  totalFlats: number
  paidFlatsCount: number
}

interface AssessmentsClientViewProps {
  societyCode: string
  currencySymbol: string
  campaigns: AssessmentCampaignItem[]
  totalFlatsCount: number
  canManage: boolean
}

export function AssessmentsClientView({
  societyCode,
  currencySymbol,
  campaigns,
  totalFlatsCount,
  canManage,
}: AssessmentsClientViewProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("ALL")

  // Overall Statistics
  const totalCampaigns = campaigns.length
  const totalTarget = campaigns.reduce((sum, c) => sum + (c.totalTargetAmount || c.totalAllocated), 0)
  const totalCollected = campaigns.reduce((sum, c) => sum + c.totalCollected, 0)
  const totalOutstanding = campaigns.reduce((sum, c) => sum + c.totalOutstanding, 0)
  const overallRealization = totalTarget > 0 ? Math.round((totalCollected / totalTarget) * 100) : 0

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      if (selectedStatus !== "ALL" && c.status !== selectedStatus) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          c.title.toLowerCase().includes(q) ||
          (c.description || "").toLowerCase().includes(q) ||
          (c.approvedInMeeting || "").toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [campaigns, selectedStatus, searchQuery])

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          title="Total Assessment Drives"
          value={totalCampaigns}
          subtitle="Sinking & Capital fund campaigns"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />

        <AdminStatCard
          title="Total Target Budget"
          value={`${currencySymbol}${totalTarget.toLocaleString("en-IN")}`}
          subtitle="Total capital improvement budget"
          icon={
            <svg className="h-5 w-5 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Total Realized (Collected)"
          value={`${currencySymbol}${totalCollected.toLocaleString("en-IN")}`}
          subtitle={`Realization Rate: ${overallRealization}%`}
          icon={
            <svg className="h-5 w-5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Pending Arrears"
          value={`${currencySymbol}${totalOutstanding.toLocaleString("en-IN")}`}
          subtitle="Remaining to be collected"
          icon={
            <svg className="h-5 w-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
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
              placeholder="Search assessment drives..."
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
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-700 focus:border-stone-900 focus:outline-none"
          >
            <option value="ALL">All Campaign Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="PAUSED">PAUSED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            <span>+ Launch Special Assessment</span>
          </button>
        )}
      </div>

      {/* Campaigns Cards Grid */}
      {filteredCampaigns.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-200 bg-white p-12 text-center shadow-xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-400">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="mt-3 text-sm font-semibold text-stone-900">No special assessment drives</h3>
          <p className="mt-1 text-xs text-stone-500">
            Launch a targeted sinking fund or capital assessment drive (e.g. Painting, Solar, Lift Replacement).
          </p>
          {canManage && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition"
              >
                + Launch First Drive
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {filteredCampaigns.map((camp) => {
            const realizationRate = camp.totalAllocated > 0 ? Math.round((camp.totalCollected / camp.totalAllocated) * 100) : 0

            return (
              <div
                key={camp.id}
                className="flex flex-col justify-between rounded-3xl border border-stone-200 bg-white p-6 shadow-xs hover:border-stone-300 transition"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AdminBadge
                        variant={
                          camp.status === "ACTIVE"
                            ? "success"
                            : camp.status === "COMPLETED"
                              ? "info"
                              : "neutral"
                        }
                        size="sm"
                      >
                        {camp.status}
                      </AdminBadge>

                      <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-700 uppercase tracking-wider">
                        {camp.calculationType === "SQFT_RATE"
                          ? `₹${camp.ratePerSqft}/sqft`
                          : `₹${camp.fixedAmountPerFlat?.toLocaleString("en-IN")}/flat`}
                      </span>
                    </div>

                    <span className="text-[11px] font-semibold text-stone-500">
                      {camp.paymentPlan === "ONE_TIME_ONLY" ? "Lump Sum" : `${camp.numberOfInstallments} Installments`}
                    </span>
                  </div>

                  <div>
                    <Link
                      href={`/society/${societyCode}/assessments/${camp.id}`}
                      className="text-base font-bold text-stone-950 hover:text-blue-600 transition block"
                    >
                      {camp.title}
                    </Link>
                    {camp.description && (
                      <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                        {camp.description}
                      </p>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-stone-700">Realization Progress</span>
                      <span className="font-mono font-bold text-emerald-700">{realizationRate}% Realized</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-stone-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${Math.min(100, realizationRate)}%` }}
                      />
                    </div>
                  </div>

                  {/* Financial Breakdown */}
                  <div className="grid grid-cols-3 gap-2 border-t border-stone-100 pt-3 text-xs">
                    <div>
                      <span className="text-[10px] text-stone-400 block font-medium">Assessed Total</span>
                      <span className="font-mono font-bold text-stone-900">
                        {currencySymbol}{camp.totalAllocated.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-stone-400 block font-medium">Realized</span>
                      <span className="font-mono font-bold text-emerald-700">
                        {currencySymbol}{camp.totalCollected.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-stone-400 block font-medium">Outstanding</span>
                      <span className="font-mono font-bold text-amber-700">
                        {currencySymbol}{camp.totalOutstanding.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-stone-100 pt-4 text-xs">
                  <span className="text-[11px] text-stone-400">
                    {camp.paidFlatsCount} of {camp.totalFlats} flats fully paid
                  </span>

                  <Link
                    href={`/society/${societyCode}/assessments/${camp.id}`}
                    className="inline-flex items-center gap-1 font-semibold text-stone-900 hover:text-blue-600 transition"
                  >
                    <span>View Unit Allocations</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Modal */}
      <CreateAssessmentModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        societyCode={societyCode}
        totalFlatsCount={totalFlatsCount}
      />
    </div>
  )
}
