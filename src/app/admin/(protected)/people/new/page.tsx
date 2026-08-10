import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { prisma } from "@/lib/prisma"
import { AdminFormCard } from "@/components/admin/AdminFormCard"
import { AdminFormField } from "@/components/admin/AdminFormField"
import { AdminPrimaryButton } from "@/components/admin/AdminPrimaryButton"

export default async function NewPersonPage() {
  const societies = await prisma.society.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-8 md:px-8">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-stone-600">
          Resident Setup
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-stone-950">
          Create Person
        </h1>
      </div>

      <form action={createPerson}>
        <AdminFormCard>
          <AdminFormField label="Society">
            <select name="societyId" required className="w-full rounded-xl border border-stone-300 px-3 py-2 outline-none ring-0">
              <option value="">Select a society</option>
              {societies.map((society) => (
                <option key={society.id} value={society.id}>
                  {society.name}
                </option>
              ))}
            </select>
          </AdminFormField>

          <AdminFormField label="Name">
            <input name="name" required className="w-full rounded-xl border border-stone-300 px-3 py-2 outline-none ring-0" />
          </AdminFormField>

          <div className="grid gap-4 md:grid-cols-2">
            <AdminFormField label="Phone">
              <input name="phone" className="w-full rounded-xl border border-stone-300 px-3 py-2 outline-none ring-0" />
            </AdminFormField>

            <AdminFormField label="Email">
              <input type="email" name="email" className="w-full rounded-xl border border-stone-300 px-3 py-2 outline-none ring-0" />
            </AdminFormField>
          </div>

          <AdminPrimaryButton type="submit">Save Person</AdminPrimaryButton>
        </AdminFormCard>
      </form>
    </div>
  )
}

async function createPerson(formData: FormData) {
  "use server"

  const societyId = formData.get("societyId")?.toString().trim()
  const name = formData.get("name")?.toString().trim()
  const phone = formData.get("phone")?.toString().trim() || null
  const email = formData.get("email")?.toString().trim() || null

  if (!societyId || !name) {
    throw new Error("Society and name are required")
  }

  await prisma.person.create({
    data: {
      societyId,
      name,
      phone,
      email,
    },
  })

  revalidatePath("/admin/people")
  redirect("/admin/people")
}
