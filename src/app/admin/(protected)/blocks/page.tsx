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

export default async function BlocksPage() {
  const [blocks, totalSocietiesCount, totalFlatsCount, occupiedFlatsCount] = await Promise.all([
    prisma.block.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: [
        { society: { name: "asc" } },
        { name: "asc" },
      ],
      include: {
        society: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        flats: {
          where: { isActive: true, deletedAt: null },
          select: {
            id: true,
            status: true,
          },
        },
        _count: {
          select: {
            flats: true,
          },
        },
      },
    }),
    prisma.society.count({
      where: { isActive: true, deletedAt: null },
    }),
    prisma.flat.count({
      where: { isActive: true, deletedAt: null },
    }),
    prisma.flat.count({
      where: { status: "OCCUPIED", isActive: true, deletedAt: null },
    }),
  ])

  const totalBlocks = blocks.length
  const avgUnitsPerBlock = totalBlocks > 0 ? Math.round(totalFlatsCount / totalBlocks) : 0

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-6 py-8 md:px-8">
      {/* Header */}
      <AdminPageHeader
        eyebrow="Property Structure"
        title="Blocks & Towers"
        description="Manage building wings, towers, and structural blocks across all housing societies."
        action={
          <AdminButton href="/admin/blocks/new" variant="primary" size="md">
            + New Block
          </AdminButton>
        }
      />

      {/* KPI Overview */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          title="Total Blocks / Towers"
          value={totalBlocks}
          subtitle={`Across ${totalSocietiesCount} societies`}
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />

        <AdminStatCard
          title="Total Configured Flats"
          value={totalFlatsCount}
          subtitle={`Average ${avgUnitsPerBlock} units per block`}
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          }
        />

        <AdminStatCard
          title="Occupied Units"
          value={occupiedFlatsCount}
          subtitle={`${totalFlatsCount > 0 ? Math.round((occupiedFlatsCount / totalFlatsCount) * 100) : 0}% occupancy rate`}
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Active Societies"
          value={totalSocietiesCount}
          subtitle="Configured residential complexes"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
            </svg>
          }
        />
      </div>

      {/* Blocks Table */}
      {blocks.length === 0 ? (
        <AdminEmptyState
          title="No blocks or wings created yet"
          description="Create your first building block or wing to start organizing flats and residents."
          action={
            <AdminButton href="/admin/blocks/new" variant="primary">
              + Create First Block
            </AdminButton>
          }
        />
      ) : (
        <AdminTable
          headers={[
            "Block / Tower",
            "Society Name",
            "Society Code",
            "Total Units",
            "Occupancy",
            "Created Date",
            "Actions",
          ]}
          rows={blocks.map((block) => {
            const blockTotalFlats = block._count.flats
            const blockOccupiedFlats = block.flats.filter((f) => f.status === "OCCUPIED").length
            const occupancyPct =
              blockTotalFlats > 0 ? Math.round((blockOccupiedFlats / blockTotalFlats) * 100) : 0

            return (
              <tr
                key={block.id}
                className="border-t border-stone-100 transition-colors hover:bg-stone-50/70"
              >
                {/* Block Name */}
                <td className="px-4 py-3.5 font-bold text-stone-950 text-sm">
                  {block.name}
                </td>

                {/* Society Name */}
                <td className="px-4 py-3.5 text-xs text-stone-800">
                  <Link
                    href={`/admin/societies/${block.society.id}`}
                    className="font-medium hover:text-stone-600 underline-offset-2 hover:underline"
                  >
                    {block.society.name}
                  </Link>
                </td>

                {/* Society Code */}
                <td className="px-4 py-3.5">
                  {block.society.code ? (
                    <AdminBadge variant="neutral" size="sm">
                      {block.society.code}
                    </AdminBadge>
                  ) : (
                    <span className="text-xs text-stone-400">—</span>
                  )}
                </td>

                {/* Total Flats */}
                <td className="px-4 py-3.5 text-xs font-semibold text-stone-900">
                  {blockTotalFlats} {blockTotalFlats === 1 ? "Unit" : "Units"}
                </td>

                {/* Occupancy */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <AdminBadge
                      variant={occupancyPct > 0 ? "success" : "neutral"}
                      size="sm"
                      dot
                    >
                      {blockOccupiedFlats} / {blockTotalFlats} ({occupancyPct}%)
                    </AdminBadge>
                  </div>
                </td>

                {/* Created Date */}
                <td className="px-4 py-3.5 text-xs text-stone-500">
                  {formatDateInAppTimeZone(block.createdAt)}
                </td>

                {/* Actions */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <AdminButton
                      href={`/society/${block.society.code || block.society.id}/flats`}
                      variant="outline"
                      size="xs"
                    >
                      View Flats →
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
