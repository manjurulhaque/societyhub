import { notFound } from "next/navigation"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { prisma } from "@/lib/prisma"
import { AdminPageHeader } from "@/components/admin"
import { SocietySettingsForm } from "./SocietySettingsForm"

export default async function SocietySettingsPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const context = await getSocietyAdmin(code)

  if (!context) {
    notFound()
  }

  const { society: currentSociety } = context

  const society = await prisma.society.findUnique({
    where: { id: currentSociety.id },
  })

  if (!society) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-8 md:px-8">
      <AdminPageHeader
        eyebrow="Configuration"
        title="Society Settings"
        description={`Update statutory registration, official address, and maintenance calculation parameters for ${society.name}.`}
      />

      <SocietySettingsForm
        currentCode={code}
        society={{
          id: society.id,
          name: society.name,
          code: society.code,
          societyType: society.societyType,
          phone: society.phone,
          email: society.email,
          address: society.address,
          city: society.city,
          state: society.state,
          pincode: society.pincode,
          registrationNumber: society.registrationNumber,
          panNumber: society.panNumber,
          tanNumber: society.tanNumber,
          gstin: society.gstin,
          maintenanceType: society.maintenanceType,
          fixedRate: society.fixedRate ? Number(society.fixedRate) : null,
          ratePerSqft: society.ratePerSqft ? Number(society.ratePerSqft) : null,
          billGenerationDay: society.billGenerationDay,
          dueDayOfMonth: society.dueDayOfMonth,
          gracePeriodDays: society.gracePeriodDays,
          lateFeeRate: society.lateFeeRate ? Number(society.lateFeeRate) : null,
          invoicePrefix: society.invoicePrefix,
          receiptPrefix: society.receiptPrefix,
        }}
      />
    </div>
  )
}
