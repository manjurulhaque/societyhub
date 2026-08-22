import Link from "next/link"
import { notFound } from "next/navigation"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { prisma } from "@/lib/prisma"
import { AdminBadge, AdminStatCard } from "@/components/admin"
import { AssessmentDetailClient, type FlatAllocationItem } from "./AssessmentDetailClient"
import { COMMITTEE_ROLES } from "@/lib/auth/requireAuth"
import type { SocietyRole } from "@/generated/prisma/client"

export default async function SocietyAssessmentDetailPage({
  params,
}: {
  params: Promise<{ code: string; id: string }>
}) {
  const { code, id } = await params
  const context = await getSocietyAdmin(code)

  if (!context) {
    notFound()
  }

  const { society, designation, isSuperAdmin } = context
  const canManage = isSuperAdmin || COMMITTEE_ROLES.includes(designation as SocietyRole)

  const campaign = await prisma.oneTimeCollection.findFirst({
    where: {
      id,
      societyId: society.id,
    },
    include: {
      allocations: {
        include: {
          flat: {
            include: {
              block: true,
              people: {
                where: { toDate: null },
                include: { person: true },
              },
            },
          },
          installments: {
            orderBy: { installmentNumber: "asc" },
          },
        },
        orderBy: [
          { flat: { block: { name: "asc" } } },
          { flat: { number: "asc" } },
        ],
      },
    },
  })

  if (!campaign) {
    notFound()
  }

  const currencySymbol = society.currencySymbol || "₹"

  // Aggregate totals
  const totalAllocated = campaign.allocations.reduce((sum, a) => sum + Number(a.totalAmount), 0)
  const totalCollected = campaign.allocations.reduce((sum, a) => sum + Number(a.paidAmount), 0)
  const totalOutstanding = campaign.allocations.reduce((sum, a) => sum + Number(a.balanceAmount), 0)
  const realizationRate = totalAllocated > 0 ? Math.round((totalCollected / totalAllocated) * 100) : 0

  const fullyPaidCount = campaign.allocations.filter((a) => a.status === "PAID").length

  // Block names
  const blockNames = Array.from(new Set(campaign.allocations.map((a) => a.flat.block.name))).sort()

  const flatAllocations: FlatAllocationItem[] = campaign.allocations.map((a) => {
    const primaryPerson =
      a.flat.people.find((p) => p.isPrimary)?.person.name ||
      a.flat.people[0]?.person.name ||
      "Unassigned"

    return {
      id: a.id,
      flatId: a.flatId,
      flatNumber: a.flat.number,
      blockName: a.flat.block.name,
      residentName: primaryPerson,
      area: a.flat.area ? Number(a.flat.area) : null,
      areaUnit: a.flat.areaUnit,
      totalAmount: Number(a.totalAmount),
      paidAmount: Number(a.paidAmount),
      balanceAmount: Number(a.balanceAmount),
      status: a.status,
      installments: a.installments.map((inst) => ({
        id: inst.id,
        installmentNumber: inst.installmentNumber,
        amount: Number(inst.amount),
        dueDate: inst.dueDate.toISOString(),
        paidAmount: Number(inst.paidAmount),
        status: inst.status,
        paidOn: inst.paidOn ? inst.paidOn.toISOString() : null,
      })),
    }
  })

  return (
    <div className="space-y-6">
      {/* Back Link & Header */}
      <div>
        <Link
          href={`/society/${code}/assessments`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900 transition mb-3"
        >
          <span>←</span>
          <span>Back to Special Assessments</span>
        </Link>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                Special Capital Assessment
              </span>
              <AdminBadge
                variant={
                  campaign.status === "ACTIVE"
                    ? "success"
                    : campaign.status === "COMPLETED"
                      ? "info"
                      : "neutral"
                }
                size="sm"
              >
                {campaign.status}
              </AdminBadge>
              <span className="rounded-md bg-stone-100 px-2 py-0.5 font-mono text-xs font-semibold text-stone-700">
                {campaign.calculationType === "PER_SQFT"
                  ? `₹${campaign.ratePerSqft}/sqft`
                  : `₹${campaign.fixedAmountPerFlat ? Number(campaign.fixedAmountPerFlat).toLocaleString("en-IN") : 0}/flat`}
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-stone-950 sm:text-2xl">
              {campaign.title}
            </h1>
            <p className="text-xs text-stone-500">
              Allocated across {campaign.allocations.length} society units • {campaign.paymentPlan === "ONE_TIME_ONLY" ? "Lump sum collection" : `${campaign.numberOfInstallments} monthly installments`}
            </p>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          title="Assessed Total"
          value={`${currencySymbol}${totalAllocated.toLocaleString("en-IN")}`}
          subtitle={`Target: ${campaign.totalTargetAmount ? `${currencySymbol}${Number(campaign.totalTargetAmount).toLocaleString("en-IN")}` : "Uncapped"}`}
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Realized Collections"
          value={`${currencySymbol}${totalCollected.toLocaleString("en-IN")}`}
          subtitle={`${realizationRate}% realized of assessed total`}
          icon={
            <svg className="h-5 w-5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Outstanding Balance"
          value={`${currencySymbol}${totalOutstanding.toLocaleString("en-IN")}`}
          subtitle="Pending across unpaid tranches"
          icon={
            <svg className="h-5 w-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Unit Compliance"
          value={`${fullyPaidCount} / ${campaign.allocations.length}`}
          subtitle="Flats with all tranches fully cleared"
          icon={
            <svg className="h-5 w-5 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Assessment Detail Client Container */}
      <AssessmentDetailClient
        societyCode={code}
        currencySymbol={currencySymbol}
        campaign={{
          id: campaign.id,
          title: campaign.title,
          description: campaign.description,
          totalTargetAmount: campaign.totalTargetAmount ? Number(campaign.totalTargetAmount) : null,
          calculationType: campaign.calculationType,
          ratePerSqft: campaign.ratePerSqft ? Number(campaign.ratePerSqft) : null,
          fixedAmountPerFlat: campaign.fixedAmountPerFlat ? Number(campaign.fixedAmountPerFlat) : null,
          paymentPlan: campaign.paymentPlan,
          numberOfInstallments: campaign.numberOfInstallments,
          startDate: campaign.startDate.toISOString(),
          dueDate: campaign.dueDate ? campaign.dueDate.toISOString() : null,
          status: campaign.status,
          approvedInMeeting: campaign.approvedInMeeting,
          remarks: campaign.remarks,
          totalAllocated,
          totalCollected,
          totalOutstanding,
          realizationRate,
        }}
        allocations={flatAllocations}
        blocks={blockNames}
        canManage={canManage}
      />
    </div>
  )
}
