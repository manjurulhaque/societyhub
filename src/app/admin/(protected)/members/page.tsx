import Link from "next/link"

import { prisma } from "@/lib/prisma"

export default async function MembersPage() {
  const members = await prisma.societyMember.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      society: {
        select: {
          name: true,
        },
      },
      user: {
        select: {
          email: true,
        },
      },
    },
  })

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-8 md:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-stone-600">
            Admin
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-stone-950">
            Members
          </h1>
        </div>

        <Link
          href="/admin/members/new"
          className="rounded-full bg-stone-950 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-stone-800"
        >
          + New Member
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-stone-50 text-stone-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Society</th>
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Role</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-t border-stone-200 hover:bg-stone-50">
                  <td className="px-4 py-3 font-semibold text-stone-900">{member.society.name}</td>
                  <td className="px-4 py-3 text-stone-600">{member.user.email}</td>
                  <td className="px-4 py-3 text-stone-600">{member.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
