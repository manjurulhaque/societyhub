import Link from "next/link"
import { notFound } from "next/navigation"

import { prisma } from "@/lib/prisma"
import { AdminDetailItem } from "@/components/admin/AdminDetailItem"
import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader"

export default async function PersonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const person = await prisma.person.findUnique({
    where: { id },
    include: {
      society: {
        select: {
          id: true,
          name: true,
        },
      },
      flats: {
        include: {
          flat: {
            select: {
              id: true,
              number: true,
              block: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!person) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-6 py-8 md:px-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-stone-600">Person</p>
          <h1 className="text-3xl font-bold tracking-tight text-stone-950">{person.name}</h1>
        </div>

        <Link
          href="/admin/people"
          className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
        >
          Back to list
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <AdminDetailItem label="Society" value={person.society.name} />
        <AdminDetailItem label="Phone" value={person.phone ?? "Not provided"} />
        <AdminDetailItem label="Email" value={person.email ?? "Not provided"} />
      </div>

      <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <AdminSectionHeader title="Associated Flats" />
        <div className="mt-4 space-y-3">
          {person.flats.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between rounded-xl border border-stone-200 px-4 py-3">
              <div>
                <p className="font-medium text-stone-900">{entry.flat.block.name} / {entry.flat.number}</p>
                <p className="text-sm text-stone-500">Role: {entry.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
