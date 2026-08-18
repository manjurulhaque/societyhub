import { notFound } from "next/navigation"
import { revalidatePath } from "next/cache"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { prisma } from "@/lib/prisma"
import { seedSocietyChartOfAccounts } from "@/lib/chartOfAccounts"
import type { LedgerGroup, BalanceType } from "@/generated/prisma/client"
import { LedgerExplorer } from "./LedgerExplorer"

export default async function SocietyLedgersPage({
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

  const rawLedgers = await prisma.ledger.findMany({
    where: {
      societyId: society.id,
      isActive: true,
      deletedAt: null,
    },
    orderBy: [
      { group: "asc" },
      { code: "asc" },
      { name: "asc" },
    ],
    include: {
      parentLedger: {
        select: { name: true, code: true },
      },
    },
  })

  // Format ledgers for client explorer component
  const ledgers = rawLedgers.map((l) => ({
    id: l.id,
    name: l.name,
    code: l.code,
    group: l.group as "ASSET" | "LIABILITY" | "INCOME" | "EXPENSE" | "EQUITY",
    description: l.description,
    balanceType: l.balanceType as "DEBIT" | "CREDIT",
    openingBalance: Number(l.openingBalance),
    isSystem: l.isSystem,
    parentLedger: l.parentLedger,
  }))

  // Group counts for KPI overview
  const assetsCount = ledgers.filter((l) => l.group === "ASSET").length
  const liabilitiesCount = ledgers.filter((l) => l.group === "LIABILITY").length
  const incomeCount = ledgers.filter((l) => l.group === "INCOME").length
  const expensesCount = ledgers.filter((l) => l.group === "EXPENSE").length
  const equityCount = ledgers.filter((l) => l.group === "EQUITY").length

  // Potential parent ledgers (primary heads or heads with 4-digit codes)
  const potentialParents = rawLedgers.filter(
    (l) => !l.parentLedgerId || (l.code && l.code.endsWith("00"))
  )

  async function handleSeedChart() {
    "use server"
    await seedSocietyChartOfAccounts(society.id)
    revalidatePath(`/society/${code}/ledgers`)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="inline-flex items-center rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-stone-600">
            Accounting Core
          </span>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-stone-900 md:text-3xl">
            Chart of Accounts & Ledgers
          </h1>
          <p className="text-sm text-stone-500">
            Standard double-entry accounting tree, statutory ledgers, and revenue heads for {society.name}.
          </p>
        </div>

        <form action={handleSeedChart}>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-800 shadow-sm transition hover:bg-stone-50"
          >
            ⚡ {ledgers.length === 0 ? "Initialize Standard Chart" : "Refresh Standard Ledgers"}
          </button>
        </form>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-700">Assets</p>
          <p className="mt-1 text-2xl font-bold text-stone-950">{assetsCount}</p>
          <p className="text-[10px] text-stone-400">Bank, Cash, Receivables, ITC</p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-purple-700">Liabilities</p>
          <p className="mt-1 text-2xl font-bold text-stone-950">{liabilitiesCount}</p>
          <p className="text-[10px] text-stone-400">Creditors, Taxes, Caution Deposits</p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Income</p>
          <p className="mt-1 text-2xl font-bold text-stone-950">{incomeCount}</p>
          <p className="text-[10px] text-stone-400">Maintenance, Solar, Rentals</p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-700">Expenses</p>
          <p className="mt-1 text-2xl font-bold text-stone-950">{expensesCount}</p>
          <p className="text-[10px] text-stone-400">Security, AMCs, Insurance, Power</p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">Equity</p>
          <p className="mt-1 text-2xl font-bold text-stone-950">{equityCount}</p>
          <p className="text-[10px] text-stone-400">Corpus, Sinking & Welfare Reserves</p>
        </div>
      </div>

      {/* Add Custom Ledger Form */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-stone-950 mb-1">
          + Create Custom Ledger
        </h2>
        <p className="text-xs text-stone-500 mb-5">
          Add specific expense, revenue, asset, or liability heads tailored to your society.
        </p>

        <form action={createLedger} className="space-y-4">
          <input type="hidden" name="societyId" value={society.id} />
          <input type="hidden" name="code" value={code} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                Ledger Name *
              </label>
              <input
                type="text"
                name="name"
                required
                placeholder="e.g. EV Charging Station Income"
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                Ledger Code (Optional)
              </label>
              <input
                type="text"
                name="ledgerCode"
                placeholder="e.g. 4480"
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs font-mono text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                Accounting Group *
              </label>
              <select
                name="group"
                defaultValue="EXPENSE"
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
              >
                <option value="EXPENSE">Expense (Debit nature)</option>
                <option value="INCOME">Income (Credit nature)</option>
                <option value="ASSET">Asset (Debit nature)</option>
                <option value="LIABILITY">Liability (Credit nature)</option>
                <option value="EQUITY">Equity / Reserve (Credit nature)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                Parent Classification (Optional)
              </label>
              <select
                name="parentLedgerId"
                defaultValue=""
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
              >
                <option value="">— Primary / Top-Level Head —</option>
                {potentialParents.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.group}] {p.code ? `${p.code} - ` : ""}{p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                Opening Balance (₹)
              </label>
              <input
                type="number"
                name="openingBalance"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs font-mono text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                Description (Optional)
              </label>
              <input
                type="text"
                name="description"
                placeholder="Brief purpose or classification note"
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl bg-stone-950 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-stone-800"
            >
              Save Custom Ledger Head
            </button>
          </div>
        </form>
      </div>

      {/* Interactive Ledger Explorer & Tables */}
      <LedgerExplorer ledgers={ledgers} />
    </div>
  )
}

async function createLedger(formData: FormData) {
  "use server"

  const societyId = formData.get("societyId")?.toString().trim()
  const code = formData.get("code")?.toString().trim()
  const name = formData.get("name")?.toString().trim()
  const ledgerCode = formData.get("ledgerCode")?.toString().trim() || null
  const group = formData.get("group")?.toString().trim() || "EXPENSE"
  const parentLedgerId = formData.get("parentLedgerId")?.toString().trim() || null
  const description = formData.get("description")?.toString().trim() || null
  const rawOpeningBalance = formData.get("openingBalance")?.toString().trim()

  if (!societyId || !name) {
    throw new Error("Society and ledger name are required")
  }

  const openingBalance = rawOpeningBalance ? parseFloat(rawOpeningBalance) : 0
  const validOpening = !isNaN(openingBalance) ? openingBalance : 0

  const balanceType: BalanceType =
    group === "ASSET" || group === "EXPENSE" ? "DEBIT" : "CREDIT"

  await prisma.ledger.create({
    data: {
      societyId,
      name,
      code: ledgerCode,
      group: group as LedgerGroup,
      balanceType,
      parentLedgerId: parentLedgerId || null,
      openingBalance: validOpening,
      description,
      isSystem: false,
    },
  })

  revalidatePath(`/society/${code}/ledgers`)
}
