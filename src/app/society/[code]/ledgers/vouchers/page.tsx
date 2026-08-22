import { notFound } from "next/navigation"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { prisma } from "@/lib/prisma"
import { AdminPageHeader } from "@/components/admin"
import {
  JournalVouchersClientView,
  type JournalEntryListItem,
} from "./JournalVouchersClientView"
import { type LedgerOption } from "./CreateJournalVoucherModal"
import { FINANCIAL_ROLES, EXECUTIVE_ROLES } from "@/lib/auth/requireAuth"
import type { SocietyRole } from "@/generated/prisma/client"

export default async function SocietyJournalVouchersPage({
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
  const canManage =
    isSuperAdmin ||
    EXECUTIVE_ROLES.includes(designation as SocietyRole) ||
    FINANCIAL_ROLES.includes(designation as SocietyRole)

  const [rawJournals, rawLedgers] = await Promise.all([
    prisma.journalEntry.findMany({
      where: { societyId: society.id },
      include: {
        entries: {
          include: {
            ledger: {
              select: { id: true, name: true, code: true, group: true },
            },
          },
        },
      },
      orderBy: { entryDate: "desc" },
    }),
    prisma.ledger.findMany({
      where: { societyId: society.id, isActive: true, deletedAt: null },
      select: { id: true, name: true, code: true, group: true },
      orderBy: [{ group: "asc" }, { name: "asc" }],
    }),
  ])

  const journals: JournalEntryListItem[] = rawJournals.map((j) => {
    const totalAmount = j.entries.reduce((sum, e) => sum + Number(e.debit), 0)

    return {
      id: j.id,
      voucherNumber: j.voucherNumber,
      voucherType: j.voucherType,
      status: j.status,
      entryDate: j.entryDate.toISOString(),
      narration: j.narration,
      reference: j.reference,
      totalAmount,
      entries: j.entries.map((e) => ({
        id: e.id,
        ledgerId: e.ledgerId,
        ledgerName: e.ledger.name,
        ledgerGroup: e.ledger.group,
        debit: Number(e.debit),
        credit: Number(e.credit),
        narration: e.narration,
      })),
    }
  })

  const ledgerOptions: LedgerOption[] = rawLedgers.map((l) => ({
    id: l.id,
    name: l.name,
    code: l.code,
    group: l.group,
  }))

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Double-Entry Accounting"
        title="Journal Vouchers Register"
        description={`Statutory Journal Vouchers (JV), Contra Transfers, and manual adjusting entries for ${society.name}.`}
      />

      <JournalVouchersClientView
        societyCode={code}
        currencySymbol={society.currencySymbol || "₹"}
        journals={journals}
        ledgers={ledgerOptions}
        canManage={canManage}
      />
    </div>
  )
}
