import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { prisma } from "@/lib/prisma"
import type { UnitType } from "@/generated/prisma/client"
import { AdminFormCard } from "@/components/admin/AdminFormCard"
import { AdminFormField } from "@/components/admin/AdminFormField"
import { AdminPrimaryButton } from "@/components/admin/AdminPrimaryButton"

export default async function NewFlatPage() {
  const blocks = await prisma.block.findMany({
    orderBy: { name: "asc" },
    include: {
      society: {
        select: {
          name: true,
        },
      },
    },
  })

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-8 md:px-8">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-stone-600">
          Flat Setup
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-stone-950">
          Create Flat
        </h1>
      </div>

      <form action={createFlat}>
        <AdminFormCard>
          <AdminFormField label="Block">
            <select name="blockId" required className="w-full rounded-xl border border-stone-300 px-3 py-2 outline-none ring-0">
              <option value="">Select a block</option>
              {blocks.map((block) => (
                <option key={block.id} value={block.id}>
                  {block.society.name} / {block.name}
                </option>
              ))}
            </select>
          </AdminFormField>

          <AdminFormField label="Flat Number">
            <input name="number" required className="w-full rounded-xl border border-stone-300 px-3 py-2 outline-none ring-0" />
          </AdminFormField>

          <div className="grid gap-4 md:grid-cols-2">
            <AdminFormField label="Unit Type">
              <select name="unitType" className="w-full rounded-xl border border-stone-300 px-3 py-2 outline-none ring-0">
                <option value="">Select type</option>
                <option value="STUDIO">Studio</option>
                <option value="RK1">RK1</option>
                <option value="BHK1">BHK1</option>
                <option value="BHK2">BHK2</option>
                <option value="BHK3">BHK3</option>
                <option value="BHK4">BHK4</option>
                <option value="PENTHOUSE">Penthouse</option>
                <option value="DUPLEX">Duplex</option>
                <option value="SHOP">Shop</option>
                <option value="OFFICE">Office</option>
              </select>
            </AdminFormField>

            <AdminFormField label="Area">
              <input type="number" step="0.01" name="area" className="w-full rounded-xl border border-stone-300 px-3 py-2 outline-none ring-0" />
            </AdminFormField>
          </div>

          <AdminPrimaryButton type="submit">Save Flat</AdminPrimaryButton>
        </AdminFormCard>
      </form>
    </div>
  )
}

async function createFlat(formData: FormData) {
  "use server"

  const blockId = formData.get("blockId")?.toString().trim()
  const number = formData.get("number")?.toString().trim()
  const unitType = formData.get("unitType")?.toString().trim() || null
  const area = formData.get("area")?.toString().trim()

  if (!blockId || !number) {
    throw new Error("Block and flat number are required")
  }

  await prisma.flat.create({
    data: {
      blockId,
      number,
      unitType: (unitType as UnitType) || null,
      area: area ? Number(area) : null,
    },
  })

  revalidatePath("/admin/flats")
  redirect("/admin/flats")
}
