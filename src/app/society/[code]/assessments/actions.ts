"use server"

import { revalidatePath } from "next/cache"
import { requireCommitteeAccess, COMMITTEE_ROLES } from "@/lib/auth/requireAuth"
import { prisma } from "@/lib/prisma"
import { recordAuditLog } from "@/lib/audit"
import type { MaintenanceType, PaymentPlan, AssessmentStatus, BillStatus } from "@/generated/prisma/client"

export type AssessmentActionState = {
  success?: boolean
  error?: string
  message?: string
  collectionId?: string
}

/**
 * Creates a new Special Assessment / Sinking Fund drive and generates flat allocations & installments
 */
export async function createAssessmentCampaign(
  societyCode: string,
  data: {
    title: string
    description?: string | null
    totalTargetAmount?: number | null
    calculationType: MaintenanceType
    ratePerSqft?: number | null
    fixedAmountPerFlat?: number | null
    paymentPlan: PaymentPlan
    numberOfInstallments: number
    startDate: string
    dueDate?: string | null
    approvedInMeeting?: string | null
    remarks?: string | null
  }
): Promise<AssessmentActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, COMMITTEE_ROLES)
    const societyId = context.society.id

    const title = data.title?.trim()
    if (!title) {
      return { error: "Assessment campaign title is required (e.g. Exterior Painting & Waterproofing)." }
    }

    if (data.calculationType === "PER_SQFT" && (!data.ratePerSqft || data.ratePerSqft <= 0)) {
      return { error: "Valid rate per sq.ft is required for sqft-based assessments." }
    }

    if (data.calculationType === "FIXED" && (!data.fixedAmountPerFlat || data.fixedAmountPerFlat <= 0)) {
      return { error: "Valid fixed amount per flat is required for fixed-rate assessments." }
    }

    const numInstallments = Math.max(1, Math.min(24, data.numberOfInstallments || 1))
    const startDate = data.startDate ? new Date(data.startDate) : new Date()
    const dueDate = data.dueDate ? new Date(data.dueDate) : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000)

    // Fetch all active flats in the society
    const flats = await prisma.flat.findMany({
      where: {
        block: { societyId },
        deletedAt: null,
      },
      include: {
        block: true,
      },
      orderBy: [
        { block: { name: "asc" } },
        { number: "asc" },
      ],
    })

    if (flats.length === 0) {
      return { error: "No flats found in this society. Please create blocks and flats first." }
    }

    // Atomic transaction to create campaign, allocations, and installments
    const collection = await prisma.$transaction(async (tx) => {
      const col = await tx.oneTimeCollection.create({
        data: {
          societyId,
          title,
          description: data.description?.trim() || null,
          totalTargetAmount: data.totalTargetAmount || null,
          calculationType: data.calculationType,
          ratePerSqft: data.ratePerSqft || null,
          fixedAmountPerFlat: data.fixedAmountPerFlat || null,
          paymentPlan: data.paymentPlan,
          numberOfInstallments: numInstallments,
          startDate,
          dueDate,
          status: "ACTIVE",
          approvedInMeeting: data.approvedInMeeting?.trim() || null,
          remarks: data.remarks?.trim() || null,
        },
      })

      // Generate allocations for each flat
      for (const flat of flats) {
        let assessedAmount = 0
        if (data.calculationType === "PER_SQFT") {
          const area = flat.area ? Number(flat.area) : 0
          assessedAmount = area * (data.ratePerSqft || 0)
        } else {
          assessedAmount = data.fixedAmountPerFlat || 0
        }

        // Round to 2 decimal places
        assessedAmount = Math.round(assessedAmount * 100) / 100

        const allocation = await tx.assessmentAllocation.create({
          data: {
            collectionId: col.id,
            flatId: flat.id,
            totalAmount: assessedAmount,
            paidAmount: 0,
            balanceAmount: assessedAmount,
            status: "PENDING",
          },
        })

        // Generate Installments
        const baseInstAmount = Math.floor((assessedAmount / numInstallments) * 100) / 100
        let allocatedSum = 0

        for (let i = 1; i <= numInstallments; i++) {
          let instAmount = baseInstAmount
          if (i === numInstallments) {
            // Adjust remainder on final installment
            instAmount = Math.round((assessedAmount - allocatedSum) * 100) / 100
          } else {
            allocatedSum += baseInstAmount
          }

          // Compute installment due date (e.g. distributed monthly)
          const instDueDate = new Date(startDate)
          instDueDate.setMonth(instDueDate.getMonth() + (i - 1))

          await tx.assessmentInstallment.create({
            data: {
              allocationId: allocation.id,
              installmentNumber: i,
              amount: instAmount,
              dueDate: instDueDate,
              paidAmount: 0,
              status: "PENDING",
            },
          })
        }
      }

      return col
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "CREATE",
      entity: "OneTimeCollection",
      entityId: collection.id,
      description: `${context.user.email} created Special Assessment "${title}" allocated to ${flats.length} flats`,
      newData: { title, calculationType: data.calculationType, totalTarget: data.totalTargetAmount, flatsCount: flats.length },
    })

    revalidatePath(`/society/${societyCode}/assessments`)
    revalidatePath(`/society/${societyCode}/bills`)

    return {
      success: true,
      message: `Assessment campaign "${title}" created and allocated across ${flats.length} flats.`,
      collectionId: collection.id,
    }
  } catch (err: unknown) {
    console.error("Failed to create assessment campaign:", err)
    const message = err instanceof Error ? err.message : "Failed to create assessment campaign."
    return { error: message }
  }
}

