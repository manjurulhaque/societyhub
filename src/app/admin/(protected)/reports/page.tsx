import { prisma } from "@/lib/prisma"
import { AdminPageCard } from "@/components/admin/AdminPageCard"
import { AdminPageHeader } from "@/components/admin/AdminPageHeader"

export default async function ReportsPage() {
  const [bills, payments, societies] = await Promise.all([
    prisma.bill.findMany({
      select: {
        amount: true,
      },
    }),
    prisma.payment.findMany({
      select: {
        amount: true,
      },
    }),
    prisma.society.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            people: true,
            members: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ])

  const totalBilled = bills.reduce((sum, bill) => sum + Number(bill.amount), 0)
  const totalCollected = payments.reduce((sum, payment) => sum + Number(payment.amount), 0)
  const outstanding = Math.max(0, totalBilled - totalCollected)
  const collectionRate = totalBilled === 0 ? 0 : Math.round((totalCollected / totalBilled) * 100)

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-6 py-8 md:px-8">
      <AdminPageHeader eyebrow="Admin" title="Reports" />

      <div className="grid gap-4 md:grid-cols-3">
        <AdminPageCard title="Total Billed" value={totalBilled.toFixed(2)} />
        <AdminPageCard title="Total Collected" value={totalCollected.toFixed(2)} />
        <AdminPageCard title="Outstanding" value={outstanding.toFixed(2)} />
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-stone-900">Collection Rate</h2>
          <span className="rounded-full bg-stone-100 px-3 py-1 text-sm font-medium text-stone-700">
            {collectionRate}%
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-stone-900">Society Summary</h2>
        <div className="mt-4 space-y-3">
          {societies.map((society) => (
            <div key={society.id} className="flex items-center justify-between rounded-xl border border-stone-200 px-4 py-3">
              <div>
                <p className="font-medium text-stone-900">{society.name}</p>
                <p className="text-sm text-stone-500">
                  {society._count.people} people • {society._count.members} members
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
