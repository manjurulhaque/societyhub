import { notFound } from "next/navigation"
import { revalidatePath } from "next/cache"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { prisma } from "@/lib/prisma"
import { formatDateInAppTimeZone } from "@/lib/datetime"
import type { PettyCashType } from "@/generated/prisma/client"

export default async function SocietyPettyCashPage({
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

  // Find petty cash accounts and entries
  let pettyAccount = await prisma.account.findFirst({
    where: { societyId: society.id, accountType: "PETTY_CASH", isActive: true, deletedAt: null },
  })

  // Auto-provision a default Petty Cash float if none exists
  if (!pettyAccount) {
    pettyAccount = await prisma.account.create({
      data: {
        societyId: society.id,
        name: "Petty Cash Imprest Float",
        accountType: "PETTY_CASH",
        openingBalance: 0,
        currentBalance: 0,
      },
    })
  }

  const entries = await prisma.pettyCashEntry.findMany({
    where: { societyId: society.id },
    orderBy: { entryDate: "desc" },
  })

  const currentFloat = Number(pettyAccount.currentBalance)
  const totalExpenses = entries
    .filter((e) => e.type === "EXPENSE")
    .reduce((acc, e) => acc + Number(e.amount), 0)
  const totalTopups = entries
    .filter((e) => e.type === "TOPUP_RECEIPT")
    .reduce((acc, e) => acc + Number(e.amount), 0)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="inline-flex items-center rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-stone-600">
            Cash Management
          </span>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-stone-900 md:text-3xl">
            Petty Cash Book (Imprest)
          </h1>
          <p className="text-sm text-stone-500">
            Manage daily office expenses, tea & refreshments, stationery, minor hardware, and cash top-ups for {society.name}.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
            Current Petty Cash Balance
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">
            ₹{currentFloat.toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            {pettyAccount.name}
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
            Total Imprest Top-Ups
          </p>
          <p className="mt-2 text-2xl font-bold text-stone-950">
            ₹{totalTopups.toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            Cash drawn from bank
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
            Total Petty Expenses
          </p>
          <p className="mt-2 text-2xl font-bold text-rose-700">
            ₹{totalExpenses.toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            {entries.filter((e) => e.type === "EXPENSE").length} expense vouchers
          </p>
        </div>
      </div>

      {/* Record Voucher Form */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-stone-950 mb-1">
          + Record Petty Cash Voucher
        </h2>
        <p className="text-xs text-stone-500 mb-5">
          Record cash disbursements or replenish the petty cash float.
        </p>

        <form action={createPettyEntry} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <input type="hidden" name="societyId" value={society.id} />
          <input type="hidden" name="accountId" value={pettyAccount.id} />
          <input type="hidden" name="code" value={code} />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Voucher Type *
            </label>
            <select
              name="type"
              defaultValue="EXPENSE"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            >
              <option value="EXPENSE">Expense Disbursement (Outflow)</option>
              <option value="TOPUP_RECEIPT">Float Top-up / Replenishment (Inflow)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Amount (₹) *
            </label>
            <input
              type="number"
              step="0.01"
              name="amount"
              required
              placeholder="e.g. 450"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs font-bold text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Date *
            </label>
            <input
              type="date"
              name="entryDate"
              required
              defaultValue={new Date().toISOString().split("T")[0]}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Payee / Vendor Name *
            </label>
            <input
              type="text"
              name="payee"
              required
              placeholder="e.g. Stationery Mart / Tea Stall"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Purpose / Description *
            </label>
            <input
              type="text"
              name="purpose"
              required
              placeholder="e.g. Office register printing, tea for MCM meeting, emergency bulb replacement"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Bill / Receipt Ref
            </label>
            <input
              type="text"
              name="billReference"
              placeholder="e.g. Bill # 1042"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-xl bg-stone-950 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-stone-800"
            >
              Post Voucher
            </button>
          </div>
        </form>
      </div>

      {/* Vouchers Table */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-stone-200 bg-stone-50 px-6 py-4">
          <h2 className="text-sm font-bold text-stone-900">Petty Cash Vouchers Ledger</h2>
        </div>

        {entries.length === 0 ? (
          <div className="p-12 text-center text-xs text-stone-500">
            No petty cash entries recorded yet. Post your first voucher above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-stone-200 bg-stone-50/50 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-4 py-3">Voucher # & Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Payee & Purpose</th>
                  <th className="px-4 py-3">Bill Ref</th>
                  <th className="px-4 py-3 text-right">Amount (₹)</th>
                  <th className="px-4 py-3 text-right">Running Balance (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-stone-50/70 transition">
                    <td className="px-4 py-3.5">
                      <span className="font-mono font-bold text-stone-900 block">
                        {e.voucherNumber || `#${e.id.slice(0, 8)}`}
                      </span>
                      <span className="text-[11px] text-stone-500">
                        {formatDateInAppTimeZone(e.entryDate)}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          e.type === "TOPUP_RECEIPT"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {e.type === "TOPUP_RECEIPT" ? "TOP-UP (+)" : "EXPENSE (-)"}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-stone-800">
                      <p className="font-semibold">{e.payee || "Direct"}</p>
                      <p className="text-[11px] text-stone-500">{e.purpose}</p>
                    </td>

                    <td className="px-4 py-3.5 font-mono text-[11px] text-stone-600">
                      {e.billReference || "—"}
                    </td>

                    <td
                      className={`px-4 py-3.5 text-right font-bold ${
                        e.type === "TOPUP_RECEIPT" ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      {e.type === "TOPUP_RECEIPT" ? "+" : "-"}₹{Number(e.amount).toLocaleString("en-IN")}
                    </td>

                    <td className="px-4 py-3.5 text-right font-mono font-semibold text-stone-900">
                      {e.runningBalance != null
                        ? `₹${Number(e.runningBalance).toLocaleString("en-IN")}`
                        : "—"}
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

async function createPettyEntry(formData: FormData) {
  "use server"

  const societyId = formData.get("societyId")?.toString().trim()
  const accountId = formData.get("accountId")?.toString().trim()
  const code = formData.get("code")?.toString().trim()
  const type = formData.get("type")?.toString().trim() || "EXPENSE"
  const rawAmount = formData.get("amount")?.toString().trim()
  const entryDateStr = formData.get("entryDate")?.toString().trim()
  const payee = formData.get("payee")?.toString().trim()
  const purpose = formData.get("purpose")?.toString().trim()
  const billReference = formData.get("billReference")?.toString().trim() || null

  if (!societyId || !accountId || !rawAmount || !entryDateStr || !payee || !purpose) {
    throw new Error("All required fields must be provided")
  }

  const amount = parseFloat(rawAmount)
  if (isNaN(amount) || amount <= 0) {
    throw new Error("Invalid petty cash amount")
  }

  const account = await prisma.account.findUniqueOrThrow({
    where: { id: accountId },
  })

  const currentBalance = Number(account.currentBalance)
  const newBalance = type === "TOPUP_RECEIPT" ? currentBalance + amount : currentBalance - amount

  const timestamp = Date.now().toString().slice(-4)
  const voucherNumber = `PCV-${new Date().getFullYear()}-${timestamp}`

  await prisma.$transaction([
    prisma.pettyCashEntry.create({
      data: {
        societyId,
        accountId,
        voucherNumber,
        entryDate: new Date(entryDateStr),
        type: type as PettyCashType,
        amount,
        runningBalance: newBalance,
        payee,
        purpose,
        billReference,
      },
    }),
    prisma.account.update({
      where: { id: accountId },
      data: {
        currentBalance: newBalance,
      },
    }),
  ])

  revalidatePath(`/society/${code}/petty-cash`)
  revalidatePath(`/society/${code}/accounts`)
}
