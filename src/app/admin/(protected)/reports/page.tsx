import { prisma } from "@/lib/prisma"
import {
  AdminPageHeader,
  AdminStatCard,
} from "@/components/admin"
import { AdminReportsClient, type AdminReportData } from "./AdminReportsClient"

export default async function ReportsPage() {
  const [
    billAggregate,
    paymentAggregate,
    expenseAggregate,
    billsByCategoryRaw,
    paymentsByModeRaw,
    societiesWithFinancials,
    recentPaymentsRaw,
    totalFlatsCount,
    occupiedFlatsCount,
  ] = await Promise.all([
    prisma.bill.aggregate({
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.payment.aggregate({
      where: { status: "SUCCESS" },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.expense.aggregate({
      where: { status: "PAID" },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.bill.groupBy({
      by: ["billType"],
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.payment.groupBy({
      by: ["mode"],
      where: { status: "SUCCESS" },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.society.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { name: "asc" },
      include: {
        blocks: {
          select: {
            id: true,
            flats: {
              select: {
                id: true,
                status: true,
                bills: {
                  select: {
                    amount: true,
                    lateFeeAmount: true,
                    payments: {
                      where: { status: "SUCCESS" },
                      select: { amount: true },
                    },
                  },
                },
              },
            },
          },
        },
        bills: {
          select: {
            amount: true,
            lateFeeAmount: true,
            status: true,
          },
        },
        payments: {
          where: { status: "SUCCESS" },
          select: {
            amount: true,
          },
        },
        _count: {
          select: {
            people: true,
            members: true,
            blocks: true,
          },
        },
      },
    }),
    prisma.payment.findMany({
      where: { status: "SUCCESS" },
      orderBy: { createdAt: "desc" },
      take: 15,
      include: {
        society: {
          select: { id: true, name: true, code: true },
        },
        paidBy: {
          select: { name: true },
        },
        bill: {
          select: {
            month: true,
            year: true,
            flat: { select: { number: true, block: { select: { name: true } } } },
          },
        },
      },
    }),
    prisma.flat.count({
      where: { isActive: true, deletedAt: null },
    }),
    prisma.flat.count({
      where: { status: "OCCUPIED", isActive: true, deletedAt: null },
    }),
  ])

  const totalBilled = Number(billAggregate._sum.amount ?? 0)
  const totalCollected = Number(paymentAggregate._sum.amount ?? 0)
  const totalExpenses = Number(expenseAggregate._sum.amount ?? 0)
  const totalOutstanding = Math.max(0, totalBilled - totalCollected)
  const collectionRate =
    totalBilled === 0 ? 0 : Math.min(100, Math.round((totalCollected / totalBilled) * 100))

  const billsByCategory = billsByCategoryRaw.map((b) => {
    const amount = Number(b._sum.amount ?? 0)
    return {
      billType: b.billType,
      amount,
      count: b._count._all,
      percentage: totalBilled > 0 ? Math.round((amount / totalBilled) * 100) : 0,
    }
  })

  const paymentsByMode = paymentsByModeRaw.map((p) => {
    const amount = Number(p._sum.amount ?? 0)
    return {
      mode: p.mode,
      amount,
      count: p._count._all,
      percentage: totalCollected > 0 ? Math.round((amount / totalCollected) * 100) : 0,
    }
  })

  const societies: AdminReportData["societies"] = societiesWithFinancials.map((society) => {
    const societyBilled = society.bills.reduce(
      (acc, b) => acc + Number(b.amount ?? 0) + Number(b.lateFeeAmount ?? 0),
      0
    )
    const societyCollected = society.payments.reduce(
      (acc, p) => acc + Number(p.amount ?? 0),
      0
    )
    const societyOutstanding = Math.max(0, societyBilled - societyCollected)
    const societyRate =
      societyBilled === 0
        ? 0
        : Math.min(100, Math.round((societyCollected / societyBilled) * 100))

    let flatsCount = 0
    let occupiedCount = 0
    let defaultersCount = 0

    for (const block of society.blocks) {
      for (const flat of block.flats) {
        flatsCount += 1
        if (flat.status === "OCCUPIED") occupiedCount += 1

        const flatBilled = flat.bills.reduce(
          (sum, b) => sum + Number(b.amount ?? 0) + Number(b.lateFeeAmount ?? 0),
          0
        )
        const flatPaid = flat.bills.reduce(
          (sum, b) =>
            sum + b.payments.reduce((psum, p) => psum + Number(p.amount ?? 0), 0),
          0
        )
        if (flatBilled - flatPaid > 0) {
          defaultersCount += 1
        }
      }
    }

    const riskTier: AdminReportData["societies"][0]["riskTier"] =
      societyRate >= 80 ? "HEALTHY" : societyRate >= 50 ? "MODERATE" : "CRITICAL"

    return {
      id: society.id,
      name: society.name,
      code: society.code,
      blocksCount: society._count.blocks,
      flatsCount,
      occupiedCount,
      totalBilled: societyBilled,
      totalCollected: societyCollected,
      totalOutstanding: societyOutstanding,
      collectionRate: societyRate,
      defaultersCount,
      riskTier,
    }
  })

  const recentPayments = recentPaymentsRaw.map((p) => ({
    id: p.id,
    receiptNumber: p.receiptNumber,
    societyId: p.society.id,
    societyName: p.society.name,
    societyCode: p.society.code,
    residentName: p.paidBy?.name || "Resident",
    flatNumber: p.bill?.flat?.number || null,
    amount: Number(p.amount ?? 0),
    mode: p.mode,
    createdAt: p.createdAt.toISOString(),
  }))

  const reportData: AdminReportData = {
    summary: {
      totalBilled,
      totalCollected,
      totalOutstanding,
      collectionRate,
      totalInvoicesCount: billAggregate._count._all,
      totalPaymentsCount: paymentAggregate._count._all,
      totalExpenses,
      totalExpensesCount: expenseAggregate._count._all,
      totalSocieties: societiesWithFinancials.length,
      totalFlats: totalFlatsCount,
      totalOccupiedFlats: occupiedFlatsCount,
    },
    societies,
    billsByCategory,
    paymentsByMode,
    recentPayments,
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 sm:py-8 md:px-8">
      {/* Header */}
      <AdminPageHeader
        eyebrow="Platform Analytics & Intelligence"
        title="Reports & Financial Analytics"
        description="Comprehensive audit of platform receivables, collection efficiency, society balance sheets, and revenue streams."
      />

      {/* KPI Overview */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <AdminStatCard
          title="Total Billed"
          value={`₹${totalBilled.toLocaleString("en-IN")}`}
          subtitle={`${billAggregate._count._all} Total invoices issued`}
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Total Collections"
          value={`₹${totalCollected.toLocaleString("en-IN")}`}
          subtitle={`${paymentAggregate._count._all} Receipts recorded`}
          icon={
            <svg className="h-5 w-5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Outstanding Receivables"
          value={`₹${totalOutstanding.toLocaleString("en-IN")}`}
          subtitle="Pending across all societies"
          icon={
            <svg className="h-5 w-5 text-rose-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Collection Rate"
          value={`${collectionRate}%`}
          trend={{
            value: `${collectionRate}%`,
            direction: collectionRate >= 80 ? "up" : "down",
            label: collectionRate >= 80 ? "Healthy recovery" : "Needs attention",
          }}
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Platform Expenses"
          value={`₹${totalExpenses.toLocaleString("en-IN")}`}
          subtitle={`${expenseAggregate._count._all} Total expense vouchers`}
          icon={
            <svg className="h-5 w-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Total Housing Units"
          value={totalFlatsCount}
          subtitle={`${societiesWithFinancials.length} Societies (${occupiedFlatsCount} Occupied)`}
          icon={
            <svg className="h-5 w-5 text-indigo-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />
      </div>

      {/* Interactive Client View */}
      <AdminReportsClient data={reportData} />
    </div>
  )
}
