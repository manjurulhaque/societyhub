import { notFound } from "next/navigation"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import {
  requireCommitteeAccess,
  COMMITTEE_ROLES,
  EXECUTIVE_ROLES,
  FINANCIAL_ROLES,
} from "@/lib/auth/requireAuth"
import { prisma } from "@/lib/prisma"
import {
  BudgetsClientView,
  type BudgetView,
  type BudgetItemView,
} from "./BudgetsClientView"
import type { SocietyRole } from "@/generated/prisma/client"

export default async function SocietyBudgetsPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const context = await getSocietyAdmin(code)

  if (!context) {
    notFound()
  }

  // Ensure user has committee access
  await requireCommitteeAccess(code, COMMITTEE_ROLES)

  const { society, designation, isSuperAdmin } = context

  const canManage =
    isSuperAdmin ||
    EXECUTIVE_ROLES.includes(designation as SocietyRole) ||
    FINANCIAL_ROLES.includes(designation as SocietyRole)

  // Fetch all budgets, financial years, ledgers, and posted journal entries in parallel
  const [dbBudgets, dbFinancialYears, dbLedgers, postedJournals] = await Promise.all([
    prisma.budget.findMany({
      where: { societyId: society.id },
      orderBy: [
        { financialYear: { startYear: "desc" } },
        { createdAt: "desc" },
      ],
      include: {
        financialYear: true,
        items: {
          include: {
            ledger: true,
          },
          orderBy: { ledger: { name: "asc" } },
        },
      },
    }),

    prisma.financialYear.findMany({
      where: { societyId: society.id },
      orderBy: { startYear: "desc" },
      select: {
        id: true,
        name: true,
        startYear: true,
        endYear: true,
        startDate: true,
        endDate: true,
        isCurrent: true,
        isLocked: true,
      },
    }),

    prisma.ledger.findMany({
      where: {
        societyId: society.id,
        isActive: true,
        deletedAt: null,
      },
      orderBy: [
        { group: "asc" },
        { code: "asc" },
        { name: "asc" },
      ],
      select: {
        id: true,
        name: true,
        code: true,
        group: true,
      },
    }),

    prisma.journalEntry.findMany({
      where: {
        societyId: society.id,
        status: "POSTED",
      },
      select: {
        entryDate: true,
        entries: {
          select: {
            ledgerId: true,
            debit: true,
            credit: true,
          },
        },
      },
    }),
  ])

  // Build an in-memory lookup for fast calculation of actual spent per (ledgerId, FY date range)
  const budgets: BudgetView[] = dbBudgets.map((b) => {
    const fyStartDate = b.financialYear.startDate
    const fyEndDate = b.financialYear.endDate

    let budgetTotalAllocated = 0
    let budgetTotalUtilized = 0
    let overBudgetCount = 0

    const items: BudgetItemView[] = b.items.map((item) => {
      const allocated = Number(item.allocatedAmount ?? 0)
      budgetTotalAllocated += allocated

      // Calculate actual posted ledger expense inside this FY
      let actualSpent = 0
      for (const journal of postedJournals) {
        if (journal.entryDate >= fyStartDate && journal.entryDate <= fyEndDate) {
          for (const entry of journal.entries) {
            if (entry.ledgerId === item.ledgerId) {
              const debit = Number(entry.debit ?? 0)
              const credit = Number(entry.credit ?? 0)
              actualSpent += debit - credit
            }
          }
        }
      }

      budgetTotalUtilized += actualSpent

      const remaining = allocated - actualSpent
      const rate = allocated > 0 ? (actualSpent / allocated) * 100 : 0

      let varianceStatus: BudgetItemView["varianceStatus"] = "WITHIN_BUDGET"
      if (actualSpent > allocated) {
        varianceStatus = "EXCEEDED_BUDGET"
        overBudgetCount++
      } else if (rate >= 85) {
        varianceStatus = "APPROACHING_LIMIT"
      }

      return {
        id: item.id,
        ledgerId: item.ledgerId,
        ledgerName: item.ledger?.name || "Operating Head",
        ledgerCode: item.ledger?.code || null,
        ledgerGroup: item.ledger?.group || "EXPENSE",
        allocatedAmount: allocated,
        actualUtilizedAmount: actualSpent,
        remainingBalance: remaining,
        utilizationRate: rate,
        varianceStatus,
      }
    })

    const remainingTotal = budgetTotalAllocated - budgetTotalUtilized
    const overallRate =
      budgetTotalAllocated > 0 ? (budgetTotalUtilized / budgetTotalAllocated) * 100 : 0

    return {
      id: b.id,
      name: b.name,
      financialYearId: b.financialYearId,
      financialYearName: b.financialYear.name,
      financialYearStartYear: b.financialYear.startYear,
      isCurrentFY: b.financialYear.isCurrent,
      isLocked: b.financialYear.isLocked,
      totalAllocated: budgetTotalAllocated,
      totalUtilized: budgetTotalUtilized,
      remainingTotal,
      utilizationRate: overallRate,
      overBudgetCount,
      createdAt: b.createdAt.toISOString(),
      items,
    }
  })

  const formattedFinancialYears = dbFinancialYears.map((fy) => ({
    id: fy.id,
    name: fy.name,
    isCurrent: fy.isCurrent,
    isLocked: fy.isLocked,
  }))

  const formattedLedgers = dbLedgers.map((l) => ({
    id: l.id,
    name: l.name,
    code: l.code,
    group: l.group,
  }))

  return (
    <BudgetsClientView
      societyCode={code}
      societyName={society.name}
      budgets={budgets}
      financialYears={formattedFinancialYears}
      ledgers={formattedLedgers}
      canManage={canManage}
    />
  )
}
