import Link from "next/link"

import { prisma } from "@/lib/prisma"
import { AdminPageHeader } from "@/components/admin/AdminPageHeader"
import { AdminTable } from "@/components/admin/AdminTable"

export default async function SocietiesPage() {
  const societies = await prisma.society.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      _count: {
        select: {
          members: true,
          blocks: true,
          people: true,
        },
      },
    },
  })

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-8 md:px-8">
      <AdminPageHeader
        eyebrow="Admin"
        title="Societies"
        action={
          <Link
            href="/admin/societies/new"
            className="rounded-full bg-stone-950 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-stone-800"
          >
            + New Society
          </Link>
        }
      />

      <AdminTable
        headers={["Name", "Code", "Address", "Maintenance", "Members", "Blocks", "People"]}
        rows={societies.map((society) => (
          <tr key={society.id} className="border-t border-stone-200 hover:bg-stone-50">
            <td className="px-4 py-3">
              <Link
                href={`/admin/societies/${society.id}`}
                className="font-semibold text-stone-900 hover:text-stone-700"
              >
                {society.name}
              </Link>
            </td>
            <td className="px-4 py-3 text-stone-600">{society.code}</td>
            <td className="px-4 py-3 text-stone-600">{society.address ?? "—"}</td>
            <td className="px-4 py-3 text-stone-600">{society.maintenanceType}</td>
            <td className="px-4 py-3 text-stone-600">{society._count.members}</td>
            <td className="px-4 py-3 text-stone-600">{society._count.blocks}</td>
            <td className="px-4 py-3 text-stone-600">{society._count.people}</td>
          </tr>
        ))}
      />
    </div>
  )
}
