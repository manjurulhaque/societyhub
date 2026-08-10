import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { prisma } from "@/lib/prisma"
import { AdminFormCard } from "@/components/admin/AdminFormCard"
import { AdminFormField } from "@/components/admin/AdminFormField"
import { AdminPrimaryButton } from "@/components/admin/AdminPrimaryButton"

export default async function EditSocietyPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const society = await prisma.society.findUnique({
    where: { id },
  })

  if (!society) {
    notFound()
  }

  const updateSocietyWithId = updateSociety.bind(null, id)

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-8 md:px-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-stone-600">
            Society Management
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-stone-950">
            Edit Society
          </h1>
        </div>
        <Link
          href={`/admin/societies/${id}`}
          className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
        >
          Cancel
        </Link>
      </div>

      <form action={updateSocietyWithId}>
        <AdminFormCard>
          <div className="grid gap-4 md:grid-cols-2">
            <AdminFormField label="Name">
              <input
                name="name"
                defaultValue={society.name}
                required
                className="w-full rounded-xl border border-stone-300 px-3 py-2 outline-none ring-0"
              />
            </AdminFormField>

            <AdminFormField label="Code">
              <input
                name="code"
                defaultValue={society.code}
                required
                className="w-full rounded-xl border border-stone-300 px-3 py-2 outline-none ring-0"
              />
            </AdminFormField>
          </div>

          <AdminFormField label="Address">
            <textarea
              name="address"
              defaultValue={society.address ?? ""}
              rows={3}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 outline-none ring-0"
            />
          </AdminFormField>

          <AdminFormField label="Maintenance Type">
            <select
              name="maintenanceType"
              defaultValue={society.maintenanceType}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 outline-none ring-0"
            >
              <option value="FIXED">Fixed</option>
              <option value="PER_SQFT">Per Sqft</option>
            </select>
          </AdminFormField>

          <AdminPrimaryButton type="submit">Update Society</AdminPrimaryButton>
        </AdminFormCard>
      </form>
    </div>
  )
}

async function updateSociety(id: string, formData: FormData) {
  "use server"

  const name = formData.get("name")?.toString().trim()
  const code = formData.get("code")?.toString().trim()
  const address = formData.get("address")?.toString().trim() || null
  const maintenanceType = formData.get("maintenanceType")?.toString()

  if (!name || !code) {
    throw new Error("Name and code are required")
  }

  await prisma.society.update({
    where: { id },
    data: {
      name,
      code,
      address,
      maintenanceType: maintenanceType === "PER_SQFT" ? "PER_SQFT" : "FIXED",
    },
  })

  revalidatePath("/admin/societies")
  revalidatePath(`/admin/societies/${id}`)
  redirect(`/admin/societies/${id}`)
}
