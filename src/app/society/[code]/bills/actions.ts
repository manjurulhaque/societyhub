"use server"

import { revalidatePath } from "next/cache"
import { requireCommitteeAccess, FINANCIAL_ROLES } from "@/lib/auth/requireAuth"
import { prisma } from "@/lib/prisma"
import { recordAuditLog } from "@/lib/audit"
import { sanitizeText } from "@/lib/sanitize"
import { getSafeErrorMessage } from "@/lib/errors"
import { logger } from "@/lib/logger"
import type { BillType, BillStatus } from "@/generated/prisma/client"

export type BillActionState = {
  success?: boolean
  error?: string
  message?: string
  generatedCount?: number
  skippedCount?: number
  totalAmount?: number
}

/**
 * Generates monthly maintenance bills in batch for all active flats in the society.
 */
export async function generateBatchBills(
  societyCode: string,
  data: {
    month: number
    year: number
    dueDate?: string | null
    billType?: BillType
  }
): Promise<BillActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, FINANCIAL_ROLES)
    const societyId = context.society.id

    const month = Number(data.month)
    const year = Number(data.year)
    const billType: BillType = data.billType || "MAINTENANCE"

    if (isNaN(month) || month < 1 || month > 12) {
      return { error: "Please provide a valid billing month (1 - 12)." }
    }

    if (isNaN(year) || year < 2000 || year > 2100) {
      return { error: "Please provide a valid billing year." }
    }

    // Fetch society policy
    const society = await prisma.society.findUnique({
      where: { id: societyId },
      select: {
        id: true,
        name: true,
        maintenanceType: true,
        fixedRate: true,
        ratePerSqft: true,
        dueDayOfMonth: true,
        gracePeriodDays: true,
        invoicePrefix: true,
      },
    })

    if (!society) {
      return { error: "Society configuration not found." }
    }

    // Fetch all active flats in this society
    const flats = await prisma.flat.findMany({
      where: {
        block: { societyId },
        isActive: true,
        deletedAt: null,
      },
      include: {
        block: { select: { name: true } },
      },
      orderBy: [
        { block: { name: "asc" } },
        { number: "asc" },
      ],
    })

    if (flats.length === 0) {
      return { error: "No active flats configured in this society to bill." }
    }

    // Calculate default due date if not provided
    let dueDate: Date
    if (data.dueDate) {
      dueDate = new Date(data.dueDate)
    } else {
      const dueDay = society.dueDayOfMonth || 10
      dueDate = new Date(year, month - 1, dueDay, 23, 59, 59)
    }

    const gracePeriodDays = society.gracePeriodDays || 0
    const graceDate = new Date(dueDate)
    graceDate.setDate(graceDate.getDate() + gracePeriodDays)

    const prefix = society.invoicePrefix?.trim().toUpperCase() || "INV"
    const monthStr = month.toString().padStart(2, "0")

    // Fetch existing bills for this period to avoid duplicate billing
    const existingBills = await prisma.bill.findMany({
      where: {
        societyId,
        billType,
        year,
        month,
        sequence: 1,
      },
      select: {
        flatId: true,
      },
    })

    const existingFlatIds = new Set(existingBills.map((b) => b.flatId))

    let generatedCount = 0
    let skippedCount = 0
    let totalGeneratedAmount = 0

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ]
    const periodLabel = `${monthNames[month - 1]} ${year}`

    await prisma.$transaction(async (tx) => {
      for (const flat of flats) {
        if (existingFlatIds.has(flat.id)) {
          skippedCount++
          continue
        }

        // Calculate bill amount
        let billAmount = 0
        if (society.maintenanceType === "PER_SQFT" && flat.area && society.ratePerSqft) {
          billAmount = Number(flat.area) * Number(society.ratePerSqft)
        } else if (society.fixedRate) {
          billAmount = Number(society.fixedRate)
        } else if (society.ratePerSqft && flat.area) {
          billAmount = Number(flat.area) * Number(society.ratePerSqft)
        } else {
          billAmount = 2000 // Standard baseline if unconfigured
        }

        // Round to 2 decimals
        billAmount = Math.round(billAmount * 100) / 100

        // Create unique invoice number
        const cleanFlatNum = `${flat.block.name.replace(/[^A-Z0-9]/gi, "")}-${flat.number.replace(/[^A-Z0-9]/gi, "")}`
        const billNumber = `${prefix}-${year}${monthStr}-${cleanFlatNum}`

        await tx.bill.create({
          data: {
            societyId,
            flatId: flat.id,
            billNumber,
            billType,
            title: `Maintenance Charges - ${periodLabel}`,
            sequence: 1,
            year,
            month,
            amount: billAmount,
            status: "PENDING" as BillStatus,
            billDate: new Date(),
            dueDate,
          },
        })

        generatedCount++
        totalGeneratedAmount += billAmount
      }
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "CREATE",
      entity: "Bill",
      description: `${context.user.email} executed batch maintenance billing for ${periodLabel}: ${generatedCount} invoices generated (₹${totalGeneratedAmount.toLocaleString("en-IN")}), ${skippedCount} skipped`,
      newData: { month, year, billType, generatedCount, skippedCount, totalGeneratedAmount },
    })

    revalidatePath(`/society/${societyCode}/bills`)
    revalidatePath(`/society/${societyCode}/dashboard`)
    revalidatePath(`/society/${societyCode}/reports`)

    if (generatedCount === 0 && skippedCount > 0) {
      return {
        success: true,
        message: `All ${skippedCount} flats in this society have already been billed for ${periodLabel}. No new invoices generated.`,
        generatedCount,
        skippedCount,
        totalAmount: 0,
      }
    }

    return {
      success: true,
      message: `Generated ${generatedCount} invoices for ${periodLabel} totaling ₹${totalGeneratedAmount.toLocaleString("en-IN")}.${skippedCount > 0 ? ` (${skippedCount} already-billed flats skipped)` : ""}`,
      generatedCount,
      skippedCount,
      totalAmount: totalGeneratedAmount,
    }
  } catch (err: unknown) {
    logger.error("Failed to generate batch bills", err, "generateBatchBills", { societyCode, month: data.month, year: data.year, billType: data.billType })
    return { error: getSafeErrorMessage(err, "Failed to execute batch billing.") }
  }
}

