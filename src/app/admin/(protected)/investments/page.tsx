import Link from "next/link"
import { prisma } from "@/lib/prisma"
import {
  AdminPageHeader,
  AdminTable,
  AdminBadge,
  AdminStatCard,
  AdminButton,
  AdminEmptyState,
} from "@/components/admin"
import { formatDateInAppTimeZone } from "@/lib/datetime"

export default async function AdminInvestmentsPage() {
  const [
    fixedDeposits,
    principalAggregate,
    maturityAggregate,
    activeCount,
    maturedCount,
  ] = await Promise.all([
    prisma.fixedDeposit.findMany({
      orderBy: { maturityDate: "asc" },
      include: {
        society: {
          select: { id: true, name: true, code: true },
        },
      },
    }),
    prisma.fixedDeposit.aggregate({
      where: { status: "ACTIVE" },
      _sum: { principalAmount: true },
    }),
    prisma.fixedDeposit.aggregate({
      where: { status: "ACTIVE" },
      _sum: { maturityAmount: true },
    }),
    prisma.fixedDeposit.count({ where: { status: "ACTIVE" } }),
    prisma.fixedDeposit.count({ where: { status: "MATURED" } }),
  ])

  const totalPrincipal = Number(principalAggregate._sum.principalAmount ?? 0)
  const totalMaturity = Number(maturityAggregate._sum.maturityAmount ?? 0)
  const projectedEarnings = Math.max(0, totalMaturity - totalPrincipal)

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-6 py-8 md:px-8">
      {/* Header */}
      <AdminPageHeader
        eyebrow="Treasury & Reserves"
        title="Fixed Deposits & Investments"
        description="Audit ledger of society sinking funds, capital reserves, and fixed deposit investments placed with scheduled banks."
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          title="Active FD Principal"
          value={`₹${totalPrincipal.toLocaleString("en-IN")}`}
          subtitle={`${activeCount} active fixed deposits`}
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Projected Maturity Corpus"
          value={`₹${totalMaturity.toLocaleString("en-IN")}`}
          subtitle="At scheduled maturity dates"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />

        <AdminStatCard
          title="Accrued / Projected Interest"
          value={`₹${projectedEarnings.toLocaleString("en-IN")}`}
          subtitle="Total interest yield"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Matured / Settled FDs"
          value={maturedCount}
          subtitle="Completed term deposits"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Fixed Deposits Table */}
      {fixedDeposits.length === 0 ? (
        <AdminEmptyState
          title="No fixed deposits registered yet"
          description="Housing societies can invest their sinking and reserve funds into fixed deposits from their society portals."
        />
      ) : (
        <AdminTable
          headers={[
            "FD Certificate & Bank",
            "Housing Society",
            "Principal (₹)",
            "Interest Rate",
            "Maturity Value (₹)",
            "Maturity Date",
            "Status",
            "Actions",
          ]}
          rows={fixedDeposits.map((fd) => {
            const society = fd.society

            return (
              <tr
                key={fd.id}
                className="border-t border-stone-100 transition-colors hover:bg-stone-50/70"
              >
                {/* FD # & Bank */}
                <td className="px-4 py-3.5">
                  <span className="font-mono font-bold text-stone-950 text-sm block">
                    {fd.fdNumber}
                  </span>
                  <div className="text-xs text-stone-600">
                    <span>{fd.bankName}</span>
                    {fd.branch ? <span> ({fd.branch})</span> : null}
                  </div>
                </td>

                {/* Society */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/admin/societies/${society.id}`}
                      className="text-xs font-medium text-stone-900 hover:underline truncate max-w-[130px]"
                      title={society.name}
                    >
                      {society.name}
                    </Link>
                    {society.code ? (
                      <AdminBadge variant="neutral" size="sm">
                        {society.code}
                      </AdminBadge>
                    ) : null}
                  </div>
                </td>

                {/* Principal */}
                <td className="px-4 py-3.5 text-xs font-bold text-stone-950">
                  ₹{Number(fd.principalAmount).toLocaleString("en-IN")}
                </td>

                {/* Interest Rate */}
                <td className="px-4 py-3.5 text-xs font-bold text-emerald-700">
                  {Number(fd.interestRate)}% p.a.
                  <span className="text-[10px] text-stone-500 font-normal block">
                    {fd.interestPayout.toLowerCase().replace(/_/g, " ")}
                  </span>
                </td>

                {/* Maturity Value */}
                <td className="px-4 py-3.5 text-xs font-bold text-stone-950">
                  ₹{Number(fd.maturityAmount).toLocaleString("en-IN")}
                </td>

                {/* Maturity Date */}
                <td className="px-4 py-3.5 text-xs text-stone-700">
                  {formatDateInAppTimeZone(fd.maturityDate)}
                </td>

                {/* Status */}
                <td className="px-4 py-3.5">
                  <AdminBadge
                    variant={
                      fd.status === "ACTIVE"
                        ? "success"
                        : fd.status === "MATURED"
                          ? "info"
                          : "neutral"
                    }
                    size="sm"
                    dot
                  >
                    {fd.status}
                  </AdminBadge>
                </td>

                {/* Actions */}
                <td className="px-4 py-3.5">
                  <AdminButton
                    href={`/society/${society.code || society.id}/investments`}
                    variant="outline"
                    size="xs"
                  >
                    Society Portfolio ↗
                  </AdminButton>
                </td>
              </tr>
            )
          })}
        />
      )}
    </div>
  )
}
