import Link from "next/link"
import { prisma } from "@/lib/prisma"
import {
  AdminPageHeader,
  AdminCard,
  AdminBadge,
  AdminStatCard,
  AdminTable,
  AdminButton,
} from "@/components/admin"
import { formatDateInAppTimeZone } from "@/lib/datetime"

export default async function ReportsPage() {
  const [
    billAggregate,
    paymentAggregate,
    billsByCategory,
    societiesWithFinancials,
    recentPayments,
  ] = await Promise.all([
    prisma.bill.aggregate({
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.bill.groupBy({
      by: ["billType"],
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.society.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { name: "asc" },
      include: {
        blocks: {
          select: {
            id: true,
            _count: { select: { flats: true } },
          },
        },
        bills: {
          select: {
            amount: true,
            status: true,
          },
        },
        payments: {
          select: {
            amount: true,
          },
        },
        _count: {
          select: {
            people: true,
            members: true,
            blocks: true,
          },
        },
      },
    }),
    prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        society: {
          select: { id: true, name: true, code: true },
        },
        paidBy: {
          select: { name: true },
        },
        bill: {
          select: {
            month: true,
            year: true,
            flat: { select: { number: true, block: { select: { name: true } } } },
          },
        },
      },
    }),
  ])

  const totalBilled = Number(billAggregate._sum.amount ?? 0)
  const totalCollected = Number(paymentAggregate._sum.amount ?? 0)
  const totalOutstanding = Math.max(0, totalBilled - totalCollected)
  const collectionRate =
    totalBilled === 0 ? 0 : Math.min(100, Math.round((totalCollected / totalBilled) * 100))

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-6 py-8 md:px-8">
      {/* Header */}
      <AdminPageHeader
        eyebrow="Platform Analytics & Intelligence"
        title="Reports & Financial Analytics"
        description="Comprehensive audit of platform receivables, collection efficiency, society balance sheets, and revenue streams."
      />

      {/* KPI Overview */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          title="Total Platform Billed"
          value={`₹${totalBilled.toLocaleString("en-IN")}`}
          subtitle={`${billAggregate._count._all} total invoices issued`}
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Total Collections"
          value={`₹${totalCollected.toLocaleString("en-IN")}`}
          subtitle={`${paymentAggregate._count._all} receipts recorded`}
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Outstanding Receivables"
          value={`₹${totalOutstanding.toLocaleString("en-IN")}`}
          subtitle="Pending across all tenants"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Collection Rate"
          value={`${collectionRate}%`}
          trend={{
            value: `${collectionRate}%`,
            direction: collectionRate >= 80 ? "up" : "down",
            label: collectionRate >= 80 ? "Healthy recovery" : "Needs attention",
          }}
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
      </div>

      {/* Society-by-Society Financial Health Table */}
      <AdminCard
        title="Society Financial Breakdown"
        description="Per-organization collection efficiency, billed revenue, and outstanding balance breakdown"
      >
        {societiesWithFinancials.length === 0 ? (
          <p className="py-6 text-center text-xs text-stone-500">
            No societies currently onboarded.
          </p>
        ) : (
          <AdminTable
            headers={[
              "Housing Society",
              "Units & Blocks",
              "Total Invoiced",
              "Total Collected",
              "Outstanding Balance",
              "Collection Rate",
              "Actions",
            ]}
            rows={societiesWithFinancials.map((society) => {
              const societyBilled = society.bills.reduce(
                (acc, b) => acc + Number(b.amount),
                0
              )
              const societyCollected = society.payments.reduce(
                (acc, p) => acc + Number(p.amount),
                0
              )
              const societyOutstanding = Math.max(0, societyBilled - societyCollected)
              const societyRate =
                societyBilled === 0
                  ? 0
                  : Math.min(100, Math.round((societyCollected / societyBilled) * 100))

              const totalFlats = society.blocks.reduce(
                (acc, b) => acc + b._count.flats,
                0
              )

              return (
                <tr
                  key={society.id}
                  className="border-t border-stone-100 transition-colors hover:bg-stone-50/70"
                >
                  {/* Society Name */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/societies/${society.id}`}
                        className="font-bold text-stone-950 text-sm hover:underline"
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

                  {/* Units & Blocks */}
                  <td className="px-4 py-3.5 text-xs text-stone-700">
                    <span className="font-semibold">{totalFlats}</span> Flats in{" "}
                    <span className="text-stone-500">{society._count.blocks} Blocks</span>
                  </td>

                  {/* Total Invoiced */}
                  <td className="px-4 py-3.5 text-xs font-semibold text-stone-900">
                    ₹{societyBilled.toLocaleString("en-IN")}
                  </td>

                  {/* Total Collected */}
                  <td className="px-4 py-3.5 text-xs font-semibold text-emerald-700">
                    ₹{societyCollected.toLocaleString("en-IN")}
                  </td>

                  {/* Outstanding */}
                  <td className="px-4 py-3.5 text-xs font-semibold text-rose-700">
                    ₹{societyOutstanding.toLocaleString("en-IN")}
                  </td>

                  {/* Rate */}
                  <td className="px-4 py-3.5">
                    <AdminBadge
                      variant={
                        societyRate >= 80
                          ? "success"
                          : societyRate >= 50
                            ? "warning"
                            : "danger"
                      }
                      size="sm"
                      dot
                    >
                      {societyRate}%
                    </AdminBadge>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3.5">
                    <AdminButton
                      href={`/society/${society.code || society.id}/reports`}
                      variant="outline"
                      size="xs"
                    >
                      Tenant Report ↗
                    </AdminButton>
                  </td>
                </tr>
              )
            })}
          />
        )}
      </AdminCard>

      {/* Grid: Revenue Categories & Recent Collections */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Revenue Categories */}
        <AdminCard
          title="Revenue Assessment by Category"
          description="Distribution of generated demands across assessment types"
        >
          {billsByCategory.length === 0 ? (
            <p className="py-6 text-center text-xs text-stone-500">
              No bills recorded yet.
            </p>
          ) : (
            <div className="space-y-3">
              {billsByCategory.map((cat) => {
                const categoryAmount = Number(cat._sum.amount ?? 0)
                const pct =
                  totalBilled > 0 ? Math.round((categoryAmount / totalBilled) * 100) : 0

                return (
                  <div
                    key={cat.billType}
                    className="rounded-2xl border border-stone-100 bg-stone-50/60 p-3.5 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-stone-900">
                        {cat.billType.replace(/_/g, " ")}
                      </span>
                      <span className="text-stone-950 font-bold">
                        ₹{categoryAmount.toLocaleString("en-IN")} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-stone-200 overflow-hidden">
                      <div
                        className="h-full bg-stone-900 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-stone-500">
                      {cat._count._all} invoices generated
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </AdminCard>

        {/* Recent Collections */}
        <AdminCard
          title="Latest Collection Receipts"
          description="Most recent payment transactions across all societies"
        >
          {recentPayments.length === 0 ? (
            <p className="py-6 text-center text-xs text-stone-500">
              No payments recorded yet.
            </p>
          ) : (
            <AdminTable
              headers={["Receipt #", "Resident & Society", "Amount", "Date"]}
              rows={recentPayments.map((p) => (
                <tr key={p.id} className="border-t border-stone-100 hover:bg-stone-50/60">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-stone-900">
                    {p.receiptNumber || `#${p.id.slice(0, 8)}`}
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-800">
                    <p className="font-medium">{p.paidBy?.name || "Resident"}</p>
                    <p className="text-[11px] text-stone-500">
                      {p.society.name} ({p.bill?.flat?.number ? `Flat ${p.bill.flat.number}` : "Unit"})
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs font-bold text-emerald-700">
                    ₹{Number(p.amount).toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-500">
                    {formatDateInAppTimeZone(p.createdAt)}
                  </td>
                </tr>
              ))}
            />
          )}
        </AdminCard>
      </div>
    </div>
  )
}
