"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  AdminCard,
  AdminBadge,
  AdminTable,
  AdminButton,
  AdminTabs,
  AdminSearchBar,
  AdminSelect,
} from "@/components/admin"
import { formatDateInAppTimeZone } from "@/lib/datetime"
import { generateSafeCsv } from "@/lib/csv"

export type AdminReportData = {
  summary: {
    totalBilled: number
    totalCollected: number
    totalOutstanding: number
    collectionRate: number
    totalInvoicesCount: number
    totalPaymentsCount: number
    totalExpenses: number
    totalExpensesCount: number
    totalSocieties: number
    totalFlats: number
    totalOccupiedFlats: number
  }
  societies: {
    id: string
    name: string
    code: string | null
    blocksCount: number
    flatsCount: number
    occupiedCount: number
    totalBilled: number
    totalCollected: number
    totalOutstanding: number
    collectionRate: number
    defaultersCount: number
    riskTier: "HEALTHY" | "MODERATE" | "CRITICAL"
  }[]
  billsByCategory: {
    billType: string
    amount: number
    count: number
    percentage: number
  }[]
  paymentsByMode: {
    mode: string
    amount: number
    count: number
    percentage: number
  }[]
  recentPayments: {
    id: string
    receiptNumber: string | null
    societyId: string
    societyName: string
    societyCode: string | null
    residentName: string
    flatNumber: string | null
    amount: number
    mode: string
    createdAt: string
  }[]
}

