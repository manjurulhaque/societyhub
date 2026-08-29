import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

export const metadata: Metadata = { title: "Chart of Accounts" }
import { revalidatePath } from "next/cache"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { requireCommitteeAccess, FINANCIAL_ROLES } from "@/lib/auth/requireAuth"
import { recordAuditLog } from "@/lib/audit"
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

  const [rawLedgers, currentFY] = await Promise.all([
    prisma.ledger.findMany({
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
    }),
    prisma.financialYear.findFirst({
      where: { societyId: society.id, isCurrent: true },
      select: { id: true, name: true, startDate: true, endDate: true, isLocked: true },
    }),
  ])

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
      const authContext = await requireCommitteeAccess(code, FINANCIAL_ROLES)
      await seedSocietyChartOfAccounts(authContext.society.id)


      await recordAuditLog({
        societyId: authContext.society.id,
        userId: authContext.user.id,
        action: "UPDATE",
        entity: "Ledger",
        description: `${authContext.user.email} re-initialized / refreshed standard chart of accounts`,
      })

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

        <div className="flex items-center gap-2">
          <Link
            href={`/society/${code}/ledgers/vouchers`}
            className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-800 shadow-sm transition hover:bg-stone-50"
          >
            📋 Journal Vouchers Register →
          </Link>

          <form action={handleSeedChart}>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-800 shadow-sm transition hover:bg-stone-50"
            >
              ⚡ {ledgers.length === 0 ? "Initialize Standard Chart" : "Refresh Standard Ledgers"}
            </button>
          </form>
        </div>
      </div>

      {/* Active Financial Year Context Bar */}
      {currentFY && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-stone-200 bg-white px-5 py-3.5 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100 shrink-0" />
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Active Financial Year Cycle
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-stone-950">
                  {currentFY.name}
                </span>
                <span className="text-xs text-stone-500 font-medium">
                  ({new Date(currentFY.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} – {new Date(currentFY.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })})
                </span>
                {currentFY.isLocked ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                    AUDIT FROZEN
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    OPEN FOR POSTING
                  </span>
                )}
              </div>
            </div>
          </div>
          <Link
            href={`/society/${code}/settings/financial-years`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-stone-700 hover:text-stone-900 transition"
          >
            Manage Accounting Cycles →
          </Link>
        </div>
      )}

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

import { sanitizeText } from "@/lib/sanitize"

async function createLedger(formData: FormData) {
  "use server"

  const code = formData.get("code")?.toString().trim()
  if (!code) throw new Error("Society code is required")

  const authContext = await requireCommitteeAccess(code, FINANCIAL_ROLES)
  const verifiedSocietyId = authContext.society.id

  const rawName = formData.get("name")?.toString().trim()
  const name = sanitizeText(rawName)
  const rawLedgerCode = formData.get("ledgerCode")?.toString().trim() || null
  const ledgerCode = rawLedgerCode ? sanitizeText(rawLedgerCode) : null
  const group = formData.get("group")?.toString().trim() || "EXPENSE"
  const parentLedgerId = formData.get("parentLedgerId")?.toString().trim() || null
  const rawDesc = formData.get("description")?.toString().trim() || null
  const description = rawDesc ? sanitizeText(rawDesc) : null
  const rawOpeningBalance = formData.get("openingBalance")?.toString().trim()

  if (!name) {
    throw new Error("Ledger name is required")
  }

  // If parentLedgerId specified, verify it belongs to this society
  if (parentLedgerId) {
    const parent = await prisma.ledger.findFirst({
      where: { id: parentLedgerId, societyId: verifiedSocietyId },
    })
    if (!parent) {
      throw new Error("Parent ledger not found in this society")
    }
  }

  const openingBalance = rawOpeningBalance ? parseFloat(rawOpeningBalance) : 0
  const validOpening = !isNaN(openingBalance) ? openingBalance : 0

  const balanceType: BalanceType =
    group === "ASSET" || group === "EXPENSE" ? "DEBIT" : "CREDIT"

  const ledger = await prisma.ledger.create({
    data: {
      societyId: verifiedSocietyId,
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

  await recordAuditLog({
    societyId: verifiedSocietyId,
    userId: authContext.user.id,
    action: "CREATE",
    entity: "Ledger",
    entityId: ledger.id,
    description: `${authContext.user.email} created custom ledger ${name} (${group})`,
    newData: { name, code: ledgerCode, group, openingBalance: validOpening },
  })

  revalidatePath(`/society/${code}/ledgers`)
}

