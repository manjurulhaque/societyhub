import Link from "next/link"

import { prisma } from "@/lib/prisma"

export default async function PeoplePage() {
  const people = await prisma.person.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      society: {
        select: {
          name: true,
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
            People
          </h1>
        </div>

        <Link
          href="/admin/people/new"
          className="rounded-full bg-stone-950 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-stone-800"
        >
          + New Person
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-stone-50 text-stone-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Society</th>
              </tr>
            </thead>
            <tbody>
              {people.map((person) => (
                <tr key={person.id} className="border-t border-stone-200 hover:bg-stone-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/people/${person.id}`}
                      className="font-semibold text-stone-900 hover:text-stone-700"
                    >
                      {person.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-stone-600">{person.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-stone-600">{person.email ?? "—"}</td>
                  <td className="px-4 py-3 text-stone-600">{person.society.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
