import Link from "next/link"
import { notFound } from "next/navigation"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { canApproveDataEntry, isManagerRole } from "@/lib/auth/requireAuth"
import { prisma } from "@/lib/prisma"
import {
  AdminPageHeader,
  AdminStatCard,
  AdminCard,
  AdminBadge,
  AdminTable,
  AdminButton,
} from "@/components/admin"
import { formatDateInAppTimeZone } from "@/lib/datetime"

export default async function SocietyDashboardPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const context = await getSocietyAdmin(code)

  if (!context) {
    notFound()
  }

  const { society, designation, isSuperAdmin } = context
  const isApprover = canApproveDataEntry(designation, isSuperAdmin)
  const isManager = isManagerRole(designation, isSuperAdmin)
  const societyId = society.id
  const societyCode = society.code || society.id

  const [
    totalFlats,
    occupiedFlats,
    totalPeople,
    totalMembers,
    billTotal,
    paymentTotal,
    recentBills,
    recentPayments,
    blocks,
    pendingExpenseData,
  ] = await Promise.all([
    prisma.flat.count({
      where: { block: { societyId }, isActive: true, deletedAt: null },
    }),

    prisma.flat.count({
      where: {
        block: { societyId },
        status: "OCCUPIED",
        isActive: true,
        deletedAt: null,
      },
    }),

    prisma.person.count({
      where: { societyId, isActive: true, deletedAt: null },
    }),

    prisma.societyMember.count({
      where: { societyId },
    }),

    prisma.bill.aggregate({
      where: { societyId },
      _sum: { amount: true },
    }),

    prisma.payment.aggregate({
      where: { societyId },
      _sum: { amount: true },
    }),

    prisma.bill.findMany({
      where: { societyId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        flat: {
          select: {
            number: true,
            block: { select: { name: true } },
          },
        },
      },
    }),

    prisma.payment.findMany({
      where: { societyId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        paidBy: { select: { name: true } },
        bill: {
          select: {
            year: true,
            month: true,
            flat: {
              select: {
                number: true,
                block: { select: { name: true } },
              },
            },
          },
        },
      },
    }),

    prisma.block.findMany({
      where: { societyId, isActive: true, deletedAt: null },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { flats: true },
        },
      },
    }),

    prisma.expense.aggregate({
      where: { societyId, status: "PENDING" },
      _count: { _all: true },
      _sum: { amount: true },
    }),
  ])

  const pendingCount = pendingExpenseData._count._all
  const pendingAmount = Number(pendingExpenseData._sum.amount ?? 0)

  const totalBilled = Number(billTotal._sum.amount ?? 0)
  const totalCollected = Number(paymentTotal._sum.amount ?? 0)
  const outstanding = Math.max(0, totalBilled - totalCollected)
  const collectionRate =
    totalBilled === 0 ? 0 : Math.min(100, Math.round((totalCollected / totalBilled) * 100))

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 sm:py-8 md:px-8">
      {/* Header */}
      <AdminPageHeader
        eyebrow="Society Overview"
        title={society.name}
        description={`Manage properties, residents, monthly maintenance billing, and payments for ${society.name}.`}
        action={
          <div className="flex flex-wrap gap-2">
            <AdminButton variant="outline" size="sm" href={`/society/${societyCode}/bills`}>
              View Bills
            </AdminButton>
            <AdminButton variant="primary" size="sm" href={`/society/${societyCode}/payments`}>
              + Record Payment
            </AdminButton>
          </div>
        }
      />

      {/* Governance & Approvals Banner */}
      {pendingCount > 0 && isApprover ? (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-200/80 text-amber-900 font-bold text-sm">
              {pendingCount}
            </div>
            <div>
              <p className="text-sm font-bold text-amber-950">
                Action Required: {pendingCount} Manager Data Entry Voucher{pendingCount > 1 ? "s" : ""} Pending Approval
              </p>
              <p className="text-xs text-amber-800 mt-0.5">
                Totaling ₹{pendingAmount.toLocaleString("en-IN")}. As Hon. {designation}, your review and sign-off is required to disburse funds.
              </p>
            </div>
          </div>
          <Link
            href={`/society/${societyCode}/approvals`}
            className="inline-flex items-center justify-center rounded-full bg-amber-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-amber-800 transition shrink-0"
          >
            Open Approvals Queue ({pendingCount}) →
          </Link>
        </div>
      ) : isManager && pendingCount > 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-100/80 p-4 text-stone-800 text-xs shadow-sm">
          <svg className="h-5 w-5 shrink-0 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            You have <strong className="font-semibold text-stone-950">{pendingCount} voucher(s)</strong> awaiting Treasurer/Secretary approval.
          </div>
        </div>
      ) : null}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          title="Total Flats"
          value={totalFlats}
          subtitle={`${occupiedFlats} Occupied (${totalFlats > 0 ? Math.round((occupiedFlats / totalFlats) * 100) : 0}%)`}
          href={`/society/${societyCode}/flats`}
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />

        <AdminStatCard
          title="Total Residents"
          value={totalPeople}
          subtitle={`${totalMembers} Committee Members`}
          href={`/society/${societyCode}/members`}
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Total Billed"
          value={`₹${totalBilled.toLocaleString("en-IN")}`}
          subtitle={`Total Collections: ₹${totalCollected.toLocaleString("en-IN")}`}
          href={`/society/${societyCode}/bills`}
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Outstanding Dues"
          value={`₹${outstanding.toLocaleString("en-IN")}`}
          trend={{
            value: `${collectionRate}%`,
            direction: collectionRate >= 80 ? "up" : "down",
            label: "collection rate",
          }}
          href={`/society/${societyCode}/reports`}
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Blocks Overview */}
      {blocks.length > 0 ? (
        <AdminCard
          title="Society Blocks & Buildings"
          description="Property structures configured in this society"
          action={
            <Link
              href={`/society/${societyCode}/flats`}
              className="text-xs font-semibold text-stone-900 hover:text-stone-700"
            >
              View All Flats →
            </Link>
          }
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {blocks.map((b) => (
              <div
                key={b.id}
                className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4 text-center"
              >
                <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                  Block
                </p>
                <p className="mt-1 text-lg font-bold text-stone-950">{b.name}</p>
                <p className="mt-0.5 text-xs text-stone-600">
                  {b._count.flats} {b._count.flats === 1 ? "Flat" : "Flats"}
                </p>
              </div>
            ))}
          </div>
        </AdminCard>
      ) : null}

      {/* Recent Bills & Payments Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Recent Bills */}
        <AdminCard
          title="Recent Bills"
          description="Latest maintenance invoices generated"
          action={
            <Link
              href={`/society/${societyCode}/bills`}
              className="text-xs font-semibold text-stone-900 hover:text-stone-700"
            >
              All Bills →
            </Link>
          }
        >
          {recentBills.length === 0 ? (
            <p className="py-6 text-center text-xs text-stone-500">
              No bills generated yet for this society.
            </p>
          ) : (
            <AdminTable
              headers={["Bill #", "Flat", "Amount", "Status"]}
              rows={recentBills.map((b) => (
                <tr key={b.id} className="border-t border-stone-100 hover:bg-stone-50/60">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-stone-900">
                    {b.billNumber || `#${b.month}/${b.year}`}
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-700">
                    {b.flat.block.name} - {b.flat.number}
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold text-stone-950">
                    ₹{Number(b.amount).toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3">
                    <AdminBadge
                      variant={
                        b.status === "PAID"
                          ? "success"
                          : b.status === "OVERDUE"
                            ? "danger"
                            : "warning"
                      }
                      size="sm"
                      dot
                    >
                      {b.status}
                    </AdminBadge>
                  </td>
                </tr>
              ))}
            />
          )}
        </AdminCard>

        {/* Recent Payments */}
        <AdminCard
          title="Recent Payments"
          description="Latest collections and receipts recorded"
          action={
            <Link
              href={`/society/${societyCode}/payments`}
              className="text-xs font-semibold text-stone-900 hover:text-stone-700"
            >
              All Payments →
            </Link>
          }
        >
          {recentPayments.length === 0 ? (
            <p className="py-6 text-center text-xs text-stone-500">
              No payments recorded yet for this society.
            </p>
          ) : (
            <AdminTable
              headers={["Receipt #", "Paid By", "Amount", "Date"]}
              rows={recentPayments.map((p) => (
                <tr key={p.id} className="border-t border-stone-100 hover:bg-stone-50/60">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-stone-900">
                    {p.receiptNumber || `#${p.id.slice(0, 8)}`}
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-700">
                    {p.paidBy?.name || p.bill?.flat.number || "Resident"}
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold text-emerald-700">
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
