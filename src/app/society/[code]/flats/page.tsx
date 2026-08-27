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
        isActive: true,
        _count: {
          select: {
            flats: {
              where: { deletedAt: null },
            },
          },
        },
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
                id: true,
                name: true,
                phone: true,
                email: true,
              },
            },
          },
        },
        bills: {
          select: {
            amount: true,
            status: true,
            payments: {
              where: { status: "SUCCESS" },
              select: { amount: true },
            },
          },
        },
        shareCertificate: {
          select: {
            certificateNumber: true,
          },
        },
      },
    }),
  ])

  const flats: FlatListItem[] = flatsData.map((flat) => {
    const totalBilled = flat.bills.reduce((sum, b) => sum + Number(b.amount), 0)
    const totalPaid = flat.bills.reduce((sum, b) => {
      const paid = b.payments.reduce((pSum, p) => pSum + Number(p.amount), 0)
      return sum + paid
    }, 0)

    const unpaidBills = flat.bills.filter(
      (b) => b.status === "PENDING" || b.status === "OVERDUE" || b.status === "PARTIALLY_PAID"
    )

    const unpaidDues = unpaidBills.reduce((sum, b) => {
      const paid = b.payments.reduce((pSum, p) => pSum + Number(p.amount), 0)
      return sum + Math.max(0, Number(b.amount) - paid)
    }, 0)

    const isDefaulter = unpaidDues > 0 && flat.bills.some((b) => b.status === "OVERDUE")

    return {
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
      occupantDetails: flat.people.map((p) => ({
        id: p.id,
        personId: p.person.id,
        name: p.person.name,
        role: p.role,
        phone: p.person.phone,
        email: p.person.email,
        isPrimary: p.isPrimary,
      })),
      unpaidDues,
      totalBilled,
      totalPaid,
      unpaidBillsCount: unpaidBills.length,
      isDefaulter,
      shareCertificateNumber: flat.shareCertificate?.certificateNumber || null,
    }
  })

  // Calculate block financial scorecard
  const enrichedBlocks = blocksData.map((b) => {
    const blockFlats = flats.filter((f) => f.blockId === b.id)
    const totalUnits = blockFlats.length
    const occupiedUnits = blockFlats.filter((f) => f.status === "OCCUPIED").length
    const totalBilled = blockFlats.reduce((sum, f) => sum + (f.totalBilled || 0), 0)
    const totalPaid = blockFlats.reduce((sum, f) => sum + (f.totalPaid || 0), 0)
    const totalOutstanding = blockFlats.reduce((sum, f) => sum + (f.unpaidDues || 0), 0)
    const defaultersCount = blockFlats.filter((f) => f.isDefaulter || (f.unpaidDues || 0) > 0).length
    const collectionRate = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 100
    const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0

    return {
      id: b.id,
      name: b.name,
      isActive: b.isActive,
      flatCount: b._count.flats,
      financialScorecard: {
        totalBilled,
        totalPaid,
        totalOutstanding,
        defaultersCount,
        collectionRate,
        totalUnits,
        occupiedUnits,
        occupancyRate,
      },
    }
  })

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
        blocks={enrichedBlocks}
        canManageFlats={canManageFlats}
      />
    </div>
  )
}
