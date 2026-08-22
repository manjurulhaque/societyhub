import { notFound } from "next/navigation"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { prisma } from "@/lib/prisma"
import { AdminPageHeader } from "@/components/admin"
import { BookingsClientView, type BookingListItem } from "./BookingsClientView"
import { COMMITTEE_ROLES } from "@/lib/auth/requireAuth"
import type { SocietyRole } from "@/generated/prisma/client"

export default async function SocietyBookingsPage({
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

  const [rawBookings, rawAmenities, rawFlats, rawPeople] = await Promise.all([
    prisma.facilityBooking.findMany({
      where: { societyId: society.id },
      include: {
        amenity: true,
        flat: { include: { block: true } },
        person: true,
      },
      orderBy: { bookingDate: "desc" },
    }),
    prisma.amenity.findMany({
      where: { societyId: society.id, isActive: true, deletedAt: null },
      orderBy: { name: "asc" },
    }),
    prisma.flat.findMany({
      where: { block: { societyId: society.id }, isActive: true, deletedAt: null },
      include: { block: true },
      orderBy: [{ block: { name: "asc" } }, { number: "asc" }],
    }),
    prisma.person.findMany({
      where: { societyId: society.id, isActive: true, deletedAt: null },
      orderBy: { name: "asc" },
    }),
  ])

  const bookings: BookingListItem[] = rawBookings.map((b) => ({
    id: b.id,
    amenityId: b.amenityId,
    amenityName: b.amenity.name,
    flatId: b.flatId,
    flatNumber: b.flat.number,
    blockName: b.flat.block.name,
    personName: b.person.name,
    personPhone: b.person.phone,
    eventTitle: b.eventTitle,
    bookingDate: b.bookingDate.toISOString(),
    startTime: b.startTime ? b.startTime.toISOString() : null,
    endTime: b.endTime ? b.endTime.toISOString() : null,
    rentAmount: Number(b.rentAmount),
    depositAmount: Number(b.depositAmount),
    isDepositRefunded: b.isDepositRefunded,
    depositRefundedOn: b.depositRefundedOn ? b.depositRefundedOn.toISOString() : null,
    status: b.status,
    receiptNumber: b.receiptNumber,
    paymentMode: b.paymentMode,
    remarks: b.remarks,
  }))

  const amenityOptions = rawAmenities.map((a) => ({
    id: a.id,
    name: a.name,
    defaultRent: Number(a.defaultRent),
    defaultDeposit: Number(a.defaultDeposit),
  }))

  const flatOptions = rawFlats.map((f) => ({
    id: f.id,
    number: f.number,
    blockName: f.block.name,
  }))

  const personOptions = rawPeople.map((p) => ({
    id: p.id,
    name: p.name,
  }))

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Community Infrastructure"
        title="Facility Bookings & Reservations"
        description={`Resident clubhouse reservations, event hall bookings, caution deposits, and scheduling for ${society.name}.`}
      />

      <BookingsClientView
        societyCode={code}
        currencySymbol={society.currencySymbol || "₹"}
        bookings={bookings}
        amenities={amenityOptions}
        flats={flatOptions}
        people={personOptions}
        canManage={canManage}
      />
    </div>
  )
}
