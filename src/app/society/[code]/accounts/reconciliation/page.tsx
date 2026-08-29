import { notFound } from "next/navigation"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { prisma } from "@/lib/prisma"
import { AdminPageHeader } from "@/components/admin"
import {
  ReconciliationClientView,
  type BankAccountOption,
  type UnclearedCheque,
  type HistoricalReconItem,
} from "./ReconciliationClientView"
import type { FlatOption, UnpaidBillOption } from "./AutoReconciliationEngine"
import { COMMITTEE_ROLES } from "@/lib/auth/requireAuth"
import type { SocietyRole } from "@/generated/prisma/client"

export default async function SocietyBankReconciliationPage({
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
  const canManage = isSuperAdmin || COMMITTEE_ROLES.includes(designation as SocietyRole)

  const [rawAccounts, rawCheques, rawRecons, rawFlats, rawBills] = await Promise.all([
    prisma.account.findMany({
      where: {
        societyId: society.id,
        accountType: "BANK",
        isActive: true,
        deletedAt: null,
      },
      orderBy: { name: "asc" },
    }),
    prisma.chequeRegister.findMany({
      where: {
        societyId: society.id,
        status: { in: ["RECEIVED", "IN_CLEARING", "ISSUED"] },
      },
      orderBy: { chequeDate: "desc" },
    }),
    prisma.bankReconciliation.findMany({
      where: { account: { societyId: society.id } },
      include: {
        account: true,
      },
      orderBy: { statementDate: "desc" },
    }),
    prisma.flat.findMany({
      where: {
        block: { societyId: society.id },
        isActive: true,
        deletedAt: null,
      },
      include: { block: true },
      orderBy: [{ block: { name: "asc" } }, { number: "asc" }],
    }),
    prisma.bill.findMany({
      where: {
        societyId: society.id,
        status: { in: ["PENDING", "PARTIALLY_PAID"] },
      },
      include: {
        flat: { include: { block: true } },
      },
      orderBy: [{ year: "asc" }, { month: "asc" }],
    }),
  ])

  const bankAccounts: BankAccountOption[] = rawAccounts.map((a) => ({
    id: a.id,
    name: a.name,
    bankName: a.bankName,
    accountNumber: a.accountNumber,
    currentBalance: Number(a.currentBalance),
  }))

  const unpresentedCheques: UnclearedCheque[] = rawCheques
    .filter((c) => c.direction === "OUTWARD" && c.status === "ISSUED")
    .map((c) => ({
      id: c.id,
      chequeNumber: c.chequeNumber,
      chequeDate: c.chequeDate.toISOString(),
      partyName: c.partyName,
      amount: Number(c.amount),
      direction: c.direction,
      status: c.status,
    }))

  const uncreditedCheques: UnclearedCheque[] = rawCheques
    .filter((c) => c.direction === "INWARD" && (c.status === "RECEIVED" || c.status === "IN_CLEARING"))
    .map((c) => ({
      id: c.id,
      chequeNumber: c.chequeNumber,
      chequeDate: c.chequeDate.toISOString(),
      partyName: c.partyName,
      amount: Number(c.amount),
      direction: c.direction,
      status: c.status,
    }))

  const historicalRecons: HistoricalReconItem[] = rawRecons.map((r) => ({
    id: r.id,
    accountId: r.accountId,
    accountName: r.account.name,
    bankName: r.account.bankName,
    accountNumber: r.account.accountNumber,
    statementDate: r.statementDate.toISOString(),
    statementBalance: Number(r.statementBalance),
    bookBalance: Number(r.ledgerBalance),
    uncreditedAmount: 0,
    unpresentedAmount: 0,
    discrepancy: Number(r.difference),
    status: r.status,
    notes: r.notes,
    reconciledAt: r.reconciledAt ? r.reconciledAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  }))

  const flats: FlatOption[] = rawFlats.map((f) => ({
    id: f.id,
    label: `${f.block.name ? `${f.block.name}-` : ""}${f.number}`,
    flatNumber: f.number,
    blockName: f.block.name,
  }))

  const unpaidBills: UnpaidBillOption[] = rawBills.map((b) => ({
    id: b.id,
    flatId: b.flatId,
    flatLabel: `${b.flat.block.name ? `${b.flat.block.name}-` : ""}${b.flat.number}`,
    title: b.title || `${b.month}/${b.year} Maintenance Bill`,
    amount: Number(b.amount),
    month: b.month,
    year: b.year,
  }))

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Treasury & Audit"
        title="Bank Reconciliation Statement (BRS)"
        description={`Statutory Bank Reconciliation Statement (BRS) reconciling society ledger balances with passbook/bank statements for ${society.name}.`}
      />

      <ReconciliationClientView
        societyCode={code}
        societyInfo={{
          name: society.name,
          address: society.address,
          city: society.city,
          state: society.state,
          pincode: society.pincode,
          registrationNumber: society.registrationNumber,
          panNumber: society.panNumber,
          currencySymbol: society.currencySymbol || "₹",
        }}
        currencySymbol={society.currencySymbol || "₹"}
        bankAccounts={bankAccounts}
        unpresentedCheques={unpresentedCheques}
        uncreditedCheques={uncreditedCheques}
        historicalRecons={historicalRecons}
        flats={flats}
        unpaidBills={unpaidBills}
        canManage={canManage}
      />
    </div>
  )
}
