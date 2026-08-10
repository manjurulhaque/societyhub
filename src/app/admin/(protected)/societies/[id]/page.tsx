import Link from "next/link"
import { notFound } from "next/navigation"

import { prisma } from "@/lib/prisma"
import { AdminDetailItem } from "@/components/admin/AdminDetailItem"
import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader"

export default async function SocietyDetailPage({
  params,
}: {
  params: Promise<{ id: string }> 
}) {
  const { id } = await params
  const society = await prisma.society.findUnique({
    where: { id },
    include: {
      blocks: {
        select: {
          id: true,
          name: true,
          _count: {
            select: { flats: true },
          },
        },
      },
      people: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
        },
      },
      members: {
        include: {
          user: {
            select: {
              email: true,
            },
          },
        },
      },
    },
  })

  if (!society) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-6 py-8 md:px-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-stone-600">Society</p>
          <h1 className="text-3xl font-bold tracking-tight text-stone-950">{society.name}</h1>
          <p className="text-sm text-stone-600">{society.code}</p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/admin/societies"
            className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
          >
            Back to list
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <AdminDetailItem label="Address" value={society.address ?? "Not provided"} />
        <AdminDetailItem label="Maintenance" value={society.maintenanceType} />
        <AdminDetailItem label="Members" value={society.members.length} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <AdminSectionHeader
            title="Blocks"
            description={`${society.blocks.length} total`}
          />
          <div className="space-y-3">
            {society.blocks.map((block) => (
              <div key={block.id} className="flex items-center justify-between rounded-xl border border-stone-200 px-4 py-3">
                <div>
                  <p className="font-medium text-stone-900">{block.name}</p>
                </div>
                <p className="text-sm text-stone-500">{block._count.flats} flats</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <AdminSectionHeader title="Recent People" />
          <div className="space-y-3">
            {society.people.map((person) => (
              <div key={person.id} className="flex items-center justify-between rounded-xl border border-stone-200 px-4 py-3">
                <div>
                  <p className="font-medium text-stone-900">{person.name}</p>
                  <p className="text-sm text-stone-500">{person.phone ?? person.email ?? "No contact info"}</p>
                </div>
                <Link
                  href={`/admin/people/${person.id}`}
                  className="text-sm font-medium text-stone-700 hover:text-stone-900"
                >
                  View
                </Link>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
