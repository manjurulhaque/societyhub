import { notFound } from "next/navigation"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { prisma } from "@/lib/prisma"
import { AdminPageHeader } from "@/components/admin"
import { BillsClientView, type BillListItem } from "./BillsClientView"
import { type FlatOption } from "./CreateBillModal"
import { FINANCIAL_ROLES, EXECUTIVE_ROLES } from "@/lib/auth/requireAuth"
import type { SocietyRole } from "@/generated/prisma/client"

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

  const { society, designation, isSuperAdmin } = context
  const canManageBills =
    isSuperAdmin ||
    EXECUTIVE_ROLES.includes(designation as SocietyRole) ||
    FINANCIAL_ROLES.includes(designation as SocietyRole) ||
    designation === "MANAGER"

  const [rawBills, rawFlats] = await Promise.all([
    prisma.bill.findMany({
      where: { societyId: society.id },
      orderBy: [
        { year: "desc" },
        { month: "desc" },
        { createdAt: "desc" },
      ],
      include: {
        flat: {
          select: {
            id: true,
            number: true,
            block: {
              select: { name: true },
            },
          },
        },
      },
    }),

    prisma.flat.findMany({
      where: {
        block: { societyId: society.id },
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        number: true,
        block: {
          select: { name: true },
        },
      },
      orderBy: [
        { block: { name: "asc" } },
        { number: "asc" },
      ],
    }),
  ])

  const bills: BillListItem[] = rawBills.map((b) => ({
    id: b.id,
    billNumber: b.billNumber,
    flatId: b.flat.id,
    flatNumber: b.flat.number,
    blockName: b.flat.block.name,
    month: b.month,
    year: b.year,
    billType: b.billType,
    title: b.title,
    amount: Number(b.amount),
    status: b.status,
    dueDate: b.dueDate ? b.dueDate.toISOString() : null,
    paidDate: b.paidDate ? b.paidDate.toISOString() : null,
    createdAt: b.createdAt.toISOString(),
  }))

  const flats: FlatOption[] = rawFlats.map((f) => ({
    id: f.id,
    number: f.number,
    blockName: f.block.name,
  }))

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-8 md:px-8">
      <AdminPageHeader
        eyebrow="Billing & Demand"
        title="Bills & Invoices"
        description={`Manage maintenance assessments, batch invoice generation, and receivables for ${society.name}.`}
      />

      <BillsClientView
        societyCode={code}
        bills={bills}
        flats={flats}
        canManageBills={canManageBills}
        maintenanceType={society.maintenanceType || "FIXED"}
        fixedRate={society.fixedRate ? Number(society.fixedRate) : null}
        ratePerSqft={society.ratePerSqft ? Number(society.ratePerSqft) : null}
        dueDayOfMonth={society.dueDayOfMonth}
      />
    </div>
  )
}
