import { notFound } from "next/navigation"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { prisma } from "@/lib/prisma"
import { AdminPageHeader, AdminTable, AdminBadge } from "@/components/admin"
import { formatDateInAppTimeZone } from "@/lib/datetime"

export default async function SocietyPaymentsPage({
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

  const payments = await prisma.payment.findMany({
    where: { societyId: society.id },
    orderBy: { createdAt: "desc" },
    include: {
      paidBy: {
        select: {
          name: true,
          phone: true,
        },
      },
      bill: {
        select: {
          year: true,
          month: true,
          flat: {
            select: {
              number: true,
              block: {
                select: { name: true },
              },
            },
          },
        },
      },
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

  const totalCollected = payments.reduce((acc, p) => acc + Number(p.amount), 0)

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-8 md:px-8">
      <AdminPageHeader
        eyebrow="Collections"
        title="Payments & Receipts"
        description={`Record and track payments collected for maintenance and society dues in ${society.name}.`}
      />

      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
          Total Collections:
        </span>
        <AdminBadge variant="success" size="md">
          {payments.length} Transactions (₹{totalCollected.toLocaleString("en-IN")})
        </AdminBadge>
      </div>

      {payments.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-300 bg-white p-12 text-center shadow-sm">
          <p className="text-sm font-semibold text-stone-900">No payments recorded</p>
          <p className="mt-1 text-xs text-stone-500">
            No payments or receipts have been recorded in this society yet.
          </p>
        </div>
      ) : (
        <AdminTable
          headers={["Receipt #", "Paid By", "Flat / Unit", "Bill Period", "Payment Mode", "Amount", "Excess", "Paid On"]}
          rows={payments.map((payment) => (
            <tr key={payment.id} className="border-t border-stone-100 hover:bg-stone-50/60">
              <td className="px-4 py-3 font-mono text-xs font-semibold text-stone-900">
                {payment.receiptNumber || `#${payment.id.slice(0, 8)}`}
              </td>
              <td className="px-4 py-3 text-xs font-medium text-stone-950">
                {payment.paidBy?.name || "Resident"}
              </td>
              <td className="px-4 py-3 text-xs text-stone-700">
                {payment.bill
                  ? `${payment.bill.flat.block.name} - ${payment.bill.flat.number}`
                  : payment.flat
                    ? `${payment.flat.block.name} - ${payment.flat.number}`
                    : "—"}
              </td>
              <td className="px-4 py-3 text-xs text-stone-600">
                {payment.isAdvance ? (
                  <AdminBadge variant="info" size="sm">ADVANCE</AdminBadge>
                ) : payment.bill ? (
                  `${payment.bill.month}/${payment.bill.year}`
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-3">
                <AdminBadge variant="neutral" size="sm">
                  {payment.mode || "ONLINE"}
                </AdminBadge>
              </td>
              <td className="px-4 py-3 text-xs font-semibold text-emerald-700">
                ₹{Number(payment.amount).toLocaleString("en-IN")}
              </td>
              <td className="px-4 py-3 text-xs">
                {Number(payment.excessAmount) > 0 ? (
                  <AdminBadge variant="warning" size="sm">
                    +₹{Number(payment.excessAmount).toLocaleString("en-IN")}
                  </AdminBadge>
                ) : (
                  <span className="text-stone-400">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-xs text-stone-500">
                {formatDateInAppTimeZone(payment.createdAt)}
              </td>
            </tr>
          ))}
        />
      )}
    </div>
  )
}
