import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { prisma } from "@/lib/prisma"
import { AdminFormCard } from "@/components/admin/AdminFormCard"
import { AdminFormField } from "@/components/admin/AdminFormField"
import { AdminPrimaryButton } from "@/components/admin/AdminPrimaryButton"

export default function NewSocietyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-8 md:px-8">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-stone-600">
          Society Setup
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-stone-950">
          Create Society
        </h1>
      </div>

      <form action={createSociety}>
        <AdminFormCard>
          <div className="grid gap-4 md:grid-cols-2">
            <AdminFormField label="Name">
              <input
                name="name"
                required
                className="w-full rounded-xl border border-stone-300 px-3 py-2 outline-none ring-0"
              />
            </AdminFormField>

            <AdminFormField label="Code">
              <input
                name="code"
                required
                className="w-full rounded-xl border border-stone-300 px-3 py-2 outline-none ring-0"
              />
            </AdminFormField>
          </div>

          <AdminFormField label="Address">
            <textarea
              name="address"
              rows={3}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 outline-none ring-0"
            />
          </AdminFormField>

          <AdminFormField label="Maintenance Type">
            <select
              name="maintenanceType"
              defaultValue="FIXED"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 outline-none ring-0"
            >
              <option value="FIXED">Fixed</option>
              <option value="PER_SQFT">Per Sqft</option>
            </select>
          </AdminFormField>

          <AdminPrimaryButton type="submit">Save Society</AdminPrimaryButton>
        </AdminFormCard>
      </form>
    </div>
  )
}

async function createSociety(formData: FormData) {
  "use server"

  const name = formData.get("name")?.toString().trim()
  const code = formData.get("code")?.toString().trim()
  const address = formData.get("address")?.toString().trim() || null
  const maintenanceType = formData.get("maintenanceType")?.toString()

  if (!name || !code) {
    throw new Error("Name and code are required")
  }

  await prisma.society.create({
    data: {
      name,
      code,
      address,
      maintenanceType: maintenanceType === "PER_SQFT" ? "PER_SQFT" : "FIXED",
    },
  })

  revalidatePath("/admin/societies")
  redirect("/admin/societies")
}
