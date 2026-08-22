import { notFound } from "next/navigation"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { prisma } from "@/lib/prisma"
import { AdminPageHeader } from "@/components/admin"
import { VendorBillsClientView, type VendorBillListItem } from "./VendorBillsClientView"
import { FINANCIAL_ROLES, EXECUTIVE_ROLES } from "@/lib/auth/requireAuth"
import type { SocietyRole } from "@/generated/prisma/client"

export default async function SocietyVendorBillsPage({
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

  const [rawBills, rawVendors] = await Promise.all([
    prisma.vendorBill.findMany({
      where: { societyId: society.id },
      include: {
        vendor: true,
      },
      orderBy: { billDate: "desc" },
    }),
    prisma.vendor.findMany({
      where: { societyId: society.id, isActive: true, deletedAt: null },
      select: { id: true, name: true, companyName: true, panNumber: true },
      orderBy: { name: "asc" },
    }),
  ])

  const bills: VendorBillListItem[] = rawBills.map((b) => {
    const amount = Number(b.amount)
    const gstAmount = Number(b.gstAmount)
    const tdsAmount = Number(b.tdsAmount)
    const paidAmount = Number(b.paidAmount)
    const netPayable = amount + gstAmount - tdsAmount

    return {
      id: b.id,
      vendorId: b.vendorId,
      vendorName: b.vendor.name,
      vendorCompany: b.vendor.companyName,
      vendorPan: b.vendor.panNumber,
      billNumber: b.billNumber,
      billDate: b.billDate.toISOString(),
      dueDate: b.dueDate ? b.dueDate.toISOString() : null,
      amount,
      gstAmount,
      tdsAmount,
      paidAmount,
      netPayable,
      status: b.status,
      notes: b.notes,
      reference: b.reference,
    }
  })

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Expenditures & Procurement"
        title="Vendor Invoices & Statutory TDS Register"
        description={`Track contractor bills, compute Section 194C/194J TDS deductions, and manage invoice settlement for ${society.name}.`}
      />

      <VendorBillsClientView
        societyCode={code}
        currencySymbol={society.currencySymbol || "₹"}
        bills={bills}
        vendors={rawVendors}
        canManage={canManage}
      />
    </div>
  )
}
