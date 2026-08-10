import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { prisma } from "@/lib/prisma"
import { AdminFormCard } from "@/components/admin/AdminFormCard"
import { AdminFormField } from "@/components/admin/AdminFormField"
import { AdminPrimaryButton } from "@/components/admin/AdminPrimaryButton"

export default async function NewBlockPage() {
  const societies = await prisma.society.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-8 md:px-8">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-stone-600">
          Block Setup
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-stone-950">
          Create Block
        </h1>
      </div>

      <form action={createBlock}>
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

          <AdminFormField label="Block Name">
            <input name="name" required className="w-full rounded-xl border border-stone-300 px-3 py-2 outline-none ring-0" />
          </AdminFormField>

          <AdminPrimaryButton type="submit">Save Block</AdminPrimaryButton>
        </AdminFormCard>
      </form>
    </div>
  )
}

async function createBlock(formData: FormData) {
  "use server"

  const societyId = formData.get("societyId")?.toString().trim()
  const name = formData.get("name")?.toString().trim()

  if (!societyId || !name) {
    throw new Error("Society and block name are required")
  }

  await prisma.block.create({
    data: {
      societyId,
      name,
    },
  })

  revalidatePath("/admin/blocks")
  redirect("/admin/blocks")
}
