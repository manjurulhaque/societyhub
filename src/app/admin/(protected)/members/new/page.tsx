import Link from "next/link"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import type { SocietyRole } from "@/generated/prisma/client"
import {
  AdminPageHeader,
  AdminCard,
  AdminSelect,
  AdminButton,
} from "@/components/admin"

export default async function NewMemberPage() {
  const [societies, users] = await Promise.all([
    prisma.society.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    }),
    prisma.user.findMany({
      orderBy: { email: "asc" },
      select: { id: true, email: true, appRole: true },
    }),
  ])

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-6 py-8 md:px-8">
      <AdminPageHeader
        eyebrow="Governance Setup"
        title="Assign Society Member"
        description="Grant a user administrative or committee member authority within a specific housing society."
        action={
          <Link
            href="/admin/members"
            className="rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-stone-700 transition hover:bg-stone-100 shadow-sm"
          >
            Cancel
          </Link>
        }
      />

      <form action={createMember} className="space-y-6">
        <AdminCard
          title="Membership & Role Details"
          description="Select the housing society, user account, and committee designation"
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
                User Account *
              </label>
              <AdminSelect
                name="userId"
                required
                options={[
                  { label: "Select a user account...", value: "", disabled: true },
                  ...users.map((u) => ({
                    label: `${u.email} (${u.appRole})`,
                    value: u.id,
                  })),
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Committee Designation / Role *
              </label>
              <AdminSelect
                name="designation"
                defaultValue="MEMBER"
                options={[
                  { label: "President", value: "PRESIDENT" },
                  { label: "Secretary", value: "SECRETARY" },
                  { label: "Treasurer", value: "TREASURER" },
                  { label: "Vice President", value: "VICE_PRESIDENT" },
                  { label: "Joint Secretary", value: "JOINT_SECRETARY" },
                  { label: "Society Manager", value: "MANAGER" },
                  { label: "Accountant", value: "ACCOUNTANT" },
                  { label: "Security In-Charge", value: "SECURITY" },
                  { label: "General Committee Member", value: "MEMBER" },
                ]}
              />
            </div>
          </div>
        </AdminCard>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/admin/members"
            className="rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
          >
            Cancel
          </Link>
          <AdminButton type="submit" variant="primary" size="lg">
            Assign Member
          </AdminButton>
        </div>
      </form>
    </div>
  )
}

async function createMember(formData: FormData) {
  "use server"

  const societyId = formData.get("societyId")?.toString().trim()
  const userId = formData.get("userId")?.toString().trim()
  const designation = formData.get("designation")?.toString().trim()

  if (!societyId || !userId || !designation) {
    throw new Error("Society, user, and designation are required")
  }

  await prisma.societyMember.upsert({
    where: {
      societyId_userId: {
        societyId,
        userId,
      },
    },
    update: {
      designation: designation as SocietyRole,
    },
    create: {
      societyId,
      userId,
      designation: designation as SocietyRole,
    },
  })

  revalidatePath("/admin/members")
  revalidatePath(`/admin/societies/${societyId}`)
  redirect("/admin/members")
}
