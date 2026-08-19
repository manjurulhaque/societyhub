"use client"

import { useState, useMemo, useRef } from "react"
import Link from "next/link"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts"
import {
  AdminCard,
  AdminBadge,
  AdminStatCard,
  AdminTable,
  AdminButton,
  AdminTabs,
  AdminSearchBar,
  AdminSelect,
  AdminModal,
} from "@/components/admin"
import { formatDateInAppTimeZone } from "@/lib/datetime"
import { generateReportPDF } from "@/lib/pdf/reportPdfGenerator"

const CHART_COLORS = [
  "#059669",
  "#2563eb",
  "#d97706",
  "#7c3aed",
  "#db2777",
  "#0891b2",
  "#ea580c",
  "#4b5563",
]

export type SocietyReportData = {
  society: {
    id: string
    name: string
    code: string | null
    currencySymbol: string
    address?: string | null
    city?: string | null
    state?: string | null
    pincode?: string | null
    registrationNumber?: string | null
    panNumber?: string | null
    gstin?: string | null
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
    totalFixedAssetsBookValue: number
    totalReserves: number
    defaultersCount: number
    totalFlatsCount: number
    defaulterRate: number
    totalVendorPayables: number
    totalMemberDepositsHeld: number
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
  fixedAssets: {
    id: string
    name: string
    assetCode: string | null
    categoryName: string
    location: string | null
    purchaseCost: number
    currentBookValue: number
    amcVendorName: string | null
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
    isVotingDisqualified: boolean
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
  balanceSheet: {
    assets: {
      liquidBankCash: number
      maintenanceArrears: number
      fixedDeposits: number
      fixedAssetsBookValue: number
      totalAssets: number
    }
    liabilities: {
      memberDepositsHeld: number
      vendorPayables: number
      advanceCollections: number
      sinkingAndGeneralReserves: number
      totalLiabilitiesAndFunds: number
    }
    netFinancialPosition: number
  }
  budgetVariance: {
    id: string
    budgetName: string
    headName: string
    allocatedAmount: number
    utilizedAmount: number
    remainingAmount: number
    utilizationRate: number
    status: "ON_TRACK" | "WARNING" | "OVER_BUDGET"
  }[]
  statutory: {
    shares: {
      id: string
      flatNumber: string
      blockName: string
      memberName: string
      certificateNumber: string
      sharesCount: number
      distinctiveNumbers: string
      faceValueTotal: number
      issueDate: string
      status: string
    }[]
    votingList: {
      flatNumber: string
      blockName: string
      memberName: string
      occupancyStatus: string
      outstandingDues: number
      isEligible: boolean
      disqualificationReason: string | null
    }[]
    nominations: {
      id: string
      flatNumber: string
      blockName: string
      memberName: string
      nomineeName: string
      relationship: string
      percentageShare: number
      nominationDate: string
      status: string
    }[]
    propertyLiens: {
      id: string
      flatNumber: string
      blockName: string
      memberName: string
      bankName: string
      loanAccountNumber: string | null
      sanctionAmount: number | null
      nocIssuedDate: string | null
      nocReference: string | null
      status: string
    }[]
  }
  vendorAging: {
    vendorId: string
    vendorName: string
    companyName: string | null
    phone: string | null
    totalBilledAmount: number
    totalPaidAmount: number
    outstandingDue: number
    tdsDeducted: number
    pendingBillsCount: number
    agingBucket: "OVER_60" | "DAYS_31_60" | "DAYS_0_30"
  }[]
  cheques: {
    id: string
    chequeNumber: string
    direction: "INWARD" | "OUTWARD"
    partyName: string
    bankName: string | null
    accountName: string | null
    amount: number
    status: string
    chequeDate: string
    clearedOn: string | null
    bouncedReason: string | null
    bounceCharges: number
  }[]
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
  financialYears: {
    id: string
    name: string
    startYear: number
    endYear: number
    isCurrent: boolean
  }[]
}

export function SocietyReportsClient({ data }: { data: SocietyReportData }) {
  const [activeTab, setActiveTab] = useState<string>("overview")
  const [periodFilter, setPeriodFilter] = useState<string>("ALL")

  // Defaulters Filter State
  const [defaulterSearch, setDefaulterSearch] = useState("")
  const [defaulterBlock, setDefaulterBlock] = useState("ALL")
  const [defaulterAgingFilter, setDefaulterAgingFilter] = useState("ALL")

  // Notice Generator State
  const [noticeDefaulter, setNoticeDefaulter] = useState<SocietyReportData["defaulters"][0] | null>(null)
  const [noticeType, setNoticeType] = useState<"FIRST_REMINDER" | "URGENT_NOTICE" | "STATUTORY_DEMAND">("FIRST_REMINDER")
  const noticePrintRef = useRef<HTMLDivElement>(null)

  // Unit Ledger Filter State
  const [unitSearch, setUnitSearch] = useState("")
  const [unitBlock, setUnitBlock] = useState("ALL")
  const [unitStatusFilter, setUnitStatusFilter] = useState("ALL")

  // Statutory Sub-Tab State
  const [statutorySubTab, setStatutorySubTab] = useState<"shares" | "voting" | "nominations" | "liens">("shares")

  // Cheques Filter State
  const [chequeDirectionFilter, setChequeDirectionFilter] = useState<"ALL" | "INWARD" | "OUTWARD">("ALL")
  const [chequeStatusFilter, setChequeStatusFilter] = useState<string>("ALL")

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

  // Filtered Cheques
  const filteredCheques = useMemo(() => {
    return data.cheques.filter((c) => {
      if (chequeDirectionFilter !== "ALL" && c.direction !== chequeDirectionFilter) return false
      if (chequeStatusFilter !== "ALL" && c.status !== chequeStatusFilter) return false
      return true
    })
  }, [data.cheques, chequeDirectionFilter, chequeStatusFilter])

  // Chart data for monthly trends
  const chartMonthlyData = useMemo(() => {
    return [...data.monthlyTrends].reverse().map((m) => ({
      name: m.label,
      Billed: m.billedAmount,
      Collected: m.collectedAmount,
      Expenses: m.expenseAmount,
      Cashflow: m.netCashflow,
    }))
  }, [data.monthlyTrends])

  // Chart data for expenses
  const chartExpenseData = useMemo(() => {
    return data.expensesByCategory.map((e) => ({
      name: e.categoryName,
      value: e.amount,
    }))
  }, [data.expensesByCategory])

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
        "Voting Rights Status",
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
        d.isVotingDisqualified ? "DISQUALIFIED (Dues >90d)" : "ELIGIBLE",
      ])
    } else if (reportType === "balance_sheet") {
      headers = ["Category", "Account / Ledger Head", "Amount (₹)"]
      rows = [
        ["Assets", "Liquid Bank & Cash Balances", data.balanceSheet.assets.liquidBankCash],
        ["Assets", "Maintenance Arrears Receivable (Sundry Debtors)", data.balanceSheet.assets.maintenanceArrears],
        ["Assets", "Fixed Deposits (Sinking / Term Reserves)", data.balanceSheet.assets.fixedDeposits],
        ["Assets", "Fixed Capital Assets (Book Value)", data.balanceSheet.assets.fixedAssetsBookValue],
        ["Assets Total", "TOTAL ASSETS", data.balanceSheet.assets.totalAssets],
        ["Liabilities & Funds", "Member Security & Fit-out Deposits Held", data.balanceSheet.liabilities.memberDepositsHeld],
        ["Liabilities & Funds", "Vendor Payables (Sundry Creditors)", data.balanceSheet.liabilities.vendorPayables],
        ["Liabilities & Funds", "Advance Collections (Unearned Revenue)", data.balanceSheet.liabilities.advanceCollections],
        ["Liabilities & Funds", "Sinking, Repair & General Reserves", data.balanceSheet.liabilities.sinkingAndGeneralReserves],
        ["Liabilities Total", "TOTAL LIABILITIES & FUNDS", data.balanceSheet.liabilities.totalLiabilitiesAndFunds],
      ]
    } else if (reportType === "budget_variance") {
      headers = ["Budget Plan", "Head Name", "Allocated (₹)", "Utilized (₹)", "Remaining (₹)", "Utilization %", "Status"]
      rows = data.budgetVariance.map((b) => [
        `"${b.budgetName}"`,
        `"${b.headName}"`,
        b.allocatedAmount,
        b.utilizedAmount,
        b.remainingAmount,
        `${b.utilizationRate}%`,
        b.status,
      ])
    } else if (reportType === "statutory_shares") {
      headers = ["Flat", "Block", "Member Name", "Certificate #", "Shares Count", "Distinctive Nos", "Face Value Total (₹)", "Issue Date", "Status"]
      rows = data.statutory.shares.map((s) => [
        s.flatNumber,
        s.blockName,
        `"${s.memberName}"`,
        s.certificateNumber,
        s.sharesCount,
        s.distinctiveNumbers,
        s.faceValueTotal,
        formatDateInAppTimeZone(s.issueDate),
        s.status,
      ])
    } else if (reportType === "statutory_voting") {
      headers = ["Flat", "Block", "Member Name", "Occupancy", "Outstanding Dues (₹)", "AGM/SGM Voting Rights", "Disqualification Reason"]
      rows = data.statutory.votingList.map((v) => [
        v.flatNumber,
        v.blockName,
        `"${v.memberName}"`,
        v.occupancyStatus,
        v.outstandingDues,
        v.isEligible ? "ELIGIBLE" : "DISQUALIFIED",
        v.disqualificationReason || "",
      ])
    } else if (reportType === "vendor_aging") {
      headers = ["Vendor Name", "Company", "Phone", "Total Billed (₹)", "Total Paid (₹)", "Outstanding Due (₹)", "TDS Deducted (₹)", "Pending Bills", "Aging Bucket"]
      rows = data.vendorAging.map((v) => [
        `"${v.vendorName}"`,
        `"${v.companyName || ""}"`,
        v.phone || "",
        v.totalBilledAmount,
        v.totalPaidAmount,
        v.outstandingDue,
        v.tdsDeducted,
        v.pendingBillsCount,
        v.agingBucket,
      ])
    } else if (reportType === "cheques") {
      headers = ["Cheque #", "Direction", "Party Name", "Bank Name", "Amount (₹)", "Status", "Cheque Date", "Cleared Date", "Bounce Reason", "Bounce Charges (₹)"]
      rows = filteredCheques.map((c) => [
        c.chequeNumber,
        c.direction,
        `"${c.partyName}"`,
        c.bankName || "",
        c.amount,
        c.status,
        formatDateInAppTimeZone(c.chequeDate),
        c.clearedOn ? formatDateInAppTimeZone(c.clearedOn) : "",
        c.bouncedReason || "",
        c.bounceCharges,
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

  // Direct 1-Click PDF Download
  const handleDownloadPDF = () => {
    let reportTitle = "Official Society Report"
    let subtitle = ""
    let headers: string[] = []
    let rows: (string | number)[][] = []
    let filename = `${data.society.name.toLowerCase().replace(/\s+/g, "_")}_report.pdf`
    let orientation: "portrait" | "landscape" = "portrait"

    if (activeTab === "overview") {
      reportTitle = "Financial Overview & Key Performance Indicators"
      subtitle = `Summary of Billings, Realized Collections, Operational Expenses, and Reserve Funds`
      headers = ["Metric / KPI Description", "Amount / Count", "Notes & Recovery Status"]
      rows = [
        ["Total Maintenance Demands Billed", `${sym}${data.summary.totalBilled.toLocaleString("en-IN")}`, `${data.summary.totalBillsCount} invoices issued`],
        ["Total Collections Realized", `${sym}${data.summary.totalCollected.toLocaleString("en-IN")}`, `${data.summary.totalPaymentsCount} payment receipts`],
        ["Total Outstanding Arrears", `${sym}${data.summary.totalOutstanding.toLocaleString("en-IN")}`, `${data.summary.defaultersCount} units with dues (${data.summary.defaulterRate}%)`],
        ["Collection Recovery Efficiency", `${data.summary.collectionRate}%`, data.summary.collectionRate >= 80 ? "Healthy recovery" : "Needs attention"],
        ["Total Operational Expenses", `${sym}${data.summary.totalExpenses.toLocaleString("en-IN")}`, `${data.summary.totalExpensesCount} expense vouchers`],
        ["Net Operating Surplus / (Deficit)", `${sym}${data.summary.netOperatingSurplus.toLocaleString("en-IN")}`, data.summary.netOperatingSurplus >= 0 ? "Operating Surplus" : "Operating Deficit"],
        ["Liquid Cash & Bank Balances", `${sym}${data.summary.liquidCashAndBank.toLocaleString("en-IN")}`, "Operational bank float"],
        ["Fixed Term Deposits (Reserves)", `${sym}${data.summary.totalFixedDeposits.toLocaleString("en-IN")}`, "Sinking & capital reserves"],
        ["Total Society Reserves", `${sym}${data.summary.totalReserves.toLocaleString("en-IN")}`, "Liquid + Term deposits"],
      ]
      filename = `${data.society.name.toLowerCase().replace(/\s+/g, "_")}_financial_overview.pdf`
    } else if (activeTab === "defaulters") {
      reportTitle = "Defaulters & Arrears Aging Register"
      subtitle = `Itemized overdue assessment breakdown per housing unit (${filteredDefaulters.length} units)`
      headers = ["Flat", "Block", "Primary Resident / Owner", "Phone", "Unpaid Bills", "Principal (₹)", "Late Fee (₹)", "Total Overdue (₹)", "Aging Severity", "Voting Rights"]
      rows = filteredDefaulters.map((d) => [
        d.flatNumber,
        d.blockName,
        d.residentName,
        d.residentPhone || "—",
        d.unpaidBillsCount,
        d.unpaidPrincipal.toLocaleString("en-IN"),
        d.unpaidLateFees.toLocaleString("en-IN"),
        d.totalOverdue.toLocaleString("en-IN"),
        d.agingBucket === "OVER_90" ? ">90 Days" : d.agingBucket === "DAYS_61_90" ? "61-90 Days" : d.agingBucket === "DAYS_31_60" ? "31-60 Days" : "0-30 Days",
        d.isVotingDisqualified ? "DISQUALIFIED" : "ELIGIBLE",
      ])
      orientation = "landscape"
      filename = `${data.society.name.toLowerCase().replace(/\s+/g, "_")}_defaulters_aging_report.pdf`
    } else if (activeTab === "balance_sheet") {
      reportTitle = "Statement of Financial Position (Balance Sheet)"
      subtitle = `Audited summary of Society Assets vs Liabilities and Statutory Capital Reserves`
      headers = ["Category", "Account / Ledger Head", "Amount (₹)"]
      rows = [
        ["Assets", "Liquid Bank & Cash Balances", data.balanceSheet.assets.liquidBankCash.toLocaleString("en-IN")],
        ["Assets", "Maintenance Arrears Receivable (Sundry Debtors)", data.balanceSheet.assets.maintenanceArrears.toLocaleString("en-IN")],
        ["Assets", "Fixed Deposits (Sinking / Term Reserves)", data.balanceSheet.assets.fixedDeposits.toLocaleString("en-IN")],
        ["Assets", "Fixed Capital Assets (Book Value)", data.balanceSheet.assets.fixedAssetsBookValue.toLocaleString("en-IN")],
        ["Assets Total", "TOTAL ASSETS", `${sym}${data.balanceSheet.assets.totalAssets.toLocaleString("en-IN")}`],
        ["Liabilities & Funds", "Member Security & Fit-out Deposits Held", data.balanceSheet.liabilities.memberDepositsHeld.toLocaleString("en-IN")],
        ["Liabilities & Funds", "Vendor Payables (Sundry Creditors)", data.balanceSheet.liabilities.vendorPayables.toLocaleString("en-IN")],
        ["Liabilities & Funds", "Advance Collections (Unearned Revenue)", data.balanceSheet.liabilities.advanceCollections.toLocaleString("en-IN")],
        ["Liabilities & Funds", "Statutory Sinking, Repair & General Reserves", data.balanceSheet.liabilities.sinkingAndGeneralReserves.toLocaleString("en-IN")],
        ["Liabilities Total", "TOTAL LIABILITIES & FUNDS", `${sym}${data.balanceSheet.liabilities.totalLiabilitiesAndFunds.toLocaleString("en-IN")}`],
      ]
      filename = `${data.society.name.toLowerCase().replace(/\s+/g, "_")}_balance_sheet.pdf`
    } else if (activeTab === "budget_variance") {
      reportTitle = "Budget vs. Actual Expenditure Variance Report"
      subtitle = `Comparison of annual allocated budgetary caps against actual disbursements`
      headers = ["Budget Plan", "Expenditure Head", "Allocated (₹)", "Spent (₹)", "Remaining (₹)", "Utilization %", "Status"]
      rows = data.budgetVariance.map((b) => [
        b.budgetName,
        b.headName,
        b.allocatedAmount.toLocaleString("en-IN"),
        b.utilizedAmount.toLocaleString("en-IN"),
        b.remainingAmount.toLocaleString("en-IN"),
        `${b.utilizationRate}%`,
        b.status === "ON_TRACK" ? "Under Budget" : b.status === "WARNING" ? "Nearing Cap" : "Over Budget",
      ])
      filename = `${data.society.name.toLowerCase().replace(/\s+/g, "_")}_budget_variance_report.pdf`
    } else if (activeTab === "statutory") {
      if (statutorySubTab === "shares") {
        reportTitle = "Form 'I' Register of Members & Share Capital"
        subtitle = `Statutory share allotment ledger under Cooperative Housing Societies Act`
        headers = ["Certificate #", "Flat & Block", "Member Name", "Shares Count", "Distinctive Nos", "Face Value (₹)", "Admission Date", "Status"]
        rows = data.statutory.shares.map((s) => [
          s.certificateNumber,
          `${s.flatNumber} (${s.blockName})`,
          s.memberName,
          s.sharesCount,
          s.distinctiveNumbers,
          s.faceValueTotal.toLocaleString("en-IN"),
          formatDateInAppTimeZone(s.issueDate),
          s.status,
        ])
        filename = `${data.society.name.toLowerCase().replace(/\s+/g, "_")}_form_I_shares_register.pdf`
      } else {
        reportTitle = "Form 'J' Register of Active Members & AGM/SGM Voting Rights"
        subtitle = `Electoral roll of eligible voters vs disqualified members (arrears >90 days)`
        headers = ["Flat & Block", "Member Name", "Occupancy", "Outstanding Dues (₹)", "Voting Rights Status", "Remarks / Legal Grounds"]
        rows = data.statutory.votingList.map((v) => [
          `${v.flatNumber} (${v.blockName})`,
          v.memberName,
          v.occupancyStatus,
          v.outstandingDues.toLocaleString("en-IN"),
          v.isEligible ? "ELIGIBLE VOTER" : "DISQUALIFIED",
          v.disqualificationReason || "Clear for AGM/SGM voting",
        ])
        filename = `${data.society.name.toLowerCase().replace(/\s+/g, "_")}_form_J_voting_electoral_roll.pdf`
      }
    } else if (activeTab === "vendors") {
      reportTitle = "Vendor Payables & Outstanding Aging Report"
      subtitle = `Operational liabilities, pending contractor bills, and TDS audit`
      headers = ["Vendor Name", "Company", "Contact", "Total Billed (₹)", "Total Paid (₹)", "Outstanding Due (₹)", "TDS Deducted (₹)", "Pending Bills", "Aging Bucket"]
      rows = data.vendorAging.map((v) => [
        v.vendorName,
        v.companyName || "—",
        v.phone || "—",
        v.totalBilledAmount.toLocaleString("en-IN"),
        v.totalPaidAmount.toLocaleString("en-IN"),
        v.outstandingDue.toLocaleString("en-IN"),
        v.tdsDeducted.toLocaleString("en-IN"),
        v.pendingBillsCount,
        v.agingBucket === "OVER_60" ? ">60 Days" : v.agingBucket === "DAYS_31_60" ? "31-60 Days" : "0-30 Days",
      ])
      orientation = "landscape"
      filename = `${data.society.name.toLowerCase().replace(/\s+/g, "_")}_vendor_payables_aging.pdf`
    } else if (activeTab === "cheques") {
      reportTitle = "Bank Cheque & Clearance Register"
      subtitle = `Inward member receipts and outward vendor payment instruments`
      headers = ["Cheque #", "Direction", "Party Name", "Bank Name", "Amount (₹)", "Cheque Date", "Status", "Remarks / Clearance"]
      rows = filteredCheques.map((c) => [
        c.chequeNumber,
        c.direction,
        c.partyName,
        c.bankName || "—",
        c.amount.toLocaleString("en-IN"),
        formatDateInAppTimeZone(c.chequeDate),
        c.status,
        c.bouncedReason ? `Bounced: ${c.bouncedReason}` : c.clearedOn ? `Cleared: ${formatDateInAppTimeZone(c.clearedOn)}` : "—",
      ])
      filename = `${data.society.name.toLowerCase().replace(/\s+/g, "_")}_cheque_register.pdf`
    } else if (activeTab === "monthly") {
      reportTitle = "Month-on-Month Invoicing & Collection Performance Report"
      subtitle = `Chronological audit of monthly demands, collection realizations, and operating cashflow`
      headers = ["Billing Period", "Invoices Issued", "Billed Demand (₹)", "Payments Received", "Collections Realized (₹)", "Recovery Rate %", "Expenses (₹)", "Net Cashflow (₹)"]
      rows = data.monthlyTrends.map((m) => [
        m.label,
        m.billedCount,
        m.billedAmount.toLocaleString("en-IN"),
        m.collectedCount,
        m.collectedAmount.toLocaleString("en-IN"),
        `${m.collectionRate}%`,
        m.expenseAmount.toLocaleString("en-IN"),
        m.netCashflow.toLocaleString("en-IN"),
      ])
      filename = `${data.society.name.toLowerCase().replace(/\s+/g, "_")}_monthly_trends_audit.pdf`
    } else if (activeTab === "pnl") {
      reportTitle = "Statement of Income & Expenditure (P&L Audit)"
      subtitle = `Categorized operational revenues and expenditures with net surplus / deficit`
      headers = ["Section", "Head / Category", "Transaction Count", "Amount (₹)"]
      rows = [
        ...data.pnl.incomeHeads.map((h) => ["Income", h.category, h.count, h.amount.toLocaleString("en-IN")]),
        ["Income Total", "TOTAL INCOME", "", `${sym}${data.pnl.totalIncome.toLocaleString("en-IN")}`],
        ...data.pnl.expenseHeads.map((h) => ["Expenditure", h.category, h.count, h.amount.toLocaleString("en-IN")]),
        ["Expenditure Total", "TOTAL EXPENDITURE", "", `${sym}${data.pnl.totalExpense.toLocaleString("en-IN")}`],
        ["Net Result", "OPERATING SURPLUS / (DEFICIT)", "", `${sym}${data.pnl.netSurplus.toLocaleString("en-IN")}`],
      ]
      filename = `${data.society.name.toLowerCase().replace(/\s+/g, "_")}_income_expenditure_statement.pdf`
    } else if (activeTab === "units") {
      reportTitle = "Unit-by-Unit Maintenance & Dues Ledger"
      subtitle = `Comprehensive ledger of demands, payments, and balances across flats (${filteredUnitLedger.length} units)`
      headers = ["Flat #", "Block", "Resident / Owner", "Occupancy", "Invoices", "Billed (₹)", "Paid (₹)", "Outstanding (₹)", "Advance (₹)", "Status"]
      rows = filteredUnitLedger.map((u) => [
        u.flatNumber,
        u.blockName,
        u.residentName,
        u.occupancyStatus,
        u.totalInvoicesCount,
        u.totalBilledAmount.toLocaleString("en-IN"),
        u.totalPaidAmount.toLocaleString("en-IN"),
        u.outstandingAmount.toLocaleString("en-IN"),
        u.advanceAmount.toLocaleString("en-IN"),
        u.accountStatus,
      ])
      orientation = "landscape"
      filename = `${data.society.name.toLowerCase().replace(/\s+/g, "_")}_unit_ledger_report.pdf`
    }

    generateReportPDF({
      society: {
        name: data.society.name,
        address: data.society.address,
        city: data.society.city,
        state: data.society.state,
        pincode: data.society.pincode,
        registrationNumber: data.society.registrationNumber,
        panNumber: data.society.panNumber,
        currencySymbol: sym,
      },
      reportTitle,
      subtitle,
      headers,
      rows,
      filename,
      orientation,
    })
  }

  const handlePrint = () => {
    window.print()
  }

  const handlePrintNotice = () => {
    if (!noticePrintRef.current) return
    const printContents = noticePrintRef.current.innerHTML
    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Demand Notice - ${noticeDefaulter?.flatNumber}</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #111; line-height: 1.6; }
              .header { text-align: center; border-bottom: 2px solid #222; padding-bottom: 16px; margin-bottom: 24px; }
              .header h1 { margin: 0; font-size: 24px; font-weight: 800; text-transform: uppercase; }
              .header p { margin: 4px 0 0; font-size: 12px; color: #555; }
              .meta { display: flex; justify-content: space-between; margin-bottom: 24px; font-size: 14px; }
              .table { width: 100%; border-collapse: collapse; margin: 24px 0; }
              .table th, .table td { border: 1px solid #ccc; padding: 10px 14px; text-align: left; font-size: 13px; }
              .table th { background: #f4f4f4; font-weight: bold; }
              .amount-row { font-weight: bold; font-size: 15px; background: #fafafa; }
              .signatures { display: flex; justify-content: space-between; margin-top: 60px; padding-top: 20px; }
              .sign-box { text-align: center; width: 200px; border-top: 1px dashed #333; padding-top: 8px; font-size: 12px; }
              .badge { display: inline-block; padding: 4px 8px; font-size: 12px; font-weight: bold; background: #fee2e2; color: #991b1b; border-radius: 4px; }
              @media print {
                body { padding: 20px; }
                button { display: none; }
              }
            </style>
          </head>
          <body>
            ${printContents}
            <script>
              window.onload = function() { window.print(); window.close(); }
            </script>
          </body>
        </html>
      `)
      printWindow.document.close()
    }
  }

  return (
    <div className="space-y-8">
      {/* Action & Tab Bar */}
      <div className="space-y-4 border-b border-stone-200 pb-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <AdminTabs
            items={[
              { id: "overview", label: "Analytics & Overview" },
              { id: "balance_sheet", label: "Balance Sheet" },
              { id: "budget_variance", label: "Budget Variance" },
              {
                id: "defaulters",
                label: "Defaulters & Aging",
                count: data.summary.defaultersCount,
              },
              { id: "statutory", label: "Statutory Registers (Form I/J)" },
              { id: "vendors", label: "Vendor Payables Aging" },
              { id: "cheques", label: "Cheque Register" },
              { id: "monthly", label: "Monthly Trends" },
              { id: "pnl", label: "Income & Expenditure" },
              { id: "units", label: "Unit Ledger", count: data.summary.totalFlatsCount },
            ]}
            activeId={activeTab}
            onChange={(tab) => setActiveTab(tab)}
          />

          <div className="flex items-center gap-2">
            {/* Period / Financial Year Filter */}
            <div className="w-44">
              <AdminSelect
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                options={[
                  { value: "ALL", label: "All Time (Cumulative)" },
                  ...data.financialYears.map((fy) => ({
                    value: fy.id,
                    label: fy.name + (fy.isCurrent ? " (Current)" : ""),
                  })),
                  { value: "LAST_12M", label: "Last 12 Months" },
                  { value: "LAST_6M", label: "Last 6 Months" },
                ]}
              />
            </div>

            <AdminButton
              variant="primary"
              size="sm"
              onClick={handleDownloadPDF}
            >
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

            <AdminButton
              variant="outline"
              size="sm"
              onClick={() => {
                if (activeTab === "defaulters") handleExportCSV("defaulters")
                else if (activeTab === "balance_sheet") handleExportCSV("balance_sheet")
                else if (activeTab === "budget_variance") handleExportCSV("budget_variance")
                else if (activeTab === "statutory") {
                  if (statutorySubTab === "shares") handleExportCSV("statutory_shares")
                  else handleExportCSV("statutory_voting")
                }
                else if (activeTab === "vendors") handleExportCSV("vendor_aging")
                else if (activeTab === "cheques") handleExportCSV("cheques")
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
              Print / Letterhead
            </AdminButton>
          </div>
        </div>
      </div>

      {/* Global KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
      {/* TAB 1: ANALYTICS & OVERVIEW (WITH CHARTS) */}
      {/* ========================================== */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          {/* Interactive Recharts Visual Analytics Row */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Monthly Demands vs Collections Bar Chart */}
            <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-stone-950">
                    Monthly Demands vs Realized Collections
                  </h3>
                  <p className="text-xs text-stone-500">
                    Historical invoicing realization and recovery trajectory
                  </p>
                </div>
                <AdminBadge variant="neutral" size="sm">
                  12-Month Audit
                </AdminBadge>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartMonthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#78716c" }} axisLine={{ stroke: "#e7e5e4" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#78716c" }} axisLine={{ stroke: "#e7e5e4" }} />
                    <Tooltip
                      formatter={(val: unknown) => [`${sym}${Number(val ?? 0).toLocaleString("en-IN")}`, ""]}
                      contentStyle={{ backgroundColor: "#1c1917", borderRadius: "12px", color: "#fff", fontSize: "12px" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                    <Bar dataKey="Billed" fill="#1c1917" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Collected" fill="#059669" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Expenses" fill="#d97706" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Expense Distribution Donut Chart */}
            <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-stone-950">
                  Expense Category Distribution
                </h3>
                <p className="text-xs text-stone-500">Operational cost allocations</p>
              </div>

              {chartExpenseData.length === 0 ? (
                <div className="flex h-72 items-center justify-center text-xs text-stone-400">
                  No expense data to chart
                </div>
              ) : (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartExpenseData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {chartExpenseData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: unknown) => [`${sym}${Number(val ?? 0).toLocaleString("en-IN")}`, ""]}
                        contentStyle={{ backgroundColor: "#1c1917", borderRadius: "12px", color: "#fff", fontSize: "12px" }}
                      />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Operating Cashflow Surplus / Deficit Area Trend */}
          <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-stone-950">
                  Operating Net Cashflow Trajectory
                </h3>
                <p className="text-xs text-stone-500">
                  Monthly Surplus (Positive) vs Deficit (Negative) trend
                </p>
              </div>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartMonthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCashflow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#78716c" }} axisLine={{ stroke: "#e7e5e4" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#78716c" }} axisLine={{ stroke: "#e7e5e4" }} />
                  <Tooltip
                    formatter={(val: unknown) => [`${sym}${Number(val ?? 0).toLocaleString("en-IN")}`, "Net Cashflow"]}
                    contentStyle={{ backgroundColor: "#1c1917", borderRadius: "12px", color: "#fff", fontSize: "12px" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="Cashflow"
                    stroke="#059669"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorCashflow)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Revenue Streams & Expenditure Categories Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Revenue Assessment Breakdown */}
            <AdminCard
              title="Revenue Streams by Bill Type"
              description="Distribution of generated demands across assessment types"
            >
              {data.billsByCategory.length === 0 ? (
                <p className="py-6 text-center text-xs text-stone-500">No bills recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {data.billsByCategory.map((cat) => (
                    <div key={cat.billType} className="rounded-2xl border border-stone-100 bg-stone-50/60 p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-stone-900">{cat.billType.replace(/_/g, " ")}</span>
                        <span className="text-stone-950 font-bold">
                          {sym}{cat.amount.toLocaleString("en-IN")} ({cat.percentage}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-stone-200 overflow-hidden">
                        <div className="h-full bg-stone-900 rounded-full transition-all" style={{ width: `${cat.percentage}%` }} />
                      </div>
                      <span className="text-[10px] text-stone-500">{cat.count} invoices generated</span>
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
                <p className="py-6 text-center text-xs text-stone-500">No expense records found.</p>
              ) : (
                <div className="space-y-3">
                  {data.expensesByCategory.map((cat) => (
                    <div key={cat.categoryName} className="rounded-2xl border border-stone-100 bg-stone-50/60 p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-stone-900">{cat.categoryName}</span>
                        <span className="text-amber-900 font-bold">
                          {sym}{cat.amount.toLocaleString("en-IN")} ({cat.percentage}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-amber-100 overflow-hidden">
                        <div className="h-full bg-amber-600 rounded-full transition-all" style={{ width: `${cat.percentage}%` }} />
                      </div>
                      <span className="text-[10px] text-stone-500">{cat.count} vouchers processed</span>
                    </div>
                  ))}
                </div>
              )}
            </AdminCard>
          </div>

          {/* Payment Modes & Bank / Reserve Summary Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <AdminCard
              title="Collections by Payment Channel"
              description="Distribution of payment methods used by residents"
            >
              {data.paymentsByMode.length === 0 ? (
                <p className="py-6 text-center text-xs text-stone-500">No payment records found.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {data.paymentsByMode.map((mode) => (
                    <div key={mode.mode} className="rounded-2xl border border-stone-200 bg-stone-50/70 p-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-stone-900">{mode.mode}</span>
                        <AdminBadge variant="neutral" size="sm">{mode.percentage}%</AdminBadge>
                      </div>
                      <p className="mt-2 text-base font-extrabold text-emerald-800">
                        {sym}{mode.amount.toLocaleString("en-IN")}
                      </p>
                      <p className="text-[11px] text-stone-500 mt-0.5">{mode.count} transactions</p>
                    </div>
                  ))}
                </div>
              )}
            </AdminCard>

            <AdminCard
              title="Bank Accounts & Liquid Cash Float"
              description="Current available balances across operational bank accounts"
              action={
                <Link href={`/society/${societyCode}/accounts`} className="text-xs font-semibold text-stone-900 hover:text-stone-700">
                  Manage Accounts →
                </Link>
              }
            >
              {data.bankAccounts.length === 0 ? (
                <p className="py-6 text-center text-xs text-stone-500">No bank accounts configured.</p>
              ) : (
                <AdminTable
                  headers={["Account Name", "Type & Bank", "Account Number", "Current Balance"]}
                  rows={data.bankAccounts.map((acc) => (
                    <tr key={acc.id} className="border-t border-stone-100 hover:bg-stone-50/60">
                      <td className="px-4 py-3 text-xs font-bold text-stone-950">
                        {acc.name}
                        {acc.isDefault && <AdminBadge variant="success" size="sm" className="ml-2">Default</AdminBadge>}
                      </td>
                      <td className="px-4 py-3 text-xs text-stone-700">{acc.bankName || acc.accountType}</td>
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
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 2: BALANCE SHEET & FINANCIAL POSITION */}
      {/* ========================================== */}
      {activeTab === "balance_sheet" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="border-b border-stone-200 pb-4 text-center">
              <h2 className="text-xl font-black tracking-tight text-stone-950">
                {data.society.name}
              </h2>
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mt-1">
                Statement of Financial Position (Balance Sheet)
              </p>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Audit Snapshot as of {formatDateInAppTimeZone(new Date().toISOString())}
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2">
              {/* ASSETS SIDE */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b-2 border-emerald-600 pb-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-950">
                    Assets & Receivables
                  </h3>
                  <span className="text-xs font-semibold text-emerald-800">Amount ({sym})</span>
                </div>

                <div className="divide-y divide-stone-100 text-xs">
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-semibold text-stone-900">Liquid Cash & Operational Bank Accounts</p>
                      <p className="text-[11px] text-stone-500">Current balances in scheduled banks</p>
                    </div>
                    <span className="font-bold text-stone-950">
                      {sym}{data.balanceSheet.assets.liquidBankCash.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-semibold text-stone-900">Maintenance Dues Receivable (Sundry Debtors)</p>
                      <p className="text-[11px] text-stone-500">Outstanding arrears from members</p>
                    </div>
                    <span className="font-bold text-rose-700">
                      {sym}{data.balanceSheet.assets.maintenanceArrears.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-semibold text-stone-900">Fixed Term Deposits (Investments / Sinking)</p>
                      <p className="text-[11px] text-stone-500">Principal held in term deposit receipts</p>
                    </div>
                    <span className="font-bold text-stone-950">
                      {sym}{data.balanceSheet.assets.fixedDeposits.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-semibold text-stone-900">Fixed Assets & Infrastructure (Book Value)</p>
                      <p className="text-[11px] text-stone-500">Generators, Elevators, Pumps, CCTV net book value</p>
                    </div>
                    <span className="font-bold text-stone-950">
                      {sym}{data.balanceSheet.assets.fixedAssetsBookValue.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t-2 border-stone-300 pt-3 text-sm font-extrabold text-stone-950">
                  <span>TOTAL ASSETS</span>
                  <span className="text-emerald-800">
                    {sym}{data.balanceSheet.assets.totalAssets.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* LIABILITIES & FUNDS SIDE */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b-2 border-amber-600 pb-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-amber-950">
                    Liabilities, Deposits & Reserves
                  </h3>
                  <span className="text-xs font-semibold text-amber-800">Amount ({sym})</span>
                </div>

                <div className="divide-y divide-stone-100 text-xs">
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-semibold text-stone-900">Member Security & Fit-Out Deposits Held</p>
                      <p className="text-[11px] text-stone-500">Refundable deposits from residents/tenants</p>
                    </div>
                    <span className="font-bold text-stone-950">
                      {sym}{data.balanceSheet.liabilities.memberDepositsHeld.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-semibold text-stone-900">Vendor Bills Payable (Sundry Creditors)</p>
                      <p className="text-[11px] text-stone-500">Unpaid vendor invoices and contractor bills</p>
                    </div>
                    <span className="font-bold text-amber-700">
                      {sym}{data.balanceSheet.liabilities.vendorPayables.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-semibold text-stone-900">Advance Collections Held (Unearned Revenue)</p>
                      <p className="text-[11px] text-stone-500">Advance maintenance paid by members</p>
                    </div>
                    <span className="font-bold text-stone-950">
                      {sym}{data.balanceSheet.liabilities.advanceCollections.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-semibold text-stone-900">Statutory Sinking, Repair & General Reserves</p>
                      <p className="text-[11px] text-stone-500">Accumulated operating surplus & capital reserve funds</p>
                    </div>
                    <span className="font-bold text-stone-950">
                      {sym}{data.balanceSheet.liabilities.sinkingAndGeneralReserves.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t-2 border-stone-300 pt-3 text-sm font-extrabold text-stone-950">
                  <span>TOTAL LIABILITIES & FUNDS</span>
                  <span className="text-amber-800">
                    {sym}{data.balanceSheet.liabilities.totalLiabilitiesAndFunds.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>

            {/* Solvency Audit Banner */}
            <div className="mt-8 rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Net Asset & Reserve Solvency
                  </p>
                  <p className="text-xl font-bold text-stone-950 mt-0.5">
                    {sym}{data.balanceSheet.assets.totalAssets.toLocaleString("en-IN")} Total Capitalized Assets
                  </p>
                </div>
                <AdminBadge variant="success" size="md" dot>
                  Balanced & Audited
                </AdminBadge>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 3: BUDGET VS ACTUAL VARIANCE */}
      {/* ========================================== */}
      {activeTab === "budget_variance" && (
        <div className="space-y-6">
          <AdminCard
            title="Annual Budget vs. Actual Expenditure Variance"
            description="Comparison of allocated budgetary caps against actual disbursements"
          >
            {data.budgetVariance.length === 0 ? (
              <div className="py-10 text-center text-xs text-stone-500">
                No active budget plan configured for the current financial year.
              </div>
            ) : (
              <AdminTable
                headers={[
                  "Budget Plan",
                  "Expenditure Head",
                  "Allocated Cap",
                  "Utilized / Spent",
                  "Remaining Balance",
                  "Utilization %",
                  "Status",
                ]}
                rows={data.budgetVariance.map((b) => (
                  <tr key={b.id} className="border-t border-stone-100 hover:bg-stone-50/60">
                    <td className="px-4 py-3.5 font-semibold text-xs text-stone-950">
                      {b.budgetName}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-stone-800 font-medium">
                      {b.headName}
                    </td>
                    <td className="px-4 py-3.5 text-xs font-semibold text-stone-900">
                      {sym}{b.allocatedAmount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3.5 text-xs font-bold text-amber-700">
                      {sym}{b.utilizedAmount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3.5 text-xs font-semibold text-stone-900">
                      {sym}{b.remainingAmount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-stone-900">{b.utilizationRate}%</span>
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-stone-100">
                          <div
                            className={`h-full ${
                              b.status === "ON_TRACK"
                                ? "bg-emerald-600"
                                : b.status === "WARNING"
                                  ? "bg-amber-500"
                                  : "bg-rose-600"
                            }`}
                            style={{ width: `${Math.min(100, b.utilizationRate)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <AdminBadge
                        variant={
                          b.status === "ON_TRACK"
                            ? "success"
                            : b.status === "WARNING"
                              ? "warning"
                              : "danger"
                        }
                        size="sm"
                        dot
                      >
                        {b.status === "ON_TRACK"
                          ? "Under Budget"
                          : b.status === "WARNING"
                            ? "Nearing Cap"
                            : "Over Budget"}
                      </AdminBadge>
                    </td>
                  </tr>
                ))}
              />
            )}
          </AdminCard>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 4: DEFAULTERS & 1-CLICK NOTICE MODAL */}
      {/* ========================================== */}
      {activeTab === "defaulters" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-800">
                  Severe Overdue (&gt;90 Days)
                </span>
                <AdminBadge variant="danger" size="sm">Chronic</AdminBadge>
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
                <AdminBadge variant="warning" size="sm">Medium</AdminBadge>
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
                <AdminBadge variant="warning" size="sm">Notice</AdminBadge>
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
                <AdminBadge variant="neutral" size="sm">Recent</AdminBadge>
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
          </div>

          <AdminCard
            title={`Defaulters & Arrears Register (${filteredDefaulters.length} Units)`}
            description="Itemized overdue assessment breakdown per housing unit with 1-click statutory notice generation"
          >
            {filteredDefaulters.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm font-semibold text-stone-800">No defaulters found matching your criteria.</p>
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
                  "Voting Rights",
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
                      {d.residentPhone && <p className="text-[11px] text-stone-500">📞 {d.residentPhone}</p>}
                    </td>

                    <td className="px-4 py-3.5 text-xs text-stone-700">
                      <span className="font-semibold text-stone-900">{d.unpaidBillsCount}</span> bill(s)
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
                              : "neutral"
                        }
                        size="sm"
                        dot
                      >
                        {d.agingBucket === "OVER_90" ? ">90 Days" : d.agingBucket === "DAYS_61_90" ? "61-90 Days" : "Recent"}
                      </AdminBadge>
                    </td>

                    <td className="px-4 py-3.5">
                      <AdminBadge
                        variant={d.isVotingDisqualified ? "danger" : "success"}
                        size="sm"
                      >
                        {d.isVotingDisqualified ? "Disqualified" : "Eligible"}
                      </AdminBadge>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <AdminButton
                          variant="outline"
                          size="xs"
                          onClick={() => {
                            setNoticeDefaulter(d)
                            setNoticeType(d.agingBucket === "OVER_90" ? "STATUTORY_DEMAND" : "FIRST_REMINDER")
                          }}
                        >
                          📄 Demand Notice
                        </AdminButton>
                      </div>
                    </td>
                  </tr>
                ))}
              />
            )}
          </AdminCard>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 5: STATUTORY REGISTERS (FORM I / FORM J) */}
      {/* ========================================== */}
      {activeTab === "statutory" && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
            <button
              type="button"
              onClick={() => setStatutorySubTab("shares")}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all ${
                statutorySubTab === "shares"
                  ? "bg-stone-900 text-white"
                  : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              Form &quot;I&quot; Register (Members &amp; Shares)
            </button>

            <button
              type="button"
              onClick={() => setStatutorySubTab("voting")}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all ${
                statutorySubTab === "voting"
                  ? "bg-stone-900 text-white"
                  : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              Form &quot;J&quot; Register (Voting Rights &amp; AGM Roll)
            </button>

            <button
              type="button"
              onClick={() => setStatutorySubTab("nominations")}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all ${
                statutorySubTab === "nominations"
                  ? "bg-stone-900 text-white"
                  : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              Nomination Register
            </button>

            <button
              type="button"
              onClick={() => setStatutorySubTab("liens")}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all ${
                statutorySubTab === "liens"
                  ? "bg-stone-900 text-white"
                  : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              Bank NOC &amp; Mortgage Liens
            </button>
          </div>

          {statutorySubTab === "shares" && (
            <AdminCard
              title="Form 'I' Register of Members & Share Capital"
              description="Official statutory share allotment ledger under Cooperative Housing Societies Act"
            >
              {data.statutory.shares.length === 0 ? (
                <p className="py-6 text-center text-xs text-stone-500">No share certificates recorded.</p>
              ) : (
                <AdminTable
                  headers={[
                    "Certificate #",
                    "Flat & Block",
                    "Member / Shareholder",
                    "Shares Count",
                    "Distinctive Nos",
                    "Total Face Value",
                    "Date of Admission",
                    "Status",
                  ]}
                  rows={data.statutory.shares.map((s) => (
                    <tr key={s.id} className="border-t border-stone-100 hover:bg-stone-50/60">
                      <td className="px-4 py-3.5 font-mono text-xs font-bold text-stone-950">
                        {s.certificateNumber}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-stone-700">
                        {s.flatNumber} (Block {s.blockName})
                      </td>
                      <td className="px-4 py-3.5 text-xs font-medium text-stone-900">
                        {s.memberName}
                      </td>
                      <td className="px-4 py-3.5 text-xs font-semibold text-stone-800">
                        {s.sharesCount} shares
                      </td>
                      <td className="px-4 py-3.5 text-xs font-mono text-stone-600">
                        {s.distinctiveNumbers}
                      </td>
                      <td className="px-4 py-3.5 text-xs font-bold text-emerald-800">
                        {sym}{s.faceValueTotal.toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-stone-500">
                        {formatDateInAppTimeZone(s.issueDate)}
                      </td>
                      <td className="px-4 py-3.5">
                        <AdminBadge variant={s.status === "ACTIVE" ? "success" : "neutral"} size="sm">
                          {s.status}
                        </AdminBadge>
                      </td>
                    </tr>
                  ))}
                />
              )}
            </AdminCard>
          )}

          {statutorySubTab === "voting" && (
            <AdminCard
              title="Form 'J' Register of Active Members & AGM/SGM Voting Rights"
              description="Electoral roll of eligible members vs members disqualified due to chronic arrears (>90 days)"
            >
              <AdminTable
                headers={[
                  "Flat & Block",
                  "Member Name",
                  "Occupancy",
                  "Outstanding Dues",
                  "Voting Rights Status",
                  "Remarks / Legal Grounds",
                ]}
                rows={data.statutory.votingList.map((v, idx) => (
                  <tr key={idx} className="border-t border-stone-100 hover:bg-stone-50/60">
                    <td className="px-4 py-3.5 text-xs font-bold text-stone-950">
                      {v.flatNumber} (Block {v.blockName})
                    </td>
                    <td className="px-4 py-3.5 text-xs text-stone-800 font-medium">
                      {v.memberName}
                    </td>
                    <td className="px-4 py-3.5">
                      <AdminBadge variant={v.occupancyStatus === "OCCUPIED" ? "success" : "neutral"} size="sm">
                        {v.occupancyStatus}
                      </AdminBadge>
                    </td>
                    <td className="px-4 py-3.5 text-xs font-bold">
                      {v.outstandingDues > 0 ? (
                        <span className="text-rose-700">{sym}{v.outstandingDues.toLocaleString("en-IN")}</span>
                      ) : (
                        <span className="text-stone-400">₹0 (Clear)</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <AdminBadge variant={v.isEligible ? "success" : "danger"} size="sm" dot>
                        {v.isEligible ? "ELIGIBLE VOTER" : "DISQUALIFIED"}
                      </AdminBadge>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-stone-500">
                      {v.disqualificationReason || "Clear for AGM/SGM voting"}
                    </td>
                  </tr>
                ))}
              />
            </AdminCard>
          )}

          {statutorySubTab === "nominations" && (
            <AdminCard
              title="Nomination Register (Form 14 / Form 15)"
              description="Official record of member nominee declarations under society rules"
            >
              {data.statutory.nominations.length === 0 ? (
                <p className="py-6 text-center text-xs text-stone-500">No nominations filed.</p>
              ) : (
                <AdminTable
                  headers={[
                    "Flat & Block",
                    "Member / Owner",
                    "Nominee Name",
                    "Relationship",
                    "Percentage Share",
                    "Filing Date",
                    "Status",
                  ]}
                  rows={data.statutory.nominations.map((n) => (
                    <tr key={n.id} className="border-t border-stone-100 hover:bg-stone-50/60">
                      <td className="px-4 py-3.5 text-xs font-bold text-stone-950">
                        {n.flatNumber} (Block {n.blockName})
                      </td>
                      <td className="px-4 py-3.5 text-xs text-stone-800">{n.memberName}</td>
                      <td className="px-4 py-3.5 text-xs font-semibold text-stone-900">{n.nomineeName}</td>
                      <td className="px-4 py-3.5 text-xs text-stone-600">{n.relationship}</td>
                      <td className="px-4 py-3.5 text-xs font-bold text-stone-950">{n.percentageShare}%</td>
                      <td className="px-4 py-3.5 text-xs text-stone-500">{formatDateInAppTimeZone(n.nominationDate)}</td>
                      <td className="px-4 py-3.5">
                        <AdminBadge variant="neutral" size="sm">{n.status}</AdminBadge>
                      </td>
                    </tr>
                  ))}
                />
              )}
            </AdminCard>
          )}

          {statutorySubTab === "liens" && (
            <AdminCard
              title="Bank Mortgage NOC & Lien Register"
              description="Record of bank loan NOCs and property mortgage encumbrances"
            >
              {data.statutory.propertyLiens.length === 0 ? (
                <p className="py-6 text-center text-xs text-stone-500">No bank liens or mortgage NOCs recorded.</p>
              ) : (
                <AdminTable
                  headers={[
                    "Flat & Block",
                    "Member Name",
                    "Bank / Financial Institution",
                    "Loan A/C Number",
                    "Sanction Amount",
                    "NOC Issued Date",
                    "Status",
                  ]}
                  rows={data.statutory.propertyLiens.map((l) => (
                    <tr key={l.id} className="border-t border-stone-100 hover:bg-stone-50/60">
                      <td className="px-4 py-3.5 text-xs font-bold text-stone-950">
                        {l.flatNumber} (Block {l.blockName})
                      </td>
                      <td className="px-4 py-3.5 text-xs text-stone-800">{l.memberName}</td>
                      <td className="px-4 py-3.5 text-xs font-semibold text-stone-900">{l.bankName}</td>
                      <td className="px-4 py-3.5 font-mono text-xs text-stone-600">{l.loanAccountNumber || "—"}</td>
                      <td className="px-4 py-3.5 text-xs font-bold text-stone-950">
                        {l.sanctionAmount ? `${sym}${l.sanctionAmount.toLocaleString("en-IN")}` : "—"}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-stone-500">
                        {l.nocIssuedDate ? formatDateInAppTimeZone(l.nocIssuedDate) : "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        <AdminBadge variant={l.status === "ACTIVE" ? "warning" : "success"} size="sm">
                          {l.status}
                        </AdminBadge>
                      </td>
                    </tr>
                  ))}
                />
              )}
            </AdminCard>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 6: VENDOR PAYABLES AGING */}
      {/* ========================================== */}
      {activeTab === "vendors" && (
        <div className="space-y-6">
          <AdminCard
            title={`Vendor Payables & Outstanding Aging (${data.vendorAging.length} Vendors)`}
            description="Itemized payables aging across operational suppliers, AMC contracts, and service providers"
          >
            {data.vendorAging.length === 0 ? (
              <p className="py-6 text-center text-xs text-stone-500">No vendor invoices or outstanding payables.</p>
            ) : (
              <AdminTable
                headers={[
                  "Vendor & Business Name",
                  "Contact",
                  "Total Invoiced",
                  "Total Paid",
                  "Outstanding Due",
                  "TDS Deducted",
                  "Pending Bills",
                  "Aging Bucket",
                ]}
                rows={data.vendorAging.map((v) => (
                  <tr key={v.vendorId} className="border-t border-stone-100 hover:bg-stone-50/60">
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-xs text-stone-950">{v.vendorName}</p>
                      {v.companyName && <p className="text-[11px] text-stone-500">{v.companyName}</p>}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-stone-600">{v.phone || "—"}</td>
                    <td className="px-4 py-3.5 text-xs font-semibold text-stone-900">
                      {sym}{v.totalBilledAmount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3.5 text-xs font-semibold text-emerald-700">
                      {sym}{v.totalPaidAmount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3.5 text-xs font-bold text-amber-800">
                      {sym}{v.outstandingDue.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3.5 text-xs font-mono text-stone-600">
                      {sym}{v.tdsDeducted.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-stone-700 font-semibold">{v.pendingBillsCount}</td>
                    <td className="px-4 py-3.5">
                      <AdminBadge
                        variant={v.agingBucket === "OVER_60" ? "danger" : v.agingBucket === "DAYS_31_60" ? "warning" : "neutral"}
                        size="sm"
                      >
                        {v.agingBucket === "OVER_60" ? ">60 Days Due" : v.agingBucket === "DAYS_31_60" ? "31-60 Days" : "0-30 Days"}
                      </AdminBadge>
                    </td>
                  </tr>
                ))}
              />
            )}
          </AdminCard>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 7: CHEQUE & BANKING REGISTER */}
      {/* ========================================== */}
      {activeTab === "cheques" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
            <div className="w-44">
              <AdminSelect
                value={chequeDirectionFilter}
                onChange={(e) => setChequeDirectionFilter(e.target.value as typeof chequeDirectionFilter)}
                options={[
                  { value: "ALL", label: "All Directions" },
                  { value: "INWARD", label: "Inward (Member Payments)" },
                  { value: "OUTWARD", label: "Outward (Vendor Payments)" },
                ]}
              />
            </div>

            <div className="w-44">
              <AdminSelect
                value={chequeStatusFilter}
                onChange={(e) => setChequeStatusFilter(e.target.value)}
                options={[
                  { value: "ALL", label: "All Statuses" },
                  { value: "CLEARED", label: "Cleared" },
                  { value: "IN_CLEARING", label: "In Clearing" },
                  { value: "RECEIVED", label: "Received" },
                  { value: "BOUNCED", label: "Bounced" },
                ]}
              />
            </div>
          </div>

          <AdminCard
            title={`Bank Cheque Register (${filteredCheques.length} Instruments)`}
            description="Inward member receipts and outward vendor payment cheques tracking"
          >
            {filteredCheques.length === 0 ? (
              <p className="py-6 text-center text-xs text-stone-500">No cheque records found.</p>
            ) : (
              <AdminTable
                headers={[
                  "Cheque #",
                  "Direction",
                  "Party / Member Name",
                  "Drawee Bank",
                  "Amount",
                  "Date",
                  "Status",
                  "Remarks / Bounce",
                ]}
                rows={filteredCheques.map((c) => (
                  <tr key={c.id} className="border-t border-stone-100 hover:bg-stone-50/60">
                    <td className="px-4 py-3.5 font-mono text-xs font-bold text-stone-950">
                      {c.chequeNumber}
                    </td>
                    <td className="px-4 py-3.5">
                      <AdminBadge variant={c.direction === "INWARD" ? "success" : "neutral"} size="sm">
                        {c.direction}
                      </AdminBadge>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-stone-900 font-medium">{c.partyName}</td>
                    <td className="px-4 py-3.5 text-xs text-stone-600">{c.bankName || "—"}</td>
                    <td className="px-4 py-3.5 text-xs font-bold text-stone-950">
                      {sym}{c.amount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-stone-500">{formatDateInAppTimeZone(c.chequeDate)}</td>
                    <td className="px-4 py-3.5">
                      <AdminBadge
                        variant={c.status === "CLEARED" ? "success" : c.status === "BOUNCED" ? "danger" : "warning"}
                        size="sm"
                        dot
                      >
                        {c.status}
                      </AdminBadge>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-stone-500">
                      {c.bouncedReason ? (
                        <span className="text-rose-700 font-semibold">{c.bouncedReason} (Fee: {sym}{c.bounceCharges})</span>
                      ) : (
                        c.clearedOn ? `Cleared ${formatDateInAppTimeZone(c.clearedOn)}` : "—"
                      )}
                    </td>
                  </tr>
                ))}
              />
            )}
          </AdminCard>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 8: MONTH-ON-MONTH TRENDS */}
      {/* ========================================== */}
      {activeTab === "monthly" && (
        <div className="space-y-6">
          <AdminCard
            title="Month-on-Month Invoicing & Collection Performance"
            description="Chronological audit of monthly demands, collection realizations, and operating cashflow"
          >
            {data.monthlyTrends.length === 0 ? (
              <p className="py-6 text-center text-xs text-stone-500">No monthly billing trends available.</p>
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
                    <td className="px-4 py-3.5 font-bold text-xs text-stone-950">{trend.label}</td>
                    <td className="px-4 py-3.5 text-xs text-stone-600">{trend.billedCount} invoice(s)</td>
                    <td className="px-4 py-3.5 text-xs font-semibold text-stone-900">
                      {sym}{trend.billedAmount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3.5 text-xs font-bold text-emerald-700">
                      {sym}{trend.collectedAmount.toLocaleString("en-IN")}
                      <span className="block text-[10px] text-stone-400 font-normal">{trend.collectedCount} receipt(s)</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <AdminBadge
                        variant={trend.collectionRate >= 80 ? "success" : trend.collectionRate >= 50 ? "warning" : "danger"}
                        size="sm"
                      >
                        {trend.collectionRate}%
                      </AdminBadge>
                    </td>
                    <td className="px-4 py-3.5 text-xs font-semibold text-amber-700">
                      {sym}{trend.expenseAmount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3.5 text-xs font-extrabold">
                      <span className={trend.netCashflow >= 0 ? "text-emerald-700" : "text-rose-700"}>
                        {trend.netCashflow >= 0 ? "+" : ""}{sym}{trend.netCashflow.toLocaleString("en-IN")}
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
      {/* TAB 9: INCOME & EXPENDITURE STATEMENT */}
      {/* ========================================== */}
      {activeTab === "pnl" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="border-b border-stone-200 pb-4 text-center">
              <h2 className="text-xl font-black tracking-tight text-stone-950">{data.society.name}</h2>
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mt-1">
                Statement of Income & Expenditure
              </p>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2">
              {/* INCOME */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b-2 border-emerald-600 pb-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-950">Income Heads</h3>
                  <span className="text-xs font-semibold text-emerald-800">Amount ({sym})</span>
                </div>

                <div className="divide-y divide-stone-100">
                  {data.pnl.incomeHeads.map((head) => (
                    <div key={head.category} className="flex items-center justify-between py-2.5 text-xs">
                      <span className="text-stone-800">
                        {head.category} <span className="text-[10px] text-stone-400">({head.count})</span>
                      </span>
                      <span className="font-semibold text-stone-950">{sym}{head.amount.toLocaleString("en-IN")}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between border-t-2 border-stone-300 pt-3 text-sm font-extrabold text-stone-950">
                  <span>TOTAL INCOME</span>
                  <span className="text-emerald-800">{sym}{data.pnl.totalIncome.toLocaleString("en-IN")}</span>
                </div>
              </div>

              {/* EXPENDITURE */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b-2 border-amber-600 pb-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-amber-950">Expenditure Heads</h3>
                  <span className="text-xs font-semibold text-amber-800">Amount ({sym})</span>
                </div>

                <div className="divide-y divide-stone-100">
                  {data.pnl.expenseHeads.map((head) => (
                    <div key={head.category} className="flex items-center justify-between py-2.5 text-xs">
                      <span className="text-stone-800">
                        {head.category} <span className="text-[10px] text-stone-400">({head.count})</span>
                      </span>
                      <span className="font-semibold text-stone-950">{sym}{head.amount.toLocaleString("en-IN")}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between border-t-2 border-stone-300 pt-3 text-sm font-extrabold text-stone-950">
                  <span>TOTAL EXPENDITURE</span>
                  <span className="text-amber-800">{sym}{data.pnl.totalExpense.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            {/* NET SURPLUS / DEFICIT */}
            <div className="mt-8 rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Net Operating Result</p>
                  <p className={`text-2xl font-black mt-0.5 ${data.pnl.netSurplus >= 0 ? "text-emerald-800" : "text-rose-800"}`}>
                    {data.pnl.netSurplus >= 0 ? "Surplus: +" : "Deficit: "}
                    {sym}{Math.abs(data.pnl.netSurplus).toLocaleString("en-IN")}
                  </p>
                </div>
                <AdminBadge variant={data.pnl.netSurplus >= 0 ? "success" : "danger"} size="md">
                  {data.pnl.netSurplus >= 0 ? "Excess of Income over Expenditure" : "Excess of Expenditure over Income"}
                </AdminBadge>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 10: UNIT-BY-UNIT LEDGER */}
      {/* ========================================== */}
      {activeTab === "units" && (
        <div className="space-y-6">
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
          </div>

          <AdminCard
            title={`Unit Maintenance & Dues Ledger (${filteredUnitLedger.length} Flats)`}
            description="Comprehensive audit of demands invoiced, receipts recorded, and net balances per flat"
          >
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
                  <td className="px-4 py-3.5 text-xs font-bold text-stone-950">{unit.flatNumber}</td>
                  <td className="px-4 py-3.5 text-xs text-stone-700">{unit.blockName}</td>
                  <td className="px-4 py-3.5 text-xs text-stone-800 font-medium">{unit.residentName}</td>
                  <td className="px-4 py-3.5">
                    <AdminBadge variant={unit.occupancyStatus === "OCCUPIED" ? "success" : "neutral"} size="sm">
                      {unit.occupancyStatus}
                    </AdminBadge>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-stone-600">{unit.totalInvoicesCount}</td>
                  <td className="px-4 py-3.5 text-xs font-semibold text-stone-900">
                    {sym}{unit.totalBilledAmount.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3.5 text-xs font-semibold text-emerald-700">
                    {sym}{unit.totalPaidAmount.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3.5 text-xs font-black">
                    {unit.outstandingAmount > 0 ? (
                      <span className="text-rose-700">{sym}{unit.outstandingAmount.toLocaleString("en-IN")}</span>
                    ) : unit.advanceAmount > 0 ? (
                      <span className="text-emerald-700">+{sym}{unit.advanceAmount.toLocaleString("en-IN")} (Adv)</span>
                    ) : (
                      <span className="text-stone-400">₹0</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <AdminBadge
                      variant={unit.accountStatus === "CLEAR" ? "success" : unit.accountStatus === "OVERDUE" ? "danger" : "warning"}
                      size="sm"
                      dot
                    >
                      {unit.accountStatus}
                    </AdminBadge>
                  </td>
                  <td className="px-4 py-3.5">
                    <AdminButton href={`/society/${societyCode}/flats/${unit.flatId}`} variant="outline" size="xs">
                      Details →
                    </AdminButton>
                  </td>
                </tr>
              ))}
            />
          </AdminCard>
        </div>
      )}

      {/* ========================================== */}
      {/* 1-CLICK DEFAULTER NOTICE GENERATOR MODAL */}
      {/* ========================================== */}
      {noticeDefaulter && (
        <AdminModal
          isOpen={Boolean(noticeDefaulter)}
          onClose={() => setNoticeDefaulter(null)}
          title="Maintenance Demand & Overdue Notice Generator"
          description={`Generate official demand letter for Flat ${noticeDefaulter.flatNumber}`}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-stone-700">Notice Type:</span>
              <div className="w-64">
                <AdminSelect
                  value={noticeType}
                  onChange={(e) => setNoticeType(e.target.value as typeof noticeType)}
                  options={[
                    { value: "FIRST_REMINDER", label: "First Friendly Reminder" },
                    { value: "URGENT_NOTICE", label: "Urgent Overdue Notice (>30d)" },
                    { value: "STATUTORY_DEMAND", label: "Final Statutory Demand Notice (>90d)" },
                  ]}
                />
              </div>
            </div>

            {/* Printable Notice Container */}
            <div
              ref={noticePrintRef}
              className="rounded-2xl border border-stone-200 bg-stone-50/60 p-6 text-stone-900 font-sans"
            >
              <div className="header">
                <h1>{data.society.name}</h1>
                <p>
                  {data.society.address ? `${data.society.address}, ` : ""}
                  {data.society.city ? `${data.society.city}, ` : ""}
                  {data.society.state || ""} {data.society.pincode || ""}
                </p>
                {data.society.registrationNumber && (
                  <p>Regn. No: {data.society.registrationNumber} | PAN: {data.society.panNumber || "—"}</p>
                )}
              </div>

              <div className="meta">
                <div>
                  <p><strong>To:</strong></p>
                  <p><strong>{noticeDefaulter.residentName}</strong></p>
                  <p>Flat No: {noticeDefaulter.flatNumber}, Block {noticeDefaulter.blockName}</p>
                  {noticeDefaulter.residentPhone && <p>Phone: {noticeDefaulter.residentPhone}</p>}
                </div>
                <div style={{ textAlign: "right" }}>
                  <p><strong>Date:</strong> {formatDateInAppTimeZone(new Date().toISOString())}</p>
                  <p><strong>Ref:</strong> MNT/DUE/{noticeDefaulter.flatNumber}/{new Date().getFullYear()}</p>
                  <span className="badge">
                    {noticeType === "STATUTORY_DEMAND"
                      ? "FINAL STATUTORY NOTICE"
                      : noticeType === "URGENT_NOTICE"
                        ? "URGENT DEMAND NOTICE"
                        : "PAYMENT REMINDER"}
                  </span>
                </div>
              </div>

              <p style={{ marginTop: "16px", fontWeight: "bold", fontSize: "14px" }}>
                SUBJECT: {noticeType === "STATUTORY_DEMAND"
                  ? `FINAL STATUTORY DEMAND FOR OUTSTANDING MAINTENANCE ARREARS (SECTION 101/BYE-LAWS)`
                  : `REMINDER: OUTSTANDING SOCIETY MAINTENANCE DUES`}
              </p>

              <p style={{ marginTop: "12px", fontSize: "13px", color: "#333" }}>
                Dear Member / Resident,
              </p>

              <p style={{ marginTop: "8px", fontSize: "13px", color: "#333" }}>
                {noticeType === "STATUTORY_DEMAND"
                  ? `This is a formal statutory notice that maintenance charges and associated assessments for Flat ${noticeDefaulter.flatNumber} remain unpaid for over 90 days across ${noticeDefaulter.unpaidBillsCount} billing cycles. Under the Model Bye-laws of the Society, chronic default is a statutory violation and disqualifies the member from voting rights in Society General Body Meetings (AGM/SGM).`
                  : `This is a courteous reminder that your monthly society maintenance charges for Flat ${noticeDefaulter.flatNumber} are currently pending settlement.`}
              </p>

              {/* Dues Breakdown Table */}
              <table className="table">
                <thead>
                  <tr>
                    <th>Item Description</th>
                    <th>Billing Cycles</th>
                    <th style={{ textAlign: "right" }}>Amount ({sym})</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Principal Maintenance & Utility Demands</td>
                    <td>{noticeDefaulter.unpaidBillsCount} unpaid invoices</td>
                    <td style={{ textAlign: "right" }}>{sym}{noticeDefaulter.unpaidPrincipal.toLocaleString("en-IN")}</td>
                  </tr>
                  <tr>
                    <td>Late Fee & Simple Interest on Arrears (21% p.a.)</td>
                    <td>Accrued to date</td>
                    <td style={{ textAlign: "right" }}>{sym}{noticeDefaulter.unpaidLateFees.toLocaleString("en-IN")}</td>
                  </tr>
                  <tr className="amount-row">
                    <td>TOTAL OVERDUE AMOUNT PAYABLE</td>
                    <td>Total Due</td>
                    <td style={{ textAlign: "right", color: "#b91c1c" }}>
                      {sym}{noticeDefaulter.totalOverdue.toLocaleString("en-IN")}
                    </td>
                  </tr>
                </tbody>
              </table>

              <p style={{ fontSize: "13px", color: "#333" }}>
                Please arrange to clear the outstanding balance of <strong>{sym}{noticeDefaulter.totalOverdue.toLocaleString("en-IN")}</strong> within <strong>7 days</strong> of receipt of this notice via Net Banking, UPI, or Cheque favoring <em>&quot;{data.society.name}&quot;</em>.
              </p>

              <div className="signatures">
                <div className="sign-box">
                  <p>Prepared By</p>
                  <p><strong>Estate Office / Accountant</strong></p>
                </div>
                <div className="sign-box">
                  <p>Authorized Signatory</p>
                  <p><strong>Hon. Secretary / Treasurer</strong></p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <AdminButton variant="outline" size="sm" onClick={() => setNoticeDefaulter(null)}>
                Close
              </AdminButton>
              <AdminButton variant="primary" size="sm" onClick={handlePrintNotice}>
                🖨️ Print / Download Notice
              </AdminButton>
            </div>
          </div>
        </AdminModal>
      )}
    </div>
  )
}
