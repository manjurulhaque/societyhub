import Link from "next/link"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import type { PaymentMode } from "@/generated/prisma/client"
import {
  AdminPageHeader,
  AdminCard,
  AdminSelect,
  AdminInput,
  AdminTextarea,
  AdminButton,
} from "@/components/admin"

export default async function NewPaymentPage() {
  const [bills, people] = await Promise.all([
    prisma.bill.findMany({
      where: {
        status: { in: ["PENDING", "OVERDUE", "PARTIALLY_PAID"] },
      },
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
              select: {
                name: true,
                society: {
                  select: {
                    name: true,
                    code: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.person.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        society: {
          select: {
            name: true,
            code: true,
          },
        },
      },
    }),
  ])

  const today = new Date().toISOString().split("T")[0]

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-6 py-8 md:px-8">
      <AdminPageHeader
        eyebrow="Collection Setup"
        title="Record Payment Receipt"
        description="Acknowledge maintenance collections, UPI transactions, bank transfers, or cash receipts."
        action={
          <Link
            href="/admin/payments"
            className="rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-stone-700 transition hover:bg-stone-100 shadow-sm"
          >
            Cancel
          </Link>
        }
      />

      <form action={createPayment} className="space-y-8">
        {/* 1. Target Bill & Payer */}
        <AdminCard
          title="Bill & Resident Details"
          description="Select the outstanding bill and the resident who made the payment"
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Outstanding Bill / Assessment *
              </label>
              <AdminSelect
                name="billId"
                required
                options={[
                  { label: "Select an outstanding bill...", value: "", disabled: true },
                  ...bills.map((b) => ({
                    label: `${b.flat.block.society.name} → ${b.flat.block.name}-${b.flat.number} (${b.month}/${b.year}) — ₹${Number(b.amount).toLocaleString("en-IN")}`,
                    value: b.id,
                  })),
                ]}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Paid By (Resident) *
              </label>
              <AdminSelect
                name="paidById"
                required
                options={[
                  { label: "Select resident...", value: "", disabled: true },
                  ...people.map((p) => ({
                    label: `${p.name} (${p.society.name})`,
                    value: p.id,
                  })),
                ]}
              />
            </div>
          </div>
        </AdminCard>

        {/* 2. Amount, Mode & Transaction Details */}
        <AdminCard
          title="Transaction & Receipt Details"
          description="Specify collection mode, amount received, and bank reference"
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Amount Received (₹) *
              </label>
              <AdminInput
                name="amount"
                type="number"
                step="0.01"
                placeholder="e.g. 2500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Payment Date *
              </label>
              <AdminInput
                name="paidOn"
                type="date"
                defaultValue={today}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Payment Mode *
              </label>
              <AdminSelect
                name="mode"
                defaultValue="UPI"
                options={[
                  { label: "UPI / QR Code", value: "UPI" },
                  { label: "NEFT / RTGS / IMPS", value: "BANK" },
                  { label: "Cheque Deposit", value: "CHEQUE" },
                  { label: "Cash Receipt", value: "CASH" },
                  { label: "Debit / Credit Card", value: "CARD" },
                  { label: "Mobile App Payment", value: "APP" },
                ]}
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Transaction Reference / UTR / Cheque #
              </label>
              <AdminInput
                name="reference"
                placeholder="e.g. UPI Ref: 318293849201 or Cheque # 004123"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Internal Remarks / Notes
              </label>
              <AdminTextarea
                name="remarks"
                rows={2}
                placeholder="Optional notes or receipt annotations"
              />
            </div>
          </div>
        </AdminCard>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/admin/payments"
            className="rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
          >
            Cancel
          </Link>
          <AdminButton type="submit" variant="primary" size="lg">
            Record & Issue Receipt
          </AdminButton>
        </div>
      </form>
    </div>
  )
}

async function createPayment(formData: FormData) {
  "use server"

  const billId = formData.get("billId")?.toString().trim()
  const paidById = formData.get("paidById")?.toString().trim()
  const rawAmount = formData.get("amount")?.toString().trim()
  const paidOnStr = formData.get("paidOn")?.toString().trim()
  const mode = formData.get("mode")?.toString().trim() || "UPI"
  const reference = formData.get("reference")?.toString().trim() || null
  const remarks = formData.get("remarks")?.toString().trim() || null

  if (!billId || !paidById || !rawAmount || !paidOnStr) {
    throw new Error("Bill, payer, amount, and payment date are required")
  }

  const amount = parseFloat(rawAmount)
  if (isNaN(amount) || amount <= 0) {
    throw new Error("Please enter a valid payment amount")
  }

  const paidOn = new Date(paidOnStr)

  // Resolve bill, its existing payments, and the society prefix
  const bill = await prisma.bill.findUniqueOrThrow({
    where: { id: billId },
    include: {
      society: {
        select: {
          id: true,
          receiptPrefix: true,
        },
      },
      payments: {
        select: {
          amount: true,
        },
      },
    },
  })

  const prefix = bill.society.receiptPrefix || "RCPT"
  const timestamp = Date.now().toString().slice(-6)
  const randomSuffix = Math.floor(100 + Math.random() * 900)
  const receiptNumber = `${prefix}-${timestamp}-${randomSuffix}`

  await prisma.payment.create({
    data: {
      societyId: bill.society.id,
      billId,
      paidById,
      amount,
      paidOn,
      mode: mode as PaymentMode,
      status: "SUCCESS",
      receiptNumber,
      reference,
      remarks,
    },
  })

  // Check if bill is now fully paid
  const previousPaid = bill.payments.reduce((acc, p) => acc + Number(p.amount), 0)
  const newTotalPaid = previousPaid + amount
  const billAmount = Number(bill.amount)

  if (newTotalPaid >= billAmount) {
    await prisma.bill.update({
      where: { id: billId },
      data: {
        status: "PAID",
        paidDate: paidOn,
      },
    })
  } else if (newTotalPaid > 0) {
    await prisma.bill.update({
      where: { id: billId },
      data: {
        status: "PARTIALLY_PAID",
      },
    })
  }

  revalidatePath("/admin/payments")
  revalidatePath("/admin/bills")
  revalidatePath(`/society/${bill.society.id}/payments`)
  revalidatePath(`/society/${bill.society.id}/bills`)
  redirect("/admin/payments")
}
