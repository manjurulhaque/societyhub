import { prisma } from "@/lib/prisma"
import { AdminPrimaryButton } from "@/components/admin/AdminPrimaryButton"
import { AdminListPage } from "@/components/admin/AdminListPage"

export default async function BillsPage() {
  const bills = await prisma.bill.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
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
  })

  return (
    <AdminListPage
      eyebrow="Admin"
      title="Bills"
      action={<AdminPrimaryButton href="/admin/bills/new">+ New Bill</AdminPrimaryButton>}
      headers={["Society", "Block", "Flat", "Period", "Amount", "Due Date"]}
      rows={bills.map((bill) => (
        <tr key={bill.id} className="border-t border-stone-200 hover:bg-stone-50">
          <td className="px-4 py-3 font-semibold text-stone-900">{bill.flat.block.society.name}</td>
          <td className="px-4 py-3 text-stone-600">{bill.flat.block.name}</td>
          <td className="px-4 py-3 text-stone-600">{bill.flat.number}</td>
          <td className="px-4 py-3 text-stone-600">{bill.year}/{bill.month}</td>
          <td className="px-4 py-3 text-stone-600">{bill.amount.toString()}</td>
          <td className="px-4 py-3 text-stone-600">{bill.dueDate ? new Date(bill.dueDate).toLocaleDateString() : "—"}</td>
        </tr>
      ))}
    />
  )
}
