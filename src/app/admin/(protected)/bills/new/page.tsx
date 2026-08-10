import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { prisma } from "@/lib/prisma"
import { AdminFormCard } from "@/components/admin/AdminFormCard"
import { AdminFormField } from "@/components/admin/AdminFormField"
import { AdminPrimaryButton } from "@/components/admin/AdminPrimaryButton"

export default async function NewBillPage() {
  const flats = await prisma.flat.findMany({
    orderBy: { createdAt: "desc" },
    include: {
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
  })

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-8 md:px-8">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-stone-600">
          Billing Setup
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-stone-950">
          Create Bill
        </h1>
      </div>

      <form action={createBill}>
        <AdminFormCard>
          <AdminFormField label="Flat">
            <select name="flatId" required className="w-full rounded-xl border border-stone-300 px-3 py-2 outline-none ring-0">
              <option value="">Select a flat</option>
              {flats.map((flat) => (
                <option key={flat.id} value={flat.id}>
                  {flat.block.society.name} / {flat.block.name} / {flat.number}
                </option>
              ))}
            </select>
          </AdminFormField>

          <div className="grid gap-4 md:grid-cols-2">
            <AdminFormField label="Year">
              <input type="number" name="year" required className="w-full rounded-xl border border-stone-300 px-3 py-2 outline-none ring-0" />
            </AdminFormField>

            <AdminFormField label="Month">
              <input type="number" min="1" max="12" name="month" required className="w-full rounded-xl border border-stone-300 px-3 py-2 outline-none ring-0" />
            </AdminFormField>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <AdminFormField label="Amount">
              <input type="number" step="0.01" name="amount" required className="w-full rounded-xl border border-stone-300 px-3 py-2 outline-none ring-0" />
            </AdminFormField>

            <AdminFormField label="Due Date">
              <input type="date" name="dueDate" className="w-full rounded-xl border border-stone-300 px-3 py-2 outline-none ring-0" />
            </AdminFormField>
          </div>

          <AdminPrimaryButton type="submit">Save Bill</AdminPrimaryButton>
        </AdminFormCard>
      </form>
    </div>
  )
}

async function createBill(formData: FormData) {
  "use server"

  const flatId = formData.get("flatId")?.toString().trim()
  const year = Number(formData.get("year")?.toString())
  const month = Number(formData.get("month")?.toString())
  const amount = Number(formData.get("amount")?.toString())
  const dueDate = formData.get("dueDate")?.toString().trim()

  if (!flatId || !year || !month || !amount) {
    throw new Error("Flat, year, month, and amount are required")
  }

  await prisma.bill.create({
    data: {
      flatId,
      year,
      month,
      amount: amount.toFixed(2),
      dueDate: dueDate ? new Date(dueDate) : null,
    },
  })

  revalidatePath("/admin/bills")
  redirect("/admin/bills")
}
