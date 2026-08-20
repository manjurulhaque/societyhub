import { notFound } from "next/navigation"
import Link from "next/link"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import {
  requireCommitteeAccess,
  COMMITTEE_ROLES,
  EXECUTIVE_ROLES,
  FINANCIAL_ROLES,
} from "@/lib/auth/requireAuth"
import { prisma } from "@/lib/prisma"
import { AdminPageHeader } from "@/components/admin"
import {
  FinancialYearsClientView,
} from "./FinancialYearsClientView"
import type { FinancialYearItem } from "./FinancialYearModal"
import type { SocietyRole } from "@/generated/prisma/client"

export default async function FinancialYearsPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const context = await getSocietyAdmin(code)

  if (!context) {
    notFound()
  }

  // Ensure committee access
  await requireCommitteeAccess(code, COMMITTEE_ROLES)

  const { society, designation, isSuperAdmin } = context

  const canManage =
    isSuperAdmin ||
    EXECUTIVE_ROLES.includes(designation as SocietyRole) ||
    FINANCIAL_ROLES.includes(designation as SocietyRole)

  // Fetch all financial years for this society with relational counts
  const dbYears = await prisma.financialYear.findMany({
    where: { societyId: society.id },
    orderBy: { startYear: "desc" },
    include: {
      _count: {
        select: {
          journalEntries: true,
          budgets: true,
          maintenanceRegisters: true,
        },
      },
    },
  })

  const financialYears: FinancialYearItem[] = dbYears.map((fy) => ({
    id: fy.id,
    name: fy.name,
    startYear: fy.startYear,
    endYear: fy.endYear,
    startDate: fy.startDate.toISOString(),
    endDate: fy.endDate.toISOString(),
    isCurrent: fy.isCurrent,
    isLocked: fy.isLocked,
    isClosed: fy.isClosed,
    lockedAt: fy.lockedAt ? fy.lockedAt.toISOString() : null,
    lockedBy: fy.lockedBy,
    journalCount: fy._count.journalEntries,
    budgetCount: fy._count.budgets,
    registerCount: fy._count.maintenanceRegisters,
  }))

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-8 md:px-8">
      {/* Top Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-stone-500">
        <Link
          href={`/society/${code}/settings`}
          className="hover:text-stone-900 transition flex items-center gap-1"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Society Settings
        </Link>
        <span>/</span>
        <span className="font-semibold text-stone-900">Financial Years</span>
      </div>

      <AdminPageHeader
        eyebrow="Accounting Cycles & Governance"
        title="Financial Years & Accounting Periods"
        description={`Define fiscal years, set the active billing cycle, and enforce statutory audit freeze protections for ${society.name}.`}
      />

      <FinancialYearsClientView
        societyCode={code}
        societyName={society.name}
        financialYears={financialYears}
        canManage={canManage}
      />
    </div>
  )
}
