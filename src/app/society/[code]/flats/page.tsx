import { notFound } from "next/navigation"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { prisma } from "@/lib/prisma"
import { AdminPageHeader, AdminTable, AdminBadge } from "@/components/admin"

export default async function SocietyFlatsPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const context = await getSocietyAdmin(code)

  if (!context) {
    notFound()
  }

  const { society } = context

  const flats = await prisma.flat.findMany({
    where: {
      block: {
        societyId: society.id,
      },
      isActive: true,
      deletedAt: null,
    },
    orderBy: [
      { block: { name: "asc" } },
      { number: "asc" },
    ],
    include: {
      block: {
        select: {
          name: true,
        },
      },
      people: {
        where: {
          toDate: null,
        },
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
  })

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-8 md:px-8">
      <AdminPageHeader
        eyebrow="Properties"
        title="Flats & Units"
        description={`List of all residential and commercial units registered in ${society.name}.`}
      />

      {flats.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-300 bg-white p-12 text-center shadow-sm">
          <p className="text-sm font-semibold text-stone-900">No flats found</p>
          <p className="mt-1 text-xs text-stone-500">
            No flats or blocks have been configured in this society yet.
          </p>
        </div>
      ) : (
        <AdminTable
          headers={["Flat Number", "Block", "Floor", "Unit Type", "Area", "Status", "Current Occupants"]}
          rows={flats.map((flat) => {
            const occupantNames = flat.people
              .map((p) => p.person.name)
              .filter(Boolean)
              .join(", ")

            return (
              <tr key={flat.id} className="border-t border-stone-100 hover:bg-stone-50/60">
                <td className="px-4 py-3 font-semibold text-stone-950 text-xs">
                  {flat.number}
                </td>
                <td className="px-4 py-3 text-stone-700 text-xs">{flat.block.name}</td>
                <td className="px-4 py-3 text-stone-600 text-xs">{flat.floor ?? "—"}</td>
                <td className="px-4 py-3 text-stone-600 text-xs">{flat.unitType ?? "—"}</td>
                <td className="px-4 py-3 text-stone-600 text-xs">
                  {flat.area ? `${flat.area} ${flat.areaUnit}` : "—"}
                </td>
                <td className="px-4 py-3">
                  <AdminBadge
                    variant={flat.status === "OCCUPIED" ? "success" : "neutral"}
                    size="sm"
                    dot
                  >
                    {flat.status}
                  </AdminBadge>
                </td>
                <td className="px-4 py-3 text-stone-700 text-xs">
                  {occupantNames || <span className="text-stone-400">None assigned</span>}
                </td>
              </tr>
            )
          })}
        />
      )}
    </div>
  )
}
