import Link from "next/link"

import { prisma } from "@/lib/prisma"
import { AdminPrimaryButton } from "@/components/admin/AdminPrimaryButton"
import { AdminListPage } from "@/components/admin/AdminListPage"

export default async function FlatsPage() {
  const flats = await prisma.flat.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      block: {
        select: {
          name: true,
          society: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  })

  return (
    <AdminListPage
      eyebrow="Admin"
      title="Flats"
      action={<AdminPrimaryButton href="/admin/flats/new">+ New Flat</AdminPrimaryButton>}
      headers={["Flat", "Block", "Society", "Unit Type", "Area"]}
      rows={flats.map((flat) => (
        <tr key={flat.id} className="border-t border-stone-200 hover:bg-stone-50">
          <td className="px-4 py-3 font-semibold text-stone-900">{flat.number}</td>
          <td className="px-4 py-3 text-stone-600">{flat.block.name}</td>
          <td className="px-4 py-3 text-stone-600">{flat.block.society.name}</td>
          <td className="px-4 py-3 text-stone-600">{flat.unitType ?? "—"}</td>
          <td className="px-4 py-3 text-stone-600">{flat.area ? `${flat.area} ${flat.areaUnit}` : "—"}</td>
        </tr>
      ))}
    />
  )
}
