import Link from "next/link"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import {
  AdminPageHeader,
  AdminCard,
  AdminSelect,
  AdminInput,
  AdminButton,
} from "@/components/admin"

export default async function NewBlockPage() {
  const societies = await prisma.society.findMany({
    where: { isActive: true, deletedAt: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  })

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-6 py-8 md:px-8">
      <AdminPageHeader
        eyebrow="Structure Setup"
        title="Create New Block"
        description="Add a new residential wing, tower, or structural block to a housing society."
        action={
          <Link
            href="/admin/blocks"
            className="rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-stone-700 transition hover:bg-stone-100 shadow-sm"
          >
            Cancel
          </Link>
        }
      />

      <form action={createBlock} className="space-y-6">
        <AdminCard
          title="Block Details"
          description="Specify the target society and block identifier"
        >
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Housing Society *
              </label>
              <AdminSelect
                name="societyId"
                required
                options={[
                  { label: "Select a housing society...", value: "", disabled: true },
                  ...societies.map((s) => ({
                    label: s.code ? `${s.name} (${s.code})` : s.name,
                    value: s.id,
                  })),
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Block / Tower Name *
              </label>
              <AdminInput
                name="name"
                required
                placeholder="e.g. Wing A, Tower 1, Block B"
              />
            </div>
          </div>
        </AdminCard>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/admin/blocks"
            className="rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
          >
            Cancel
          </Link>
          <AdminButton type="submit" variant="primary" size="lg">
            Create Block
          </AdminButton>
        </div>
      </form>
    </div>
  )
}

import { requireSuperAdmin } from "@/lib/auth/requireAuth"
import { recordAuditLog } from "@/lib/audit"

async function createBlock(formData: FormData) {
  "use server"

  const admin = await requireSuperAdmin()

  const societyId = formData.get("societyId")?.toString().trim()
  const name = formData.get("name")?.toString().trim()

  if (!societyId || !name) {
    throw new Error("Society and block name are required")
  }

  const block = await prisma.block.create({
    data: {
      societyId,
      name,
    },
  })

  await recordAuditLog({
    societyId,
    userId: admin.id,
    action: "CREATE",
    entity: "Block",
    entityId: block.id,
    description: `Super Admin ${admin.email} created block ${name}`,
    newData: { name, societyId },
  })

  revalidatePath("/admin/blocks")
  revalidatePath("/admin/societies")
  redirect("/admin/blocks")
}

