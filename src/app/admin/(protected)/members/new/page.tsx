import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { prisma } from "@/lib/prisma"
import type { SocietyRole } from "@/generated/prisma/client"

export default async function NewMemberPage() {
  const [societies, users] = await Promise.all([
    prisma.society.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.user.findMany({
      orderBy: { email: "asc" },
      select: { id: true, email: true },
    }),
  ])

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-8 md:px-8">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-stone-600">
          Membership Setup
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-stone-950">
          Create Member
        </h1>
      </div>

      <form action={createMember} className="space-y-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <label className="block space-y-2 text-sm font-medium text-stone-700">
          <span>Society</span>
          <select name="societyId" required className="w-full rounded-xl border border-stone-300 px-3 py-2 outline-none ring-0">
            <option value="">Select a society</option>
            {societies.map((society) => (
              <option key={society.id} value={society.id}>
                {society.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-2 text-sm font-medium text-stone-700">
          <span>User</span>
          <select name="userId" required className="w-full rounded-xl border border-stone-300 px-3 py-2 outline-none ring-0">
            <option value="">Select a user</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.email}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-2 text-sm font-medium text-stone-700">
          <span>Role</span>
          <select name="role" required className="w-full rounded-xl border border-stone-300 px-3 py-2 outline-none ring-0">
            <option value="PRESIDENT">President</option>
            <option value="VICE_PRESIDENT">Vice President</option>
            <option value="SECRETARY">Secretary</option>
            <option value="JOINT_SECRETARY">Joint Secretary</option>
            <option value="TREASURER">Treasurer</option>
            <option value="MANAGER">Manager</option>
            <option value="ACCOUNTANT">Accountant</option>
            <option value="SECURITY">Security</option>
            <option value="MEMBER">Member</option>
          </select>
        </label>

        <button
          type="submit"
          className="rounded-full bg-stone-950 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-stone-800"
        >
          Save Member
        </button>
      </form>
    </div>
  )
}

async function createMember(formData: FormData) {
  "use server"

  const societyId = formData.get("societyId")?.toString().trim()
  const userId = formData.get("userId")?.toString().trim()
  const role = formData.get("role")?.toString().trim()

  if (!societyId || !userId || !role) {
    throw new Error("Society, user, and role are required")
  }

  await prisma.societyMember.create({
    data: {
      societyId,
      userId,
      role: role as SocietyRole,
    },
  })

  revalidatePath("/admin/members")
  redirect("/admin/members")
}
