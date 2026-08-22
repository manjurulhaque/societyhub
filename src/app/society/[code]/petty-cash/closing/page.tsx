import { notFound } from "next/navigation"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { prisma } from "@/lib/prisma"
import { AdminPageHeader } from "@/components/admin"
import { CashClosingClientView, type CashClosingLogItem } from "./CashClosingClientView"
import { COMMITTEE_ROLES } from "@/lib/auth/requireAuth"
import type { SocietyRole } from "@/generated/prisma/client"

export default async function SocietyCashClosingPage({
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

  const [pettyAccount, rawLogs] = await Promise.all([
    prisma.account.findFirst({
      where: {
        societyId: society.id,
        accountType: "PETTY_CASH",
        isActive: true,
        deletedAt: null,
      },
    }),
    prisma.cashClosingLog.findMany({
      where: { societyId: society.id },
      orderBy: { closingDate: "desc" },
    }),
  ])

  const currentFloatBalance = pettyAccount ? Number(pettyAccount.currentBalance) : 0

  const logs: CashClosingLogItem[] = rawLogs.map((l) => ({
    id: l.id,
    closingDate: l.closingDate.toISOString(),
    openingBalance: Number(l.openingBalance),
    totalReceipts: Number(l.totalReceipts),
    totalPayments: Number(l.totalPayments),
    calculatedBalance: Number(l.calculatedBalance),
    actualPhysicalCash: Number(l.actualPhysicalCash),
    difference: Number(l.difference),
    verifiedBy: l.verifiedBy,
    notes: l.notes,
    createdAt: l.createdAt.toISOString(),
  }))

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Cashbox Audit & Verification"
        title="Physical Cash Verification & Closing Log"
        description={`Statutory cash in hand physical counts, denomination breakdowns, and audit reconciliation logs for ${society.name}.`}
      />

      <CashClosingClientView
        societyCode={code}
        currencySymbol={society.currencySymbol || "₹"}
        currentFloatBalance={currentFloatBalance}
        closingLogs={logs}
        canManage={canManage}
      />
    </div>
  )
}
