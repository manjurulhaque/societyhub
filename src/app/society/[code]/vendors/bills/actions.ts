"use server"

import { revalidatePath } from "next/cache"
import { requireCommitteeAccess, FINANCIAL_ROLES } from "@/lib/auth/requireAuth"
import { prisma } from "@/lib/prisma"
import { recordAuditLog } from "@/lib/audit"
import type { BillStatus } from "@/generated/prisma/client"

export type VendorBillActionState = {
  success?: boolean
  error?: string
  message?: string
  billId?: string
}

/**
 * Creates a formal Vendor / Contractor Bill with statutory TDS calculation
 */
export async function createVendorBill(
  societyCode: string,
  data: {
    vendorId: string
    billNumber: string
    billDate: string
    dueDate?: string | null
    amount: number
    gstAmount?: number
    tdsAmount?: number
    notes?: string | null
    reference?: string | null
  }
): Promise<VendorBillActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, FINANCIAL_ROLES)
    const societyId = context.society.id

    const vendor = await prisma.vendor.findFirst({
      where: { id: data.vendorId, societyId, isActive: true, deletedAt: null },
    })
    if (!vendor) return { error: "Selected vendor not found." }

    if (!data.billNumber || !data.billNumber.trim()) {
      return { error: "Invoice/Bill number is required." }
    }

    if (!data.amount || data.amount <= 0) {
      return { error: "Please provide a valid positive bill amount." }
    }

    const billDate = new Date(data.billDate)
    const dueDate = data.dueDate ? new Date(data.dueDate) : null
    const gstAmount = data.gstAmount && data.gstAmount > 0 ? data.gstAmount : 0
    const tdsAmount = data.tdsAmount && data.tdsAmount > 0 ? data.tdsAmount : 0

    const vendorBill = await prisma.vendorBill.create({
      data: {
        societyId,
        vendorId: data.vendorId,
        billNumber: data.billNumber.trim(),
        billDate,
        dueDate,
        amount: data.amount,
        gstAmount,
        tdsAmount,
        paidAmount: 0,
        status: "PENDING",
        notes: data.notes?.trim() || null,
        reference: data.reference?.trim() || null,
      },
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "CREATE",
      entity: "VendorBill",
      entityId: vendorBill.id,
      description: `${context.user.email} recorded vendor bill #${data.billNumber} for ₹${data.amount} from ${vendor.name} (TDS: ₹${tdsAmount})`,
      newData: {
        vendorName: vendor.name,
        billNumber: data.billNumber,
        amount: data.amount,
        tdsAmount,
      },
    })

    revalidatePath(`/society/${societyCode}/vendors/bills`)
    revalidatePath(`/society/${societyCode}/vendors`)
    revalidatePath(`/society/${societyCode}/expenses`)

    return {
      success: true,
      message: `Vendor bill #${data.billNumber} created successfully.`,
      billId: vendorBill.id,
    }
  } catch (err: unknown) {
    console.error("Failed to create vendor bill:", err)
    const message = err instanceof Error ? err.message : "Failed to create vendor bill."
    return { error: message }
  }
}

/**
 * Updates status of a Vendor Bill (e.g. mark PAID or CANCELLED)
 */
export async function updateVendorBillStatus(
  societyCode: string,
  billId: string,
  status: BillStatus
): Promise<VendorBillActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, FINANCIAL_ROLES)
    const societyId = context.society.id

    const bill = await prisma.vendorBill.findFirst({
      where: { id: billId, societyId },
      include: { vendor: true },
    })
    if (!bill) return { error: "Vendor bill not found." }

    const updateData: { status: BillStatus; paidAmount?: number } = { status }
    if (status === "PAID") {
      const netPayable = Number(bill.amount) + Number(bill.gstAmount) - Number(bill.tdsAmount)
      updateData.paidAmount = netPayable
    }

    await prisma.vendorBill.update({
      where: { id: billId },
      data: updateData,
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "STATUS_CHANGE",
      entity: "VendorBill",
      entityId: billId,
      description: `${context.user.email} updated vendor bill #${bill.billNumber} status to ${status}`,
    })

    revalidatePath(`/society/${societyCode}/vendors/bills`)
    revalidatePath(`/society/${societyCode}/vendors`)

    return { success: true, message: `Vendor bill updated to ${status}.` }
  } catch (err: unknown) {
    console.error("Failed to update vendor bill status:", err)
    const message = err instanceof Error ? err.message : "Failed to update status."
    return { error: message }
  }
}