export function AdminReportsClient({ data }: { data: AdminReportData }) {
  const [activeTab, setActiveTab] = useState<string>("leaderboard")
  const [searchQuery, setSearchQuery] = useState("")
  const [riskFilter, setRiskFilter] = useState("ALL")
  const [sortOrder, setSortOrder] = useState<"rate_desc" | "rate_asc" | "arrears_desc" | "billed_desc">("rate_desc")

  const filteredSocieties = useMemo(() => {
    return data.societies
      .filter((s) => {
        if (riskFilter !== "ALL" && s.riskTier !== riskFilter) return false
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim()
          const nameMatch = s.name.toLowerCase().includes(q)
          const codeMatch = s.code?.toLowerCase().includes(q)
          if (!nameMatch && !codeMatch) return false
        }
        return true
      })
      .sort((a, b) => {
        if (sortOrder === "rate_desc") return b.collectionRate - a.collectionRate
        if (sortOrder === "rate_asc") return a.collectionRate - b.collectionRate
        if (sortOrder === "arrears_desc") return b.totalOutstanding - a.totalOutstanding
        if (sortOrder === "billed_desc") return b.totalBilled - a.totalBilled
        return 0
      })
  }, [data.societies, riskFilter, searchQuery, sortOrder])

  const handleExportCSV = () => {
    const headers = [
      "Society Name",
      "Society Code",
      "Blocks",
      "Total Flats",
      "Occupied Flats",
      "Total Invoiced (₹)",
      "Total Collected (₹)",
      "Outstanding Balance (₹)",
      "Collection Rate (%)",
      "Defaulters Count",
      "Health Tier",
    ]

    const rows = filteredSocieties.map((s) => [
      s.name,
      s.code || "",
      s.blocksCount,
      s.flatsCount,
      s.occupiedCount,
      s.totalBilled,
      s.totalCollected,
      s.totalOutstanding,
      `${s.collectionRate}%`,
      s.defaultersCount,
      s.riskTier,
    ])

    if (rows.length === 0) {
      alert("No data to export.")
      return
    }

    const csvString = generateSafeCsv(headers, rows)
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `platform_societies_financial_report.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleDownloadPDF = async () => {
    const { generateReportPDF } = await import("@/lib/pdf/reportPdfGenerator")
    generateReportPDF({
      society: {
        name: "SARWS Connect Central Administration",
        address: "Syndicate Arena Portfolio Performance & Financial Audit",
        currencySymbol: "₹",
      },
      reportTitle: "Society Financial Health & Recovery Leaderboard",
      subtitle: `Aggregated portfolio recovery audit across all registered societies (${filteredSocieties.length} societies)`,
      headers: [
        "Society Name",
        "Code",
        "Flats",
        "Occupied",
        "Invoiced (₹)",
        "Collected (₹)",
        "Receivables (₹)",
        "Recovery %",
        "Defaulters",
        "Health Tier",
      ],
      rows: filteredSocieties.map((s) => [
        s.name,
        s.code || "—",
        s.flatsCount,
        s.occupiedCount,
        s.totalBilled.toLocaleString("en-IN"),
        s.totalCollected.toLocaleString("en-IN"),
        s.totalOutstanding.toLocaleString("en-IN"),
        `${s.collectionRate}%`,
        s.defaultersCount,
        s.riskTier,
      ]),
      filename: `platform_society_financial_leaderboard.pdf`,
      orientation: "landscape",
    })
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-8">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-4 print:hidden">
        <AdminTabs
          items={[
            { id: "leaderboard", label: "Society Financial Breakdown", count: data.societies.length },
            { id: "breakdown", label: "Revenue & Payment Channels" },
            { id: "recent", label: "Recent Collections Feed", count: data.recentPayments.length },
          ]}
          activeId={activeTab}
          onChange={(tab) => setActiveTab(tab)}
        />

        <div className="flex items-center gap-2">
          <AdminButton variant="primary" size="sm" onClick={handleDownloadPDF}>
            <svg
              className="mr-1.5 h-4 w-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Download PDF
          </AdminButton>

          <AdminButton variant="outline" size="sm" onClick={handleExportCSV}>
            <svg
              className="mr-1.5 h-4 w-4 text-stone-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Export CSV
          </AdminButton>

          <AdminButton variant="outline" size="sm" onClick={handlePrint}>
            <svg
              className="mr-1.5 h-4 w-4 text-stone-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            Print / Letterhead
          </AdminButton>
        </div>
      </div>

      {/* TAB 1: LEADERBOARD */}
      {activeTab === "leaderboard" && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
            <div className="w-full sm:w-72">
              <AdminSearchBar
                placeholder="Search society name or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery("")}
              />
            </div>

            <div className="w-48">
              <AdminSelect
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                options={[
                  { value: "ALL", label: "All Health Tiers" },
                  { value: "HEALTHY", label: "🟢 Healthy (>80%)" },
                  { value: "MODERATE", label: "🟡 Moderate (50-80%)" },
                  { value: "CRITICAL", label: "🔴 Critical (<50%)" },
                ]}
              />
            </div>

            <div className="w-52">
              <AdminSelect
                value={sortOrder}
                onChange={(e) =>
                  setSortOrder(
                    e.target.value as
                      | "rate_desc"
                      | "rate_asc"
                      | "arrears_desc"
                      | "billed_desc"
                  )
                }
                options={[
                  { value: "rate_desc", label: "Highest Recovery Rate" },
                  { value: "rate_asc", label: "Lowest Recovery Rate" },
                  { value: "arrears_desc", label: "Highest Outstanding" },
                  { value: "billed_desc", label: "Highest Invoiced" },
                ]}
              />
            </div>

            {(searchQuery || riskFilter !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("")
                  setRiskFilter("ALL")
                }}
                className="text-xs font-semibold text-rose-600 hover:text-rose-800"
              >
                Reset Filters
              </button>
            )}
          </div>

          <AdminCard
            title={`Society Financial Health & Recovery Leaderboard (${filteredSocieties.length} Organizations)`}
            description="Per-society collection performance, total demands issued, arrears exposure, and tenant drilldown"
          >
            {filteredSocieties.length === 0 ? (
              <p className="py-8 text-center text-xs text-stone-500">
                No societies found matching your criteria.
              </p>
            ) : (
              <AdminTable
                headers={[
                  "Housing Society",
                  "Units & Occupancy",
                  "Total Invoiced",
                  "Total Collected",
                  "Outstanding Arrears",
                  "Collection Rate",
                  "Defaulters",
                  "Actions",
                ]}
                rows={filteredSocieties.map((s) => (
                  <tr
                    key={s.id}
                    className="border-t border-stone-100 transition-colors hover:bg-stone-50/70"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/societies/${s.id}`}
                          className="font-bold text-stone-950 text-sm hover:underline"
                        >
                          {s.name}
                        </Link>
                        {s.code && (
                          <AdminBadge variant="neutral" size="sm">
                            {s.code}
                          </AdminBadge>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-xs text-stone-700">
                      <span className="font-semibold text-stone-900">{s.flatsCount}</span> Flats in{" "}
                      <span className="text-stone-500">{s.blocksCount} Blocks</span>
                      <span className="block text-[11px] text-stone-400">
                        {s.occupiedCount} occupied
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-xs font-semibold text-stone-900">
                      ₹{s.totalBilled.toLocaleString("en-IN")}
                    </td>

                    <td className="px-4 py-3.5 text-xs font-bold text-emerald-700">
                      ₹{s.totalCollected.toLocaleString("en-IN")}
                    </td>

                    <td className="px-4 py-3.5 text-xs font-black text-rose-700">
                      ₹{s.totalOutstanding.toLocaleString("en-IN")}
                    </td>

                    <td className="px-4 py-3.5">
                      <AdminBadge
                        variant={
                          s.riskTier === "HEALTHY"
                            ? "success"
                            : s.riskTier === "MODERATE"
                              ? "warning"
                              : "danger"
                        }
                        size="sm"
                        dot
                      >
                        {s.collectionRate}%
                      </AdminBadge>
                    </td>

                    <td className="px-4 py-3.5 text-xs text-stone-600">
                      {s.defaultersCount > 0 ? (
                        <span className="font-bold text-rose-700">{s.defaultersCount} units</span>
                      ) : (
                        <span className="text-emerald-700 font-medium">All Clear</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <AdminButton
                        href={`/society/${s.code || s.id}/reports`}
                        variant="outline"
                        size="xs"
                      >
                        Tenant Report ↗
                      </AdminButton>
                    </td>
                  </tr>
                ))}
              />
            )}
          </AdminCard>
        </div>
      )}

      {/* TAB 2: BREAKDOWN */}
      {activeTab === "breakdown" && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Revenue Categories */}
          <AdminCard
            title="Platform Revenue Assessment by Category"
            description="Distribution of generated demands across assessment types"
          >
            {data.billsByCategory.length === 0 ? (
              <p className="py-6 text-center text-xs text-stone-500">
                No bills recorded yet.
              </p>
            ) : (
              <div className="space-y-3">
                {data.billsByCategory.map((cat) => (
                  <div
                    key={cat.billType}
                    className="rounded-2xl border border-stone-100 bg-stone-50/60 p-3.5 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-stone-900">
                        {cat.billType.replace(/_/g, " ")}
                      </span>
                      <span className="text-stone-950 font-bold">
                        ₹{cat.amount.toLocaleString("en-IN")} ({cat.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-stone-200 overflow-hidden">
                      <div
                        className="h-full bg-stone-900 rounded-full transition-all"
                        style={{ width: `${cat.percentage}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-stone-500">
                      {cat.count} invoices generated across platform
                    </span>
                  </div>
                ))}
              </div>
            )}
          </AdminCard>

          {/* Payment Modes */}
          <AdminCard
            title="Platform Collections by Payment Channel"
            description="Payment modes used by residents across all societies"
          >
            {data.paymentsByMode.length === 0 ? (
              <p className="py-6 text-center text-xs text-stone-500">
                No payments recorded yet.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {data.paymentsByMode.map((mode) => (
                  <div
                    key={mode.mode}
                    className="rounded-2xl border border-stone-200 bg-stone-50/70 p-3.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-900">
                        {mode.mode}
                      </span>
                      <AdminBadge variant="neutral" size="sm">
                        {mode.percentage}%
                      </AdminBadge>
                    </div>
                    <p className="mt-2 text-base font-extrabold text-emerald-800">
                      ₹{mode.amount.toLocaleString("en-IN")}
                    </p>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      {mode.count} receipts recorded
                    </p>
                  </div>
                ))}
              </div>
            )}
          </AdminCard>
        </div>
      )}

      {/* TAB 3: RECENT TRANSACTIONS */}
      {activeTab === "recent" && (
        <AdminCard
          title="Latest Collection Receipts Feed"
          description="Most recent payment transactions recorded across all societies"
        >
          {data.recentPayments.length === 0 ? (
            <p className="py-6 text-center text-xs text-stone-500">
              No payments recorded yet.
            </p>
          ) : (
            <AdminTable
              headers={[
                "Receipt #",
                "Resident & Unit",
                "Housing Society",
                "Amount",
                "Payment Channel",
                "Date",
              ]}
              rows={data.recentPayments.map((p) => (
                <tr key={p.id} className="border-t border-stone-100 hover:bg-stone-50/60">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-stone-900">
                    {p.receiptNumber || `#${p.id.slice(0, 8)}`}
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-800">
                    <p className="font-semibold">{p.residentName}</p>
                    <p className="text-[11px] text-stone-500">
                      {p.flatNumber ? `Flat ${p.flatNumber}` : "Unit"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-700">
                    <Link
                      href={`/society/${p.societyCode || p.societyId}/reports`}
                      className="hover:underline font-medium text-stone-900"
                    >
                      {p.societyName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs font-black text-emerald-700">
                    ₹{p.amount.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3">
                    <AdminBadge variant="neutral" size="sm">
                      {p.mode}
                    </AdminBadge>
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-500">
                    {formatDateInAppTimeZone(p.createdAt)}
                  </td>
                </tr>
              ))}
            />
          )}
        </AdminCard>
      )}
    </div>
  )
}
