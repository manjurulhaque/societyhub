import { notFound } from "next/navigation"
import { revalidatePath } from "next/cache"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { prisma } from "@/lib/prisma"
import { formatDateInAppTimeZone } from "@/lib/datetime"
import type { ChequeDirection } from "@/generated/prisma/client"


export default async function SocietyChequesPage({
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

  const [cheques, accounts] = await Promise.all([
    prisma.chequeRegister.findMany({
      where: { societyId: society.id },
      orderBy: { chequeDate: "desc" },
      include: {
        account: {
          select: { name: true, bankName: true },
        },
      },
    }),
    prisma.account.findMany({
      where: { societyId: society.id, accountType: "BANK", isActive: true, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ])

  const totalInwardAmount = cheques
    .filter((c) => c.direction === "INWARD")
    .reduce((acc, c) => acc + Number(c.amount), 0)

  const pendingCount = cheques.filter(
    (c) => c.status === "RECEIVED" || c.status === "IN_CLEARING"
  ).length

  const clearedCount = cheques.filter((c) => c.status === "CLEARED").length
  const bouncedCount = cheques.filter((c) => c.status === "BOUNCED").length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="inline-flex items-center rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-stone-600">
            Banking Operations
          </span>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-stone-900 md:text-3xl">
            Cheque Clearance Register
          </h1>
          <p className="text-sm text-stone-500">
            Track inward maintenance cheques from residents and outward vendor payment cheques for {society.name}.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
            Total Inward Cheques
          </p>
          <p className="mt-2 text-2xl font-bold text-stone-950">
            ₹{totalInwardAmount.toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            {cheques.filter((c) => c.direction === "INWARD").length} received cheques
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
            Pending Clearance
          </p>
          <p className="mt-2 text-2xl font-bold text-amber-600">
            {pendingCount}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            Awaiting bank clearing
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
            Cleared Cheques
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">
            {clearedCount}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            Settled into account
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
            Bounced / Dishonored
          </p>
          <p className="mt-2 text-2xl font-bold text-rose-600">
            {bouncedCount}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            Requires follow-up
          </p>
        </div>
      </div>

      {/* Record Cheque Form */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-stone-950 mb-1">
          + Record Inward / Outward Cheque
        </h2>
        <p className="text-xs text-stone-500 mb-5">
          Enter cheque leaf particulars to track deposit and bank realization.
        </p>

        <form action={createCheque} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <input type="hidden" name="societyId" value={society.id} />
          <input type="hidden" name="code" value={code} />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Cheque Number *
            </label>
            <input
              type="text"
              name="chequeNumber"
              required
              placeholder="e.g. 042918"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs font-mono text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Cheque Date *
            </label>
            <input
              type="date"
              name="chequeDate"
              required
              defaultValue={new Date().toISOString().split("T")[0]}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Direction *
            </label>
            <select
              name="direction"
              defaultValue="INWARD"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            >
              <option value="INWARD">Inward (From Resident / Member)</option>
              <option value="OUTWARD">Outward (To Vendor / Supplier)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Party Name *
            </label>
            <input
              type="text"
              name="partyName"
              required
              placeholder="e.g. Rahul Sharma / Security Agency"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Drawee Bank Name
            </label>
            <input
              type="text"
              name="bankName"
              placeholder="e.g. State Bank of India"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Society Bank Account *
            </label>
            <select
              name="accountId"
              required
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Cheque Amount (₹) *
            </label>
            <input
              type="number"
              step="0.01"
              name="amount"
              required
              placeholder="e.g. 15000"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs font-bold text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-xl bg-stone-950 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-stone-800"
            >
              Add to Register
            </button>
          </div>
        </form>
      </div>

      {/* Cheque Register Table */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-stone-200 bg-stone-50 px-6 py-4">
          <h2 className="text-sm font-bold text-stone-900">Cheque Records</h2>
        </div>

        {cheques.length === 0 ? (
          <div className="p-12 text-center text-xs text-stone-500">
            No cheques recorded yet. Add your first cheque above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-stone-200 bg-stone-50/50 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-4 py-3">Cheque # & Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Party Name & Bank</th>
                  <th className="px-4 py-3">Society Account</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Update Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {cheques.map((c) => (
                  <tr key={c.id} className="hover:bg-stone-50/70 transition">
                    <td className="px-4 py-3.5">
                      <span className="font-mono font-bold text-stone-900 block">
                        #{c.chequeNumber}
                      </span>
                      <span className="text-[11px] text-stone-500">
                        {formatDateInAppTimeZone(c.chequeDate)}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          c.direction === "INWARD"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                      >
                        {c.direction}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-stone-800">
                      <p className="font-semibold">{c.partyName}</p>
                      <p className="text-[10px] text-stone-500">{c.bankName || "Bank not specified"}</p>
                    </td>

                    <td className="px-4 py-3.5 text-stone-600">
                      {c.account.name}
                    </td>

                    <td className="px-4 py-3.5 font-bold text-stone-950">
                      ₹{Number(c.amount).toLocaleString("en-IN")}
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          c.status === "CLEARED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : c.status === "IN_CLEARING"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : c.status === "BOUNCED"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-stone-100 text-stone-700"
                        }`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {c.status}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      {c.status === "RECEIVED" ? (
                        <form action={updateChequeStatus} className="inline-block">
                          <input type="hidden" name="chequeId" value={c.id} />
                          <input type="hidden" name="nextStatus" value="IN_CLEARING" />
                          <input type="hidden" name="code" value={code} />
                          <button
                            type="submit"
                            className="rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1 text-[10px] font-semibold text-amber-800 hover:bg-amber-100 transition shadow-sm"
                          >
                            Mark Deposited
                          </button>
                        </form>
                      ) : c.status === "IN_CLEARING" ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <form action={updateChequeStatus} className="inline-block">
                            <input type="hidden" name="chequeId" value={c.id} />
                            <input type="hidden" name="nextStatus" value="CLEARED" />
                            <input type="hidden" name="code" value={code} />
                            <button
                              type="submit"
                              className="rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[10px] font-semibold text-emerald-800 hover:bg-emerald-100 transition shadow-sm"
                            >
                              Clear ✓
                            </button>
                          </form>
                          <form action={updateChequeStatus} className="inline-block">
                            <input type="hidden" name="chequeId" value={c.id} />
                            <input type="hidden" name="nextStatus" value="BOUNCED" />
                            <input type="hidden" name="code" value={code} />
                            <button
                              type="submit"
                              className="rounded-lg bg-rose-50 border border-rose-200 px-2.5 py-1 text-[10px] font-semibold text-rose-800 hover:bg-rose-100 transition shadow-sm"
                            >
                              Bounce ✕
                            </button>
                          </form>
                        </div>
                      ) : (
                        <span className="text-[11px] text-stone-400">Archived</span>
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

import { requireCommitteeAccess, FINANCIAL_ROLES } from "@/lib/auth/requireAuth"
import { recordAuditLog } from "@/lib/audit"
import { sanitizeText } from "@/lib/sanitize"

async function createCheque(formData: FormData) {
  "use server"

  const code = formData.get("code")?.toString().trim()
  if (!code) throw new Error("Society code is required")

  const authContext = await requireCommitteeAccess(code, FINANCIAL_ROLES)
  const verifiedSocietyId = authContext.society.id

  const rawChequeNum = formData.get("chequeNumber")?.toString().trim()
  const chequeNumber = rawChequeNum ? sanitizeText(rawChequeNum) : ""
  const chequeDateStr = formData.get("chequeDate")?.toString().trim()
  const direction = formData.get("direction")?.toString().trim() || "INWARD"
  const rawParty = formData.get("partyName")?.toString().trim()
  const partyName = rawParty ? sanitizeText(rawParty) : ""
  const rawBank = formData.get("bankName")?.toString().trim() || null
  const bankName = rawBank ? sanitizeText(rawBank) : null
  const accountId = formData.get("accountId")?.toString().trim()
  const rawAmount = formData.get("amount")?.toString().trim()

  if (!chequeNumber || !chequeDateStr || !partyName || !accountId || !rawAmount) {
    throw new Error("All required fields must be filled")
  }

  // Validate account belongs to this society
  const account = await prisma.account.findFirst({
    where: { id: accountId, societyId: verifiedSocietyId },
  })
  if (!account) {
    throw new Error("Specified bank account not found in this society")
  }

  const amount = parseFloat(rawAmount)
  if (isNaN(amount) || amount <= 0) {
    throw new Error("Invalid cheque amount")
  }

  const cheque = await prisma.chequeRegister.create({
    data: {
      societyId: verifiedSocietyId,
      accountId,
      chequeNumber,
      chequeDate: new Date(chequeDateStr),
      direction: direction as ChequeDirection,
      partyName,
      bankName,
      amount,
      status: "RECEIVED",
    },
  })

  await recordAuditLog({
    societyId: verifiedSocietyId,
    userId: authContext.user.id,
    action: "CREATE",
    entity: "ChequeRegister",
    entityId: cheque.id,
    description: `${authContext.user.email} registered ${direction} cheque #${chequeNumber} for ₹${amount} (${partyName})`,
    newData: { chequeNumber, direction, amount, partyName, accountId },
  })

  revalidatePath(`/society/${code}/cheques`)
  revalidatePath(`/society/${code}/accounts`)
}

async function updateChequeStatus(formData: FormData) {
  "use server"

  const code = formData.get("code")?.toString().trim()
  const chequeId = formData.get("chequeId")?.toString().trim()
  const nextStatus = formData.get("nextStatus")?.toString().trim()

  if (!code || !chequeId || !nextStatus) return

  const authContext = await requireCommitteeAccess(code, FINANCIAL_ROLES)
  const verifiedSocietyId = authContext.society.id


  // Verify cheque belongs to this society (IDOR prevention)
  const cheque = await prisma.chequeRegister.findFirst({
    where: { id: chequeId, societyId: verifiedSocietyId },
  })

  if (!cheque) {
    throw new Error("Cheque record not found for this society")
  }

  const now = new Date()

  if (nextStatus === "IN_CLEARING") {
    await prisma.chequeRegister.update({
      where: { id: chequeId },
      data: {
        status: "IN_CLEARING",
        depositDate: now,
      },
    })
  } else if (nextStatus === "CLEARED") {
    await prisma.chequeRegister.update({
      where: { id: chequeId },
      data: {
        status: "CLEARED",
        clearedOn: now,
      },
    })

    // If cleared and inward, credit the account balance; if outward, debit
    if (cheque.direction === "INWARD") {
      await prisma.account.update({
        where: { id: cheque.accountId },
        data: {
          currentBalance: { increment: cheque.amount },
        },
      })
    } else {
      await prisma.account.update({
        where: { id: cheque.accountId },
        data: {
          currentBalance: { decrement: cheque.amount },
        },
      })
    }
  } else if (nextStatus === "BOUNCED") {
    await prisma.chequeRegister.update({
      where: { id: chequeId },
      data: {
        status: "BOUNCED",
        bouncedOn: now,
      },
    })
  }

  await recordAuditLog({
    societyId: verifiedSocietyId,
    userId: authContext.user.id,
    action: "STATUS_CHANGE",
    entity: "ChequeRegister",
    entityId: chequeId,
    description: `${authContext.user.email} changed status of cheque #${cheque.chequeNumber} to ${nextStatus}`,
    oldData: { status: cheque.status },
    newData: { status: nextStatus },
  })

  revalidatePath(`/society/${code}/cheques`)
  revalidatePath(`/society/${code}/accounts`)
}

