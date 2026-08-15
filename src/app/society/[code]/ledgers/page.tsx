import { notFound } from "next/navigation"
import { revalidatePath } from "next/cache"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { prisma } from "@/lib/prisma"
import { seedSocietyChartOfAccounts } from "@/lib/chartOfAccounts"
import type { LedgerGroup, BalanceType } from "@/generated/prisma/client"

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

  let ledgers = await prisma.ledger.findMany({
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

  // Group into standard accounting buckets
  const assets = ledgers.filter((l) => l.group === "ASSET")
  const liabilities = ledgers.filter((l) => l.group === "LIABILITY")
  const income = ledgers.filter((l) => l.group === "INCOME")
  const expenses = ledgers.filter((l) => l.group === "EXPENSE")
  const equity = ledgers.filter((l) => l.group === "EQUITY")

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
          <p className="mt-1 text-2xl font-bold text-stone-950">{assets.length}</p>
          <p className="text-[10px] text-stone-400">Bank, Cash, Receivables</p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-purple-700">Liabilities</p>
          <p className="mt-1 text-2xl font-bold text-stone-950">{liabilities.length}</p>
          <p className="text-[10px] text-stone-400">Creditors, Caution Deposits</p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Income</p>
          <p className="mt-1 text-2xl font-bold text-stone-950">{income.length}</p>
          <p className="text-[10px] text-stone-400">Maintenance, Non-Occupancy</p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-700">Expenses</p>
          <p className="mt-1 text-2xl font-bold text-stone-950">{expenses.length}</p>
          <p className="text-[10px] text-stone-400">Security, AMCs, Common Power</p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">Equity</p>
          <p className="mt-1 text-2xl font-bold text-stone-950">{equity.length}</p>
          <p className="text-[10px] text-stone-400">Corpus & Sinking Reserves</p>
        </div>
      </div>

      {/* Add Custom Ledger Form */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-stone-950 mb-1">
          + Create Custom Ledger
        </h2>
        <p className="text-xs text-stone-500 mb-5">
          Add specific expense, revenue, or balance sheet heads unique to your society.
        </p>

        <form action={createLedger} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <input type="hidden" name="societyId" value={society.id} />
          <input type="hidden" name="code" value={code} />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Ledger Name *
            </label>
            <input
              type="text"
              name="name"
              required
              placeholder="e.g. Solar Rooftop Subsidies"
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
              placeholder="e.g. 4085"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs font-mono text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Group *
            </label>
            <select
              name="group"
              defaultValue="EXPENSE"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            >
              <option value="ASSET">Asset (Debit balance)</option>
              <option value="LIABILITY">Liability (Credit balance)</option>
              <option value="INCOME">Income (Credit balance)</option>
              <option value="EXPENSE">Expense (Debit balance)</option>
              <option value="EQUITY">Equity (Credit balance)</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-xl bg-stone-950 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-stone-800"
            >
              Save Ledger Head
            </button>
          </div>
        </form>
      </div>

      {/* Ledger Tables by Group */}
      <div className="space-y-6">
        <LedgerGroupTable title="Income Heads (Revenue)" color="emerald" groupLedgers={income} />
        <LedgerGroupTable title="Expense Heads (Expenditures)" color="rose" groupLedgers={expenses} />
        <LedgerGroupTable title="Assets (Current & Fixed)" color="blue" groupLedgers={assets} />
        <LedgerGroupTable title="Liabilities & Caution Deposits" color="purple" groupLedgers={liabilities} />
        <LedgerGroupTable title="Equity & Capital Reserves" color="amber" groupLedgers={equity} />
      </div>
    </div>
  )
}

function LedgerGroupTable({
  title,
  color,
  groupLedgers,
}: {
  title: string
  color: string
  groupLedgers: any[]
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-stone-200 bg-stone-50/70 px-6 py-3.5 flex items-center justify-between">
        <h3 className="text-sm font-bold text-stone-950">{title}</h3>
        <span className="text-xs font-semibold text-stone-500">{groupLedgers.length} ledgers</span>
      </div>

      {groupLedgers.length === 0 ? (
        <div className="p-8 text-center text-xs text-stone-400">
          No ledgers under this category.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="border-b border-stone-100 bg-stone-50/30 text-[10px] font-semibold uppercase tracking-wider text-stone-500">
              <tr>
                <th className="px-4 py-2.5">Code</th>
                <th className="px-4 py-2.5">Ledger Name</th>
                <th className="px-4 py-2.5">Parent Classification</th>
                <th className="px-4 py-2.5">Nature</th>
                <th className="px-4 py-2.5">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {groupLedgers.map((l) => (
                <tr key={l.id} className="hover:bg-stone-50/60 transition">
                  <td className="px-4 py-3 font-mono font-bold text-stone-700">
                    {l.code || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-stone-950 block">{l.name}</span>
                    {l.description ? (
                      <span className="text-[10px] text-stone-500">{l.description}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    {l.parentLedger?.name || <span className="text-stone-400">— Primary Head —</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] font-medium text-stone-700">
                    {l.balanceType}
                  </td>
                  <td className="px-4 py-3">
                    {l.isSystem ? (
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[9px] font-bold text-stone-600">
                        STANDARD
                      </span>
                    ) : (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-700 border border-blue-200">
                        CUSTOM
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
  )
}

async function createLedger(formData: FormData) {
  "use server"

  const societyId = formData.get("societyId")?.toString().trim()
  const code = formData.get("code")?.toString().trim()
  const name = formData.get("name")?.toString().trim()
  const ledgerCode = formData.get("ledgerCode")?.toString().trim() || null
  const group = formData.get("group")?.toString().trim() || "EXPENSE"

  if (!societyId || !name) {
    throw new Error("Society and ledger name are required")
  }

  const balanceType: BalanceType =
    group === "ASSET" || group === "EXPENSE" ? "DEBIT" : "CREDIT"

  await prisma.ledger.create({
    data: {
      societyId,
      name,
      code: ledgerCode,
      group: group as LedgerGroup,
      balanceType,
      isSystem: false,
    },
  })

  revalidatePath(`/society/${code}/ledgers`)
}
