import Link from "next/link"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import type { BillType } from "@/generated/prisma/client"
import {
  AdminPageHeader,
  AdminCard,
  AdminSelect,
  AdminInput,
  AdminButton,
} from "@/components/admin"

export default async function NewBillPage() {
  const flats = await prisma.flat.findMany({
    where: { isActive: true, deletedAt: null },
    orderBy: [
      { block: { society: { name: "asc" } } },
      { block: { name: "asc" } },
      { number: "asc" },
    ],
    include: {
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
  })

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-6 py-8 md:px-8">
      <AdminPageHeader
        eyebrow="Billing Setup"
        title="Generate New Bill / Invoice"
        description="Issue a maintenance demand, utility surcharge, or statutory assessment for a flat."
        action={
          <Link
            href="/admin/bills"
            className="rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-stone-700 transition hover:bg-stone-100 shadow-sm"
          >
            Cancel
          </Link>
        }
      />

      <form action={createBill} className="space-y-8">
        {/* 1. Target Flat & Type */}
        <AdminCard
          title="Unit & Assessment Type"
          description="Select the recipient flat and billing category"
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Target Flat / Unit *
              </label>
              <AdminSelect
                name="flatId"
                required
                options={[
                  { label: "Select a flat / unit...", value: "", disabled: true },
                  ...flats.map((f) => ({
                    label: `${f.block.society.name} (${f.block.society.code || "CHS"}) → ${f.block.name} - ${f.number}`,
                    value: f.id,
                  })),
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Bill Category / Type *
              </label>
              <AdminSelect
                name="billType"
                defaultValue="MAINTENANCE"
                options={[
                  { label: "Monthly Maintenance Demand", value: "MAINTENANCE" },
                  { label: "Sinking Fund Assessment", value: "SINKING_FUND" },
                  { label: "Water Charges", value: "WATER" },
                  { label: "Electricity Charges", value: "ELECTRICITY" },
                  { label: "Special Repair Fund", value: "REPAIR_FUND" },
                  { label: "Special Assessment", value: "SPECIAL_ASSESSMENT" },
                  { label: "Parking Fee", value: "PARKING" },
                  { label: "Penalty / Late Interest", value: "PENALTY_INTEREST" },
                  { label: "Other Assessment", value: "OTHER" },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Invoice Title (Optional)
              </label>
              <AdminInput
                name="title"
                placeholder="e.g. Regular Monthly Dues"
              />
            </div>
          </div>
        </AdminCard>

        {/* 2. Billing Period & Financials */}
        <AdminCard
          title="Period, Amount & Due Date"
          description="Specify the assessment period, invoice amount, and payment deadline"
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Year *
              </label>
              <AdminInput
                name="year"
                type="number"
                defaultValue={currentYear}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Month (1-12) *
              </label>
              <AdminInput
                name="month"
                type="number"
                min="1"
                max="12"
                defaultValue={currentMonth}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Amount (₹) *
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
                Due Date
              </label>
              <AdminInput
                name="dueDate"
                type="date"
              />
            </div>
          </div>
        </AdminCard>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/admin/bills"
            className="rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
          >
            Cancel
          </Link>
          <AdminButton type="submit" variant="primary" size="lg">
            Generate Bill
          </AdminButton>
        </div>
      </form>
    </div>
  )
}

import { requireSuperAdmin } from "@/lib/auth/requireAuth"
import { recordAuditLog } from "@/lib/audit"

async function createBill(formData: FormData) {
  "use server"

  const admin = await requireSuperAdmin()

  const flatId = formData.get("flatId")?.toString().trim()
  const billType = formData.get("billType")?.toString().trim() || "MAINTENANCE"
  const title = formData.get("title")?.toString().trim() || null
  const year = Number(formData.get("year")?.toString())
  const month = Number(formData.get("month")?.toString())
  const rawAmount = formData.get("amount")?.toString().trim()
  const dueDateStr = formData.get("dueDate")?.toString().trim()

  if (!flatId || !year || !month || !rawAmount) {
    throw new Error("Flat, year, month, and amount are required")
  }

  const amount = parseFloat(rawAmount)
  if (isNaN(amount) || amount <= 0) {
    throw new Error("Please enter a valid bill amount")
  }

  // Resolve society and flat information
  const flat = await prisma.flat.findUniqueOrThrow({
    where: { id: flatId },
    select: {
      number: true,
      block: {
        select: {
          societyId: true,
          society: {
            select: {
              invoicePrefix: true,
            },
          },
        },
      },
    },
  })

  const prefix = flat.block.society.invoicePrefix || "INV"
  const randomSuffix = Math.floor(1000 + Math.random() * 9000)
  const billNumber = `${prefix}-${year}-${String(month).padStart(2, "0")}-${flat.number}-${randomSuffix}`

  const bill = await prisma.bill.create({
    data: {
      societyId: flat.block.societyId,
      flatId,
      billNumber,
      billType: billType as BillType,
      title,
      year,
      month,
      amount,
      dueDate: dueDateStr ? new Date(dueDateStr) : null,
      status: "PENDING",
    },
  })

  await recordAuditLog({
    societyId: flat.block.societyId,
    userId: admin.id,
    action: "BILL_GENERATED",
    entity: "Bill",
    entityId: bill.id,
    description: `Super Admin ${admin.email} generated bill ${billNumber} for ₹${amount}`,
    newData: { billNumber, amount, flatId, year, month },
  })

  revalidatePath("/admin/bills")
  revalidatePath(`/society/${flat.block.societyId}/bills`)
  redirect("/admin/bills")
}