/**
 * Creates an individual custom bill for a specific flat.
 */
export async function createIndividualBill(
  societyCode: string,
  data: {
    flatId: string
    billType: BillType
    amount: number
    month: number
    year: number
    dueDate?: string | null
    title?: string | null
  }
): Promise<BillActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, FINANCIAL_ROLES)
    const societyId = context.society.id

    const amount = Number(data.amount)
    const month = Number(data.month)
    const year = Number(data.year)

    if (!data.flatId) {
      return { error: "Please select a target flat." }
    }

    if (isNaN(amount) || amount <= 0) {
      return { error: "Please enter a valid bill amount." }
    }

    const flat = await prisma.flat.findFirst({
      where: {
        id: data.flatId,
        block: { societyId },
        deletedAt: null,
      },
      include: {
        block: { select: { name: true } },
      },
    })

    if (!flat) {
      return { error: "Selected flat is invalid for this society." }
    }

    // Determine sequence number if previous bill exists for same flat+type+period
    const existingCount = await prisma.bill.count({
      where: {
        flatId: data.flatId,
        billType: data.billType,
        year,
        month,
      },
    })

    const sequence = existingCount + 1
    const prefix = "INV"
    const monthStr = month.toString().padStart(2, "0")
    const cleanFlatNum = `${flat.block.name.replace(/[^A-Z0-9]/gi, "")}-${flat.number.replace(/[^A-Z0-9]/gi, "")}`
    const billNumber = `${prefix}-${year}${monthStr}-${cleanFlatNum}${sequence > 1 ? `-S${sequence}` : ""}`

    const dueDate = data.dueDate
      ? new Date(data.dueDate)
      : new Date(year, month - 1, 10, 23, 59, 59)

    const rawTitle = data.title?.trim() || `${data.billType.replace(/_/g, " ")} Assessment`
    const title = sanitizeText(rawTitle)

    const bill = await prisma.bill.create({
      data: {
        societyId,
        flatId: data.flatId,
        billNumber,
        billType: data.billType,
        title,
        sequence,
        year,
        month,
        amount,
        status: "PENDING" as BillStatus,
        billDate: new Date(),
        dueDate,
      },
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "CREATE",
      entity: "Bill",
      entityId: bill.id,
      description: `${context.user.email} issued bill ${billNumber} for Flat ${flat.block.name}-${flat.number} (₹${amount})`,
      newData: { billNumber, flatId: data.flatId, amount, billType: data.billType },
    })

    revalidatePath(`/society/${societyCode}/bills`)
    revalidatePath(`/society/${societyCode}/dashboard`)

    return {
      success: true,
      message: `Bill ${billNumber} created successfully.`,
    }
  } catch (err: unknown) {
    logger.error("Failed to create individual bill", err, "createIndividualBill", { societyCode, flatId: data.flatId, amount: data.amount, billType: data.billType })
    return { error: getSafeErrorMessage(err, "Failed to create bill.") }
  }
}

/**
 * Cancels an unpaid bill.
 */
export async function cancelBill(
  societyCode: string,
  billId: string,
  reason?: string
): Promise<BillActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, FINANCIAL_ROLES)
    const societyId = context.society.id

    const bill = await prisma.bill.findFirst({
      where: { id: billId, societyId },
      include: {
        flat: {
          include: { block: true },
        },
      },
    })

    if (!bill) {
      return { error: "Bill not found." }
    }

    if (bill.status === "PAID") {
      return { error: "Cannot cancel a bill that has already been paid." }
    }

    const sanitizedReason = reason ? sanitizeText(reason) : undefined

    const updatedBill = await prisma.bill.update({
      where: { id: billId },
      data: {
        status: "CANCELLED" as BillStatus,
      },
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "STATUS_CHANGE",
      entity: "Bill",
      entityId: billId,
      description: `${context.user.email} cancelled Bill ${bill.billNumber || bill.id} for Flat ${bill.flat.block.name}-${bill.flat.number}${sanitizedReason ? `: ${sanitizedReason}` : ""}`,
      oldData: { status: bill.status },
      newData: { status: updatedBill.status, reason: sanitizedReason },
    })

    revalidatePath(`/society/${societyCode}/bills`)
    revalidatePath(`/society/${societyCode}/dashboard`)

    return {
      success: true,
      message: `Bill ${bill.billNumber || bill.id} has been cancelled.`,
    }
  } catch (err: unknown) {
    logger.error("Failed to cancel bill", err, "cancelBill", { societyCode, billId })
    return { error: getSafeErrorMessage(err, "Failed to cancel bill.") }
  }
}
