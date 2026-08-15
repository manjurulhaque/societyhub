import { notFound } from "next/navigation"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { prisma } from "@/lib/prisma"
import { AdminPageHeader, AdminTable, AdminBadge } from "@/components/admin"
import { formatDateInAppTimeZone } from "@/lib/datetime"

export default async function SocietyBillsPage({
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

  const bills = await prisma.bill.findMany({
    where: { societyId: society.id },
    orderBy: [
      { year: "desc" },
      { month: "desc" },
      { createdAt: "desc" },
    ],
    include: {
      flat: {
        select: {
          number: true,
          block: {
            select: { name: true },
          },
        },
      },
    },
  })

  const totalAmount = bills.reduce((acc, b) => acc + Number(b.amount), 0)
  const paidCount = bills.filter((b) => b.status === "PAID").length
  const pendingCount = bills.filter((b) => b.status === "PENDING").length
  const overdueCount = bills.filter((b) => b.status === "OVERDUE").length

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-8 md:px-8">
      <AdminPageHeader
        eyebrow="Billing"
        title="Bills & Invoices"
        description={`Maintenance invoices and utility bills for units in ${society.name}.`}
      />

      {/* Summary Row */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
          Summary:
        </span>
        <AdminBadge variant="neutral" size="md">
          {bills.length} Total Bills (₹{totalAmount.toLocaleString("en-IN")})
        </AdminBadge>
        <AdminBadge variant="success" size="md" dot>
          {paidCount} Paid
        </AdminBadge>
        <AdminBadge variant="warning" size="md" dot>
          {pendingCount} Pending
        </AdminBadge>
        {overdueCount > 0 ? (
          <AdminBadge variant="danger" size="md" dot>
            {overdueCount} Overdue
          </AdminBadge>
        ) : null}
      </div>

      {bills.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-300 bg-white p-12 text-center shadow-sm">
          <p className="text-sm font-semibold text-stone-900">No bills generated</p>
          <p className="mt-1 text-xs text-stone-500">
            No bills have been created for this society yet.
          </p>
        </div>
      ) : (
        <AdminTable
          headers={["Bill #", "Flat / Unit", "Period", "Type", "Amount", "Due Date", "Status"]}
          rows={bills.map((bill) => (
            <tr key={bill.id} className="border-t border-stone-100 hover:bg-stone-50/60">
              <td className="px-4 py-3 font-mono text-xs font-semibold text-stone-900">
                {bill.billNumber || `#${bill.month}/${bill.year}`}
              </td>
              <td className="px-4 py-3 text-xs text-stone-800">
                {bill.flat.block.name} - {bill.flat.number}
              </td>
              <td className="px-4 py-3 text-xs text-stone-600">
                {bill.month}/{bill.year}
              </td>
              <td className="px-4 py-3 text-xs text-stone-600">
                {bill.billType}
              </td>
              <td className="px-4 py-3 text-xs font-semibold text-stone-950">
                ₹{Number(bill.amount).toLocaleString("en-IN")}
              </td>
              <td className="px-4 py-3 text-xs text-stone-600">
                {bill.dueDate ? formatDateInAppTimeZone(bill.dueDate) : "—"}
              </td>
              <td className="px-4 py-3">
                <AdminBadge
                  variant={
                    bill.status === "PAID"
                      ? "success"
                      : bill.status === "OVERDUE"
                        ? "danger"
                        : "warning"
                  }
                  size="sm"
                  dot
                >
                  {bill.status}
                </AdminBadge>
              </td>
            </tr>
          ))}
        />
      )}
    </div>
  )
}
