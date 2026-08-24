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

export default async function SocietiesPage() {
  const [societies, totalFlatsCount] = await Promise.all([
    prisma.society.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        blocks: {
          select: {
            id: true,
            _count: {
              select: { flats: true },
            },
          },
        },
        _count: {
          select: {
            members: true,
            blocks: true,
            people: true,
            bills: true,
            payments: true,
          },
        },
      },
    }),
    prisma.flat.count({
      where: { isActive: true, deletedAt: null },
    }),
  ])

  const totalSocieties = societies.length
  const totalBlocks = societies.reduce((acc, s) => acc + s._count.blocks, 0)
  const totalPeople = societies.reduce((acc, s) => acc + s._count.people, 0)
  const totalMembers = societies.reduce((acc, s) => acc + s._count.members, 0)

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-6 py-8 md:px-8">
      {/* Header */}
      <AdminPageHeader
        eyebrow="Platform Management"
        title="Housing Societies"
        description="Onboard, configure, and manage housing societies and apartment associations on SARWS Connect."
        action={
          <AdminButton href="/admin/societies/new" variant="primary" size="md">
            + New Society
          </AdminButton>
        }
      />

      {/* KPI Overview */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          title="Total Societies"
          value={totalSocieties}
          subtitle="Active tenant organizations"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />

        <AdminStatCard
          title="Total Units / Flats"
          value={totalFlatsCount}
          subtitle={`Across ${totalBlocks} blocks & wings`}
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          }
        />

        <AdminStatCard
          title="Total Residents"
          value={totalPeople}
          subtitle="Registered owners & tenants"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Committee & Staff"
          value={totalMembers}
          subtitle="Authorized society managers"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        />
      </div>

      {/* Societies List / Table */}
      {societies.length === 0 ? (
        <AdminEmptyState
          title="No housing societies found"
          description="Get started by creating your first housing society or apartment association on SARWS Connect."
          action={
            <AdminButton href="/admin/societies/new" variant="primary">
              + Create First Society
            </AdminButton>
          }
        />
      ) : (
        <AdminTable
          headers={[
            "Society / Organization",
            "Code",
            "Location",
            "Maintenance Rule",
            "Blocks & Flats",
            "Residents",
            "Actions",
          ]}
          rows={societies.map((society) => {
            const flatsInSociety = society.blocks.reduce(
              (acc, b) => acc + b._count.flats,
              0
            )

            const locationText =
              [society.city, society.state].filter(Boolean).join(", ") ||
              society.address ||
              "—"

            const maintenanceDisplay =
              society.maintenanceType === "FIXED" && society.fixedRate
                ? `₹${Number(society.fixedRate).toLocaleString("en-IN")}/mo`
                : society.maintenanceType === "PER_SQFT" && society.ratePerSqft
                  ? `₹${Number(society.ratePerSqft)}/sqft`
                  : society.maintenanceType

            return (
              <tr
                key={society.id}
                className="border-t border-stone-100 transition-colors hover:bg-stone-50/70"
              >
                {/* Society Name & Type */}
                <td className="px-4 py-3.5">
                  <div className="space-y-1">
                    <Link
                      href={`/admin/societies/${society.id}`}
                      className="font-bold text-stone-950 hover:text-stone-700 text-sm block"
                    >
                      {society.name}
                    </Link>
                    <AdminBadge variant="purple" size="sm">
                      {society.societyType.replace(/_/g, " ")}
                    </AdminBadge>
                  </div>
                </td>

                {/* Code */}
                <td className="px-4 py-3.5">
                  {society.code ? (
                    <AdminBadge variant="neutral" size="sm">
                      {society.code}
                    </AdminBadge>
                  ) : (
                    <span className="text-xs text-stone-400">—</span>
                  )}
                </td>

                {/* Location */}
                <td className="px-4 py-3.5 text-xs text-stone-600 max-w-xs truncate" title={locationText}>
                  {locationText}
                </td>

                {/* Maintenance */}
                <td className="px-4 py-3.5">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-stone-900 block">
                      {maintenanceDisplay}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-stone-400">
                      {society.maintenanceType}
                    </span>
                  </div>
                </td>

                {/* Blocks & Flats */}
                <td className="px-4 py-3.5 text-xs text-stone-700">
                  <span className="font-semibold text-stone-950">{society._count.blocks}</span> Blocks{" "}
                  <span className="text-stone-400">({flatsInSociety} Flats)</span>
                </td>

                {/* Residents */}
                <td className="px-4 py-3.5 text-xs text-stone-700">
                  <span className="font-semibold text-stone-950">{society._count.people}</span> Residents
                </td>

                {/* Actions */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <AdminButton
                      href={`/society/${society.code || society.id}/dashboard`}
                      variant="outline"
                      size="xs"
                    >
                      Portal ↗
                    </AdminButton>
                    <AdminButton
                      href={`/admin/societies/${society.id}`}
                      variant="secondary"
                      size="xs"
                    >
                      Manage
                    </AdminButton>
                  </div>
                </td>
              </tr>
            )
          })}
        />
      )}
    </div>
  )
}
