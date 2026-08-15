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
import { formatDateInAppTimeZone } from "@/lib/datetime"

export default async function BillsPage() {
  const [bills, totalBilledAggregate, paidAggregate, overdueCount] = await Promise.all([
    prisma.bill.findMany({
      orderBy: [
        { year: "desc" },
        { month: "desc" },
        { createdAt: "desc" },
      ],
      include: {
        society: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        flat: {
          select: {
            number: true,
            block: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    }),
    prisma.bill.aggregate({
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.payment.aggregate({
      _sum: { amount: true },
    }),
    prisma.bill.count({
      where: { status: "OVERDUE" },
    }),
  ])

  const totalBilled = Number(totalBilledAggregate._sum.amount ?? 0)
  const totalCollected = Number(paidAggregate._sum.amount ?? 0)
  const totalOutstanding = Math.max(0, totalBilled - totalCollected)
  const collectionRate =
    totalBilled === 0 ? 0 : Math.min(100, Math.round((totalCollected / totalBilled) * 100))

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-6 py-8 md:px-8">
      {/* Header */}
      <AdminPageHeader
        eyebrow="Financial Operations"
        title="Bills & Maintenance Invoices"
        description="Comprehensive ledger of monthly maintenance demands, utility assessments, and statutory bills."
        action={
          <AdminButton href="/admin/bills/new" variant="primary" size="md">
            + New Bill
          </AdminButton>
        }
      />

      {/* KPI Overview */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          title="Total Billed"
          value={`₹${totalBilled.toLocaleString("en-IN")}`}
          subtitle={`${totalBilledAggregate._count._all} total invoices issued`}
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Total Collections"
          value={`₹${totalCollected.toLocaleString("en-IN")}`}
          subtitle={`${collectionRate}% overall collection rate`}
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Outstanding Receivables"
          value={`₹${totalOutstanding.toLocaleString("en-IN")}`}
          subtitle="Pending collection across units"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Overdue Bills"
          value={overdueCount}
          subtitle="Past due payment date"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Bills Table */}
      {bills.length === 0 ? (
        <AdminEmptyState
          title="No bills generated yet"
          description="Create your first monthly maintenance invoice or utility bill."
          action={
            <AdminButton href="/admin/bills/new" variant="primary">
              + Generate First Bill
            </AdminButton>
          }
        />
      ) : (
        <AdminTable
          headers={[
            "Bill # & Period",
            "Society & Block / Flat",
            "Bill Type",
            "Amount",
            "Due Date",
            "Status",
            "Actions",
          ]}
          rows={bills.map((bill) => {
            const society = bill.society

            return (
              <tr
                key={bill.id}
                className="border-t border-stone-100 transition-colors hover:bg-stone-50/70"
              >
                {/* Bill # & Period */}
                <td className="px-4 py-3.5">
                  <span className="font-mono font-bold text-stone-950 text-xs block">
                    {bill.billNumber || `#${bill.month}/${bill.year}`}
                  </span>
                  <span className="text-[11px] text-stone-500">
                    Period: {bill.month}/{bill.year}
                  </span>
                </td>

                {/* Society & Flat */}
                <td className="px-4 py-3.5">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-stone-900 text-xs block">
                      {bill.flat.block.name} - {bill.flat.number}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/admin/societies/${society.id}`}
                        className="text-xs text-stone-600 hover:underline truncate max-w-[140px]"
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
                  </div>
                </td>

                {/* Bill Type */}
                <td className="px-4 py-3.5">
                  <AdminBadge variant="purple" size="sm">
                    {bill.billType.replace(/_/g, " ")}
                  </AdminBadge>
                </td>

                {/* Amount */}
                <td className="px-4 py-3.5 text-xs font-bold text-stone-950">
                  ₹{Number(bill.amount).toLocaleString("en-IN")}
                </td>

                {/* Due Date */}
                <td className="px-4 py-3.5 text-xs text-stone-600">
                  {bill.dueDate ? formatDateInAppTimeZone(bill.dueDate) : "—"}
                </td>

                {/* Status */}
                <td className="px-4 py-3.5">
                  <AdminBadge
                    variant={
                      bill.status === "PAID"
                        ? "success"
                        : bill.status === "OVERDUE"
                          ? "danger"
                          : bill.status === "PARTIALLY_PAID"
                            ? "info"
                            : "warning"
                    }
                    size="sm"
                    dot
                  >
                    {bill.status}
                  </AdminBadge>
                </td>

                {/* Actions */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <AdminButton
                      href={`/society/${society.code || society.id}/bills`}
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
