import { notFound } from "next/navigation"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { prisma } from "@/lib/prisma"
import { AdminPageHeader } from "@/components/admin"
import { AmenitiesClientView, type AmenityListItem } from "./AmenitiesClientView"
import { COMMITTEE_ROLES } from "@/lib/auth/requireAuth"
import type { SocietyRole, AmenityType } from "@/generated/prisma/client"

const DEFAULT_AMENITIES = [
  {
    name: "Clubhouse Banquet Hall",
    type: "CLUBHOUSE" as AmenityType,
    description: "Air-conditioned indoor community hall for birthday parties, family gatherings, and AGM meetings.",
    defaultRent: 5000,
    defaultDeposit: 2000,
    capacity: 150,
  },
  {
    name: "Rooftop Party Lawn",
    type: "PARTY_LAWN" as AmenityType,
    description: "Open-air landscaped party terrace with lighting, sound points, and food serving counters.",
    defaultRent: 4000,
    defaultDeposit: 1500,
    capacity: 200,
  },
  {
    name: "Guest Suite 1 (Air-Conditioned)",
    type: "GUEST_ROOM" as AmenityType,
    description: "Furnished guest room with attached washroom for visiting family and friends of residents.",
    defaultRent: 1500,
    defaultDeposit: 500,
    capacity: 4,
  },
  {
    name: "Swimming Pool & Deck",
    type: "SWIMMING_POOL" as AmenityType,
    description: "Swimming pool area reservation for private training sessions or pool-side functions.",
    defaultRent: 2500,
    defaultDeposit: 1000,
    capacity: 40,
  },
]

export default async function SocietyAmenitiesPage({
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
  const canManage = isSuperAdmin || COMMITTEE_ROLES.includes(designation as SocietyRole)

  // Auto-provision standard amenities if none exist
  const existingCount = await prisma.amenity.count({
    where: { societyId: society.id },
  })

  if (existingCount === 0) {
    for (const a of DEFAULT_AMENITIES) {
      await prisma.amenity.create({
        data: {
          societyId: society.id,
          name: a.name,
          type: a.type,
          description: a.description,
          defaultRent: a.defaultRent,
          defaultDeposit: a.defaultDeposit,
          capacity: a.capacity,
        },
      })
    }
  }

  const [rawAmenities, rawBookings] = await Promise.all([
    prisma.amenity.findMany({
      where: { societyId: society.id, isActive: true, deletedAt: null },
      include: {
        _count: { select: { bookings: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.facilityBooking.findMany({
      where: { societyId: society.id },
    }),
  ])

  const amenities: AmenityListItem[] = rawAmenities.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    description: a.description,
    defaultRent: Number(a.defaultRent),
    defaultDeposit: Number(a.defaultDeposit),
    capacity: a.capacity,
    isActive: a.isActive,
    totalBookingsCount: a._count.bookings,
  }))

  const totalRevenue = rawBookings.reduce((sum, b) => sum + Number(b.rentAmount), 0)
  const activeCautionHeld = rawBookings
    .filter((b) => !b.isDepositRefunded && b.status !== "CANCELLED")
    .reduce((sum, b) => sum + Number(b.depositAmount), 0)

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Community Infrastructure"
        title="Amenities & Facilities"
        description={`Manage society clubhouse halls, party lawns, guest rooms, and rental pricing for ${society.name}.`}
      />

      <AmenitiesClientView
        societyCode={code}
        currencySymbol={society.currencySymbol || "₹"}
        amenities={amenities}
        totalBookings={rawBookings.length}
        totalRevenue={totalRevenue}
        activeCautionHeld={activeCautionHeld}
        canManage={canManage}
      />
    </div>
  )
}
