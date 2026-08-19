"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  AdminCard,
  AdminBadge,
  AdminStatCard,
  AdminTable,
  AdminButton,
  AdminTabs,
  AdminSearchBar,
  AdminSelect,
} from "@/components/admin"
import { formatDateInAppTimeZone } from "@/lib/datetime"

export type SocietyReportData = {
  society: {
    id: string
    name: string
    code: string | null
    currencySymbol: string
  }
  summary: {
    totalBilled: number
    totalCollected: number
    totalOutstanding: number
    collectionRate: number
    totalBillsCount: number
    totalPaymentsCount: number
    totalExpenses: number
    totalExpensesCount: number
    netOperatingSurplus: number
    liquidCashAndBank: number
    totalFixedDeposits: number
    totalReserves: number
    defaultersCount: number
    totalFlatsCount: number
    defaulterRate: number
  }
  billsByCategory: {
    billType: string
    amount: number
    count: number
    percentage: number
  }[]
  expensesByCategory: {
    categoryName: string
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
  bankAccounts: {
    id: string
    name: string
    bankName: string | null
    accountNumber: string | null
    accountType: string
    currentBalance: number
    isDefault: boolean
  }[]
  fixedDeposits: {
    id: string
    fdNumber: string
    bankName: string
    principalAmount: number
    interestRate: number
    maturityAmount: number
    maturityDate: string
    status: string
  }[]
  defaulters: {
    flatId: string
    flatNumber: string
    blockName: string
    occupancyStatus: string
    residentName: string
    residentPhone: string | null
    residentEmail: string | null
    unpaidBillsCount: number
    unpaidPrincipal: number
    unpaidLateFees: number
    totalOverdue: number
    oldestDueDate: string | null
    agingBucket: "OVER_90" | "DAYS_61_90" | "DAYS_31_60" | "DAYS_0_30"
    daysOverdue: number
  }[]
  agingSummary: {
    over90: { count: number; amount: number }
    days61To90: { count: number; amount: number }
    days31To60: { count: number; amount: number }
    days0To30: { count: number; amount: number }
  }
  monthlyTrends: {
    key: string
    label: string
    year: number
    month: number
    billedAmount: number
    billedCount: number
    collectedAmount: number
    collectedCount: number
    collectionRate: number
    expenseAmount: number
    netCashflow: number
  }[]
  pnl: {
    incomeHeads: {
      category: string
      amount: number
      count: number
    }[]
    totalIncome: number
    expenseHeads: {
      category: string
      amount: number
      count: number
    }[]
    totalExpense: number
    netSurplus: number
  }
  unitLedger: {
    flatId: string
    flatNumber: string
    blockName: string
    unitType: string | null
    area: number | null
    areaUnit: string
    occupancyStatus: string
    residentName: string
    totalInvoicesCount: number
    totalBilledAmount: number
    totalPaidAmount: number
    outstandingAmount: number
    advanceAmount: number
    accountStatus: "CLEAR" | "PENDING" | "OVERDUE" | "ADVANCE" | "NO_BILLS"
  }[]
  blocks: string[]
}

export function SocietyReportsClient({ data }: { data: SocietyReportData }) {
  const [activeTab, setActiveTab] = useState<string>("overview")

  // Defaulters Filter State
  const [defaulterSearch, setDefaulterSearch] = useState("")
  const [defaulterBlock, setDefaulterBlock] = useState("ALL")
  const [defaulterAgingFilter, setDefaulterAgingFilter] = useState("ALL")

  // Unit Ledger Filter State
  const [unitSearch, setUnitSearch] = useState("")
  const [unitBlock, setUnitBlock] = useState("ALL")
  const [unitStatusFilter, setUnitStatusFilter] = useState("ALL")

  const societyCode = data.society.code || data.society.id
  const sym = data.society.currencySymbol || "₹"

  // Filtered Defaulters
  const filteredDefaulters = useMemo(() => {
    return data.defaulters.filter((item) => {
      if (defaulterBlock !== "ALL" && item.blockName !== defaulterBlock) return false
      if (defaulterAgingFilter !== "ALL" && item.agingBucket !== defaulterAgingFilter) return false
      if (defaulterSearch.trim()) {
        const query = defaulterSearch.toLowerCase().trim()
        const flatMatch = item.flatNumber.toLowerCase().includes(query)
        const nameMatch = item.residentName.toLowerCase().includes(query)
        const blockMatch = item.blockName.toLowerCase().includes(query)
        const phoneMatch = item.residentPhone?.toLowerCase().includes(query)
        if (!flatMatch && !nameMatch && !blockMatch && !phoneMatch) return false
      }
      return true
    })
  }, [data.defaulters, defaulterBlock, defaulterAgingFilter, defaulterSearch])

  // Filtered Unit Ledger
  const filteredUnitLedger = useMemo(() => {
    return data.unitLedger.filter((unit) => {
      if (unitBlock !== "ALL" && unit.blockName !== unitBlock) return false
      if (unitStatusFilter !== "ALL") {
        if (unitStatusFilter === "DUES" && unit.outstandingAmount <= 0) return false
        if (unitStatusFilter === "CLEAR" && (unit.outstandingAmount > 0 || unit.advanceAmount > 0)) return false
        if (unitStatusFilter === "ADVANCE" && unit.advanceAmount <= 0) return false
      }
      if (unitSearch.trim()) {
        const query = unitSearch.toLowerCase().trim()
        const flatMatch = unit.flatNumber.toLowerCase().includes(query)
        const nameMatch = unit.residentName.toLowerCase().includes(query)
        const blockMatch = unit.blockName.toLowerCase().includes(query)
        if (!flatMatch && !nameMatch && !blockMatch) return false
      }
      return true
    })
  }, [data.unitLedger, unitBlock, unitStatusFilter, unitSearch])

  // CSV Export Utility
  const handleExportCSV = (reportType: string) => {
    let headers: string[] = []
    let rows: (string | number)[][] = []
    const filename = `${data.society.name.toLowerCase().replace(/\s+/g, "_")}_${reportType}_report.csv`

    if (reportType === "defaulters") {
      headers = [
        "Flat Number",
        "Block",
        "Occupancy",
        "Resident / Owner Name",
        "Phone",
        "Email",
        "Unpaid Bills",
        "Principal Due (₹)",
        "Late Fee / Interest (₹)",
        "Total Overdue (₹)",
        "Aging Bucket",
        "Days Overdue",
        "Oldest Due Date",
      ]
      rows = filteredDefaulters.map((d) => [
        d.flatNumber,
        d.blockName,
        d.occupancyStatus,
        `"${d.residentName.replace(/"/g, '""')}"`,
        d.residentPhone || "",
        d.residentEmail || "",
        d.unpaidBillsCount,
        d.unpaidPrincipal,
        d.unpaidLateFees,
        d.totalOverdue,
        d.agingBucket,
        d.daysOverdue,
        d.oldestDueDate ? formatDateInAppTimeZone(d.oldestDueDate) : "",
      ])
    } else if (reportType === "monthly_trends") {
      headers = [
        "Period",
        "Invoices Issued",
        "Billed Demand (₹)",
        "Payments Received",
        "Collections Realized (₹)",
        "Collection Efficiency (%)",
        "Expenses (₹)",
        "Net Operating Cashflow (₹)",
      ]
      rows = data.monthlyTrends.map((m) => [
        m.label,
        m.billedCount,
        m.billedAmount,
        m.collectedCount,
        m.collectedAmount,
        `${m.collectionRate}%`,
        m.expenseAmount,
        m.netCashflow,
      ])
    } else if (reportType === "income_expenditure") {
      headers = ["Section", "Head / Category", "Transaction Count", "Amount (₹)"]
      rows = [
        ...data.pnl.incomeHeads.map((h) => ["Income", `"${h.category}"`, h.count, h.amount]),
        ["Income Total", "Total Income", "", data.pnl.totalIncome],
        ...data.pnl.expenseHeads.map((h) => ["Expense", `"${h.category}"`, h.count, h.amount]),
        ["Expense Total", "Total Expense", "", data.pnl.totalExpense],
        ["Net Result", "Operating Surplus / (Deficit)", "", data.pnl.netSurplus],
      ]
    } else if (reportType === "unit_ledger") {
      headers = [
        "Flat Number",
        "Block",
        "Unit Type",
        "Area (sq.ft)",
        "Occupancy",
        "Resident / Owner",
        "Total Invoices",
        "Total Billed (₹)",
        "Total Paid (₹)",
        "Outstanding Due (₹)",
        "Advance Balance (₹)",
        "Account Status",
      ]
      rows = filteredUnitLedger.map((u) => [
        u.flatNumber,
        u.blockName,
        u.unitType || "",
        u.area || "",
        u.occupancyStatus,
        `"${u.residentName.replace(/"/g, '""')}"`,
        u.totalInvoicesCount,
        u.totalBilledAmount,
        u.totalPaidAmount,
        u.outstandingAmount,
        u.advanceAmount,
        u.accountStatus,
      ])
    }

    if (rows.length === 0) {
      alert("No data available to export.")
      return
    }

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-8">
      {/* Action Bar (Export & Print) */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-4 print:hidden">
        <AdminTabs
          items={[
            { id: "overview", label: "Overview & Health" },
            {
              id: "defaulters",
              label: "Defaulters & Arrears",
              count: data.summary.defaultersCount,
            },
            { id: "monthly", label: "Monthly Trends" },
            { id: "pnl", label: "Income & Expenditure" },
            { id: "units", label: "Unit Ledger", count: data.summary.totalFlatsCount },
          ]}
          activeId={activeTab}
          onChange={(tab) => setActiveTab(tab)}
        />

        <div className="flex items-center gap-2">
          <AdminButton
            variant="outline"
            size="sm"
            onClick={() => {
              if (activeTab === "defaulters") handleExportCSV("defaulters")
              else if (activeTab === "monthly") handleExportCSV("monthly_trends")
              else if (activeTab === "pnl") handleExportCSV("income_expenditure")
              else if (activeTab === "units") handleExportCSV("unit_ledger")
              else handleExportCSV("defaulters")
            }}
          >
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
            Print Report
          </AdminButton>
        </div>
      </div>

      {/* Global KPI Cards (Shown on all views) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* Total Billed */}
        <AdminStatCard
          title="Total Billed"
          value={`${sym}${data.summary.totalBilled.toLocaleString("en-IN")}`}
          subtitle={`${data.summary.totalBillsCount} Invoices generated`}
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
            </svg>
          }
        />

        {/* Total Collected */}
        <AdminStatCard
          title="Total Collections"
          value={`${sym}${data.summary.totalCollected.toLocaleString("en-IN")}`}
          subtitle={`${data.summary.totalPaymentsCount} Payments received`}
          icon={
            <svg className="h-5 w-5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        {/* Outstanding Arrears */}
        <AdminStatCard
          title="Outstanding Arrears"
          value={`${sym}${data.summary.totalOutstanding.toLocaleString("en-IN")}`}
          subtitle={`${data.summary.defaultersCount} Units with dues (${data.summary.defaulterRate}%)`}
          trend={{
            value: `${data.summary.collectionRate}%`,
            direction: data.summary.collectionRate >= 80 ? "up" : "down",
            label: "recovery rate",
          }}
          icon={
            <svg className="h-5 w-5 text-rose-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />

        {/* Operational Expenses */}
        <AdminStatCard
          title="Total Expenses"
          value={`${sym}${data.summary.totalExpenses.toLocaleString("en-IN")}`}
          subtitle={`${data.summary.totalExpensesCount} Expense vouchers`}
          icon={
            <svg className="h-5 w-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />

        {/* Net Operating Surplus / Deficit */}
        <AdminStatCard
          title="Operating Balance"
          value={`${sym}${data.summary.netOperatingSurplus.toLocaleString("en-IN")}`}
          subtitle={
            data.summary.netOperatingSurplus >= 0
              ? "Net Operating Surplus"
              : "Net Operating Deficit"
          }
          trend={{
            value: data.summary.netOperatingSurplus >= 0 ? "Surplus" : "Deficit",
            direction: data.summary.netOperatingSurplus >= 0 ? "up" : "down",
            label: "cashflow status",
          }}
          icon={
            <svg
              className={`h-5 w-5 ${
                data.summary.netOperatingSurplus >= 0 ? "text-emerald-700" : "text-rose-700"
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />

        {/* Bank & Reserves */}
        <AdminStatCard
          title="Liquid & Reserves"
          value={`${sym}${data.summary.totalReserves.toLocaleString("en-IN")}`}
          subtitle={`Liquid: ${sym}${data.summary.liquidCashAndBank.toLocaleString("en-IN")} | FDs: ${sym}${data.summary.totalFixedDeposits.toLocaleString("en-IN")}`}
          icon={
            <svg className="h-5 w-5 text-indigo-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
            </svg>
          }
        />
      </div>

      {/* ========================================== */}
      {/* TAB 1: OVERVIEW & HEALTH */}
      {/* ========================================== */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          {/* Visual Financial Health & Cashflow Summary */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Collection Health Gauge Card */}
            <AdminCard
              title="Collection Recovery & Arrears Health"
              description="Overall recovery efficiency and overdue risk exposure"
            >
              <div className="space-y-6 pt-2">
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-stone-900">
                      Collection Recovery Rate
                    </span>
                    <span className="font-bold text-stone-950">
                      {data.summary.collectionRate}%
                    </span>
                  </div>
                  <div className="mt-2 h-3.5 w-full overflow-hidden rounded-full bg-stone-100 p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        data.summary.collectionRate >= 80
                          ? "bg-emerald-600"
                          : data.summary.collectionRate >= 50
                            ? "bg-amber-500"
                            : "bg-rose-600"
                      }`}
                      style={{ width: `${Math.min(100, data.summary.collectionRate)}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-stone-500">
                    <span>
                      Collected: {sym}
                      {data.summary.totalCollected.toLocaleString("en-IN")}
                    </span>
                    <span>
                      Target Demand: {sym}
                      {data.summary.totalBilled.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* Arrears Aging Distribution Bar */}
                <div>
                  <span className="text-xs font-semibold text-stone-700">
                    Arrears Aging Distribution (Total: {sym}
                    {data.summary.totalOutstanding.toLocaleString("en-IN")})
                  </span>
                  <div className="mt-2 flex h-3 w-full overflow-hidden rounded-full bg-stone-100">
                    {data.summary.totalOutstanding > 0 ? (
                      <>
                        <div
                          className="bg-rose-600"
                          style={{
                            width: `${(data.agingSummary.over90.amount / data.summary.totalOutstanding) * 100}%`,
                          }}
                          title={`>90 Days: ${sym}${data.agingSummary.over90.amount.toLocaleString("en-IN")}`}
                        />
                        <div
                          className="bg-amber-500"
                          style={{
                            width: `${(data.agingSummary.days61To90.amount / data.summary.totalOutstanding) * 100}%`,
                          }}
                          title={`61-90 Days: ${sym}${data.agingSummary.days61To90.amount.toLocaleString("en-IN")}`}
                        />
                        <div
                          className="bg-yellow-400"
                          style={{
                            width: `${(data.agingSummary.days31To60.amount / data.summary.totalOutstanding) * 100}%`,
                          }}
                          title={`31-60 Days: ${sym}${data.agingSummary.days31To60.amount.toLocaleString("en-IN")}`}
                        />
                        <div
                          className="bg-sky-400"
                          style={{
                            width: `${(data.agingSummary.days0To30.amount / data.summary.totalOutstanding) * 100}%`,
                          }}
                          title={`0-30 Days: ${sym}${data.agingSummary.days0To30.amount.toLocaleString("en-IN")}`}
                        />
                      </>
                    ) : (
                      <div className="h-full w-full bg-emerald-500" title="All Clear" />
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs">
                    <div className="rounded-xl border border-rose-100 bg-rose-50/70 p-2.5">
                      <p className="text-[11px] font-semibold text-rose-800">&gt;90 Days (Chronic)</p>
                      <p className="font-bold text-rose-950">
                        {sym}{data.agingSummary.over90.amount.toLocaleString("en-IN")}
                      </p>
                      <p className="text-[10px] text-rose-600">
                        {data.agingSummary.over90.count} units
                      </p>
                    </div>

                    <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-2.5">
                      <p className="text-[11px] font-semibold text-amber-800">61-90 Days</p>
                      <p className="font-bold text-amber-950">
                        {sym}{data.agingSummary.days61To90.amount.toLocaleString("en-IN")}
                      </p>
                      <p className="text-[10px] text-amber-600">
                        {data.agingSummary.days61To90.count} units
                      </p>
                    </div>

                    <div className="rounded-xl border border-yellow-100 bg-yellow-50/70 p-2.5">
                      <p className="text-[11px] font-semibold text-yellow-800">31-60 Days</p>
                      <p className="font-bold text-yellow-950">
                        {sym}{data.agingSummary.days31To60.amount.toLocaleString("en-IN")}
                      </p>
                      <p className="text-[10px] text-yellow-600">
                        {data.agingSummary.days31To60.count} units
                      </p>
                    </div>

                    <div className="rounded-xl border border-sky-100 bg-sky-50/70 p-2.5">
                      <p className="text-[11px] font-semibold text-sky-800">0-30 Days (Current)</p>
                      <p className="font-bold text-sky-950">
                        {sym}{data.agingSummary.days0To30.amount.toLocaleString("en-IN")}
                      </p>
                      <p className="text-[10px] text-sky-600">
                        {data.agingSummary.days0To30.count} units
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </AdminCard>

            {/* Income vs Expenses Cashflow Card */}
            <AdminCard
              title="Operating Cash Flow & Reserves Summary"
              description="Realized inflows vs operational outflows and treasury balances"
            >
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                    <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                      Realized Income
                    </p>
                    <p className="mt-1 text-xl font-bold text-emerald-950">
                      {sym}{data.summary.totalCollected.toLocaleString("en-IN")}
                    </p>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      {data.summary.totalPaymentsCount} receipts deposited
                    </p>
                  </div>

                  <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
                    <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
                      Operational Expenses
                    </p>
                    <p className="mt-1 text-xl font-bold text-amber-950">
                      {sym}{data.summary.totalExpenses.toLocaleString("en-IN")}
                    </p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      {data.summary.totalExpensesCount} vouchers disbursed
                    </p>
                  </div>
                </div>

                <div
                  className={`rounded-2xl border p-4 ${
                    data.summary.netOperatingSurplus >= 0
                      ? "border-emerald-200 bg-emerald-50/80"
                      : "border-rose-200 bg-rose-50/80"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
                        Net Operating Balance
                      </p>
                      <p
                        className={`text-2xl font-black mt-1 ${
                          data.summary.netOperatingSurplus >= 0
                            ? "text-emerald-900"
                            : "text-rose-900"
                        }`}
                      >
                        {sym}{data.summary.netOperatingSurplus.toLocaleString("en-IN")}
                      </p>
                    </div>
                    <AdminBadge
                      variant={data.summary.netOperatingSurplus >= 0 ? "success" : "danger"}
                      size="md"
                    >
                      {data.summary.netOperatingSurplus >= 0
                        ? "Operating Surplus"
                        : "Operating Deficit"}
                    </AdminBadge>
                  </div>
                  <p className="text-xs text-stone-600 mt-2">
                    {data.summary.netOperatingSurplus >= 0
                      ? "Collections exceed operational expenditures. Healthy cash buffer."
                      : "Operational disbursements exceed realized collections for the period."}
                  </p>
                </div>
              </div>
            </AdminCard>
          </div>

          {/* Revenue Streams & Expenditure Categories Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Revenue Assessment Breakdown */}
            <AdminCard
              title="Revenue Streams by Bill Type"
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
                          {sym}{cat.amount.toLocaleString("en-IN")} ({cat.percentage}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-stone-200 overflow-hidden">
                        <div
                          className="h-full bg-stone-900 rounded-full transition-all"
                          style={{ width: `${cat.percentage}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-stone-500">
                        {cat.count} invoices generated
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </AdminCard>

            {/* Expenditure by Category */}
            <AdminCard
              title="Operational Expenses by Category"
              description="Distribution of operational costs and maintenance overheads"
            >
              {data.expensesByCategory.length === 0 ? (
                <p className="py-6 text-center text-xs text-stone-500">
                  No expense records found.
                </p>
              ) : (
                <div className="space-y-3">
                  {data.expensesByCategory.map((cat) => (
                    <div
                      key={cat.categoryName}
                      className="rounded-2xl border border-stone-100 bg-stone-50/60 p-3.5 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-stone-900">{cat.categoryName}</span>
                        <span className="text-amber-900 font-bold">
                          {sym}{cat.amount.toLocaleString("en-IN")} ({cat.percentage}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-amber-100 overflow-hidden">
                        <div
                          className="h-full bg-amber-600 rounded-full transition-all"
                          style={{ width: `${cat.percentage}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-stone-500">
                        {cat.count} vouchers processed
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </AdminCard>
          </div>

          {/* Payment Modes & Bank / Reserve Summary Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Collections by Payment Method */}
            <AdminCard
              title="Collections by Payment Channel"
              description="Distribution of payment methods used by residents"
            >
              {data.paymentsByMode.length === 0 ? (
                <p className="py-6 text-center text-xs text-stone-500">
                  No payment records found.
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
                        {sym}{mode.amount.toLocaleString("en-IN")}
                      </p>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        {mode.count} transactions
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </AdminCard>

            {/* Bank Accounts & Liquid Float */}
            <AdminCard
              title="Bank Accounts & Liquid Cash Float"
              description="Current available balances across operational bank accounts and cash floats"
              action={
                <Link
                  href={`/society/${societyCode}/accounts`}
                  className="text-xs font-semibold text-stone-900 hover:text-stone-700"
                >
                  Manage Accounts →
                </Link>
              }
            >
              {data.bankAccounts.length === 0 ? (
                <p className="py-6 text-center text-xs text-stone-500">
                  No bank accounts configured.
                </p>
              ) : (
                <AdminTable
                  headers={["Account Name", "Type & Bank", "Account Number", "Current Balance"]}
                  rows={data.bankAccounts.map((acc) => (
                    <tr key={acc.id} className="border-t border-stone-100 hover:bg-stone-50/60">
                      <td className="px-4 py-3 text-xs font-bold text-stone-950">
                        {acc.name}
                        {acc.isDefault && (
                          <AdminBadge variant="success" size="sm" className="ml-2">
                            Default
                          </AdminBadge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-stone-700">
                        {acc.bankName || acc.accountType}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-stone-600">
                        {acc.accountNumber ? `••••${acc.accountNumber.slice(-4)}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs font-extrabold text-stone-950">
                        {sym}{acc.currentBalance.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                />
              )}
            </AdminCard>
          </div>

          {/* Fixed Deposits Table if available */}
          {data.fixedDeposits.length > 0 && (
            <AdminCard
              title="Fixed Deposits & Long-Term Sinking Reserves"
              description="Audited active term deposits held in scheduled banks"
              action={
                <Link
                  href={`/society/${societyCode}/investments`}
                  className="text-xs font-semibold text-stone-900 hover:text-stone-700"
                >
                  View Investments →
                </Link>
              }
            >
              <AdminTable
                headers={[
                  "FD Number",
                  "Bank & Branch",
                  "Principal (₹)",
                  "Interest Rate",
                  "Maturity Date",
                  "Maturity Value (₹)",
                  "Status",
                ]}
                rows={data.fixedDeposits.map((fd) => (
                  <tr key={fd.id} className="border-t border-stone-100 hover:bg-stone-50/60">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-stone-950">
                      {fd.fdNumber}
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-700">{fd.bankName}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-stone-900">
                      {sym}{fd.principalAmount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-emerald-700">
                      {fd.interestRate}% p.a.
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-600">
                      {formatDateInAppTimeZone(fd.maturityDate)}
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-stone-950">
                      {sym}{fd.maturityAmount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3">
                      <AdminBadge
                        variant={fd.status === "ACTIVE" ? "success" : "neutral"}
                        size="sm"
                      >
                        {fd.status}
                      </AdminBadge>
                    </td>
                  </tr>
                ))}
              />
            </AdminCard>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 2: DEFAULTERS & ARREARS AGING */}
      {/* ========================================== */}
      {activeTab === "defaulters" && (
        <div className="space-y-6">
          {/* Defaulter Aging Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-800">
                  Severe Overdue (&gt;90 Days)
                </span>
                <AdminBadge variant="danger" size="sm">
                  Chronic
                </AdminBadge>
              </div>
              <p className="mt-2 text-2xl font-black text-rose-950">
                {sym}{data.agingSummary.over90.amount.toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-rose-700 mt-1 font-medium">
                {data.agingSummary.over90.count} unit(s) pending for over 3 months
              </p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                  61 - 90 Days Overdue
                </span>
                <AdminBadge variant="warning" size="sm">
                  Medium
                </AdminBadge>
              </div>
              <p className="mt-2 text-2xl font-black text-amber-950">
                {sym}{data.agingSummary.days61To90.amount.toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-amber-700 mt-1 font-medium">
                {data.agingSummary.days61To90.count} unit(s)
              </p>
            </div>

            <div className="rounded-2xl border border-yellow-200 bg-yellow-50/80 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-yellow-800">
                  31 - 60 Days Overdue
                </span>
                <AdminBadge variant="warning" size="sm">
                  Notice
                </AdminBadge>
              </div>
              <p className="mt-2 text-2xl font-black text-yellow-950">
                {sym}{data.agingSummary.days31To60.amount.toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-yellow-700 mt-1 font-medium">
                {data.agingSummary.days31To60.count} unit(s)
              </p>
            </div>

            <div className="rounded-2xl border border-sky-200 bg-sky-50/80 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-800">
                  0 - 30 Days (Current Cycle)
                </span>
                <AdminBadge variant="neutral" size="sm">
                  Recent
                </AdminBadge>
              </div>
              <p className="mt-2 text-2xl font-black text-sky-950">
                {sym}{data.agingSummary.days0To30.amount.toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-sky-700 mt-1 font-medium">
                {data.agingSummary.days0To30.count} unit(s)
              </p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
            <div className="w-full sm:w-72">
              <AdminSearchBar
                placeholder="Search flat number, resident name, phone..."
                value={defaulterSearch}
                onChange={(e) => setDefaulterSearch(e.target.value)}
                onClear={() => setDefaulterSearch("")}
              />
            </div>

            <div className="w-40">
              <AdminSelect
                value={defaulterBlock}
                onChange={(e) => setDefaulterBlock(e.target.value)}
                options={[
                  { value: "ALL", label: "All Blocks" },
                  ...data.blocks.map((b) => ({ value: b, label: `Block ${b}` })),
                ]}
              />
            </div>

            <div className="w-48">
              <AdminSelect
                value={defaulterAgingFilter}
                onChange={(e) => setDefaulterAgingFilter(e.target.value)}
                options={[
                  { value: "ALL", label: "All Aging Categories" },
                  { value: "OVER_90", label: "> 90 Days (Chronic)" },
                  { value: "DAYS_61_90", label: "61 - 90 Days" },
                  { value: "DAYS_31_60", label: "31 - 60 Days" },
                  { value: "DAYS_0_30", label: "0 - 30 Days" },
                ]}
              />
            </div>

            {(defaulterSearch || defaulterBlock !== "ALL" || defaulterAgingFilter !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setDefaulterSearch("")
                  setDefaulterBlock("ALL")
                  setDefaulterAgingFilter("ALL")
                }}
                className="text-xs font-semibold text-rose-600 hover:text-rose-800"
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* Defaulters Table */}
          <AdminCard
            title={`Defaulters & Arrears Register (${filteredDefaulters.length} Units)`}
            description="Itemized overdue assessment breakdown per housing unit with aging severity"
          >
            {filteredDefaulters.length === 0 ? (
              <div className="py-12 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-emerald-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="mt-3 text-sm font-semibold text-stone-800">
                  No defaulters found matching your criteria!
                </p>
                <p className="text-xs text-stone-500">
                  All units within this filter are clear of arrears.
                </p>
              </div>
            ) : (
              <AdminTable
                headers={[
                  "Flat & Block",
                  "Primary Resident / Owner",
                  "Unpaid Invoices",
                  "Principal Due",
                  "Late Fees / Interest",
                  "Total Outstanding",
                  "Aging Severity",
                  "Oldest Due Date",
                  "Actions",
                ]}
                rows={filteredDefaulters.map((d) => (
                  <tr key={d.flatId} className="border-t border-stone-100 hover:bg-stone-50/60">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-stone-950 text-sm">{d.flatNumber}</div>
                      <div className="text-[11px] text-stone-500">Block {d.blockName}</div>
                    </td>

                    <td className="px-4 py-3.5 text-xs text-stone-800">
                      <p className="font-semibold text-stone-900">{d.residentName}</p>
                      {d.residentPhone && (
                        <p className="text-[11px] text-stone-500">📞 {d.residentPhone}</p>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-xs text-stone-700">
                      <span className="font-semibold text-stone-900">
                        {d.unpaidBillsCount}
                      </span>{" "}
                      bill(s)
                    </td>

                    <td className="px-4 py-3.5 text-xs font-semibold text-stone-900">
                      {sym}{d.unpaidPrincipal.toLocaleString("en-IN")}
                    </td>

                    <td className="px-4 py-3.5 text-xs font-semibold text-amber-700">
                      {sym}{d.unpaidLateFees.toLocaleString("en-IN")}
                    </td>

                    <td className="px-4 py-3.5 text-xs font-black text-rose-700">
                      {sym}{d.totalOverdue.toLocaleString("en-IN")}
                    </td>

                    <td className="px-4 py-3.5">
                      <AdminBadge
                        variant={
                          d.agingBucket === "OVER_90"
                            ? "danger"
                            : d.agingBucket === "DAYS_61_90"
                              ? "warning"
                              : d.agingBucket === "DAYS_31_60"
                                ? "warning"
                                : "neutral"
                        }
                        size="sm"
                        dot
                      >
                        {d.agingBucket === "OVER_90"
                          ? ">90 Days Overdue"
                          : d.agingBucket === "DAYS_61_90"
                            ? "61-90 Days"
                            : d.agingBucket === "DAYS_31_60"
                              ? "31-60 Days"
                              : "0-30 Days"}
                      </AdminBadge>
                    </td>

                    <td className="px-4 py-3.5 text-xs text-stone-500">
                      {d.oldestDueDate ? formatDateInAppTimeZone(d.oldestDueDate) : "—"}
                    </td>

                    <td className="px-4 py-3.5">
                      <AdminButton
                        href={`/society/${societyCode}/flats/${d.flatId}`}
                        variant="outline"
                        size="xs"
                      >
                        Inspect Unit →
                      </AdminButton>
                    </td>
                  </tr>
                ))}
              />
            )}
          </AdminCard>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 3: MONTH-ON-MONTH TRENDS */}
      {/* ========================================== */}
      {activeTab === "monthly" && (
        <div className="space-y-6">
          <AdminCard
            title="Month-on-Month Invoicing & Collection Performance"
            description="Chronological audit of monthly demands, collection realizations, and operating cashflow"
          >
            {data.monthlyTrends.length === 0 ? (
              <p className="py-6 text-center text-xs text-stone-500">
                No monthly billing trends available.
              </p>
            ) : (
              <AdminTable
                headers={[
                  "Billing Period",
                  "Invoices Issued",
                  "Billed Demand",
                  "Collections Realized",
                  "Recovery Rate",
                  "Operational Expenses",
                  "Net Monthly Cashflow",
                ]}
                rows={data.monthlyTrends.map((trend) => (
                  <tr key={trend.key} className="border-t border-stone-100 hover:bg-stone-50/60">
                    <td className="px-4 py-3.5 font-bold text-xs text-stone-950">
                      {trend.label}
                    </td>

                    <td className="px-4 py-3.5 text-xs text-stone-600">
                      {trend.billedCount} invoice(s)
                    </td>

                    <td className="px-4 py-3.5 text-xs font-semibold text-stone-900">
                      {sym}{trend.billedAmount.toLocaleString("en-IN")}
                    </td>

                    <td className="px-4 py-3.5 text-xs font-bold text-emerald-700">
                      {sym}{trend.collectedAmount.toLocaleString("en-IN")}
                      <span className="block text-[10px] text-stone-400 font-normal">
                        {trend.collectedCount} receipt(s)
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <AdminBadge
                          variant={
                            trend.collectionRate >= 80
                              ? "success"
                              : trend.collectionRate >= 50
                                ? "warning"
                                : "danger"
                          }
                          size="sm"
                        >
                          {trend.collectionRate}%
                        </AdminBadge>
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-stone-100 hidden sm:block">
                          <div
                            className={`h-full ${
                              trend.collectionRate >= 80
                                ? "bg-emerald-600"
                                : trend.collectionRate >= 50
                                  ? "bg-amber-500"
                                  : "bg-rose-500"
                            }`}
                            style={{ width: `${Math.min(100, trend.collectionRate)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-xs font-semibold text-amber-700">
                      {sym}{trend.expenseAmount.toLocaleString("en-IN")}
                    </td>

                    <td className="px-4 py-3.5 text-xs font-extrabold">
                      <span
                        className={
                          trend.netCashflow >= 0 ? "text-emerald-700" : "text-rose-700"
                        }
                      >
                        {trend.netCashflow >= 0 ? "+" : ""}
                        {sym}{trend.netCashflow.toLocaleString("en-IN")}
                      </span>
                    </td>
                  </tr>
                ))}
              />
            )}
          </AdminCard>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 4: INCOME & EXPENDITURE STATEMENT */}
      {/* ========================================== */}
      {activeTab === "pnl" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="border-b border-stone-200 pb-4 text-center">
              <h2 className="text-xl font-black tracking-tight text-stone-950">
                {data.society.name}
              </h2>
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mt-1">
                Statement of Income & Expenditure
              </p>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2">
              {/* INCOME SIDE */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b-2 border-emerald-600 pb-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-950">
                    Income Heads
                  </h3>
                  <span className="text-xs font-semibold text-emerald-800">Amount ({sym})</span>
                </div>

                <div className="divide-y divide-stone-100">
                  {data.pnl.incomeHeads.length === 0 ? (
                    <p className="py-4 text-xs text-stone-500 text-center">
                      No income records.
                    </p>
                  ) : (
                    data.pnl.incomeHeads.map((head) => (
                      <div
                        key={head.category}
                        className="flex items-center justify-between py-2.5 text-xs"
                      >
                        <span className="text-stone-800">
                          {head.category}{" "}
                          <span className="text-[10px] text-stone-400">({head.count})</span>
                        </span>
                        <span className="font-semibold text-stone-950">
                          {sym}{head.amount.toLocaleString("en-IN")}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex items-center justify-between border-t-2 border-stone-300 pt-3 text-sm font-extrabold text-stone-950">
                  <span>TOTAL INCOME</span>
                  <span className="text-emerald-800">
                    {sym}{data.pnl.totalIncome.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* EXPENDITURE SIDE */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b-2 border-amber-600 pb-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-amber-950">
                    Expenditure Heads
                  </h3>
                  <span className="text-xs font-semibold text-amber-800">Amount ({sym})</span>
                </div>

                <div className="divide-y divide-stone-100">
                  {data.pnl.expenseHeads.length === 0 ? (
                    <p className="py-4 text-xs text-stone-500 text-center">
                      No expenditure records.
                    </p>
                  ) : (
                    data.pnl.expenseHeads.map((head) => (
                      <div
                        key={head.category}
                        className="flex items-center justify-between py-2.5 text-xs"
                      >
                        <span className="text-stone-800">
                          {head.category}{" "}
                          <span className="text-[10px] text-stone-400">({head.count})</span>
                        </span>
                        <span className="font-semibold text-stone-950">
                          {sym}{head.amount.toLocaleString("en-IN")}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex items-center justify-between border-t-2 border-stone-300 pt-3 text-sm font-extrabold text-stone-950">
                  <span>TOTAL EXPENDITURE</span>
                  <span className="text-amber-800">
                    {sym}{data.pnl.totalExpense.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>

            {/* NET OPERATING RESULT */}
            <div className="mt-8 rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Net Operating Result
                  </p>
                  <p
                    className={`text-2xl font-black mt-0.5 ${
                      data.pnl.netSurplus >= 0 ? "text-emerald-800" : "text-rose-800"
                    }`}
                  >
                    {data.pnl.netSurplus >= 0 ? "Surplus: +" : "Deficit: "}
                    {sym}{Math.abs(data.pnl.netSurplus).toLocaleString("en-IN")}
                  </p>
                </div>
                <AdminBadge
                  variant={data.pnl.netSurplus >= 0 ? "success" : "danger"}
                  size="md"
                >
                  {data.pnl.netSurplus >= 0
                    ? "Excess of Income over Expenditure"
                    : "Excess of Expenditure over Income"}
                </AdminBadge>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 5: UNIT-BY-UNIT LEDGER */}
      {/* ========================================== */}
      {activeTab === "units" && (
        <div className="space-y-6">
          {/* Unit Filter Bar */}
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
            <div className="w-full sm:w-72">
              <AdminSearchBar
                placeholder="Search flat number, resident name..."
                value={unitSearch}
                onChange={(e) => setUnitSearch(e.target.value)}
                onClear={() => setUnitSearch("")}
              />
            </div>

            <div className="w-40">
              <AdminSelect
                value={unitBlock}
                onChange={(e) => setUnitBlock(e.target.value)}
                options={[
                  { value: "ALL", label: "All Blocks" },
                  ...data.blocks.map((b) => ({ value: b, label: `Block ${b}` })),
                ]}
              />
            </div>

            <div className="w-48">
              <AdminSelect
                value={unitStatusFilter}
                onChange={(e) => setUnitStatusFilter(e.target.value)}
                options={[
                  { value: "ALL", label: "All Account Statuses" },
                  { value: "DUES", label: "Dues Pending" },
                  { value: "CLEAR", label: "Fully Cleared" },
                  { value: "ADVANCE", label: "Advance Balance" },
                ]}
              />
            </div>

            {(unitSearch || unitBlock !== "ALL" || unitStatusFilter !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setUnitSearch("")
                  setUnitBlock("ALL")
                  setUnitStatusFilter("ALL")
                }}
                className="text-xs font-semibold text-rose-600 hover:text-rose-800"
              >
                Reset Filters
              </button>
            )}
          </div>

          <AdminCard
            title={`Unit Maintenance & Dues Ledger (${filteredUnitLedger.length} Flats)`}
            description="Comprehensive audit of demands invoiced, receipts recorded, and net balances per flat"
          >
            {filteredUnitLedger.length === 0 ? (
              <p className="py-6 text-center text-xs text-stone-500">
                No units match your search filters.
              </p>
            ) : (
              <AdminTable
                headers={[
                  "Flat Number",
                  "Block",
                  "Resident / Owner",
                  "Occupancy",
                  "Invoices",
                  "Total Billed",
                  "Total Paid",
                  "Net Outstanding",
                  "Status",
                  "Actions",
                ]}
                rows={filteredUnitLedger.map((unit) => (
                  <tr key={unit.flatId} className="border-t border-stone-100 hover:bg-stone-50/60">
                    <td className="px-4 py-3.5 text-xs font-bold text-stone-950">
                      {unit.flatNumber}
                    </td>

                    <td className="px-4 py-3.5 text-xs text-stone-700">
                      {unit.blockName}
                    </td>

                    <td className="px-4 py-3.5 text-xs text-stone-800 font-medium">
                      {unit.residentName}
                    </td>

                    <td className="px-4 py-3.5">
                      <AdminBadge
                        variant={unit.occupancyStatus === "OCCUPIED" ? "success" : "neutral"}
                        size="sm"
                      >
                        {unit.occupancyStatus}
                      </AdminBadge>
                    </td>

                    <td className="px-4 py-3.5 text-xs text-stone-600">
                      {unit.totalInvoicesCount}
                    </td>

                    <td className="px-4 py-3.5 text-xs font-semibold text-stone-900">
                      {sym}{unit.totalBilledAmount.toLocaleString("en-IN")}
                    </td>

                    <td className="px-4 py-3.5 text-xs font-semibold text-emerald-700">
                      {sym}{unit.totalPaidAmount.toLocaleString("en-IN")}
                    </td>

                    <td className="px-4 py-3.5 text-xs font-black">
                      {unit.outstandingAmount > 0 ? (
                        <span className="text-rose-700">
                          {sym}{unit.outstandingAmount.toLocaleString("en-IN")}
                        </span>
                      ) : unit.advanceAmount > 0 ? (
                        <span className="text-emerald-700">
                          +{sym}{unit.advanceAmount.toLocaleString("en-IN")} (Adv)
                        </span>
                      ) : (
                        <span className="text-stone-400">₹0</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <AdminBadge
                        variant={
                          unit.accountStatus === "CLEAR"
                            ? "success"
                            : unit.accountStatus === "ADVANCE"
                              ? "success"
                              : unit.accountStatus === "OVERDUE"
                                ? "danger"
                                : unit.accountStatus === "PENDING"
                                  ? "warning"
                                  : "neutral"
                        }
                        size="sm"
                        dot
                      >
                        {unit.accountStatus === "CLEAR"
                          ? "ALL CLEAR"
                          : unit.accountStatus === "ADVANCE"
                            ? "IN ADVANCE"
                            : unit.accountStatus === "OVERDUE"
                              ? "OVERDUE"
                              : unit.accountStatus === "PENDING"
                                ? "PENDING"
                                : "NO BILLS"}
                      </AdminBadge>
                    </td>

                    <td className="px-4 py-3.5">
                      <AdminButton
                        href={`/society/${societyCode}/flats/${unit.flatId}`}
                        variant="outline"
                        size="xs"
                      >
                        Details →
                      </AdminButton>
                    </td>
                  </tr>
                ))}
              />
            )}
          </AdminCard>
        </div>
      )}
    </div>
  )
}