/**
 * Updates status of a Special Assessment campaign
 */
export async function updateAssessmentStatus(
  societyCode: string,
  collectionId: string,
  status: AssessmentStatus
): Promise<AssessmentActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, COMMITTEE_ROLES)
    const societyId = context.society.id

    const col = await prisma.oneTimeCollection.findFirst({
      where: { id: collectionId, societyId },
    })
    if (!col) return { error: "Campaign not found." }

    await prisma.oneTimeCollection.update({
      where: { id: collectionId },
      data: { status },
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "UPDATE",
      entity: "OneTimeCollection",
      entityId: collectionId,
      description: `${context.user.email} marked assessment campaign "${col.title}" as ${status}`,
    })

    revalidatePath(`/society/${societyCode}/assessments`)
    revalidatePath(`/society/${societyCode}/assessments/${collectionId}`)

    return { success: true, message: `Campaign status updated to ${status}.` }
  } catch (err: unknown) {
    console.error("Failed to update campaign status:", err)
    const message = err instanceof Error ? err.message : "Failed to update campaign status."
    return { error: message }
  }
}

/**
 * Records a payment against a specific assessment installment
 */
export async function recordAssessmentInstallmentPayment(
  societyCode: string,
  installmentId: string,
  amountPaid: number
): Promise<AssessmentActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, COMMITTEE_ROLES)
    const societyId = context.society.id

    if (amountPaid <= 0) {
      return { error: "Valid payment amount is required." }
    }

    const installment = await prisma.assessmentInstallment.findFirst({
      where: { id: installmentId },
      include: {
        allocation: {
          include: {
            collection: true,
            flat: { include: { block: true } },
          },
        },
      },
    })

    if (!installment || installment.allocation.collection.societyId !== societyId) {
      return { error: "Installment record not found." }
    }

    const newPaidOnInst = Number(installment.paidAmount) + amountPaid
    const instTotal = Number(installment.amount)
    const instStatus: BillStatus = newPaidOnInst >= instTotal ? "PAID" : "PARTIALLY_PAID"

    await prisma.$transaction(async (tx) => {
      // 1. Update installment
      await tx.assessmentInstallment.update({
        where: { id: installmentId },
        data: {
          paidAmount: newPaidOnInst,
          status: instStatus,
          paidOn: new Date(),
        },
      })

      // 2. Recalculate allocation totals
      const allInst = await tx.assessmentInstallment.findMany({
        where: { allocationId: installment.allocationId },
      })
      const totalPaid = allInst.reduce((sum, inst) => sum + (inst.id === installmentId ? newPaidOnInst : Number(inst.paidAmount)), 0)
      const totalAssessed = Number(installment.allocation.totalAmount)
      const newBalance = Math.max(0, totalAssessed - totalPaid)
      const allocStatus: BillStatus = newBalance <= 0 ? "PAID" : totalPaid > 0 ? "PARTIALLY_PAID" : "PENDING"

      await tx.assessmentAllocation.update({
        where: { id: installment.allocationId },
        data: {
          paidAmount: totalPaid,
          balanceAmount: newBalance,
          status: allocStatus,
        },
      })
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "UPDATE",
      entity: "AssessmentInstallment",
      entityId: installmentId,
      description: `${context.user.email} recorded payment of ₹${amountPaid} for Flat ${installment.allocation.flat.block.name}-${installment.allocation.flat.number} (Installment #${installment.installmentNumber})`,
    })

    revalidatePath(`/society/${societyCode}/assessments/${installment.allocation.collectionId}`)

    return { success: true, message: "Payment recorded successfully against installment." }
  } catch (err: unknown) {
    console.error("Failed to record installment payment:", err)
    const message = err instanceof Error ? err.message : "Failed to record payment."
    return { error: message }
  }
}
