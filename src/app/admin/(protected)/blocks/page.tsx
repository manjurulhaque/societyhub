import Link from "next/link"

import { prisma } from "@/lib/prisma"
import { AdminPrimaryButton } from "@/components/admin/AdminPrimaryButton"
import { AdminListPage } from "@/components/admin/AdminListPage"

export default async function BlocksPage() {
  const blocks = await prisma.block.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      society: {
        select: {
          name: true,
        },
      },
      _count: {
        select: {
          flats: true,
        },
      },
    },
  })

  return (
    <AdminListPage
      eyebrow="Admin"
      title="Blocks"
      action={<AdminPrimaryButton href="/admin/blocks/new">+ New Block</AdminPrimaryButton>}
      headers={["Name", "Society", "Flats"]}
      rows={blocks.map((block) => (
        <tr key={block.id} className="border-t border-stone-200 hover:bg-stone-50">
          <td className="px-4 py-3 font-semibold text-stone-900">{block.name}</td>
          <td className="px-4 py-3 text-stone-600">{block.society.name}</td>
          <td className="px-4 py-3 text-stone-600">{block._count.flats}</td>
        </tr>
      ))}
    />
  )
}
