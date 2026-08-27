import { notFound } from "next/navigation"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { prisma } from "@/lib/prisma"
import { AdminPageHeader } from "@/components/admin"
import { FlatsClientView, type FlatListItem } from "./FlatsClientView"
import { EXECUTIVE_ROLES } from "@/lib/auth/requireAuth"
import type { SocietyRole } from "@/generated/prisma/client"

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

  const { society, designation, isSuperAdmin } = context
  const canManageFlats =
    isSuperAdmin ||
    EXECUTIVE_ROLES.includes(designation as SocietyRole) ||
    designation === "MANAGER"

  const [blocksData, flatsData] = await Promise.all([
    prisma.block.findMany({
      where: {
        societyId: society.id,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    }),

    prisma.flat.findMany({
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
            id: true,
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
    }),
  ])

  const flats: FlatListItem[] = flatsData.map((flat) => ({
    id: flat.id,
    number: flat.number,
    floor: flat.floor,
    unitType: flat.unitType,
    status: flat.status,
    area: flat.area ? flat.area.toString() : null,
    areaUnit: flat.areaUnit,
    parkingSlot: flat.parkingSlot,
    intercomNumber: flat.intercomNumber,
    blockId: flat.block.id,
    blockName: flat.block.name,
    occupants: flat.people.map((p) => p.person.name).filter(Boolean),
  }))

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-8 md:px-8">
      <AdminPageHeader
        eyebrow="Properties & Units"
        title="Blocks & Flats"
        description={`Manage structural wings, residential apartments, shops, and occupancies for ${society.name}.`}
      />

      <FlatsClientView
        societyCode={code}
        flats={flats}
        blocks={blocksData}
        canManageFlats={canManageFlats}
      />
    </div>
  )
}
