import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

export const metadata: Metadata = { title: "Bank Accounts" }
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { prisma } from "@/lib/prisma"
import { maskBankAccount } from "@/lib/masking"


export default async function SocietyAccountsPage({
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

  const accounts = await prisma.account.findMany({
    where: {
      societyId: society.id,
      isActive: true,
      deletedAt: null,
    },
    orderBy: [
      { isDefault: "desc" },
      { name: "asc" },
    ],
    include: {
      _count: {
        select: {
          payments: true,
          expenses: true,
          chequeRegisters: true,
          pettyCashEntries: true,
        },
      },
    },
  })

  const totalBalance = accounts.reduce((acc, a) => acc + Number(a.currentBalance), 0)
  const bankBalance = accounts
    .filter((a) => a.accountType === "BANK")
    .reduce((acc, a) => acc + Number(a.currentBalance), 0)
  const cashBalance = accounts
    .filter((a) => a.accountType !== "BANK")
    .reduce((acc, a) => acc + Number(a.currentBalance), 0)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="inline-flex items-center rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-stone-600">
            Treasury & Banking
          </span>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-stone-900 md:text-3xl">
            Bank & Cash Accounts
          </h1>
          <p className="text-sm text-stone-500">
            Manage operational bank accounts, sinking fund savings, and cash in hand registers for {society.name}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/society/${code}/accounts/reconciliation`}
            className="inline-flex items-center justify-center rounded-full border border-stone-200 bg-white px-4 py-2.5 text-xs font-semibold text-stone-700 shadow-xs transition hover:bg-stone-50"
          >
            ⚖️ Bank Reconciliation (BRS) →
          </Link>
          <Link
            href={`/society/${code}/accounts/new`}
            className="inline-flex items-center justify-center rounded-full bg-stone-950 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-stone-800"
          >
            + Add Account
          </Link>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
            Total Liquid Balance
          </p>
          <p className="mt-2 text-2xl font-bold text-stone-950">
            ₹{totalBalance.toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            Across {accounts.length} active accounts
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
            Bank Deposits & Reserves
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">
            ₹{bankBalance.toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            {accounts.filter((a) => a.accountType === "BANK").length} bank accounts
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
            Cash & Petty Cash Floats
          </p>
          <p className="mt-2 text-2xl font-bold text-stone-900">
            ₹{cashBalance.toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            Physical cash in hand
          </p>
        </div>
      </div>

      {/* Accounts List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-stone-900">Configured Accounts</h2>
          <span className="text-xs text-stone-500">{accounts.length} accounts</span>
        </div>

        {accounts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50/50 p-12 text-center">
            <h3 className="text-sm font-semibold text-stone-900">No accounts configured</h3>
            <p className="mt-1 text-xs text-stone-500">
              Add your society&apos;s primary operational bank account or cash ledger.
            </p>

            <div className="mt-5">
              <Link
                href={`/society/${code}/accounts/new`}
                className="rounded-full bg-stone-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-stone-800"
              >
                + Add First Account
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:border-stone-300 hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-stone-950 text-base">{acc.name}</h3>
                        {acc.isDefault ? (
                          <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                            PRIMARY
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-xs text-stone-500">
                        {acc.accountType.replace(/_/g, " ")}
                      </p>
                    </div>

                    <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700">
                      {acc.accountType === "BANK" ? "🏦 Bank" : "💵 Cash"}
                    </span>
                  </div>

                  {acc.accountType === "BANK" ? (
                    <div className="mt-4 space-y-1.5 rounded-xl bg-stone-50 p-3.5 text-xs">
                      {acc.bankName ? (
                        <div className="flex justify-between text-stone-700">
                          <span className="text-stone-500">Bank:</span>
                          <span className="font-semibold">{acc.bankName}</span>
                        </div>
                      ) : null}
                      {acc.accountNumber ? (
                        <div className="flex justify-between text-stone-700">
                          <span className="text-stone-500">Account Number:</span>
                          <span className="font-mono font-bold">{maskBankAccount(acc.accountNumber)}</span>
                        </div>
                      ) : null}

                      {acc.ifscCode ? (
                        <div className="flex justify-between text-stone-700">
                          <span className="text-stone-500">IFSC Code:</span>
                          <span className="font-mono">{acc.ifscCode}</span>
                        </div>
                      ) : null}
                      {acc.branch ? (
                        <div className="flex justify-between text-stone-700">
                          <span className="text-stone-500">Branch:</span>
                          <span>{acc.branch}</span>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="mt-6 border-t border-stone-100 pt-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-stone-500">
                      Current Ledger Balance
                    </p>
                    <p className="text-lg font-bold text-emerald-700">
                      ₹{Number(acc.currentBalance).toLocaleString("en-IN")}
                    </p>
                  </div>

                  <div className="text-right text-[11px] text-stone-500">
                    <p>{acc._count.payments} collections</p>
                    <p>{acc._count.expenses} expenses</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
