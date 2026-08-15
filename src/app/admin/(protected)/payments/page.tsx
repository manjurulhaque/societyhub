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

export default async function PaymentsPage() {
  const [payments, totalCollectionsAggregate, upiCount, chequeCount, cashCount] = await Promise.all([
    prisma.payment.findMany({
      orderBy: {
        paidOn: "desc",
      },
      include: {
        society: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        bill: {
          select: {
            id: true,
            billNumber: true,
            year: true,
            month: true,
            amount: true,
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
        },
        paidBy: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.payment.count({
      where: { mode: "UPI" },
    }),
    prisma.payment.count({
      where: { mode: "CHEQUE" },
    }),
    prisma.payment.count({
      where: { mode: "CASH" },
    }),
  ])

  const totalCollected = Number(totalCollectionsAggregate._sum.amount ?? 0)
  const totalTransactions = totalCollectionsAggregate._count._all

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-6 py-8 md:px-8">
      {/* Header */}
      <AdminPageHeader
        eyebrow="Financial Collections"
        title="Payments & Receipts"
        description="Audit ledger of all maintenance fee collections, bank transfers, cheques, and cash receipts across societies."
        action={
          <AdminButton href="/admin/payments/new" variant="primary" size="md">
            + Record Payment
          </AdminButton>
        }
      />

      {/* KPI Overview */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          title="Total Collections"
          value={`₹${totalCollected.toLocaleString("en-IN")}`}
          subtitle={`${totalTransactions} total receipts processed`}
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <AdminStatCard
          title="UPI & Digital"
          value={upiCount}
          subtitle="Instant online receipts"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Cheque Deposits"
          value={chequeCount}
          subtitle="Bank cheque clearance"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Cash Receipts"
          value={cashCount}
          subtitle="Direct office collections"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />
      </div>

      {/* Payments Table */}
      {payments.length === 0 ? (
        <AdminEmptyState
          title="No payments recorded yet"
          description="Record your first maintenance payment receipt or bank collection."
          action={
            <AdminButton href="/admin/payments/new" variant="primary">
              + Record First Payment
            </AdminButton>
          }
        />
      ) : (
        <AdminTable
          headers={[
            "Receipt # & Date",
            "Payer & Unit",
            "Housing Society",
            "Linked Period",
            "Payment Mode",
            "Amount Paid",
            "Status",
            "Reference / UTR",
          ]}
          rows={payments.map((payment) => {
            const society = payment.society
            const payerName = payment.paidBy?.name || "Resident"
            const flat = payment.bill?.flat

            return (
              <tr
                key={payment.id}
                className="border-t border-stone-100 transition-colors hover:bg-stone-50/70"
              >
                {/* Receipt # & Date */}
                <td className="px-4 py-3.5">
                  <span className="font-mono font-bold text-stone-950 text-xs block">
                    {payment.receiptNumber || `#${payment.id.slice(0, 8)}`}
                  </span>
                  <span className="text-[11px] text-stone-500">
                    {formatDateInAppTimeZone(payment.paidOn)}
                  </span>
                </td>

                {/* Payer & Unit */}
                <td className="px-4 py-3.5">
                  <span className="font-semibold text-stone-950 text-xs block">
                    {payerName}
                  </span>
                  {flat ? (
                    <span className="text-[11px] text-stone-600">
                      {flat.block.name} - {flat.number}
                    </span>
                  ) : null}
                </td>

                {/* Society */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/admin/societies/${society.id}`}
                      className="text-xs font-medium text-stone-900 hover:underline truncate max-w-[130px]"
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

                {/* Linked Bill Period */}
                <td className="px-4 py-3.5 text-xs text-stone-700">
                  {payment.bill ? (
                    <span>
                      {payment.bill.month}/{payment.bill.year}
                    </span>
                  ) : (
                    <span className="text-stone-400">—</span>
                  )}
                </td>

                {/* Mode */}
                <td className="px-4 py-3.5">
                  <AdminBadge
                    variant={
                      payment.mode === "UPI"
                        ? "purple"
                        : payment.mode === "CHEQUE"
                          ? "warning"
                          : payment.mode === "CASH"
                            ? "neutral"
                            : "info"
                    }
                    size="sm"
                  >
                    {payment.mode}
                  </AdminBadge>
                </td>

                {/* Amount Paid */}
                <td className="px-4 py-3.5 text-xs font-bold text-emerald-700">
                  ₹{Number(payment.amount).toLocaleString("en-IN")}
                </td>

                {/* Status */}
                <td className="px-4 py-3.5">
                  <AdminBadge
                    variant={
                      payment.status === "SUCCESS"
                        ? "success"
                        : payment.status === "FAILED"
                          ? "danger"
                          : "warning"
                    }
                    size="sm"
                    dot
                  >
                    {payment.status}
                  </AdminBadge>
                </td>

                {/* Reference */}
                <td className="px-4 py-3.5 font-mono text-[11px] text-stone-600 max-w-[120px] truncate" title={payment.reference || ""}>
                  {payment.reference || "—"}
                </td>
              </tr>
            )
          })}
        />
      )}
    </div>
  )
}
