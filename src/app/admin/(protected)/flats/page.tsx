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

export default async function FlatsPage() {
  const [flats, occupiedCount, vacantCount, totalAreaAggregate] = await Promise.all([
    prisma.flat.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: [
        { block: { society: { name: "asc" } } },
        { block: { name: "asc" } },
        { number: "asc" },
      ],
      include: {
        block: {
          select: {
            id: true,
            name: true,
            society: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
        people: {
          where: { toDate: null },
          include: {
            person: {
              select: {
                name: true,
                phone: true,
              },
            },
          },
        },
      },
    }),
    prisma.flat.count({
      where: { status: "OCCUPIED", isActive: true, deletedAt: null },
    }),
    prisma.flat.count({
      where: { status: "VACANT", isActive: true, deletedAt: null },
    }),
    prisma.flat.aggregate({
      where: { isActive: true, deletedAt: null },
      _sum: { area: true },
    }),
  ])

  const totalFlats = flats.length
  const totalArea = Number(totalAreaAggregate._sum.area ?? 0)
  const occupancyRate = totalFlats > 0 ? Math.round((occupiedCount / totalFlats) * 100) : 0

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-6 py-8 md:px-8">
      {/* Header */}
      <AdminPageHeader
        eyebrow="Inventory Management"
        title="Units & Flats"
        description="Comprehensive directory of residential flats, commercial units, and occupancy records across all societies."
        action={
          <AdminButton href="/admin/flats/new" variant="primary" size="md">
            + New Flat
          </AdminButton>
        }
      />

      {/* KPI Overview */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          title="Total Units / Flats"
          value={totalFlats}
          subtitle="Registered across all societies"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />

        <AdminStatCard
          title="Occupied Units"
          value={occupiedCount}
          subtitle={`${occupancyRate}% occupancy rate`}
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Vacant Units"
          value={vacantCount}
          subtitle="Available for possession/lease"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Total Area Managed"
          value={`${totalArea.toLocaleString("en-IN")} sqft`}
          subtitle="Combined carpet/super area"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          }
        />
      </div>

      {/* Flats Table */}
      {flats.length === 0 ? (
        <AdminEmptyState
          title="No units or flats created yet"
          description="Add your first flat or unit to start assigning owners, tenants, and generating maintenance invoices."
          action={
            <AdminButton href="/admin/flats/new" variant="primary">
              + Create First Flat
            </AdminButton>
          }
        />
      ) : (
        <AdminTable
          headers={[
            "Flat / Unit",
            "Block & Society",
            "Unit Type",
            "Area",
            "Occupancy Status",
            "Current Occupant(s)",
            "Parking / Intercom",
            "Actions",
          ]}
          rows={flats.map((flat) => {
            const occupantNames = flat.people
              .map((p) => p.person.name)
              .filter(Boolean)
              .join(", ")

            const society = flat.block.society

            return (
              <tr
                key={flat.id}
                className="border-t border-stone-100 transition-colors hover:bg-stone-50/70"
              >
                {/* Flat Number & Floor */}
                <td className="px-4 py-3.5">
                  <span className="font-bold text-stone-950 text-sm block">
                    {flat.number}
                  </span>
                  {flat.floor !== null ? (
                    <span className="text-[11px] text-stone-500">
                      Floor {flat.floor}
                    </span>
                  ) : null}
                </td>

                {/* Block & Society */}
                <td className="px-4 py-3.5">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-stone-900 block">
                      {flat.block.name}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/admin/societies/${society.id}`}
                        className="text-xs text-stone-600 hover:text-stone-900 underline-offset-2 hover:underline truncate max-w-[150px]"
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
                  </div>
                </td>

                {/* Unit Type */}
                <td className="px-4 py-3.5">
                  {flat.unitType ? (
                    <AdminBadge variant="purple" size="sm">
                      {flat.unitType.replace(/_/g, " ")}
                    </AdminBadge>
                  ) : (
                    <span className="text-xs text-stone-400">—</span>
                  )}
                </td>

                {/* Area */}
                <td className="px-4 py-3.5 text-xs text-stone-700 font-medium">
                  {flat.area ? `${Number(flat.area).toLocaleString("en-IN")} ${flat.areaUnit}` : "—"}
                </td>

                {/* Occupancy Status */}
                <td className="px-4 py-3.5">
                  <AdminBadge
                    variant={
                      flat.status === "OCCUPIED"
                        ? "success"
                        : flat.status === "UNDER_RENOVATION"
                          ? "warning"
                          : "neutral"
                    }
                    size="sm"
                    dot
                  >
                    {flat.status.replace(/_/g, " ")}
                  </AdminBadge>
                </td>

                {/* Current Occupants */}
                <td className="px-4 py-3.5 text-xs text-stone-800 max-w-xs truncate" title={occupantNames}>
                  {occupantNames || <span className="text-stone-400">None assigned</span>}
                </td>

                {/* Parking & Intercom */}
                <td className="px-4 py-3.5 text-xs text-stone-600">
                  {flat.parkingSlot ? (
                    <span className="font-mono text-stone-800 block">🅿️ {flat.parkingSlot}</span>
                  ) : null}
                  {flat.intercomNumber ? (
                    <span className="text-stone-500 block">Ext: {flat.intercomNumber}</span>
                  ) : null}
                  {!flat.parkingSlot && !flat.intercomNumber ? (
                    <span className="text-stone-400">—</span>
                  ) : null}
                </td>

                {/* Actions */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <AdminButton
                      href={`/society/${society.code || society.id}/flats`}
                      variant="outline"
                      size="xs"
                    >
                      Society Portal ↗
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
