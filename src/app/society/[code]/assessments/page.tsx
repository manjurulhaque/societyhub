import { notFound } from "next/navigation"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { prisma } from "@/lib/prisma"
import { AdminPageHeader } from "@/components/admin"
import { AssessmentsClientView, type AssessmentCampaignItem } from "./AssessmentsClientView"
import { COMMITTEE_ROLES } from "@/lib/auth/requireAuth"
import type { SocietyRole } from "@/generated/prisma/client"

export default async function SocietyAssessmentsPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const context = await getSocietyAdmin(code)

  if (!context) {
    notFound()
  }

  const { society, designation, isSuperAdmin } = context
  const canManage = isSuperAdmin || COMMITTEE_ROLES.includes(designation as SocietyRole)

  const [rawCampaigns, totalFlatsCount] = await Promise.all([
    prisma.oneTimeCollection.findMany({
      where: { societyId: society.id },
      include: {
        allocations: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.flat.count({
      where: {
        block: { societyId: society.id },
        deletedAt: null,
      },
    }),
  ])

  const campaigns: AssessmentCampaignItem[] = rawCampaigns.map((c) => {
    const totalAllocated = c.allocations.reduce((sum, a) => sum + Number(a.totalAmount), 0)
    const totalCollected = c.allocations.reduce((sum, a) => sum + Number(a.paidAmount), 0)
    const totalOutstanding = c.allocations.reduce((sum, a) => sum + Number(a.balanceAmount), 0)
    const paidFlatsCount = c.allocations.filter((a) => a.status === "PAID").length

    return {
      id: c.id,
      title: c.title,
      description: c.description,
      totalTargetAmount: c.totalTargetAmount ? Number(c.totalTargetAmount) : null,
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
      totalAllocated,
      totalCollected,
      totalOutstanding,
      totalFlats: c.allocations.length,
      paidFlatsCount,
    }
  })

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Capital Fund Drives"
        title="Special Assessments & Sinking Funds"
        description={`Manage targeted capital improvement campaigns, one-time drives, and installment collections for ${society.name}.`}
      />

      <AssessmentsClientView
        societyCode={code}
        currencySymbol={society.currencySymbol || "₹"}
        campaigns={campaigns}
        totalFlatsCount={totalFlatsCount}
        canManage={canManage}
      />
    </div>
  )
}
