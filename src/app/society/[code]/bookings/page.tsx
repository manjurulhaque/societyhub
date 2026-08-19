import Link from "next/link"
import { notFound } from "next/navigation"
import { revalidatePath } from "next/cache"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { prisma } from "@/lib/prisma"
import { formatDateInAppTimeZone } from "@/lib/datetime"
import type { BookingStatus, PaymentMode } from "@/generated/prisma/client"

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

  const { society } = context

  const [bookings, amenities, flats, people] = await Promise.all([
    prisma.facilityBooking.findMany({
      where: { societyId: society.id },
      orderBy: { bookingDate: "desc" },
      include: {
        amenity: { select: { name: true, type: true } },
        flat: {
          select: {
            number: true,
            block: { select: { name: true } },
          },
        },
        person: { select: { name: true, phone: true } },
      },
    }),
    prisma.amenity.findMany({
      where: { societyId: society.id, isActive: true, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, defaultRent: true, defaultDeposit: true },
    }),
    prisma.flat.findMany({
      where: { block: { societyId: society.id }, isActive: true, deletedAt: null },
      orderBy: [{ block: { name: "asc" } }, { number: "asc" }],
      select: {
        id: true,
        number: true,
        block: { select: { name: true } },
      },
    }),
    prisma.person.findMany({
      where: { societyId: society.id, isActive: true, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ])

  const totalRentCollected = bookings.reduce(
    (acc, b) => acc + Number(b.rentAmount),
    0
  )
  const cautionHeld = bookings
    .filter((b) => !b.isDepositRefunded && b.status !== "CANCELLED")
    .reduce((acc, b) => acc + Number(b.depositAmount), 0)

  const confirmedCount = bookings.filter((b) => b.status === "CONFIRMED").length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href={`/society/${code}/amenities`}
              className="text-xs font-semibold text-stone-500 hover:text-stone-900 transition"
            >
              ← Amenity Catalogue
            </Link>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-stone-900 md:text-3xl">
            Facility Bookings & Reservations
          </h1>
          <p className="text-sm text-stone-500">
            Resident event reservations, clubhouse rentals, caution deposits, and scheduling for {society.name}.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
            Total Facility Rent Revenue
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">
            ₹{totalRentCollected.toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            {bookings.length} reservations processed
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
            Caution Deposits Held
          </p>
          <p className="mt-2 text-2xl font-bold text-amber-800">
            ₹{cautionHeld.toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            Refundable after post-event inspection
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
            Active / Confirmed Events
          </p>
          <p className="mt-2 text-2xl font-bold text-stone-950">
            {confirmedCount}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            Scheduled upcoming reservations
          </p>
        </div>
      </div>

      {/* Reserve Facility Form */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-stone-950 mb-1">
          + Reserve Facility / New Booking
        </h2>
        <p className="text-xs text-stone-500 mb-5">
          Schedule clubhouse banquet, party lawn, or guest suite for a resident flat.
        </p>

        <form action={createBooking} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <input type="hidden" name="societyId" value={society.id} />
          <input type="hidden" name="code" value={code} />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Select Amenity *
            </label>
            <select
              name="amenityId"
              required
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            >
              <option value="">Select facility...</option>
              {amenities.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} (Rent: ₹{Number(a.defaultRent)}, Dep: ₹{Number(a.defaultDeposit)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Flat / Unit *
            </label>
            <select
              name="flatId"
              required
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            >
              <option value="">Select flat...</option>
              {flats.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.block.name} - Flat {f.number}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Resident / Host *
            </label>
            <select
              name="personId"
              required
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            >
              <option value="">Select resident...</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Event Title / Occasion *
            </label>
            <input
              type="text"
              name="eventTitle"
              required
              placeholder="e.g. 1st Birthday Party / Sangeet Ceremony"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Event Date *
            </label>
            <input
              type="date"
              name="bookingDate"
              required
              defaultValue={new Date().toISOString().split("T")[0]}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Rent Amount (₹) *
            </label>
            <input
              type="number"
              step="0.01"
              name="rentAmount"
              required
              placeholder="e.g. 5000"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs font-bold text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Caution Deposit (₹)
            </label>
            <input
              type="number"
              step="0.01"
              name="depositAmount"
              defaultValue="0"
              placeholder="e.g. 2000"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs font-medium text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Payment Mode *
            </label>
            <select
              name="paymentMode"
              defaultValue="UPI"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            >
              <option value="UPI">UPI / QR</option>
              <option value="BANK">Bank Transfer (NEFT)</option>
              <option value="CHEQUE">Cheque</option>
              <option value="CASH">Cash</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Remarks / Special Instructions
            </label>
            <input
              type="text"
              name="remarks"
              placeholder="e.g. 50 chairs needed, catering service vendor entry approved"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-xl bg-stone-950 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-stone-800"
            >
              Confirm Reservation
            </button>
          </div>
        </form>
      </div>

      {/* Bookings Table */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-stone-200 bg-stone-50 px-6 py-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-stone-900">Reservations Register</h2>
          <span className="text-xs text-stone-500">{bookings.length} bookings</span>
        </div>

        {bookings.length === 0 ? (
          <div className="p-12 text-center text-xs text-stone-500">
            No reservations made yet. Schedule your first facility booking above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-stone-200 bg-stone-50/50 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-4 py-3">Facility & Occasion</th>
                  <th className="px-4 py-3">Flat & Host</th>
                  <th className="px-4 py-3">Event Date</th>
                  <th className="px-4 py-3 text-right">Rent (₹)</th>
                  <th className="px-4 py-3 text-right">Deposit (₹)</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Caution Deposit Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-stone-50/70 transition">
                    <td className="px-4 py-3.5">
                      <span className="font-bold text-stone-950 text-xs block">
                        {b.amenity.name}
                      </span>
                      <span className="text-[11px] text-stone-500">
                        {b.eventTitle || "Event"}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-stone-800">
                      <p className="font-semibold">{b.flat.block.name} - Flat {b.flat.number}</p>
                      <p className="text-[10px] text-stone-500">{b.person.name}</p>
                    </td>

                    <td className="px-4 py-3.5 text-stone-700 font-medium">
                      {formatDateInAppTimeZone(b.bookingDate)}
                    </td>

                    <td className="px-4 py-3.5 text-right font-bold text-emerald-700">
                      ₹{Number(b.rentAmount).toLocaleString("en-IN")}
                    </td>

                    <td className="px-4 py-3.5 text-right font-bold text-stone-900">
                      ₹{Number(b.depositAmount).toLocaleString("en-IN")}
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          b.status === "CONFIRMED"
                            ? "bg-blue-50 border border-blue-200 text-blue-700"
                            : b.status === "COMPLETED"
                              ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                              : "bg-stone-100 text-stone-700"
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      {Number(b.depositAmount) > 0 ? (
                        b.isDepositRefunded ? (
                          <span className="inline-flex rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            Refunded ✓
                          </span>
                        ) : (
                          <form action={refundDeposit} className="inline-block">
                            <input type="hidden" name="bookingId" value={b.id} />
                            <input type="hidden" name="code" value={code} />
                            <button
                              type="submit"
                              className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-800 hover:bg-amber-100 transition shadow-sm"
                            >
                              Refund Deposit ✓
                            </button>
                          </form>
                        )
                      ) : (
                        <span className="text-[10px] text-stone-400">No deposit</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

import { requireSocietyAccess } from "@/lib/auth/requireAuth"
import { recordAuditLog } from "@/lib/audit"

async function createBooking(formData: FormData) {
  "use server"

  const code = formData.get("code")?.toString().trim()
  if (!code) throw new Error("Society code is required")

  const authContext = await requireSocietyAccess(code)
  const verifiedSocietyId = authContext.society.id

  const amenityId = formData.get("amenityId")?.toString().trim()
  const flatId = formData.get("flatId")?.toString().trim()
  const personId = formData.get("personId")?.toString().trim()
  const eventTitle = formData.get("eventTitle")?.toString().trim()
  const bookingDateStr = formData.get("bookingDate")?.toString().trim()
  const rawRent = formData.get("rentAmount")?.toString().trim()
  const rawDeposit = formData.get("depositAmount")?.toString().trim()
  const paymentMode = formData.get("paymentMode")?.toString().trim() || "UPI"
  const remarks = formData.get("remarks")?.toString().trim() || null

  if (!amenityId || !flatId || !personId || !eventTitle || !bookingDateStr || !rawRent) {
    throw new Error("All required booking fields must be filled")
  }

  // Validate amenity belongs to this society
  const amenity = await prisma.amenity.findFirst({
    where: { id: amenityId, societyId: verifiedSocietyId },
  })
  if (!amenity) {
    throw new Error("Amenity not found for this society")
  }

  // Validate flat belongs to this society
  const flat = await prisma.flat.findFirst({
    where: { id: flatId, block: { societyId: verifiedSocietyId } },
  })
  if (!flat) {
    throw new Error("Flat not found for this society")
  }

  const rentAmount = parseFloat(rawRent)
  const depositAmount = rawDeposit ? parseFloat(rawDeposit) : 0

  const booking = await prisma.facilityBooking.create({
    data: {
      societyId: verifiedSocietyId,
      amenityId,
      flatId,
      personId,
      eventTitle,
      bookingDate: new Date(bookingDateStr),
      rentAmount: !isNaN(rentAmount) ? rentAmount : 0,
      depositAmount: !isNaN(depositAmount) ? depositAmount : 0,
      paymentMode: paymentMode as PaymentMode,
      status: "CONFIRMED" as BookingStatus,
      remarks,
    },
  })

  await recordAuditLog({
    societyId: verifiedSocietyId,
    userId: authContext.user.id,
    action: "CREATE",
    entity: "FacilityBooking",
    entityId: booking.id,
    description: `${authContext.user.email} created facility booking for ${eventTitle}`,
    newData: { eventTitle, amenityId, flatId, rentAmount, depositAmount },
  })

  revalidatePath(`/society/${code}/bookings`)
  revalidatePath(`/society/${code}/amenities`)
  revalidatePath("/admin/amenities")
}

async function refundDeposit(formData: FormData) {
  "use server"

  const code = formData.get("code")?.toString().trim()
  const bookingId = formData.get("bookingId")?.toString().trim()

  if (!code || !bookingId) return

  const authContext = await requireSocietyAccess(code)
  const verifiedSocietyId = authContext.society.id

  // Verify booking belongs to this society (IDOR prevention)
  const booking = await prisma.facilityBooking.findFirst({
    where: { id: bookingId, societyId: verifiedSocietyId },
  })

  if (!booking) {
    throw new Error("Booking record not found for this society")
  }

  await prisma.facilityBooking.update({
    where: { id: bookingId },
    data: {
      isDepositRefunded: true,
      depositRefundedOn: new Date(),
    },
  })

  await recordAuditLog({
    societyId: verifiedSocietyId,
    userId: authContext.user.id,
    action: "UPDATE",
    entity: "FacilityBooking",
    entityId: bookingId,
    description: `${authContext.user.email} marked deposit as refunded for booking ${booking.eventTitle}`,
  })

  revalidatePath(`/society/${code}/bookings`)
  revalidatePath("/admin/amenities")
}

