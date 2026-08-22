"use server"

import { revalidatePath } from "next/cache"
import { requireCommitteeAccess, COMMITTEE_ROLES } from "@/lib/auth/requireAuth"
import { prisma } from "@/lib/prisma"
import { recordAuditLog } from "@/lib/audit"
import { sanitizeText } from "@/lib/sanitize"
import { getSafeErrorMessage } from "@/lib/errors"
import type { MaintenanceType, UnitType } from "@/generated/prisma/client"

export type RateActionState = {
  success?: boolean
  error?: string
  message?: string
  rateId?: string
}

/**
 * Creates a new Maintenance Tariff rule
 */
export async function createMaintenanceRate(
  societyCode: string,
  data: {
    maintenanceType: MaintenanceType
    ratePerSqft?: number | null
    fixedRate?: number | null
    unitType?: UnitType | null
    effectiveFrom: string
    effectiveUpto?: string | null
    approvedInMeeting?: string | null
    remarks?: string | null
  }
): Promise<RateActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, COMMITTEE_ROLES)
    const societyId = context.society.id

    if (data.maintenanceType === "PER_SQFT" && (!data.ratePerSqft || data.ratePerSqft <= 0)) {
      return { error: "Please enter a valid rate per sq.ft." }
    }

    if (data.maintenanceType === "FIXED" && (!data.fixedRate || data.fixedRate <= 0)) {
      return { error: "Please enter a valid fixed monthly amount." }
    }

    if (!data.effectiveFrom) {
      return { error: "Effective from date is required." }
    }

    const effectiveFrom = new Date(data.effectiveFrom)
    const effectiveUpto = data.effectiveUpto ? new Date(data.effectiveUpto) : null

    // Mark previous rates without effectiveUpto as closed if this is current
    if (!effectiveUpto) {
      await prisma.maintenanceRate.updateMany({
        where: {
          societyId,
          unitType: data.unitType || null,
          isCurrent: true,
        },
        data: {
          isCurrent: false,
          effectiveUpto: effectiveFrom,
        },
      })
    }

    const approvedInMeeting = data.approvedInMeeting ? sanitizeText(data.approvedInMeeting) : null
    const remarks = data.remarks ? sanitizeText(data.remarks) : null

    const newRate = await prisma.maintenanceRate.create({
      data: {
        societyId,
        maintenanceType: data.maintenanceType,
        ratePerSqft: data.ratePerSqft || null,
        fixedRate: data.fixedRate || null,
        unitType: data.unitType || null,
        effectiveFrom,
        effectiveUpto,
        isCurrent: !effectiveUpto,
        approvedInMeeting,
        remarks,
      },
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "CREATE",
      entity: "MaintenanceRate",
      entityId: newRate.id,
      description: `${context.user.email} configured maintenance tariff rule: ${data.maintenanceType} (₹${data.ratePerSqft || data.fixedRate}) effective from ${effectiveFrom.toLocaleDateString()}`,
      newData: {
        maintenanceType: data.maintenanceType,
        ratePerSqft: data.ratePerSqft,
        fixedRate: data.fixedRate,
        unitType: data.unitType,
        effectiveFrom: data.effectiveFrom,
      },
    })

    revalidatePath(`/society/${societyCode}/rates`)
    revalidatePath(`/society/${societyCode}/bills`)

    return {
      success: true,
      message: "Maintenance tariff rule created successfully.",
      rateId: newRate.id,
    }
  } catch (err: unknown) {
    console.error("Failed to create maintenance rate:", err)
    return { error: getSafeErrorMessage(err, "Failed to create rate rule.") }
  }
}

/**
 * Deletes a Maintenance Tariff rule
 */
export async function deleteMaintenanceRate(
  societyCode: string,
  rateId: string
): Promise<RateActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, COMMITTEE_ROLES)
    const societyId = context.society.id

    const existing = await prisma.maintenanceRate.findFirst({
      where: { id: rateId, societyId },
    })
    if (!existing) return { error: "Tariff rule not found." }

    await prisma.maintenanceRate.delete({
      where: { id: rateId },
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "DELETE",
      entity: "MaintenanceRate",
      entityId: rateId,
      description: `${context.user.email} removed maintenance tariff rule`,
    })

    revalidatePath(`/society/${societyCode}/rates`)
    revalidatePath(`/society/${societyCode}/bills`)

    return { success: true, message: "Tariff rule deleted." }
  } catch (err: unknown) {
    console.error("Failed to delete maintenance rate:", err)
    return { error: getSafeErrorMessage(err, "Failed to delete rate rule.") }
  }
}
