import type { Metadata } from "next"
import { notFound } from "next/navigation"

export const metadata: Metadata = { title: "Payments" }
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { prisma } from "@/lib/prisma"
import { AdminPageHeader } from "@/components/admin"
import { PaymentsClientView, type PaymentListItem } from "./PaymentsClientView"
import {
  type OutstandingBillOption,
  type ResidentOption,
  type AccountOption,
  type FlatOption,
} from "./RecordPaymentModal"
import { FINANCIAL_ROLES, EXECUTIVE_ROLES } from "@/lib/auth/requireAuth"
import type { SocietyRole } from "@/generated/prisma/client"

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

  const { society, designation, isSuperAdmin } = context
  const canManagePayments =
    isSuperAdmin ||
    EXECUTIVE_ROLES.includes(designation as SocietyRole) ||
    FINANCIAL_ROLES.includes(designation as SocietyRole) ||
    designation === "MANAGER"

  const [rawPayments, rawOutstandingBills, rawResidents, rawAccounts, rawFlats] =
    await Promise.all([
      prisma.payment.findMany({
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
              billType: true,
              flat: {
                select: {
                  number: true,
                  block: { select: { name: true } },
                },
              },
            },
          },
          flat: {
            select: {
              number: true,
              block: { select: { name: true } },
            },
          },
          account: {
            select: {
              name: true,
            },
          },
        },
      }),

      prisma.bill.findMany({
        where: {
          societyId: society.id,
          status: { in: ["PENDING", "OVERDUE", "PARTIALLY_PAID"] },
        },
        orderBy: [
          { year: "desc" },
          { month: "desc" },
          { createdAt: "desc" },
        ],
        include: {
          flat: {
            include: {
              block: { select: { name: true } },
              people: {
                where: { toDate: null },
                include: { person: { select: { id: true, name: true } } },
              },
            },
          },
        },
      }),

      prisma.person.findMany({
        where: {
          societyId: society.id,
          isActive: true,
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          phone: true,
        },
        orderBy: { name: "asc" },
      }),

      prisma.account.findMany({
        where: {
          societyId: society.id,
          isActive: true,
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          accountNumber: true,
          accountType: true,
        },
        orderBy: { name: "asc" },
      }),

      prisma.flat.findMany({
        where: {
          block: { societyId: society.id },
          isActive: true,
          deletedAt: null,
        },
        include: {
          block: { select: { name: true } },
          people: {
            where: { toDate: null },
            include: { person: { select: { id: true, name: true } } },
          },
        },
        orderBy: [
          { block: { name: "asc" } },
          { number: "asc" },
        ],
      }),
    ])

  const payments: PaymentListItem[] = rawPayments.map((p) => {
    let flatDisplay = "—"
    if (p.bill) {
      flatDisplay = `${p.bill.flat.block.name} - ${p.bill.flat.number}`
    } else if (p.flat) {
      flatDisplay = `${p.flat.block.name} - ${p.flat.number}`
    }

    return {
      id: p.id,
      receiptNumber: p.receiptNumber,
      amount: Number(p.amount),
      mode: p.mode,
      status: p.status,
      reference: p.reference,
      remarks: p.remarks,
      paidOn: p.paidOn.toISOString(),
      createdAt: p.createdAt.toISOString(),
      isAdvance: p.isAdvance,
      payerName: p.paidBy?.name || "Resident",
      payerPhone: p.paidBy?.phone || null,
      flatDisplay,
      billPeriod: p.bill ? `${p.bill.month}/${p.bill.year}` : null,
      billType: p.bill ? p.bill.billType.replace(/_/g, " ") : p.isAdvance ? "Advance Maintenance" : null,
      accountName: p.account?.name || null,
    }
  })

  const outstandingBills: OutstandingBillOption[] = rawOutstandingBills.map((b) => {
    const primaryPerson = b.flat.people[0]?.person

    return {
      id: b.id,
      billNumber: b.billNumber,
      month: b.month,
      year: b.year,
      amount: Number(b.amount),
      billType: b.billType.replace(/_/g, " "),
      flatId: b.flatId,
      flatNumber: b.flat.number,
      blockName: b.flat.block.name,
      residentName: primaryPerson?.name || null,
      residentId: primaryPerson?.id || null,
    }
  })

  const residents: ResidentOption[] = rawResidents.map((r) => ({
    id: r.id,
    name: r.name,
    phone: r.phone,
  }))

  const accounts: AccountOption[] = rawAccounts.map((a) => ({
    id: a.id,
    name: a.name,
    accountNumber: a.accountNumber,
    type: a.accountType,
  }))

  const flats: FlatOption[] = rawFlats.map((f) => ({
    id: f.id,
    number: f.number,
    blockName: f.block.name,
    occupants: f.people.map((p) => ({ id: p.person.id, name: p.person.name })),
  }))

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-8 md:px-8">
      <AdminPageHeader
        eyebrow="Collections & Receipts"
        title="Payments & Receipts"
        description={`Record and track resident collections, bank credits, advance payments, and official receipts for ${society.name}.`}
      />

      <PaymentsClientView
        societyCode={code}
        societyName={society.name}
        payments={payments}
        outstandingBills={outstandingBills}
        residents={residents}
        accounts={accounts}
        flats={flats}
        canManagePayments={canManagePayments}
      />
    </div>
  )
}
