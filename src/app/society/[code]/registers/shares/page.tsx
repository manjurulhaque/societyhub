import Link from "next/link"
import { notFound } from "next/navigation"
import { revalidatePath } from "next/cache"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { prisma } from "@/lib/prisma"
import { formatDateInAppTimeZone } from "@/lib/datetime"

export default async function SocietyShareCertificatesPage({
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

  const [certificates, flats, people] = await Promise.all([
    prisma.shareCertificate.findMany({
      where: { societyId: society.id },
      orderBy: { certificateNumber: "asc" },
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
            &quot;I&quot; Register of Members & Share Certificates
          </h1>

          <p className="text-sm text-stone-500">
            Official register of share capital, certificate numbers, and distinctive share numbers issued to flat owners in {society.name}.
          </p>
        </div>
      </div>

      {/* Issue Share Certificate Form */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-stone-950 mb-1">
          + Issue Share Certificate
        </h2>
        <p className="text-xs text-stone-500 mb-5">
          Assign statutory share certificate leaf to flat owner according to CHS Bye-Laws.
        </p>

        <form action={issueCertificate} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              Member / Shareholder *
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
              Certificate Number *
            </label>
            <input
              type="text"
              name="certificateNumber"
              required
              placeholder="e.g. SC-0042"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs font-mono font-bold text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Shares Count *
            </label>
            <input
              type="number"
              name="sharesCount"
              required
              defaultValue="5"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Distinctive From #
            </label>
            <input
              type="number"
              name="shareDistinctFrom"
              placeholder="e.g. 201"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs font-mono text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Distinctive To #
            </label>
            <input
              type="number"
              name="shareDistinctTo"
              placeholder="e.g. 205"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs font-mono text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Face Value per Share (₹)
            </label>
            <input
              type="number"
              step="0.01"
              name="faceValuePerShare"
              defaultValue="50"
              required
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-xl bg-stone-950 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-stone-800"
            >
              Issue Certificate
            </button>
          </div>
        </form>
      </div>

      {/* Share Certificates Table */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-stone-200 bg-stone-50 px-6 py-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-stone-900">Official &quot;I&quot; Register</h2>
          <span className="text-xs text-stone-500">{certificates.length} certificates issued</span>
        </div>


        {certificates.length === 0 ? (
          <div className="p-12 text-center text-xs text-stone-500">
            No share certificates issued yet. Issue your first certificate above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-stone-200 bg-stone-50/50 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-4 py-3">Certificate # & Date</th>
                  <th className="px-4 py-3">Flat / Unit</th>
                  <th className="px-4 py-3">Member (Shareholder)</th>
                  <th className="px-4 py-3">Shares Count</th>
                  <th className="px-4 py-3">Distinctive Nos.</th>
                  <th className="px-4 py-3">Total Value</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {certificates.map((c) => {
                  const totalVal = Number(c.sharesCount) * Number(c.faceValuePerShare)

                  return (
                    <tr key={c.id} className="hover:bg-stone-50/70 transition">
                      <td className="px-4 py-3.5">
                        <span className="font-mono font-bold text-stone-950 text-xs block">
                          {c.certificateNumber}
                        </span>
                        <span className="text-[10px] text-stone-500">
                          {formatDateInAppTimeZone(c.issueDate)}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 font-semibold text-stone-900">
                        {c.flat.block.name} - {c.flat.number}
                      </td>

                      <td className="px-4 py-3.5 text-stone-800">
                        <p className="font-semibold">{c.person.name}</p>
                        <p className="text-[10px] text-stone-500">{c.person.phone || "No contact"}</p>
                      </td>

                      <td className="px-4 py-3.5 font-bold text-stone-950">
                        {c.sharesCount} shares
                      </td>

                      <td className="px-4 py-3.5 font-mono text-stone-700">
                        {c.shareDistinctFrom && c.shareDistinctTo
                          ? `${c.shareDistinctFrom} – ${c.shareDistinctTo}`
                          : "—"}
                      </td>

                      <td className="px-4 py-3.5 font-bold text-emerald-700">
                        ₹{totalVal.toLocaleString("en-IN")}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

import { requireSocietyAccess } from "@/lib/auth/requireAuth"
import { recordAuditLog } from "@/lib/audit"

async function issueCertificate(formData: FormData) {
  "use server"

  const code = formData.get("code")?.toString().trim()
  if (!code) throw new Error("Society code is required")

  const authContext = await requireSocietyAccess(code)
  const verifiedSocietyId = authContext.society.id

  const flatId = formData.get("flatId")?.toString().trim()
  const personId = formData.get("personId")?.toString().trim()
  const certificateNumber = formData.get("certificateNumber")?.toString().trim()
  const sharesCount = parseInt(formData.get("sharesCount")?.toString() || "5", 10)
  const rawFrom = formData.get("shareDistinctFrom")?.toString().trim()
  const rawTo = formData.get("shareDistinctTo")?.toString().trim()
  const rawFace = formData.get("faceValuePerShare")?.toString().trim()

  if (!flatId || !personId || !certificateNumber) {
    throw new Error("Flat, member, and certificate number are required")
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

  const shareDistinctFrom = rawFrom ? parseInt(rawFrom, 10) : null
  const shareDistinctTo = rawTo ? parseInt(rawTo, 10) : null
  const faceValuePerShare = rawFace ? parseFloat(rawFace) : 50

  const certificate = await prisma.shareCertificate.create({
    data: {
      societyId: verifiedSocietyId,
      flatId,
      personId,
      certificateNumber,
      sharesCount,
      shareDistinctFrom: !isNaN(Number(shareDistinctFrom)) ? shareDistinctFrom : null,
      shareDistinctTo: !isNaN(Number(shareDistinctTo)) ? shareDistinctTo : null,
      faceValuePerShare: !isNaN(faceValuePerShare) ? faceValuePerShare : 50,
      status: "ACTIVE",
    },
  })

  await recordAuditLog({
    societyId: verifiedSocietyId,
    userId: authContext.user.id,
    action: "CREATE",
    entity: "ShareCertificate",
    entityId: certificate.id,
    description: `${authContext.user.email} issued share certificate #${certificateNumber} to ${person.name}`,
    newData: { certificateNumber, sharesCount, flatId, personId },
  })

  revalidatePath(`/society/${code}/registers/shares`)
  revalidatePath(`/society/${code}/registers`)
  revalidatePath("/admin/registers")
}

