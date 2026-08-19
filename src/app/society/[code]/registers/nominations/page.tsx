import Link from "next/link"
import { notFound } from "next/navigation"
import { revalidatePath } from "next/cache"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { prisma } from "@/lib/prisma"
import { formatDateInAppTimeZone } from "@/lib/datetime"

export default async function SocietyNominationsPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const context = await getSocietyAdmin(code)

  if (!context) {
    notFound()
  }

  const { society } = context

  const [nominations, flats, people] = await Promise.all([
    prisma.nomination.findMany({
      where: { societyId: society.id },
      orderBy: { nominationDate: "desc" },
      include: {
        flat: {
          select: {
            number: true,
            block: { select: { name: true } },
          },
        },
        person: {
          select: { name: true, phone: true },
        },
      },
    }),
    prisma.flat.findMany({
      where: { block: { societyId: society.id }, isActive: true, deletedAt: null },
      orderBy: [{ block: { name: "asc" } }, { number: "asc" }],
      select: {
        id: true,
        number: true,
        block: { select: { name: true } },
      },
    }),
    prisma.person.findMany({
      where: { societyId: society.id, isActive: true, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href={`/society/${code}/registers`}
              className="text-xs font-semibold text-stone-500 hover:text-stone-900 transition"
            >
              ← Statutory Registers
            </Link>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-stone-900 md:text-3xl">
            &quot;J&quot; Register (Form X) — Member Nominations
          </h1>

          <p className="text-sm text-stone-500">
            Statutory nomination register recording legal nominees, relationships, and percentage share of interest for {society.name}.
          </p>
        </div>
      </div>

      {/* File Form X Nomination */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-stone-950 mb-1">
          + File Form X Member Nomination
        </h2>
        <p className="text-xs text-stone-500 mb-5">
          Record statutory nominee under Section 30 of State Co-operative Societies Act.
        </p>

        <form action={fileNomination} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <input type="hidden" name="societyId" value={society.id} />
          <input type="hidden" name="code" value={code} />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Flat / Unit *
            </label>
            <select
              name="flatId"
              required
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            >
              <option value="">Select flat...</option>
              {flats.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.block.name} - Flat {f.number}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Member (Owner) *
            </label>
            <select
              name="personId"
              required
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            >
              <option value="">Select member...</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Nominee Full Name *
            </label>
            <input
              type="text"
              name="nomineeName"
              required
              placeholder="e.g. Priya Sharma"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Relationship *
            </label>
            <select
              name="relationship"
              required
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            >
              <option value="Spouse">Spouse</option>
              <option value="Son">Son</option>
              <option value="Daughter">Daughter</option>
              <option value="Father">Father</option>
              <option value="Mother">Mother</option>
              <option value="Brother">Brother</option>
              <option value="Sister">Sister</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Percentage Share (%) *
            </label>
            <input
              type="number"
              step="0.01"
              name="percentageShare"
              required
              defaultValue="100"
              placeholder="e.g. 100"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs font-bold text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Nominee DOB (if minor)
            </label>
            <input
              type="date"
              name="nomineeDob"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Guardian Name (if minor)
            </label>
            <input
              type="text"
              name="guardianName"
              placeholder="e.g. Natural Guardian / Mother"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-xl bg-stone-950 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-stone-800"
            >
              File Nomination
            </button>
          </div>
        </form>
      </div>

      {/* Nominations Table */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-stone-200 bg-stone-50 px-6 py-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-stone-900">Form X Registered Nominations</h2>
          <span className="text-xs text-stone-500">{nominations.length} entries</span>
        </div>

        {nominations.length === 0 ? (
          <div className="p-12 text-center text-xs text-stone-500">
            No member nominations filed yet. File your first Form X nomination above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-stone-200 bg-stone-50/50 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-4 py-3">Flat & Member</th>
                  <th className="px-4 py-3">Nominee Name</th>
                  <th className="px-4 py-3">Relationship</th>
                  <th className="px-4 py-3">Share %</th>
                  <th className="px-4 py-3">Nomination Date</th>
                  <th className="px-4 py-3">Guardian (if Minor)</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {nominations.map((n) => (
                  <tr key={n.id} className="hover:bg-stone-50/70 transition">
                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-stone-900 block">
                        {n.flat.block.name} - Flat {n.flat.number}
                      </span>
                      <span className="text-[11px] text-stone-500">
                        Owner: {n.person.name}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 font-bold text-stone-950 text-sm">
                      {n.nomineeName}
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="inline-flex rounded-full bg-stone-100 px-2.5 py-0.5 text-[10px] font-semibold text-stone-700">
                        {n.relationship}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 font-mono font-bold text-emerald-700 text-sm">
                      {Number(n.percentageShare)}%
                    </td>

                    <td className="px-4 py-3.5 text-stone-500">
                      {formatDateInAppTimeZone(n.nominationDate)}
                    </td>

                    <td className="px-4 py-3.5 text-stone-600">
                      {n.guardianName || <span className="text-stone-400">—</span>}
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        {n.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

import { requireCommitteeAccess, COMMITTEE_ROLES } from "@/lib/auth/requireAuth"
import { recordAuditLog } from "@/lib/audit"
import { sanitizeText } from "@/lib/sanitize"

async function fileNomination(formData: FormData) {
  "use server"

  const code = formData.get("code")?.toString().trim()
  if (!code) throw new Error("Society code is required")

  const authContext = await requireCommitteeAccess(code, COMMITTEE_ROLES)
  const verifiedSocietyId = authContext.society.id

  const flatId = formData.get("flatId")?.toString().trim()
  const personId = formData.get("personId")?.toString().trim()
  const nomineeName = sanitizeText(formData.get("nomineeName")?.toString())
  const relationship = sanitizeText(formData.get("relationship")?.toString())
  const rawShare = formData.get("percentageShare")?.toString().trim()
  const rawDob = formData.get("nomineeDob")?.toString().trim()
  const guardianName = formData.get("guardianName") ? sanitizeText(formData.get("guardianName")?.toString()) : null


  if (!flatId || !personId || !nomineeName || !relationship || !rawShare) {
    throw new Error("Flat, member, nominee name, relationship, and share percentage are required")
  }

  // Validate flat belongs to this society
  const flat = await prisma.flat.findFirst({
    where: { id: flatId, block: { societyId: verifiedSocietyId } },
  })
  if (!flat) {
    throw new Error("Flat does not belong to this society")
  }

  // Validate person belongs to this society
  const person = await prisma.person.findFirst({
    where: { id: personId, societyId: verifiedSocietyId },
  })
  if (!person) {
    throw new Error("Member / person does not belong to this society")
  }

  const percentageShare = parseFloat(rawShare)
  const nomineeDob = rawDob ? new Date(rawDob) : null

  const nomination = await prisma.nomination.create({
    data: {
      societyId: verifiedSocietyId,
      flatId,
      personId,
      nomineeName,
      relationship,
      percentageShare: !isNaN(percentageShare) ? percentageShare : 100,
      nomineeDob,
      guardianName,
      status: "ACTIVE",
    },
  })

  await recordAuditLog({
    societyId: verifiedSocietyId,
    userId: authContext.user.id,
    action: "CREATE",
    entity: "Nomination",
    entityId: nomination.id,
    description: `${authContext.user.email} registered nomination for ${nomineeName} (${relationship}) by ${person.name}`,
    newData: { nomineeName, relationship, percentageShare, flatId, personId },
  })

  revalidatePath(`/society/${code}/registers/nominations`)
  revalidatePath(`/society/${code}/registers`)
  revalidatePath("/admin/registers")
}

