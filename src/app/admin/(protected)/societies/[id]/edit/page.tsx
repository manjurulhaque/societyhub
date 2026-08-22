import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { prisma } from "@/lib/prisma"
import { generateUniqueSocietyCode } from "@/lib/society"
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

            <AdminFormField label="Code (Optional)">
              <input
                name="code"
                defaultValue={society.code ?? ""}
                placeholder="Auto-generated if left blank"
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
              <option value="CUSTOM">Custom</option>
            </select>
          </AdminFormField>

          <AdminFormField label="Operating Timezone">
            <select
              name="timezone"
              defaultValue={society.timezone || "Asia/Kolkata"}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 outline-none ring-0"
            >
              {TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label} ({tz.offset})
                </option>
              ))}
            </select>
          </AdminFormField>

          <div className="grid gap-4 md:grid-cols-2">
            <AdminFormField label="Default Currency">
              <select
                name="currency"
                defaultValue={society.currency || "INR"}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 outline-none ring-0"
              >
                {CURRENCY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </AdminFormField>

            <AdminFormField label="Currency Symbol">
              <input
                name="currencySymbol"
                defaultValue={society.currencySymbol || "₹"}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 outline-none ring-0"
              />
            </AdminFormField>
          </div>

          <AdminPrimaryButton type="submit">Update Society</AdminPrimaryButton>
        </AdminFormCard>
      </form>
    </div>
  )
}

import { requireSuperAdmin } from "@/lib/auth/requireAuth"
import { recordAuditLog } from "@/lib/audit"
import { TIMEZONE_OPTIONS } from "@/lib/datetime"
import { CURRENCY_OPTIONS } from "@/lib/currency"

async function updateSociety(id: string, formData: FormData) {
  "use server"

  const admin = await requireSuperAdmin()

  const name = formData.get("name")?.toString().trim()
  const rawCode = formData.get("code")?.toString().trim() || null
  const address = formData.get("address")?.toString().trim() || null
  const maintenanceType = formData.get("maintenanceType")?.toString()
  const timezone = formData.get("timezone")?.toString().trim() || "Asia/Kolkata"
  const currency = formData.get("currency")?.toString().trim() || "INR"
  const currencySymbol = formData.get("currencySymbol")?.toString().trim() || "₹"

  if (!name) {
    throw new Error("Society name is required")
  }

  const existingSociety = await prisma.society.findUnique({
    where: { id },
  })

  if (!existingSociety) {
    throw new Error("Society not found")
  }

  let code = existingSociety.code
  if (rawCode !== existingSociety.code) {
    code = await generateUniqueSocietyCode(name, rawCode)
  }

  await prisma.society.update({
    where: { id },
    data: {
      name,
      code,
      address,
      timezone,
      currency,
      currencySymbol,
      maintenanceType:
        maintenanceType === "PER_SQFT"
          ? "PER_SQFT"
          : maintenanceType === "CUSTOM"
            ? "CUSTOM"
            : "FIXED",
    },
  })

  await recordAuditLog({
    societyId: id,
    userId: admin.id,
    action: "UPDATE",
    entity: "Society",
    entityId: id,
    description: `Super Admin ${admin.email} updated society settings for ${name}`,
    oldData: existingSociety,
    newData: { name, code, address, maintenanceType, timezone },
  })

  revalidatePath("/admin/societies")
  revalidatePath(`/admin/societies/${id}`)
  redirect(`/admin/societies/${id}`)
}

