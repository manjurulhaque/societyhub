import { notFound } from "next/navigation"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { prisma } from "@/lib/prisma"
import { AdminPageHeader } from "@/components/admin"
import { RatesClientView, type MaintenanceRateItem } from "./RatesClientView"
import { COMMITTEE_ROLES } from "@/lib/auth/requireAuth"
import type { SocietyRole } from "@/generated/prisma/client"

export default async function SocietyMaintenanceRatesPage({
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

  const rawRates = await prisma.maintenanceRate.findMany({
    where: { societyId: society.id },
    orderBy: [
      { effectiveFrom: "desc" },
      { createdAt: "desc" },
    ],
  })

  const rates: MaintenanceRateItem[] = rawRates.map((r) => ({
    id: r.id,
    maintenanceType: r.maintenanceType,
    ratePerSqft: r.ratePerSqft ? Number(r.ratePerSqft) : null,
    fixedRate: r.fixedRate ? Number(r.fixedRate) : null,
    unitType: r.unitType,
    effectiveFrom: r.effectiveFrom.toISOString(),
    effectiveUpto: r.effectiveUpto ? r.effectiveUpto.toISOString() : null,
    isCurrent: r.isCurrent,
    approvedInMeeting: r.approvedInMeeting,
    remarks: r.remarks,
  }))

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Billing & Tariff Master"
        title="Maintenance Tariff Rules"
        description={`Define statutory base maintenance rates, per-sqft formulas, and unit-level rate overrides for ${society.name}.`}
      />

      <RatesClientView
        societyCode={code}
        currencySymbol={society.currencySymbol || "₹"}
        rates={rates}
        canManage={canManage}
      />
    </div>
  )
}
