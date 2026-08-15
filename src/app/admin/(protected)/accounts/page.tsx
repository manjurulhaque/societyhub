import Link from "next/link"
import { prisma } from "@/lib/prisma"
import {
  AdminPageHeader,
  AdminTable,
  AdminBadge,
  AdminStatCard,
  AdminButton,
  AdminEmptyState,
} from "@/components/admin"

export default async function AccountsPage() {
  const [accounts, totalBalanceAggregate, bankCount, cashCount] = await Promise.all([
    prisma.account.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: [
        { society: { name: "asc" } },
        { name: "asc" },
      ],
      include: {
        society: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        _count: {
          select: {
            payments: true,
            expenses: true,
            chequeRegisters: true,
          },
        },
      },
    }),
    prisma.account.aggregate({
      where: { isActive: true, deletedAt: null },
      _sum: { currentBalance: true },
      _count: { _all: true },
    }),
    prisma.account.count({
      where: { accountType: "BANK", isActive: true, deletedAt: null },
    }),
    prisma.account.count({
      where: {
        accountType: { in: ["CASH", "PETTY_CASH"] },
        isActive: true,
        deletedAt: null,
      },
    }),
  ])

  const totalBalance = Number(totalBalanceAggregate._sum.currentBalance ?? 0)
  const totalAccounts = accounts.length

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-6 py-8 md:px-8">
      {/* Header */}
      <AdminPageHeader
        eyebrow="Treasury & Liquid Funds"
        title="Bank & Cash Accounts"
        description="Comprehensive directory of society operational bank accounts, sinking fund savings, and cash in hand registers."
        action={
          <AdminButton href="/admin/accounts/new" variant="primary" size="md">
            + New Account
          </AdminButton>
        }
      />

      {/* KPI Overview */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          title="Total Liquid Assets"
          value={`₹${totalBalance.toLocaleString("en-IN")}`}
          subtitle={`Across ${totalAccounts} configured accounts`}
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Bank Accounts"
          value={bankCount}
          subtitle="Operational & reserve bank savings"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Cash & Petty Cash Floats"
          value={cashCount}
          subtitle="Physical cash in hand floats"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Total Accounts"
          value={totalAccounts}
          subtitle="Active treasury accounts"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />
      </div>

      {/* Accounts Table */}
      {accounts.length === 0 ? (
        <AdminEmptyState
          title="No bank or cash accounts configured yet"
          description="Create your first society operational bank account or cash ledger."
          action={
            <AdminButton href="/admin/accounts/new" variant="primary">
              + Create First Account
            </AdminButton>
          }
        />
      ) : (
        <AdminTable
          headers={[
            "Account Name & Type",
            "Housing Society",
            "Bank Details / Account #",
            "IFSC / Branch",
            "Current Balance",
            "Default A/C",
            "Actions",
          ]}
          rows={accounts.map((acc) => {
            const society = acc.society

            return (
              <tr
                key={acc.id}
                className="border-t border-stone-100 transition-colors hover:bg-stone-50/70"
              >
                {/* Account Name & Type */}
                <td className="px-4 py-3.5">
                  <span className="font-bold text-stone-950 text-sm block">
                    {acc.name}
                  </span>
                  <div className="mt-1">
                    <AdminBadge
                      variant={
                        acc.accountType === "BANK"
                          ? "purple"
                          : acc.accountType === "PETTY_CASH"
                            ? "warning"
                            : "info"
                      }
                      size="sm"
                    >
                      {acc.accountType.replace(/_/g, " ")}
                    </AdminBadge>
                  </div>
                </td>

                {/* Society */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/admin/societies/${society.id}`}
                      className="text-xs font-medium text-stone-900 hover:underline truncate max-w-[140px]"
                      title={society.name}
                    >
                      {society.name}
                    </Link>
                    {society.code ? (
                      <AdminBadge variant="neutral" size="sm">
                        {society.code}
                      </AdminBadge>
                    ) : null}
                  </div>
                </td>

                {/* Bank Name & Account Number */}
                <td className="px-4 py-3.5 text-xs text-stone-800">
                  {acc.bankName ? (
                    <span className="font-semibold block">{acc.bankName}</span>
                  ) : null}
                  {acc.accountNumber ? (
                    <span className="font-mono text-stone-600 block">
                      A/C: {acc.accountNumber}
                    </span>
                  ) : (
                    <span className="text-stone-400">—</span>
                  )}
                </td>

                {/* IFSC & Branch */}
                <td className="px-4 py-3.5 text-xs text-stone-600">
                  {acc.ifscCode ? <p className="font-mono font-medium">{acc.ifscCode}</p> : null}
                  {acc.branch ? <p className="text-stone-500">{acc.branch}</p> : null}
                  {!acc.ifscCode && !acc.branch ? <span className="text-stone-400">—</span> : null}
                </td>

                {/* Current Balance */}
                <td className="px-4 py-3.5 text-xs font-bold text-emerald-700">
                  ₹{Number(acc.currentBalance).toLocaleString("en-IN")}
                </td>

                {/* Default Flag */}
                <td className="px-4 py-3.5">
                  {acc.isDefault ? (
                    <AdminBadge variant="success" size="sm" dot>
                      PRIMARY
                    </AdminBadge>
                  ) : (
                    <span className="text-xs text-stone-400">—</span>
                  )}
                </td>

                {/* Actions */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <AdminButton
                      href={`/society/${society.code || society.id}/accounts`}
                      variant="outline"
                      size="xs"
                    >
                      Society Ledger ↗
                    </AdminButton>
                  </div>
                </td>
              </tr>
            )
          })}
        />
      )}
    </div>
  )
}
