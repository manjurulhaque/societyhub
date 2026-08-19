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
    societyDetails,
    billAggregate,
    paymentAggregate,
    expenseAggregate,
    billsByTypeRaw,
    paymentsByModeRaw,
    expensesRaw,
    accounts,
    fixedDeposits,
    fixedAssetsRaw,
    flats,
    vendorBillsRaw,
    chequesRaw,
    budgetsRaw,
    shareCertificatesRaw,
    nominationsRaw,
    propertyLiensRaw,
    memberDepositsRaw,
    financialYearsRaw,
    monthlyBills,
    monthlyPayments,
    monthlyExpenses,
    oneTimeCollectionsRaw,
    memberDepositsDetailed,
  ] = await Promise.all([
    prisma.society.findUnique({
      where: { id: societyId },
      select: {
        address: true,
        city: true,
        state: true,
        pincode: true,
        registrationNumber: true,
        panNumber: true,
        gstin: true,
      },
    }),

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

    prisma.fixedAsset.findMany({
      where: { societyId, isActive: true, deletedAt: null },
      include: {
        category: { select: { name: true } },
        amcVendor: { select: { name: true, companyName: true } },
      },
      orderBy: { name: "asc" },
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

    prisma.vendorBill.findMany({
      where: { societyId },
      include: {
        vendor: { select: { id: true, name: true, companyName: true, phone: true } },
      },
      orderBy: { billDate: "desc" },
    }),

    prisma.chequeRegister.findMany({
      where: { societyId },
      include: {
        account: { select: { name: true, bankName: true } },
      },
      orderBy: { chequeDate: "desc" },
    }),

    prisma.budget.findMany({
      where: { societyId },
      include: {
        financialYear: { select: { name: true } },
        items: {
          include: { ledger: { select: { name: true } } },
        },
      },
    }),

    prisma.shareCertificate.findMany({
      where: { societyId },
      include: {
        flat: { select: { number: true, block: { select: { name: true } } } },
        person: { select: { name: true } },
      },
      orderBy: { certificateNumber: "asc" },
    }),

    prisma.nomination.findMany({
      where: { societyId },
      include: {
        flat: { select: { number: true, block: { select: { name: true } } } },
        person: { select: { name: true } },
      },
      orderBy: { nominationDate: "desc" },
    }),

    prisma.propertyLien.findMany({
      where: { societyId },
      include: {
        flat: { select: { number: true, block: { select: { name: true } } } },
        person: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),

    prisma.memberDeposit.findMany({
      where: { societyId, status: "HELD" },
      select: { amount: true },
    }),

    prisma.financialYear.findMany({
      where: { societyId },
      orderBy: { startYear: "desc" },
      select: {
        id: true,
        name: true,
        startYear: true,
        endYear: true,
        isCurrent: true,
      },
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

    prisma.oneTimeCollection.findMany({
      where: { societyId },
      include: {
        allocations: {
          include: {
            flat: {
              select: {
                id: true,
                number: true,
                area: true,
                block: { select: { name: true } },
                people: {
                  where: { toDate: null },
                  include: { person: true },
                  orderBy: { isPrimary: "desc" },
                },
              },
            },
            installments: {
              orderBy: { installmentNumber: "asc" },
            },
          },
        },
      },
      orderBy: { startDate: "desc" },
    }),

    prisma.memberDeposit.findMany({
      where: { societyId },
      include: {
        flat: { select: { number: true, block: { select: { name: true } } } },
        person: { select: { name: true, phone: true } },
      },
      orderBy: { receivedOn: "desc" },
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

  const totalFixedAssetsBookValue = fixedAssetsRaw.reduce(
    (sum, a) => sum + Number(a.currentBookValue ?? a.purchaseCost ?? 0),
    0
  )

  const totalReserves = liquidCashAndBank + totalFixedDeposits

  const totalMemberDepositsHeld = memberDepositsRaw.reduce(
    (sum, d) => sum + Number(d.amount ?? 0),
    0
  )

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
  const votingList: SocietyReportData["statutory"]["votingList"] = []
  let totalAdvanceHeld = 0

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
    totalAdvanceHeld += flatAdvance

    const flatOutstanding = Math.max(0, totalFlatBilled - totalFlatPaid)
    const isVotingDisqualified = maxDaysOverdue > 90

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

    votingList.push({
      flatNumber: flat.number,
      blockName,
      memberName: primaryPerson?.name || "Unassigned",
      occupancyStatus: flat.status,
      outstandingDues: flatOutstanding,
      isEligible: !isVotingDisqualified,
      disqualificationReason: isVotingDisqualified
        ? `Arrears pending for >90 days (₹${flatOutstanding.toLocaleString("en-IN")})`
        : null,
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
        isVotingDisqualified,
      })
    }
  }

  defaulters.sort((a, b) => b.totalOverdue - a.totalOverdue)

  // Vendor Aging Calculations
  const vendorMap = new Map<
    string,
    {
      vendorId: string
      vendorName: string
      companyName: string | null
      phone: string | null
      totalBilledAmount: number
      totalPaidAmount: number
      outstandingDue: number
      tdsDeducted: number
      pendingBillsCount: number
      maxDaysDue: number
    }
  >()

  let totalVendorPayables = 0

  for (const vb of vendorBillsRaw) {
    const vId = vb.vendor.id
    const current = vendorMap.get(vId) || {
      vendorId: vId,
      vendorName: vb.vendor.name,
      companyName: vb.vendor.companyName,
      phone: vb.vendor.phone,
      totalBilledAmount: 0,
      totalPaidAmount: 0,
      outstandingDue: 0,
      tdsDeducted: 0,
      pendingBillsCount: 0,
      maxDaysDue: 0,
    }

    const billAmt = Number(vb.amount ?? 0)
    const paidAmt = Number(vb.paidAmount ?? 0)
    const dueAmt = Math.max(0, billAmt - paidAmt)

    current.totalBilledAmount += billAmt
    current.totalPaidAmount += paidAmt
    current.outstandingDue += dueAmt
    current.tdsDeducted += Number(vb.tdsAmount ?? 0)

    if (dueAmt > 0) {
      current.pendingBillsCount += 1
      totalVendorPayables += dueAmt
      const diffDays = Math.max(
        0,
        Math.floor((now.getTime() - new Date(vb.billDate).getTime()) / (1000 * 60 * 60 * 24))
      )
      if (diffDays > current.maxDaysDue) {
        current.maxDaysDue = diffDays
      }
    }

    vendorMap.set(vId, current)
  }

  const vendorAging: SocietyReportData["vendorAging"] = Array.from(vendorMap.values()).map(
    (v) => {
      let agingBucket: SocietyReportData["vendorAging"][0]["agingBucket"] = "DAYS_0_30"
      if (v.maxDaysDue > 60) agingBucket = "OVER_60"
      else if (v.maxDaysDue > 30) agingBucket = "DAYS_31_60"

      return {
        vendorId: v.vendorId,
        vendorName: v.vendorName,
        companyName: v.companyName,
        phone: v.phone,
        totalBilledAmount: v.totalBilledAmount,
        totalPaidAmount: v.totalPaidAmount,
        outstandingDue: v.outstandingDue,
        tdsDeducted: v.tdsDeducted,
        pendingBillsCount: v.pendingBillsCount,
        agingBucket,
      }
    }
  )

  // Budget Variance Calculations
  const budgetVariance: SocietyReportData["budgetVariance"] = []
  for (const b of budgetsRaw) {
    for (const item of b.items) {
      const allocated = Number(item.allocatedAmount ?? 0)
      const utilized = Number(item.utilizedAmount ?? 0)
      const remaining = allocated - utilized
      const utilRate = allocated > 0 ? Math.round((utilized / allocated) * 100) : 0

      let status: SocietyReportData["budgetVariance"][0]["status"] = "ON_TRACK"
      if (utilRate > 100) status = "OVER_BUDGET"
      else if (utilRate >= 85) status = "WARNING"

      budgetVariance.push({
        id: item.id,
        budgetName: b.name,
        headName: item.ledger?.name || "Operating Head",
        allocatedAmount: allocated,
        utilizedAmount: utilized,
        remainingAmount: remaining,
        utilizationRate: utilRate,
        status,
      })
    }
  }

  // Monthly Trend Calculations (past 12 months)
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

  // Balance Sheet Totals
  const totalAssets =
    liquidCashAndBank + totalOutstanding + totalFixedDeposits + totalFixedAssetsBookValue

  const totalLiabilitiesAndFunds =
    totalMemberDepositsHeld +
    totalVendorPayables +
    totalAdvanceHeld +
    Math.max(0, totalAssets - (totalMemberDepositsHeld + totalVendorPayables + totalAdvanceHeld))

  const balanceSheet: SocietyReportData["balanceSheet"] = {
    assets: {
      liquidBankCash: liquidCashAndBank,
      maintenanceArrears: totalOutstanding,
      fixedDeposits: totalFixedDeposits,
      fixedAssetsBookValue: totalFixedAssetsBookValue,
      totalAssets,
    },
    liabilities: {
      memberDepositsHeld: totalMemberDepositsHeld,
      vendorPayables: totalVendorPayables,
      advanceCollections: totalAdvanceHeld,
      sinkingAndGeneralReserves: Math.max(
        0,
        totalAssets - (totalMemberDepositsHeld + totalVendorPayables + totalAdvanceHeld)
      ),
      totalLiabilitiesAndFunds,
    },
    netFinancialPosition: totalAssets,
  }

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

  const oneTimeCampaigns: SocietyReportData["oneTimeFunds"]["campaigns"] = oneTimeCollectionsRaw.map(
    (c) => {
      let totalAllocated = 0
      let totalCollected = 0
      let totalDue = 0

      const allocations = c.allocations.map((a) => {
        const flatPerson =
          a.flat.people.find((p) => p.isPrimary)?.person || a.flat.people[0]?.person
        const totalAmt = Number(a.totalAmount ?? 0)
        const paidAmt = Number(a.paidAmount ?? 0)
        const balAmt = Number(a.balanceAmount ?? Math.max(0, totalAmt - paidAmt))

        totalAllocated += totalAmt
        totalCollected += paidAmt
        totalDue += balAmt

        const clearedCount = a.installments.filter((i) => i.status === "PAID").length

        return {
          id: a.id,
          flatId: a.flat.id,
          flatNumber: a.flat.number,
          blockName: a.flat.block.name,
          residentName: flatPerson?.name || "Unassigned",
          area: a.flat.area ? Number(a.flat.area) : null,
          totalAmount: totalAmt,
          paidAmount: paidAmt,
          balanceAmount: balAmt,
          status: a.status,
          installmentsCount: a.installments.length,
          clearedInstallmentsCount: clearedCount,
        }
      })

      const targetAmt = Number(c.totalTargetAmount ?? totalAllocated)
      const rate = targetAmt > 0 ? Math.min(100, Math.round((totalCollected / targetAmt) * 100)) : 0

      return {
        id: c.id,
        title: c.title,
        description: c.description,
        totalTargetAmount: targetAmt,
        totalAllocatedAmount: totalAllocated,
        totalCollectedAmount: totalCollected,
        totalOutstandingAmount: totalDue,
        realizationRate: rate,
        calculationType: c.calculationType,
        ratePerSqft: c.ratePerSqft ? Number(c.ratePerSqft) : null,
        fixedAmountPerFlat: c.fixedAmountPerFlat ? Number(c.fixedAmountPerFlat) : null,
        paymentPlan: c.paymentPlan,
        numberOfInstallments: c.numberOfInstallments,
        startDate: c.startDate.toISOString(),
        dueDate: c.dueDate ? c.dueDate.toISOString() : null,
        status: c.status,
        approvedInMeeting: c.approvedInMeeting,
        remarks: c.remarks,
        allocations,
      }
    }
  )

  const totalTargetedAllCampaigns = oneTimeCampaigns.reduce(
    (sum, c) => sum + c.totalTargetAmount,
    0
  )
  const totalCollectedAllCampaigns = oneTimeCampaigns.reduce(
    (sum, c) => sum + c.totalCollectedAmount,
    0
  )
  const totalOutstandingAllCampaigns = oneTimeCampaigns.reduce(
    (sum, c) => sum + c.totalOutstandingAmount,
    0
  )

  const totalCorpusDeposits = memberDepositsDetailed
    .filter((d) => d.status === "HELD" && d.depositType === "CORPUS")
    .reduce((sum, d) => sum + Number(d.amount ?? 0), 0)

  const totalSecurityDeposits = memberDepositsDetailed
    .filter((d) => d.status === "HELD" && (d.depositType === "SECURITY" || d.depositType === "FIT_OUT"))
    .reduce((sum, d) => sum + Number(d.amount ?? 0), 0)

  const memberDeposits: SocietyReportData["oneTimeFunds"]["deposits"] = memberDepositsDetailed.map(
    (d) => ({
      id: d.id,
      flatNumber: d.flat.number,
      blockName: d.flat.block.name,
      memberName: d.person?.name || "Member",
      phone: d.person?.phone || null,
      depositType: d.depositType,
      amount: Number(d.amount ?? 0),
      status: d.status,
      receivedOn: d.receivedOn.toISOString(),
      refundedOn: d.refundedOn ? d.refundedOn.toISOString() : null,
      reference: d.reference,
      remarks: d.remarks,
    })
  )

  const oneTimeFunds: SocietyReportData["oneTimeFunds"] = {
    campaigns: oneTimeCampaigns,
    deposits: memberDeposits,
    totalTargetedAllCampaigns,
    totalCollectedAllCampaigns,
    totalOutstandingAllCampaigns,
    totalDepositsHeld: totalMemberDepositsHeld,
    totalCorpusDeposits,
    totalSecurityDeposits,
  }

  const reportData: SocietyReportData = {
    society: {
      id: society.id,
      name: society.name,
      code: society.code,
      currencySymbol: "₹",
      address: societyDetails?.address,
      city: societyDetails?.city,
      state: societyDetails?.state,
      pincode: societyDetails?.pincode,
      registrationNumber: societyDetails?.registrationNumber,
      panNumber: societyDetails?.panNumber,
      gstin: societyDetails?.gstin,
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
      totalFixedAssetsBookValue,
      totalReserves,
      defaultersCount: defaulters.length,
      totalFlatsCount: flats.length,
      defaulterRate:
        flats.length > 0 ? Math.round((defaulters.length / flats.length) * 100) : 0,
      totalVendorPayables,
      totalMemberDepositsHeld,
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
    fixedAssets: fixedAssetsRaw.map((a) => ({
      id: a.id,
      name: a.name,
      assetCode: a.assetCode,
      categoryName: a.category?.name || "General Asset",
      location: a.location,
      purchaseCost: Number(a.purchaseCost ?? 0),
      currentBookValue: Number(a.currentBookValue ?? a.purchaseCost ?? 0),
      amcVendorName: a.amcVendor?.companyName || a.amcVendor?.name || null,
      status: a.status,
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
    balanceSheet,
    budgetVariance,
    statutory: {
      shares: shareCertificatesRaw.map((s) => ({
        id: s.id,
        flatNumber: s.flat.number,
        blockName: s.flat.block.name,
        memberName: s.person.name,
        certificateNumber: s.certificateNumber,
        sharesCount: s.sharesCount,
        distinctiveNumbers:
          s.shareDistinctFrom && s.shareDistinctTo
            ? `${s.shareDistinctFrom} to ${s.shareDistinctTo}`
            : `1 to ${s.sharesCount}`,
        faceValueTotal: Number(s.faceValuePerShare ?? 50) * s.sharesCount,
        issueDate: s.issueDate.toISOString(),
        status: s.status,
      })),
      votingList,
      nominations: nominationsRaw.map((n) => ({
        id: n.id,
        flatNumber: n.flat.number,
        blockName: n.flat.block.name,
        memberName: n.person.name,
        nomineeName: n.nomineeName,
        relationship: n.relationship,
        percentageShare: Number(n.percentageShare),
        nominationDate: n.nominationDate.toISOString(),
        status: n.status,
      })),
      propertyLiens: propertyLiensRaw.map((l) => ({
        id: l.id,
        flatNumber: l.flat.number,
        blockName: l.flat.block.name,
        memberName: l.person.name,
        bankName: l.bankName,
        loanAccountNumber: l.loanAccountNumber,
        sanctionAmount: l.sanctionAmount ? Number(l.sanctionAmount) : null,
        nocIssuedDate: l.nocIssuedDate ? l.nocIssuedDate.toISOString() : null,
        nocReference: l.nocReference,
        status: l.status,
      })),
    },
    vendorAging,
    cheques: chequesRaw.map((c) => ({
      id: c.id,
      chequeNumber: c.chequeNumber,
      direction: c.direction,
      partyName: c.partyName,
      bankName: c.bankName,
      accountName: c.account.name,
      amount: Number(c.amount),
      status: c.status,
      chequeDate: c.chequeDate.toISOString(),
      clearedOn: c.clearedOn ? c.clearedOn.toISOString() : null,
      bouncedReason: c.bouncedReason,
      bounceCharges: Number(c.bounceCharges ?? 0),
    })),
    unitLedger,
    oneTimeFunds,
    blocks: Array.from(blocksSet).sort(),
    financialYears: financialYearsRaw.map((fy) => ({
      id: fy.id,
      name: fy.name,
      startYear: fy.startYear,
      endYear: fy.endYear,
      isCurrent: fy.isCurrent,
    })),
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 sm:py-8 md:px-8">
      <AdminPageHeader
        eyebrow="Financial Intelligence & Audit"
        title="Reports & Analytics"
        description={`Comprehensive financial audit, Balance Sheet, statutory registers, and expenditure statements for ${society.name}.`}
      />

      <SocietyReportsClient data={reportData} />
    </div>
  )
}
