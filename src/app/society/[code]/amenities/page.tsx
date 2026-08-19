import Link from "next/link"
import { notFound } from "next/navigation"
import { revalidatePath } from "next/cache"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { prisma } from "@/lib/prisma"
import type { AmenityType } from "@/generated/prisma/client"

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

  const { society } = context

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

  const amenities = await prisma.amenity.findMany({
    where: { societyId: society.id, isActive: true, deletedAt: null },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { bookings: true } },
    },
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="inline-flex items-center rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-stone-600">
            Community Infrastructure
          </span>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-stone-900 md:text-3xl">
            Amenities & Facilities
          </h1>
          <p className="text-sm text-stone-500">
            Manage society clubhouse halls, party lawns, guest rooms, and rental pricing for {society.name}.
          </p>
        </div>

        <Link
          href={`/society/${code}/bookings`}
          className="inline-flex items-center justify-center rounded-full bg-stone-950 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-stone-800"
        >
          View Bookings Ledger →
        </Link>
      </div>

      {/* Add Custom Amenity Form */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-stone-950 mb-1">
          + Add New Amenity / Facility
        </h2>
        <p className="text-xs text-stone-500 mb-5">
          Configure a rentable facility with default rent and caution deposit rules.
        </p>

        <form action={createAmenity} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <input type="hidden" name="societyId" value={society.id} />
          <input type="hidden" name="code" value={code} />

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Facility Name *
            </label>
            <input
              type="text"
              name="name"
              required
              placeholder="e.g. Squash Court / Terrace Gazebo"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Facility Type *
            </label>
            <select
              name="type"
              defaultValue="CLUBHOUSE"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            >
              <option value="CLUBHOUSE">Clubhouse</option>
              <option value="COMMUNITY_HALL">Community Hall</option>
              <option value="PARTY_LAWN">Party Lawn</option>
              <option value="SWIMMING_POOL">Swimming Pool</option>
              <option value="GUEST_ROOM">Guest Room</option>
              <option value="TENNIS_COURT">Tennis / Sports Court</option>
              <option value="TERRACE">Terrace</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Max Capacity (Guests)
            </label>
            <input
              type="number"
              name="capacity"
              placeholder="e.g. 50"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Default Rent Amount (₹) *
            </label>
            <input
              type="number"
              step="0.01"
              name="defaultRent"
              required
              defaultValue="0"
              placeholder="e.g. 3000"
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
              name="defaultDeposit"
              defaultValue="0"
              placeholder="e.g. 1000"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs font-medium text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Description / Usage Rules
            </label>
            <input
              type="text"
              name="description"
              placeholder="e.g. Music allowed until 10 PM. Catering setup allowed."
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-xl bg-stone-950 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-stone-800"
            >
              Add Amenity
            </button>
          </div>
        </form>
      </div>

      {/* Amenities Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-stone-900">Available Amenities</h2>
          <span className="text-xs text-stone-500">{amenities.length} facilities</span>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {amenities.map((a) => (
            <div
              key={a.id}
              className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:border-stone-300 hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-stone-950 text-base">{a.name}</h3>
                    <span className="mt-1 inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                      {a.type.replace(/_/g, " ")}
                    </span>
                  </div>

                  {a.capacity ? (
                    <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700">
                      👥 {a.capacity} Max Guests
                    </span>
                  ) : null}
                </div>

                {a.description ? (
                  <p className="mt-3 text-xs text-stone-600 leading-relaxed">
                    {a.description}
                  </p>
                ) : null}

                <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-stone-50 p-3.5 text-xs">
                  <div>
                    <span className="text-stone-500 block text-[10px] uppercase tracking-wider">
                      Standard Rent Fee
                    </span>
                    <span className="text-sm font-bold text-stone-950">
                      ₹{Number(a.defaultRent).toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div>
                    <span className="text-stone-500 block text-[10px] uppercase tracking-wider">
                      Refundable Caution Deposit
                    </span>
                    <span className="text-sm font-bold text-amber-800">
                      ₹{Number(a.defaultDeposit).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-stone-100 pt-4 text-xs font-semibold text-stone-800">
                <span className="text-stone-500 font-normal">
                  {a._count.bookings} reservations recorded
                </span>
                <Link
                  href={`/society/${code}/bookings`}
                  className="rounded-lg bg-stone-100 px-3 py-1 text-stone-900 hover:bg-stone-200 transition"
                >
                  Book Facility →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

import { requireCommitteeAccess, COMMITTEE_ROLES } from "@/lib/auth/requireAuth"
import { recordAuditLog } from "@/lib/audit"

async function createAmenity(formData: FormData) {
  "use server"

  const code = formData.get("code")?.toString().trim()
  if (!code) throw new Error("Society code is required")

  const authContext = await requireCommitteeAccess(code, COMMITTEE_ROLES)
  const verifiedSocietyId = authContext.society.id


  const name = formData.get("name")?.toString().trim()
  const type = formData.get("type")?.toString().trim() || "CLUBHOUSE"
  const rawRent = formData.get("defaultRent")?.toString().trim()
  const rawDeposit = formData.get("defaultDeposit")?.toString().trim()
  const rawCapacity = formData.get("capacity")?.toString().trim()
  const description = formData.get("description")?.toString().trim() || null

  if (!name) {
    throw new Error("Amenity name is required")
  }

  const defaultRent = rawRent ? parseFloat(rawRent) : 0
  const defaultDeposit = rawDeposit ? parseFloat(rawDeposit) : 0
  const capacity = rawCapacity ? parseInt(rawCapacity, 10) : null

  const amenity = await prisma.amenity.create({
    data: {
      societyId: verifiedSocietyId,
      name,
      type: type as AmenityType,
      defaultRent: !isNaN(defaultRent) ? defaultRent : 0,
      defaultDeposit: !isNaN(defaultDeposit) ? defaultDeposit : 0,
      capacity: !isNaN(Number(capacity)) ? capacity : null,
      description,
    },
  })

  await recordAuditLog({
    societyId: verifiedSocietyId,
    userId: authContext.user.id,
    action: "CREATE",
    entity: "Amenity",
    entityId: amenity.id,
    description: `${authContext.user.email} created amenity ${name} (${type})`,
    newData: { name, type, defaultRent, defaultDeposit, capacity },
  })

  revalidatePath(`/society/${code}/amenities`)
  revalidatePath(`/society/${code}/bookings`)
  revalidatePath("/admin/amenities")
}

