"use client"

import { useState, useMemo, useTransition } from "react"
import Link from "next/link"
import { AdminStatCard, AdminBadge, AdminTable } from "@/components/admin"
import { CreateJournalVoucherModal, type LedgerOption } from "./CreateJournalVoucherModal"
import { voidJournalVoucher } from "./actions"
import { formatDateInAppTimeZone } from "@/lib/datetime"
import type { VoucherType, VoucherStatus } from "@/generated/prisma/client"

export type JournalEntryListItem = {
  id: string
  voucherNumber: string | null
  voucherType: VoucherType
  status: VoucherStatus
  entryDate: string
  narration: string | null
  reference: string | null
  totalAmount: number
  entries: {
    id: string
    ledgerId: string
    ledgerName: string
    ledgerGroup: string
    debit: number
    credit: number
    narration: string | null
  }[]
}

interface JournalVouchersClientViewProps {
  societyCode: string
  currencySymbol: string
  journals: JournalEntryListItem[]
  ledgers: LedgerOption[]
  canManage: boolean
}

export function JournalVouchersClientView({
  societyCode,
  currencySymbol,
  journals,
  ledgers,
  canManage,
}: JournalVouchersClientViewProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedType, setSelectedType] = useState<string>("ALL")
  const [isPending, startTransition] = useTransition()

  // Statistics
  const postedJournals = journals.filter((j) => j.status === "POSTED")
  const totalVolume = postedJournals.reduce((sum, j) => sum + j.totalAmount, 0)
  const contraCount = postedJournals.filter((j) => j.voucherType === "CONTRA").length
  const jvCount = postedJournals.filter((j) => j.voucherType === "JOURNAL").length

  const filteredJournals = useMemo(() => {
    return journals.filter((j) => {
      if (selectedType !== "ALL" && j.voucherType !== selectedType) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          (j.voucherNumber || "").toLowerCase().includes(q) ||
          (j.narration || "").toLowerCase().includes(q) ||
          (j.reference || "").toLowerCase().includes(q) ||
          j.entries.some((e) => e.ledgerName.toLowerCase().includes(q))
        )
      }
      return true
    })
  }, [journals, selectedType, searchQuery])

  const handleVoid = (journalId: string) => {
    if (!confirm("Are you sure you want to VOID this journal voucher?")) return
    startTransition(async () => {
      await voidJournalVoucher(societyCode, journalId)
    })
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          title="Total Posted Vouchers"
          value={postedJournals.length}
          subtitle="Double-entry journal records"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Total Debit / Credit Volume"
          value={`${currencySymbol}${totalVolume.toLocaleString("en-IN")}`}
          subtitle="Aggregated transaction turnover"
          icon={
            <svg className="h-5 w-5 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Journal Adjustments (JV)"
          value={jvCount}
          subtitle="Depreciation & accrual entries"
          icon={
            <svg className="h-5 w-5 text-purple-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Contra Transfers"
          value={contraCount}
          subtitle="Bank-Cash internal movements"
          icon={
            <svg className="h-5 w-5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
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
              placeholder="Search voucher #, ledger, notes..."
              className="w-52 sm:w-64 rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2 pl-9 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none"
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
            <option value="ALL">All Voucher Types</option>
            <option value="JOURNAL">Journal Vouchers (JV)</option>
            <option value="CONTRA">Contra Vouchers (CONTRA)</option>
            <option value="DEBIT_NOTE">Debit Notes (DN)</option>
            <option value="CREDIT_NOTE">Credit Notes (CN)</option>
            <option value="PAYMENT">Payment Vouchers (PMNT)</option>
            <option value="RECEIPT">Receipt Vouchers (RCPT)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/society/${societyCode}/ledgers`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 shadow-xs transition"
          >
            <span>← Chart of Accounts</span>
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
              <span>+ Post Journal Voucher</span>
            </button>
          )}
        </div>
      </div>

      {/* Vouchers Table */}
      {filteredJournals.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-200 bg-white p-12 text-center shadow-xs">
          <p className="text-xs text-stone-500">No journal vouchers found matching your filter.</p>
        </div>
      ) : (
        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs">
          <AdminTable
            headers={[
              "Voucher # & Date",
              "Type",
              "Double-Entry Breakdown (Dr / Cr)",
              "Total Amount",
              "Narration & Reference",
              "Status",
              ...(canManage ? ["Action"] : []),
            ]}
            rows={filteredJournals.map((j) => (
              <tr key={j.id} className="border-t border-stone-100 text-xs hover:bg-stone-50/60 transition">
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <span className="font-mono font-bold text-stone-950 block">
                    #{j.voucherNumber || "JV"}
                  </span>
                  <span className="text-[10px] text-stone-500 block">
                    {formatDateInAppTimeZone(j.entryDate)}
                  </span>
                </td>

                <td className="px-4 py-3.5">
                  <AdminBadge
                    variant={
                      j.voucherType === "CONTRA"
                        ? "info"
                        : j.voucherType === "JOURNAL"
                          ? "purple"
                          : j.voucherType === "PAYMENT"
                            ? "neutral"
                            : "success"
                    }
                    size="sm"
                  >
                    {j.voucherType}
                  </AdminBadge>
                </td>

                <td className="px-4 py-3.5 min-w-[280px]">
                  <div className="space-y-1 text-[11px]">
                    {j.entries.map((e) => (
                      <div key={e.id} className="flex items-center justify-between border-b border-stone-100/60 pb-1">
                        <span className="text-stone-800 font-medium">
                          {e.debit > 0 ? `Dr. ${e.ledgerName}` : `   To ${e.ledgerName}`}
                        </span>
                        <span className="font-mono font-bold text-stone-900">
                          {e.debit > 0
                            ? `${currencySymbol}${e.debit.toLocaleString("en-IN")}`
                            : `${currencySymbol}${e.credit.toLocaleString("en-IN")}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </td>

                <td className="px-4 py-3.5 font-mono font-bold text-stone-950 text-sm whitespace-nowrap">
                  {currencySymbol}{j.totalAmount.toLocaleString("en-IN")}
                </td>

                <td className="px-4 py-3.5 text-stone-600 max-w-xs">
                  <span className="block font-medium text-stone-900 text-xs truncate">{j.narration || "—"}</span>
                  {j.reference && (
                    <span className="text-[10px] text-stone-400 font-mono block">Ref: {j.reference}</span>
                  )}
                </td>

                <td className="px-4 py-3.5">
                  <AdminBadge
                    variant={j.status === "POSTED" ? "success" : j.status === "VOID" ? "danger" : "warning"}
                    size="sm"
                    dot
                  >
                    {j.status}
                  </AdminBadge>
                </td>

                {canManage && (
                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    {j.status === "POSTED" && (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleVoid(j.id)}
                        className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-[11px] font-semibold text-stone-400 hover:bg-red-50 hover:text-red-700 transition"
                      >
                        Void
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          />
        </div>
      )}

      {/* Create Modal */}
      <CreateJournalVoucherModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        societyCode={societyCode}
        ledgers={ledgers}
        currencySymbol={currencySymbol}
      />
    </div>
  )
}
