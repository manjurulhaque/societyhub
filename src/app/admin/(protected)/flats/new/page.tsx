import Link from "next/link"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import type { UnitType, OccupancyStatus } from "@/generated/prisma/client"
import {
  AdminPageHeader,
  AdminCard,
  AdminSelect,
  AdminInput,
  AdminButton,
} from "@/components/admin"

export default async function NewFlatPage() {
  const blocks = await prisma.block.findMany({
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
    },
  })

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-6 py-8 md:px-8">
      <AdminPageHeader
        eyebrow="Unit Setup"
        title="Create New Flat / Unit"
        description="Register a residential flat, shop, or commercial office within a building block."
        action={
          <Link
            href="/admin/flats"
            className="rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-stone-700 transition hover:bg-stone-100 shadow-sm"
          >
            Cancel
          </Link>
        }
      />

      <form action={createFlat} className="space-y-8">
        {/* 1. Location & Block Assignment */}
        <AdminCard
          title="Building & Unit Identification"
          description="Select the parent block and specify unit number"
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Block / Tower & Society *
              </label>
              <AdminSelect
                name="blockId"
                required
                options={[
                  { label: "Select a block / tower...", value: "", disabled: true },
                  ...blocks.map((b) => ({
                    label: `${b.society.name} (${b.society.code || "CHS"}) → ${b.name}`,
                    value: b.id,
                  })),
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Flat / Unit Number *
              </label>
              <AdminInput
                name="number"
                required
                placeholder="e.g. 101, A-402, Shop-3"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Floor Number
              </label>
              <AdminInput
                name="floor"
                type="number"
                placeholder="e.g. 4 (Ground = 0)"
              />
            </div>
          </div>
        </AdminCard>

        {/* 2. Unit Configuration & Area */}
        <AdminCard
          title="Configuration & Specifications"
          description="Layout type, occupancy state, and carpet/super area"
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Unit Type
              </label>
              <AdminSelect
                name="unitType"
                defaultValue="BHK2"
                options={[
                  { label: "1 BHK", value: "BHK1" },
                  { label: "2 BHK", value: "BHK2" },
                  { label: "3 BHK", value: "BHK3" },
                  { label: "4 BHK", value: "BHK4" },
                  { label: "1 RK / Studio", value: "RK1" },
                  { label: "Studio Apartment", value: "STUDIO" },
                  { label: "Penthouse", value: "PENTHOUSE" },
                  { label: "Duplex", value: "DUPLEX" },
                  { label: "Row House / Villa", value: "ROW_HOUSE" },
                  { label: "Commercial Shop", value: "SHOP" },
                  { label: "Office Unit", value: "OFFICE" },
                  { label: "Other Unit", value: "OTHER" },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Initial Occupancy Status
              </label>
              <AdminSelect
                name="status"
                defaultValue="VACANT"
                options={[
                  { label: "Vacant", value: "VACANT" },
                  { label: "Occupied", value: "OCCUPIED" },
                  { label: "Under Renovation", value: "UNDER_RENOVATION" },
                  { label: "Temporarily Closed", value: "TEMPORARILY_CLOSED" },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Area (Sq. Ft.)
              </label>
              <AdminInput
                name="area"
                type="number"
                step="0.01"
                placeholder="e.g. 1050"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Intercom Extension
              </label>
              <AdminInput
                name="intercomNumber"
                placeholder="e.g. 402"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Assigned Parking Slot
              </label>
              <AdminInput
                name="parkingSlot"
                placeholder="e.g. B1-P14, Open-4"
              />
            </div>
          </div>
        </AdminCard>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/admin/flats"
            className="rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
          >
            Cancel
          </Link>
          <AdminButton type="submit" variant="primary" size="lg">
            Create Flat
          </AdminButton>
        </div>
      </form>
    </div>
  )
}

import { requireSuperAdmin } from "@/lib/auth/requireAuth"
import { recordAuditLog } from "@/lib/audit"

async function createFlat(formData: FormData) {
  "use server"

  const admin = await requireSuperAdmin()

  const blockId = formData.get("blockId")?.toString().trim()
  const number = formData.get("number")?.toString().trim()
  const rawFloor = formData.get("floor")?.toString().trim()
  const unitType = formData.get("unitType")?.toString().trim() || null
  const status = formData.get("status")?.toString().trim() || "VACANT"
  const rawArea = formData.get("area")?.toString().trim()
  const intercomNumber = formData.get("intercomNumber")?.toString().trim() || null
  const parkingSlot = formData.get("parkingSlot")?.toString().trim() || null

  if (!blockId || !number) {
    throw new Error("Block and flat number are required")
  }

  const block = await prisma.block.findUnique({
    where: { id: blockId },
    select: { id: true, societyId: true, name: true },
  })

  if (!block) {
    throw new Error("Block not found")
  }

  const floor = rawFloor ? parseInt(rawFloor, 10) : null
  const area = rawArea ? parseFloat(rawArea) : null

  const flat = await prisma.flat.create({
    data: {
      blockId,
      number,
      floor: floor !== null && !isNaN(floor) ? floor : null,
      unitType: (unitType as UnitType) || null,
      status: (status as OccupancyStatus) || "VACANT",
      area: area !== null && !isNaN(area) ? area : null,
      intercomNumber,
      parkingSlot,
    },
  })

  await recordAuditLog({
    societyId: block.societyId,
    userId: admin.id,
    action: "CREATE",
    entity: "Flat",
    entityId: flat.id,
    description: `Super Admin ${admin.email} created flat ${number} in block ${block.name}`,
    newData: { number, blockId, unitType, status },
  })

  revalidatePath("/admin/flats")
  revalidatePath("/admin/blocks")
  redirect("/admin/flats")
}

