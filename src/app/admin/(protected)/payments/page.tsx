import Link from "next/link"

import { prisma } from "@/lib/prisma"

export default async function PaymentsPage() {
  const payments = await prisma.payment.findMany({
    orderBy: {
      paidOn: "desc",
    },
    include: {
      bill: {
        select: {
          year: true,
          month: true,
          flat: {
            select: {
              number: true,
              block: {
                select: {
                  name: true,
                  society: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      paidBy: {
        select: {
          name: true,
        },
      },
    },
  })

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-8 md:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-stone-600">
            Admin
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-stone-950">
            Payments
          </h1>
        </div>

        <Link
          href="/admin/payments/new"
          className="rounded-full bg-stone-950 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-stone-800"
        >
          + New Payment
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-stone-50 text-stone-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Society</th>
                <th className="px-4 py-3 font-semibold">Block</th>
                <th className="px-4 py-3 font-semibold">Flat</th>
                <th className="px-4 py-3 font-semibold">Period</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Paid On</th>
                <th className="px-4 py-3 font-semibold">Mode</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-t border-stone-200 hover:bg-stone-50">
                  <td className="px-4 py-3 font-semibold text-stone-900">{payment.bill.flat.block.society.name}</td>
                  <td className="px-4 py-3 text-stone-600">{payment.bill.flat.block.name}</td>
                  <td className="px-4 py-3 text-stone-600">{payment.bill.flat.number}</td>
                  <td className="px-4 py-3 text-stone-600">{payment.bill.year}/{payment.bill.month}</td>
                  <td className="px-4 py-3 text-stone-600">{payment.amount.toString()}</td>
                  <td className="px-4 py-3 text-stone-600">{new Date(payment.paidOn).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-stone-600">{payment.mode}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
