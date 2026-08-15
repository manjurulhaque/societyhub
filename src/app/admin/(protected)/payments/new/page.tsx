import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { prisma } from "@/lib/prisma"
import type { PaymentMode } from "@/generated/prisma/client"

export default async function NewPaymentPage() {
  const [bills, people] = await Promise.all([
    prisma.bill.findMany({
      orderBy: { createdAt: "desc" },
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
    }),
    prisma.person.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ])

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-8 md:px-8">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-stone-600">
          Payment Setup
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-stone-950">
          Create Payment
        </h1>
      </div>

      <form action={createPayment} className="space-y-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <label className="block space-y-2 text-sm font-medium text-stone-700">
          <span>Bill</span>
          <select name="billId" required className="w-full rounded-xl border border-stone-300 px-3 py-2 outline-none ring-0">
            <option value="">Select a bill</option>
            {bills.map((bill) => (
              <option key={bill.id} value={bill.id}>
                {bill.flat.block.society.name} / {bill.flat.block.name} / {bill.flat.number} / {bill.year}/{bill.month}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-2 text-sm font-medium text-stone-700">
          <span>Paid By</span>
          <select name="paidById" required className="w-full rounded-xl border border-stone-300 px-3 py-2 outline-none ring-0">
            <option value="">Select a person</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-stone-700">
            <span>Amount</span>
            <input type="number" step="0.01" name="amount" required className="w-full rounded-xl border border-stone-300 px-3 py-2 outline-none ring-0" />
          </label>

          <label className="space-y-2 text-sm font-medium text-stone-700">
            <span>Paid On</span>
            <input type="date" name="paidOn" required className="w-full rounded-xl border border-stone-300 px-3 py-2 outline-none ring-0" />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-stone-700">
            <span>Mode</span>
            <select name="mode" required className="w-full rounded-xl border border-stone-300 px-3 py-2 outline-none ring-0">
              <option value="APP">App</option>
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="BANK">Bank</option>
              <option value="CHEQUE">Cheque</option>
              <option value="CARD">Card</option>
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium text-stone-700">
            <span>Reference</span>
            <input name="reference" className="w-full rounded-xl border border-stone-300 px-3 py-2 outline-none ring-0" />
          </label>
        </div>

        <label className="block space-y-2 text-sm font-medium text-stone-700">
          <span>Remarks</span>
          <textarea name="remarks" rows={3} className="w-full rounded-xl border border-stone-300 px-3 py-2 outline-none ring-0" />
        </label>

        <button
          type="submit"
          className="rounded-full bg-stone-950 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-stone-800"
        >
          Save Payment
        </button>
      </form>
    </div>
  )
}

async function createPayment(formData: FormData) {
  "use server"

  const billId = formData.get("billId")?.toString().trim()
  const paidById = formData.get("paidById")?.toString().trim()
  const amount = Number(formData.get("amount")?.toString())
  const paidOn = formData.get("paidOn")?.toString().trim()
  const mode = formData.get("mode")?.toString().trim()
  const reference = formData.get("reference")?.toString().trim() || null
  const remarks = formData.get("remarks")?.toString().trim() || null

  if (!billId || !paidById || !amount || !paidOn || !mode) {
    throw new Error("Bill, payer, amount, paid date, and mode are required")
  }

  // Resolve societyId from the Bill
  const bill = await prisma.bill.findUniqueOrThrow({
    where: { id: billId },
    select: { societyId: true },
  })

  await prisma.payment.create({
    data: {
      societyId: bill.societyId,
      billId,
      paidById,
      amount: amount.toFixed(2),
      paidOn: new Date(paidOn),
      mode: mode as PaymentMode,
      reference,
      remarks,
    },
  })

  revalidatePath("/admin/payments")
  redirect("/admin/payments")
}
