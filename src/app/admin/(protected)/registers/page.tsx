import Link from "next/link"
import { prisma } from "@/lib/prisma"
import {
  AdminPageHeader,
  AdminTable,
  AdminBadge,
  AdminStatCard,
  AdminButton,
  AdminCard,
} from "@/components/admin"

export default async function AdminRegistersPage() {
  const [
    totalSharesCount,
    totalNominationsCount,
    activeLiensCount,
    totalMeetingsCount,
    societies,
  ] = await Promise.all([
    prisma.shareCertificate.count(),
    prisma.nomination.count({ where: { status: "ACTIVE" } }),
    prisma.propertyLien.count({ where: { status: "ACTIVE" } }),
    prisma.meeting.count(),
    prisma.society.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            shareCertificates: true,
            nominations: true,
            propertyLiens: true,
            meetings: true,
          },
        },
      },
    }),
  ])

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-6 py-8 md:px-8">
      {/* Header */}
      <AdminPageHeader
        eyebrow="Bye-Laws & Governance"
        title="Statutory Registers Compliance"
        description="Comprehensive audit of statutory housing society books: 'I' Share Certificates Register, 'J' Form X Nominations, 'M' Mortgages & Bank NOCs, and AGM/MCM Meeting Minutes."
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          title="'I' Share Certificates"
          value={totalSharesCount}
          subtitle="Issued to flat owners"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />

        <AdminStatCard
          title="'J' Form X Nominations"
          value={totalNominationsCount}
          subtitle="Active member nominees"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />

        <AdminStatCard
          title="'M' Bank Mortgages / NOCs"
          value={activeLiensCount}
          subtitle="Active home loan liens"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Meeting Minutes & AGMs"
          value={totalMeetingsCount}
          subtitle="Recorded minutes of MCM & AGM"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          }
        />
      </div>

      {/* Society Compliance Table */}
      <AdminCard
        title="Statutory Governance by Society"
        description="Compliance status across all onboarded housing societies"
      >
        {societies.length === 0 ? (
          <p className="py-8 text-center text-xs text-stone-500">
            No societies onboarded yet.
          </p>
        ) : (
          <AdminTable
            headers={[
              "Housing Society",
              "Share Certificates ('I')",
              "Nominations ('J')",
              "Bank Liens ('M')",
              "Meetings & AGMs",
              "Actions",
            ]}
            rows={societies.map((s) => (
              <tr
                key={s.id}
                className="border-t border-stone-100 transition-colors hover:bg-stone-50/70"
              >
                {/* Society Name */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/societies/${s.id}`}
                      className="font-bold text-stone-950 text-sm hover:underline"
                    >
                      {s.name}
                    </Link>
                    {s.code ? (
                      <AdminBadge variant="neutral" size="sm">
                        {s.code}
                      </AdminBadge>
                    ) : null}
                  </div>
                </td>

                {/* Shares */}
                <td className="px-4 py-3.5 text-xs text-stone-800">
                  <span className="font-semibold">{s._count.shareCertificates}</span> issued
                </td>

                {/* Nominations */}
                <td className="px-4 py-3.5 text-xs text-stone-800">
                  <span className="font-semibold">{s._count.nominations}</span> filed
                </td>

                {/* Liens */}
                <td className="px-4 py-3.5 text-xs text-stone-800">
                  <span className="font-semibold">{s._count.propertyLiens}</span> bank NOCs
                </td>

                {/* Meetings */}
                <td className="px-4 py-3.5 text-xs text-stone-800">
                  <span className="font-semibold">{s._count.meetings}</span> minutes
                </td>

                {/* Actions */}
                <td className="px-4 py-3.5">
                  <AdminButton
                    href={`/society/${s.code || s.id}/registers`}
                    variant="outline"
                    size="xs"
                  >
                    Open Registers ↗
                  </AdminButton>
                </td>
              </tr>
            ))}
          />
        )}
      </AdminCard>
    </div>
  )
}
