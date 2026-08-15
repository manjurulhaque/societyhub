import { notFound } from "next/navigation"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { prisma } from "@/lib/prisma"
import {
  AdminPageHeader,
  AdminStatCard,
  AdminCard,
  AdminTable,
  AdminBadge,
} from "@/components/admin"

export default async function SocietyReportsPage({
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
  const societyId = society.id

  const [billAggregate, paymentAggregate, flats] = await Promise.all([
    prisma.bill.aggregate({
      where: { societyId },
      _sum: { amount: true },
      _count: { _all: true },
    }),

    prisma.payment.aggregate({
      where: { societyId },
      _sum: { amount: true },
      _count: { _all: true },
    }),

    prisma.flat.findMany({
      where: {
        block: { societyId },
        isActive: true,
        deletedAt: null,
      },
      include: {
        block: { select: { name: true } },
        bills: {
          select: {
            amount: true,
            status: true,
          },
        },
      },
      orderBy: [
        { block: { name: "asc" } },
        { number: "asc" },
      ],
    }),
  ])

  const totalBilled = Number(billAggregate._sum.amount ?? 0)
  const totalCollected = Number(paymentAggregate._sum.amount ?? 0)
  const totalOutstanding = Math.max(0, totalBilled - totalCollected)
  const collectionRate =
    totalBilled === 0 ? 0 : Math.min(100, Math.round((totalCollected / totalBilled) * 100))

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-6 py-8 md:px-8">
      <AdminPageHeader
        eyebrow="Financials"
        title="Reports & Analytics"
        description={`Collection breakdown and financial summaries for ${society.name}.`}
      />

      {/* Financial Metrics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          title="Total Billed"
          value={`₹${totalBilled.toLocaleString("en-IN")}`}
          subtitle={`${billAggregate._count._all} Total Bills`}
        />

        <AdminStatCard
          title="Total Collected"
          value={`₹${totalCollected.toLocaleString("en-IN")}`}
          subtitle={`${paymentAggregate._count._all} Payments`}
        />

        <AdminStatCard
          title="Outstanding Dues"
          value={`₹${totalOutstanding.toLocaleString("en-IN")}`}
          subtitle="Pending collection"
        />

        <AdminStatCard
          title="Collection Rate"
          value={`${collectionRate}%`}
          trend={{
            value: `${collectionRate}%`,
            direction: collectionRate >= 80 ? "up" : "down",
            label: collectionRate >= 80 ? "Healthy" : "Needs attention",
          }}
        />
      </div>

      {/* Flat-by-Flat Balance Summary */}
      <AdminCard
        title="Flat Dues & Billing Summary"
        description="Per-unit billing status and outstanding balances"
      >
        {flats.length === 0 ? (
          <p className="py-6 text-center text-xs text-stone-500">
            No units configured for this society.
          </p>
        ) : (
          <AdminTable
            headers={["Flat Number", "Block", "Status", "Bills Generated", "Total Billed", "Account Status"]}
            rows={flats.map((flat) => {
              const flatBilled = flat.bills.reduce((acc, b) => acc + Number(b.amount), 0)
              const hasPending = flat.bills.some((b) => b.status === "PENDING" || b.status === "OVERDUE")

              return (
                <tr key={flat.id} className="border-t border-stone-100 hover:bg-stone-50/60">
                  <td className="px-4 py-3 text-xs font-semibold text-stone-950">
                    {flat.number}
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-700">{flat.block.name}</td>
                  <td className="px-4 py-3 text-xs">
                    <AdminBadge
                      variant={flat.status === "OCCUPIED" ? "success" : "neutral"}
                      size="sm"
                    >
                      {flat.status}
                    </AdminBadge>
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-600">
                    {flat.bills.length}
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold text-stone-900">
                    ₹{flatBilled.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3">
                    <AdminBadge
                      variant={
                        flat.bills.length === 0
                          ? "neutral"
                          : hasPending
                            ? "warning"
                            : "success"
                      }
                      size="sm"
                      dot
                    >
                      {flat.bills.length === 0
                        ? "NO BILLS"
                        : hasPending
                          ? "DUES PENDING"
                          : "ALL CLEAR"}
                    </AdminBadge>
                  </td>
                </tr>
              )
            })}
          />
        )}
      </AdminCard>
    </div>
  )
}
