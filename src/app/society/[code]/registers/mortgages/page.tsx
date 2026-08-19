import Link from "next/link"
import { notFound } from "next/navigation"
import { revalidatePath } from "next/cache"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { prisma } from "@/lib/prisma"
import { formatDateInAppTimeZone } from "@/lib/datetime"

export default async function SocietyMortgagesPage({
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

  const [liens, flats, people] = await Promise.all([
    prisma.propertyLien.findMany({
      where: { societyId: society.id },
      orderBy: { createdAt: "desc" },
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
            &quot;M&quot; Register — Mortgages & Bank NOCs
          </h1>

          <p className="text-sm text-stone-500">
            Official register recording bank home loan encumbrances, society NOCs, and mortgage discharge notes for {society.name}.
          </p>
        </div>
      </div>

      {/* Record Bank Mortgage NOC */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-stone-950 mb-1">
          + Record Bank Mortgage / Society NOC
        </h2>
        <p className="text-xs text-stone-500 mb-5">
          Record property lien and society mortgage consent for member home loans.
        </p>

        <form action={recordLien} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              Borrower (Member) *
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
              Lending Bank Name *
            </label>
            <input
              type="text"
              name="bankName"
              required
              placeholder="e.g. State Bank of India / HDFC Bank"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Branch Name
            </label>
            <input
              type="text"
              name="branchName"
              placeholder="e.g. RACPC Mumbai Main"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Loan Account #
            </label>
            <input
              type="text"
              name="loanAccountNumber"
              placeholder="e.g. 64920194820"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs font-mono text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Sanction Amount (₹)
            </label>
            <input
              type="number"
              step="0.01"
              name="sanctionAmount"
              placeholder="e.g. 7500000"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs font-bold text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Society NOC Ref #
            </label>
            <input
              type="text"
              name="nocReference"
              placeholder="e.g. NOC-2026-081"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-xl bg-stone-950 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-stone-800"
            >
              Record Mortgage
            </button>
          </div>
        </form>
      </div>

      {/* Mortgages Table */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-stone-200 bg-stone-50 px-6 py-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-stone-900">Official &quot;M&quot; Register Entries</h2>
          <span className="text-xs text-stone-500">{liens.length} mortgage records</span>
        </div>


        {liens.length === 0 ? (
          <div className="p-12 text-center text-xs text-stone-500">
            No bank mortgages recorded yet. Record your first home loan NOC above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-stone-200 bg-stone-50/50 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-4 py-3">Flat & Borrower</th>
                  <th className="px-4 py-3">Lending Bank & Branch</th>
                  <th className="px-4 py-3">Loan Account #</th>
                  <th className="px-4 py-3">Sanction Amount</th>
                  <th className="px-4 py-3">Society NOC Ref</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {liens.map((l) => (
                  <tr key={l.id} className="hover:bg-stone-50/70 transition">
                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-stone-900 block">
                        {l.flat.block.name} - Flat {l.flat.number}
                      </span>
                      <span className="text-[11px] text-stone-500">
                        Borrower: {l.person.name}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-stone-800">
                      <p className="font-bold">{l.bankName}</p>
                      <p className="text-[10px] text-stone-500">{l.branchName || "Branch not listed"}</p>
                    </td>

                    <td className="px-4 py-3.5 font-mono font-medium text-stone-700">
                      {l.loanAccountNumber || "—"}
                    </td>

                    <td className="px-4 py-3.5 font-bold text-stone-950">
                      {l.sanctionAmount ? `₹${Number(l.sanctionAmount).toLocaleString("en-IN")}` : "—"}
                    </td>

                    <td className="px-4 py-3.5 font-mono text-[11px] text-stone-600">
                      {l.nocReference || "—"}
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          l.status === "ACTIVE"
                            ? "bg-purple-50 border border-purple-200 text-purple-700"
                            : "bg-emerald-50 border border-emerald-200 text-emerald-700"
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      {l.status === "ACTIVE" ? (
                        <form action={dischargeLien} className="inline-block">
                          <input type="hidden" name="lienId" value={l.id} />
                          <input type="hidden" name="code" value={code} />
                          <button
                            type="submit"
                            className="rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-800 hover:bg-emerald-100 transition shadow-sm"
                          >
                            Discharge Lien ✓
                          </button>
                        </form>
                      ) : (
                        <span className="text-[11px] text-stone-400">
                          Cleared {l.clearanceDate ? formatDateInAppTimeZone(l.clearanceDate) : ""}
                        </span>
                      )}
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

import { requireSocietyAccess } from "@/lib/auth/requireAuth"
import { recordAuditLog } from "@/lib/audit"

async function recordLien(formData: FormData) {
  "use server"

  const code = formData.get("code")?.toString().trim()
  if (!code) throw new Error("Society code is required")

  const authContext = await requireSocietyAccess(code)
  const verifiedSocietyId = authContext.society.id

  const flatId = formData.get("flatId")?.toString().trim()
  const personId = formData.get("personId")?.toString().trim()
  const bankName = formData.get("bankName")?.toString().trim()
  const branchName = formData.get("branchName")?.toString().trim() || null
  const loanAccountNumber = formData.get("loanAccountNumber")?.toString().trim() || null
  const rawAmount = formData.get("sanctionAmount")?.toString().trim()
  const nocReference = formData.get("nocReference")?.toString().trim() || null

  if (!flatId || !personId || !bankName) {
    throw new Error("Flat, borrower, and bank name are required")
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
    throw new Error("Borrower / person does not belong to this society")
  }

  const sanctionAmount = rawAmount ? parseFloat(rawAmount) : null

  const lien = await prisma.propertyLien.create({
    data: {
      societyId: verifiedSocietyId,
      flatId,
      personId,
      bankName,
      branchName,
      loanAccountNumber,
      sanctionAmount: sanctionAmount && !isNaN(sanctionAmount) ? sanctionAmount : null,
      nocReference,
      status: "ACTIVE",
    },
  })

  await recordAuditLog({
    societyId: verifiedSocietyId,
    userId: authContext.user.id,
    action: "CREATE",
    entity: "PropertyLien",
    entityId: lien.id,
    description: `${authContext.user.email} registered bank lien/mortgage with ${bankName} for flat ${flat.number}`,
    newData: { bankName, loanAccountNumber, sanctionAmount, flatId, personId },
  })

  revalidatePath(`/society/${code}/registers/mortgages`)
  revalidatePath(`/society/${code}/registers`)
  revalidatePath("/admin/registers")
}

async function dischargeLien(formData: FormData) {
  "use server"

  const code = formData.get("code")?.toString().trim()
  const lienId = formData.get("lienId")?.toString().trim()

  if (!code || !lienId) return

  const authContext = await requireSocietyAccess(code)
  const verifiedSocietyId = authContext.society.id

  // Verify lien belongs to this society (IDOR prevention)
  const lien = await prisma.propertyLien.findFirst({
    where: { id: lienId, societyId: verifiedSocietyId },
  })

  if (!lien) {
    throw new Error("Property lien record not found for this society")
  }

  await prisma.propertyLien.update({
    where: { id: lienId },
    data: {
      status: "DISCHARGED",
      isCleared: true,
      clearanceDate: new Date(),
    },
  })

  await recordAuditLog({
    societyId: verifiedSocietyId,
    userId: authContext.user.id,
    action: "STATUS_CHANGE",
    entity: "PropertyLien",
    entityId: lienId,
    description: `${authContext.user.email} marked lien with ${lien.bankName} as DISCHARGED`,
  })

  revalidatePath(`/society/${code}/registers/mortgages`)
  revalidatePath(`/society/${code}/registers`)
  revalidatePath("/admin/registers")
}

