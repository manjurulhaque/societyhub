import { notFound } from "next/navigation"
import Link from "next/link"
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
    include: {
      financialYears: {
        where: { isCurrent: true },
        select: { id: true, name: true, startYear: true, endYear: true },
      },
    },
  })

  if (!society) {
    notFound()
  }

  const currentFY = society.financialYears[0]

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-8 md:px-8">
      <AdminPageHeader
        eyebrow="Configuration"
        title="Society Settings"
        description={`Update statutory registration, official address, and maintenance calculation parameters for ${society.name}.`}
      />

      {/* Sub-module Navigation Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href={`/society/${code}/settings/financial-years`}
          className="group relative flex items-center justify-between rounded-3xl border border-stone-200 bg-white p-5 shadow-xs hover:border-stone-900 hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 transition group-hover:scale-105">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-stone-950 group-hover:text-amber-700 transition">
                  Financial Years & Periods
                </h3>
                {currentFY && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    {currentFY.name}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-stone-500">
                Manage accounting cycles, active FY, and statutory audit locks
              </p>
            </div>
          </div>
          <svg className="h-5 w-5 text-stone-400 group-hover:translate-x-1 group-hover:text-stone-900 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        <Link
          href={`/society/${code}/roles`}
          className="group relative flex items-center justify-between rounded-3xl border border-stone-200 bg-white p-5 shadow-xs hover:border-stone-900 hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-stone-100 text-stone-800 transition group-hover:scale-105">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-950 group-hover:text-stone-700 transition">
                Roles & Permissions
              </h3>
              <p className="mt-0.5 text-xs text-stone-500">
                Configure RBAC policies, custom committee roles, and access grants
              </p>
            </div>
          </div>
          <svg className="h-5 w-5 text-stone-400 group-hover:translate-x-1 group-hover:text-stone-900 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

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

