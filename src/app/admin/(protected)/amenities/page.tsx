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

export default async function AdminAmenitiesPage() {
  const [amenities, bookingAggregate, depositHeldAggregate, totalAmenitiesCount] =
    await Promise.all([
      prisma.amenity.findMany({
        where: { isActive: true, deletedAt: null },
        orderBy: [
          { society: { name: "asc" } },
          { name: "asc" },
        ],
        include: {
          society: {
            select: { id: true, name: true, code: true },
          },
          _count: {
            select: { bookings: true },
          },
        },
      }),
      prisma.facilityBooking.aggregate({
        _sum: { rentAmount: true },
        _count: { _all: true },
      }),
      prisma.facilityBooking.aggregate({
        where: { isDepositRefunded: false },
        _sum: { depositAmount: true },
      }),
      prisma.amenity.count({ where: { isActive: true, deletedAt: null } }),
    ])

  const totalRentRevenue = Number(bookingAggregate._sum.rentAmount ?? 0)
  const totalBookingsCount = bookingAggregate._count._all
  const cautionDepositsHeld = Number(depositHeldAggregate._sum.depositAmount ?? 0)

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-6 py-8 md:px-8">
      {/* Header */}
      <AdminPageHeader
        eyebrow="Community & Facilities"
        title="Amenities & Facility Bookings"
        description="Directory of shared society clubhouses, party lawns, swimming pools, tennis courts, and resident event reservations."
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          title="Configured Amenities"
          value={totalAmenitiesCount}
          subtitle="Clubhouses, halls & sports facilities"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />

        <AdminStatCard
          title="Facility Reservations"
          value={totalBookingsCount}
          subtitle="Resident bookings processed"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Booking Revenue"
          value={`₹${totalRentRevenue.toLocaleString("en-IN")}`}
          subtitle="Total rent collected"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Caution Deposits Held"
          value={`₹${cautionDepositsHeld.toLocaleString("en-IN")}`}
          subtitle="Refundable security deposits"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        />
      </div>

      {/* Amenities Table */}
      {amenities.length === 0 ? (
        <AdminEmptyState
          title="No amenities configured yet"
          description="Housing societies can configure their shared clubhouses, halls, and lawns from their society portals."
        />
      ) : (
        <AdminTable
          headers={[
            "Amenity Facility & Type",
            "Housing Society",
            "Default Rent (₹)",
            "Caution Deposit (₹)",
            "Max Capacity",
            "Reservations",
            "Actions",
          ]}
          rows={amenities.map((a) => {
            const society = a.society

            return (
              <tr
                key={a.id}
                className="border-t border-stone-100 transition-colors hover:bg-stone-50/70"
              >
                {/* Amenity Name & Type */}
                <td className="px-4 py-3.5">
                  <span className="font-bold text-stone-950 text-sm block">
                    {a.name}
                  </span>
                  <div className="mt-1">
                    <AdminBadge variant="info" size="sm">
                      {a.type.replace(/_/g, " ")}
                    </AdminBadge>
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

                {/* Default Rent */}
                <td className="px-4 py-3.5 text-xs font-bold text-stone-950">
                  ₹{Number(a.defaultRent).toLocaleString("en-IN")}
                </td>

                {/* Caution Deposit */}
                <td className="px-4 py-3.5 text-xs font-medium text-stone-700">
                  ₹{Number(a.defaultDeposit).toLocaleString("en-IN")}
                </td>

                {/* Capacity */}
                <td className="px-4 py-3.5 text-xs text-stone-600">
                  {a.capacity ? `${a.capacity} guests` : <span className="text-stone-400">—</span>}
                </td>

                {/* Bookings Count */}
                <td className="px-4 py-3.5 text-xs font-bold text-stone-900">
                  {a._count.bookings} bookings
                </td>

                {/* Actions */}
                <td className="px-4 py-3.5">
                  <AdminButton
                    href={`/society/${society.code || society.id}/bookings`}
                    variant="outline"
                    size="xs"
                  >
                    Booking Ledger ↗
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
