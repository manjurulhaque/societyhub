import { notFound } from "next/navigation"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { prisma } from "@/lib/prisma"
import { AdminPageHeader } from "@/components/admin"
import {
  SocietyReportsClient,
  type SocietyReportData,
} from "./SocietyReportsClient"

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]

export default async function SocietyReportsPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const context = await getSocietyAdmin(code)

  if (!context) {
    notFound()
  }

  const { society } = context
  const societyId = society.id

  const [
    billAggregate,
    paymentAggregate,
    expenseAggregate,
    billsByTypeRaw,
    paymentsByModeRaw,
    expensesRaw,
    accounts,
    fixedDeposits,
    flats,
    monthlyBills,
    monthlyPayments,
    monthlyExpenses,
  ] = await Promise.all([
    prisma.bill.aggregate({
      where: { societyId },
      _sum: { amount: true, lateFeeAmount: true },
      _count: { _all: true },
    }),

    prisma.payment.aggregate({
      where: { societyId, status: "SUCCESS" },
      _sum: { amount: true, lateFeePaid: true, discountApplied: true },
      _count: { _all: true },
    }),

    prisma.expense.aggregate({
      where: { societyId, status: "PAID" },
      _sum: { amount: true },
      _count: { _all: true },
    }),

    prisma.bill.groupBy({
      by: ["billType"],
      where: { societyId },
      _sum: { amount: true },
      _count: { _all: true },
    }),

    prisma.payment.groupBy({
      by: ["mode"],
      where: { societyId, status: "SUCCESS" },
      _sum: { amount: true },
      _count: { _all: true },
    }),

    prisma.expense.findMany({
      where: { societyId, status: "PAID" },
      include: { category: { select: { name: true } } },
    }),

    prisma.account.findMany({
      where: { societyId, isActive: true, deletedAt: null },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    }),

    prisma.fixedDeposit.findMany({
      where: { societyId },
      orderBy: { maturityDate: "asc" },
    }),

    prisma.flat.findMany({
      where: {
        block: { societyId },
        isActive: true,
        deletedAt: null,
      },
      include: {
        block: { select: { name: true } },
        people: {
          where: { toDate: null },
          include: { person: true },
          orderBy: { isPrimary: "desc" },
        },
        bills: {
          include: {
            payments: {
              where: { status: "SUCCESS" },
              select: { amount: true },
            },
          },
          orderBy: { dueDate: "asc" },
        },
        advancePayments: {
          where: { status: "SUCCESS", isAdvance: true },
          select: { amount: true },
        },
      },
      orderBy: [
        { block: { name: "asc" } },
        { number: "asc" },
      ],
    }),

    prisma.bill.findMany({
      where: { societyId },
      select: {
        year: true,
        month: true,
        amount: true,
        billType: true,
      },
    }),

    prisma.payment.findMany({
      where: { societyId, status: "SUCCESS" },
      select: {
        paidOn: true,
        amount: true,
      },
    }),

    prisma.expense.findMany({
      where: { societyId, status: "PAID" },
      select: {
        expenseDate: true,
        amount: true,
      },
    }),
  ])

  const totalBilled = Number(billAggregate._sum.amount ?? 0)
  const totalCollected = Number(paymentAggregate._sum.amount ?? 0)
  const totalOutstanding = Math.max(0, totalBilled - totalCollected)
  const totalExpenses = Number(expenseAggregate._sum.amount ?? 0)
  const netOperatingSurplus = totalCollected - totalExpenses
  const collectionRate =
    totalBilled === 0 ? 0 : Math.min(100, Math.round((totalCollected / totalBilled) * 100))

  // Bank & Liquid Accounts
  const liquidCashAndBank = accounts.reduce(
    (sum, acc) => sum + Number(acc.currentBalance ?? 0),
    0
  )
  const totalFixedDeposits = fixedDeposits
    .filter((fd) => fd.status === "ACTIVE")
    .reduce((sum, fd) => sum + Number(fd.principalAmount ?? 0), 0)
  const totalReserves = liquidCashAndBank + totalFixedDeposits

  // Bills By Category Breakdown
  const billsByCategory = billsByTypeRaw.map((b) => {
    const amount = Number(b._sum.amount ?? 0)
    return {
      billType: b.billType,
      amount,
      count: b._count._all,
      percentage: totalBilled > 0 ? Math.round((amount / totalBilled) * 100) : 0,
    }
  })

  // Expenses By Category Breakdown
  const expenseMap = new Map<string, { amount: number; count: number }>()
  for (const exp of expensesRaw) {
    const catName = exp.category?.name || "General Maintenance"
    const current = expenseMap.get(catName) || { amount: 0, count: 0 }
    current.amount += Number(exp.amount ?? 0)
    current.count += 1
    expenseMap.set(catName, current)
  }

  const expensesByCategory = Array.from(expenseMap.entries())
    .map(([categoryName, data]) => ({
      categoryName,
      amount: data.amount,
      count: data.count,
      percentage: totalExpenses > 0 ? Math.round((data.amount / totalExpenses) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount)

  // Payments by Mode
  const paymentsByMode = paymentsByModeRaw.map((p) => {
    const amount = Number(p._sum.amount ?? 0)
    return {
      mode: p.mode,
      amount,
      count: p._count._all,
      percentage: totalCollected > 0 ? Math.round((amount / totalCollected) * 100) : 0,
    }
  })

  // Aging & Defaulters Analysis
  const now = new Date()
  const blocksSet = new Set<string>()

  const defaulters: SocietyReportData["defaulters"] = []
  const agingSummary = {
    over90: { count: 0, amount: 0 },
    days61To90: { count: 0, amount: 0 },
    days31To60: { count: 0, amount: 0 },
    days0To30: { count: 0, amount: 0 },
  }

  const unitLedger: SocietyReportData["unitLedger"] = []

  for (const flat of flats) {
    const blockName = flat.block?.name || "Main"
    blocksSet.add(blockName)

    const primaryPerson =
      flat.people.find((p) => p.isPrimary)?.person ||
      flat.people[0]?.person

    const totalFlatBilled = flat.bills.reduce(
      (sum, b) => sum + Number(b.amount ?? 0) + Number(b.lateFeeAmount ?? 0),
      0
    )

    let totalFlatPaid = 0
    let flatUnpaidPrincipal = 0
    let flatUnpaidLateFees = 0
    let unpaidBillsCount = 0
    let oldestDueDate: Date | null = null
    let maxDaysOverdue = 0

    for (const bill of flat.bills) {
      const billPayments = bill.payments.reduce(
        (sum, p) => sum + Number(p.amount ?? 0),
        0
      )
      totalFlatPaid += billPayments

      const billTotal = Number(bill.amount ?? 0) + Number(bill.lateFeeAmount ?? 0)
      const balance = billTotal - billPayments

      if (balance > 0) {
        unpaidBillsCount += 1
        flatUnpaidPrincipal += Math.max(0, Number(bill.amount ?? 0) - billPayments)
        flatUnpaidLateFees += Number(bill.lateFeeAmount ?? 0)

        const dueDate = bill.dueDate ? new Date(bill.dueDate) : new Date(bill.createdAt)
        if (!oldestDueDate || dueDate < oldestDueDate) {
          oldestDueDate = dueDate
        }

        const diffDays = Math.max(
          0,
          Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
        )
        if (diffDays > maxDaysOverdue) {
          maxDaysOverdue = diffDays
        }
      }
    }

    const flatAdvance = flat.advancePayments.reduce(
      (sum, p) => sum + Number(p.amount ?? 0),
      0
    )
    totalFlatPaid += flatAdvance

    const flatOutstanding = Math.max(0, totalFlatBilled - totalFlatPaid)

    let accountStatus: SocietyReportData["unitLedger"][0]["accountStatus"] = "CLEAR"
    if (flat.bills.length === 0) {
      accountStatus = "NO_BILLS"
    } else if (flatOutstanding > 0) {
      accountStatus = maxDaysOverdue > 30 ? "OVERDUE" : "PENDING"
    } else if (flatAdvance > 0) {
      accountStatus = "ADVANCE"
    }

    unitLedger.push({
      flatId: flat.id,
      flatNumber: flat.number,
      blockName,
      unitType: flat.unitType,
      area: flat.area ? Number(flat.area) : null,
      areaUnit: flat.areaUnit || "sqft",
      occupancyStatus: flat.status,
      residentName: primaryPerson?.name || "Unassigned",
      totalInvoicesCount: flat.bills.length,
      totalBilledAmount: totalFlatBilled,
      totalPaidAmount: totalFlatPaid,
      outstandingAmount: flatOutstanding,
      advanceAmount: flatAdvance,
      accountStatus,
    })

    if (flatOutstanding > 0) {
      let agingBucket: SocietyReportData["defaulters"][0]["agingBucket"] = "DAYS_0_30"
      if (maxDaysOverdue > 90) {
        agingBucket = "OVER_90"
        agingSummary.over90.count += 1
        agingSummary.over90.amount += flatOutstanding
      } else if (maxDaysOverdue > 60) {
        agingBucket = "DAYS_61_90"
        agingSummary.days61To90.count += 1
        agingSummary.days61To90.amount += flatOutstanding
      } else if (maxDaysOverdue > 30) {
        agingBucket = "DAYS_31_60"
        agingSummary.days31To60.count += 1
        agingSummary.days31To60.amount += flatOutstanding
      } else {
        agingSummary.days0To30.count += 1
        agingSummary.days0To30.amount += flatOutstanding
      }

      defaulters.push({
        flatId: flat.id,
        flatNumber: flat.number,
        blockName,
        occupancyStatus: flat.status,
        residentName: primaryPerson?.name || "Unassigned",
        residentPhone: primaryPerson?.phone || null,
        residentEmail: primaryPerson?.email || null,
        unpaidBillsCount,
        unpaidPrincipal: flatUnpaidPrincipal,
        unpaidLateFees: flatUnpaidLateFees,
        totalOverdue: flatOutstanding,
        oldestDueDate: oldestDueDate ? oldestDueDate.toISOString() : null,
        agingBucket,
        daysOverdue: maxDaysOverdue,
      })
    }
  }

  // Sort Defaulters by highest overdue first
  defaulters.sort((a, b) => b.totalOverdue - a.totalOverdue)

  // Monthly Trend Calculations (past 12 monthly slots)
  const monthlyMap = new Map<
    string,
    {
      year: number
      month: number
      billedAmount: number
      billedCount: number
      collectedAmount: number
      collectedCount: number
      expenseAmount: number
    }
  >()

  // Initialize past 12 months in reverse chronological order
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    const key = `${y}-${String(m).padStart(2, "0")}`
    monthlyMap.set(key, {
      year: y,
      month: m,
      billedAmount: 0,
      billedCount: 0,
      collectedAmount: 0,
      collectedCount: 0,
      expenseAmount: 0,
    })
  }

  for (const b of monthlyBills) {
    const key = `${b.year}-${String(b.month).padStart(2, "0")}`
    const existing = monthlyMap.get(key)
    if (existing) {
      existing.billedAmount += Number(b.amount ?? 0)
      existing.billedCount += 1
    }
  }

  for (const p of monthlyPayments) {
    const d = new Date(p.paidOn)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const existing = monthlyMap.get(key)
    if (existing) {
      existing.collectedAmount += Number(p.amount ?? 0)
      existing.collectedCount += 1
    }
  }

  for (const e of monthlyExpenses) {
    const d = new Date(e.expenseDate)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const existing = monthlyMap.get(key)
    if (existing) {
      existing.expenseAmount += Number(e.amount ?? 0)
    }
  }

  const monthlyTrends = Array.from(monthlyMap.entries()).map(([key, item]) => {
    const rate =
      item.billedAmount > 0
        ? Math.min(100, Math.round((item.collectedAmount / item.billedAmount) * 100))
        : 0
    return {
      key,
      label: `${MONTH_NAMES[item.month - 1]} ${item.year}`,
      year: item.year,
      month: item.month,
      billedAmount: item.billedAmount,
      billedCount: item.billedCount,
      collectedAmount: item.collectedAmount,
      collectedCount: item.collectedCount,
      collectionRate: rate,
      expenseAmount: item.expenseAmount,
      netCashflow: item.collectedAmount - item.expenseAmount,
    }
  })

  // P&L Statement Heads
  const incomeHeads = billsByTypeRaw.map((b) => ({
    category: b.billType.replace(/_/g, " "),
    amount: Number(b._sum.amount ?? 0),
    count: b._count._all,
  }))

  const expenseHeads = expensesByCategory.map((e) => ({
    category: e.categoryName,
    amount: e.amount,
    count: e.count,
  }))

  const reportData: SocietyReportData = {
    society: {
      id: society.id,
      name: society.name,
      code: society.code,
      currencySymbol: "₹",
    },
    summary: {
      totalBilled,
      totalCollected,
      totalOutstanding,
      collectionRate,
      totalBillsCount: billAggregate._count._all,
      totalPaymentsCount: paymentAggregate._count._all,
      totalExpenses,
      totalExpensesCount: expenseAggregate._count._all,
      netOperatingSurplus,
      liquidCashAndBank,
      totalFixedDeposits,
      totalReserves,
      defaultersCount: defaulters.length,
      totalFlatsCount: flats.length,
      defaulterRate:
        flats.length > 0 ? Math.round((defaulters.length / flats.length) * 100) : 0,
    },
    billsByCategory,
    expensesByCategory,
    paymentsByMode,
    bankAccounts: accounts.map((a) => ({
      id: a.id,
      name: a.name,
      bankName: a.bankName,
      accountNumber: a.accountNumber,
      accountType: a.accountType,
      currentBalance: Number(a.currentBalance ?? 0),
      isDefault: a.isDefault,
    })),
    fixedDeposits: fixedDeposits.map((fd) => ({
      id: fd.id,
      fdNumber: fd.fdNumber,
      bankName: fd.bankName,
      principalAmount: Number(fd.principalAmount),
      interestRate: Number(fd.interestRate),
      maturityAmount: Number(fd.maturityAmount),
      maturityDate: fd.maturityDate.toISOString(),
      status: fd.status,
    })),
    defaulters,
    agingSummary,
    monthlyTrends,
    pnl: {
      incomeHeads,
      totalIncome: totalBilled,
      expenseHeads,
      totalExpense: totalExpenses,
      netSurplus: totalBilled - totalExpenses,
    },
    unitLedger,
    blocks: Array.from(blocksSet).sort(),
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 sm:py-8 md:px-8">
      <AdminPageHeader
        eyebrow="Financial Intelligence & Audit"
        title="Reports & Analytics"
        description={`Comprehensive financial audit, defaulters aging, month-on-month cashflow, and expenditure statements for ${society.name}.`}
      />

      <SocietyReportsClient data={reportData} />
    </div>
  )
}
