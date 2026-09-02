"use server"

import { revalidatePath } from "next/cache"
import { requireCommitteeAccess, FINANCIAL_ROLES, EXECUTIVE_ROLES } from "@/lib/auth/requireAuth"
import { prisma } from "@/lib/prisma"
import { recordAuditLog } from "@/lib/audit"
import { logger } from "@/lib/logger"

export type FinancialYearActionState = {
  success?: boolean
  error?: string
  message?: string
}

/**
 * Creates a new Financial Year for the society.
 */
export async function createFinancialYear(
  societyCode: string,
  data: {
    name: string
    startYear: number
    endYear: number
    startDate: string
    endDate: string
    isCurrent?: boolean
  }
): Promise<FinancialYearActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, [...EXECUTIVE_ROLES, ...FINANCIAL_ROLES])
    const societyId = context.society.id

    const name = data.name?.trim()
    const startYear = Number(data.startYear)
    const endYear = Number(data.endYear)
    const startDate = new Date(data.startDate)
    const endDate = new Date(data.endDate)

    if (!name) {
      return { error: "Financial year name is required (e.g. FY 2025-2026)." }
    }

    if (isNaN(startYear) || isNaN(endYear) || startYear >= endYear) {
      return { error: "Invalid start or end year. Start year must be earlier than end year." }
    }

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return { error: "Invalid start or end date." }
    }

    if (startDate >= endDate) {
      return { error: "Start date must be strictly earlier than end date." }
    }

    // Check duplicate name or start year in the same society
    const existing = await prisma.financialYear.findFirst({
      where: {
        societyId,
        OR: [
          { name: { equals: name, mode: "insensitive" } },
          { startYear },
        ],
      },
    })

    if (existing) {
      if (existing.startYear === startYear) {
        return { error: `A financial year starting in ${startYear} already exists (${existing.name}).` }
      }
      return { error: `A financial year named "${name}" already exists in this society.` }
    }

    const created = await prisma.$transaction(async (tx) => {
      if (data.isCurrent) {
        await tx.financialYear.updateMany({
          where: { societyId, isCurrent: true },
          data: { isCurrent: false },
        })
      }

      return tx.financialYear.create({
        data: {
          societyId,
          name,
          startYear,
          endYear,
          startDate,
          endDate,
          isCurrent: Boolean(data.isCurrent),
          isClosed: false,
          isLocked: false,
        },
      })
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "CREATE",
      entity: "FinancialYear",
      entityId: created.id,
      description: `${context.user.email} created financial year "${name}" (${startYear}-${endYear})`,
      newData: {
        name,
        startYear,
        endYear,
        startDate: data.startDate,
        endDate: data.endDate,
        isCurrent: Boolean(data.isCurrent),
      },
    })

    revalidatePath(`/society/${societyCode}/settings/financial-years`)
    revalidatePath(`/society/${societyCode}/settings`)
    revalidatePath(`/society/${societyCode}/reports`)
    revalidatePath(`/society/${societyCode}/ledgers`)

    return {
      success: true,
      message: `Financial Year "${name}" created successfully.`,
    }
  } catch (err: unknown) {
    logger.error("Failed to create financial year", err, "createFinancialYear", { societyCode, name: data.name })
    const message = err instanceof Error ? err.message : "Failed to create financial year. Please try again."
    return { error: message }
  }
}

/**
 * Updates an existing Financial Year's name, start date, and end date.
 */
export async function updateFinancialYear(
  societyCode: string,
  id: string,
  data: {
    name: string
    startDate: string
    endDate: string
  }
): Promise<FinancialYearActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, [...EXECUTIVE_ROLES, ...FINANCIAL_ROLES])
    const societyId = context.society.id

    const fy = await prisma.financialYear.findUnique({
      where: { id },
    })

    if (!fy || fy.societyId !== societyId) {
      return { error: "Financial year not found or does not belong to this society." }
    }

    if (fy.isLocked) {
      return {
        error: "This financial year is audit-locked (frozen). You must unfreeze the audit period before making modifications.",
      }
    }

    const name = data.name?.trim()
    const startDate = new Date(data.startDate)
    const endDate = new Date(data.endDate)

    if (!name) {
      return { error: "Financial year name is required." }
    }

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return { error: "Invalid start or end date." }
    }

    if (startDate >= endDate) {
      return { error: "Start date must be strictly earlier than end date." }
    }

    // Check name uniqueness if modified
    if (name.toLowerCase() !== fy.name.toLowerCase()) {
      const duplicate = await prisma.financialYear.findFirst({
        where: {
          societyId,
          name: { equals: name, mode: "insensitive" },
          id: { not: id },
        },
      })
      if (duplicate) {
        return { error: `Another financial year named "${name}" already exists.` }
      }
    }

    await prisma.financialYear.update({
      where: { id },
      data: {
        name,
        startDate,
        endDate,
      },
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "UPDATE",
      entity: "FinancialYear",
      entityId: id,
      description: `${context.user.email} updated financial year "${name}"`,
      oldData: { name: fy.name, startDate: fy.startDate, endDate: fy.endDate },
      newData: { name, startDate: data.startDate, endDate: data.endDate },
    })

    revalidatePath(`/society/${societyCode}/settings/financial-years`)
    revalidatePath(`/society/${societyCode}/settings`)
    revalidatePath(`/society/${societyCode}/reports`)
    revalidatePath(`/society/${societyCode}/ledgers`)

    return {
      success: true,
      message: `Financial Year "${name}" updated successfully.`,
    }
  } catch (err: unknown) {
    logger.error("Failed to update financial year", err, "updateFinancialYear", { societyCode, id, name: data.name })
    const message = err instanceof Error ? err.message : "Failed to update financial year. Please try again."
    return { error: message }
  }
}

/**
 * Sets a financial year as the active / current financial year for the society.
 */
export async function setCurrentFinancialYear(
  societyCode: string,
  id: string
): Promise<FinancialYearActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, [...EXECUTIVE_ROLES, ...FINANCIAL_ROLES])
    const societyId = context.society.id

    const fy = await prisma.financialYear.findUnique({
      where: { id },
    })

    if (!fy || fy.societyId !== societyId) {
      return { error: "Financial year not found." }
    }

    if (fy.isCurrent) {
      return { message: `"${fy.name}" is already the active financial year.` }
    }

    await prisma.$transaction([
      prisma.financialYear.updateMany({
        where: { societyId, isCurrent: true },
        data: { isCurrent: false },
      }),
      prisma.financialYear.update({
        where: { id },
        data: { isCurrent: true },
      }),
    ])

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "STATUS_CHANGE",
      entity: "FinancialYear",
      entityId: id,
      description: `${context.user.email} set active financial year to "${fy.name}"`,
      newData: { isCurrent: true },
    })

    revalidatePath(`/society/${societyCode}/settings/financial-years`)
    revalidatePath(`/society/${societyCode}/settings`)
    revalidatePath(`/society/${societyCode}/reports`)
    revalidatePath(`/society/${societyCode}/ledgers`)
    revalidatePath(`/society/${societyCode}/dashboard`)

    return {
      success: true,
      message: `"${fy.name}" is now set as the active financial year.`,
    }
  } catch (err: unknown) {
    logger.error("Failed to switch current financial year", err, "setCurrentFinancialYear", { societyCode, id })
    const message = err instanceof Error ? err.message : "Failed to set active financial year. Please try again."
    return { error: message }
  }
}

/**
 * Freezes (Locks) or unfreezes an accounting period for audit protection.
 */
export async function toggleAuditLock(
  societyCode: string,
  id: string,
  lock: boolean
): Promise<FinancialYearActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, [...EXECUTIVE_ROLES, ...FINANCIAL_ROLES])
    const societyId = context.society.id

    const fy = await prisma.financialYear.findUnique({
      where: { id },
    })

    if (!fy || fy.societyId !== societyId) {
      return { error: "Financial year not found." }
    }

    const lockedBy = lock ? (context.user.email || "Auditor / Admin") : null
    const lockedAt = lock ? new Date() : null

    await prisma.financialYear.update({
      where: { id },
      data: {
        isLocked: lock,
        lockedAt,
        lockedBy,
      },
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "STATUS_CHANGE",
      entity: "FinancialYear",
      entityId: id,
      description: `${context.user.email} ${lock ? "audit-locked (frozen)" : "unlocked"} financial year "${fy.name}"`,
      newData: { isLocked: lock, lockedAt, lockedBy },
    })

    revalidatePath(`/society/${societyCode}/settings/financial-years`)
    revalidatePath(`/society/${societyCode}/settings`)
    revalidatePath(`/society/${societyCode}/reports`)

    return {
      success: true,
      message: lock
        ? `"${fy.name}" has been audit-frozen. Modifications are now restricted.`
        : `"${fy.name}" has been unlocked for edits.`,
    }
  } catch (err: unknown) {
    logger.error("Failed to toggle audit lock", err, "toggleAuditLock", { societyCode, id, lock })
    const message = err instanceof Error ? err.message : "Failed to update audit lock status. Please try again."
    return { error: message }
  }
}

/**
 * Marks a financial year as statutory closed or reopened.
 */
export async function toggleYearClosure(
  societyCode: string,
  id: string,
  close: boolean
): Promise<FinancialYearActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, [...EXECUTIVE_ROLES, ...FINANCIAL_ROLES])
    const societyId = context.society.id

    const fy = await prisma.financialYear.findUnique({
      where: { id },
    })

    if (!fy || fy.societyId !== societyId) {
      return { error: "Financial year not found." }
    }

    await prisma.financialYear.update({
      where: { id },
      data: {
        isClosed: close,
      },
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "STATUS_CHANGE",
      entity: "FinancialYear",
      entityId: id,
      description: `${context.user.email} marked financial year "${fy.name}" as ${close ? "CLOSED" : "OPEN"}`,
      newData: { isClosed: close },
    })

    revalidatePath(`/society/${societyCode}/settings/financial-years`)
    revalidatePath(`/society/${societyCode}/settings`)
    revalidatePath(`/society/${societyCode}/reports`)

    return {
      success: true,
      message: close
        ? `"${fy.name}" is now marked as closed.`
        : `"${fy.name}" has been reopened.`,
    }
  } catch (err: unknown) {
    logger.error("Failed to toggle year closure", err, "toggleYearClosure", { societyCode, id, close })
    const message = err instanceof Error ? err.message : "Failed to update year closure status. Please try again."
    return { error: message }
  }
}

/**
 * Deletes an unused financial year. Prevents deletion if linked to transactions or is current.
 */
export async function deleteFinancialYear(
  societyCode: string,
  id: string
): Promise<FinancialYearActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, [...EXECUTIVE_ROLES, ...FINANCIAL_ROLES])
    const societyId = context.society.id

    const fy = await prisma.financialYear.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            journalEntries: true,
            budgets: true,
            maintenanceRegisters: true,
          },
        },
      },
    })

    if (!fy || fy.societyId !== societyId) {
      return { error: "Financial year not found." }
    }

    if (fy.isCurrent) {
      return {
        error: "Cannot delete the active financial year. Please set another financial year as current before deleting this one.",
      }
    }

    const { journalEntries, budgets, maintenanceRegisters } = fy._count
    if (journalEntries > 0 || budgets > 0 || maintenanceRegisters > 0) {
      const reasons: string[] = []
      if (journalEntries > 0) reasons.push(`${journalEntries} journal entry(ies)`)
      if (budgets > 0) reasons.push(`${budgets} budget plan(s)`)
      if (maintenanceRegisters > 0) reasons.push(`${maintenanceRegisters} register record(s)`)

      return {
        error: `Cannot delete "${fy.name}" because it contains linked accounting records: ${reasons.join(", ")}.`,
      }
    }

    await prisma.financialYear.delete({
      where: { id },
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "DELETE",
      entity: "FinancialYear",
      entityId: id,
      description: `${context.user.email} deleted financial year "${fy.name}"`,
      oldData: { name: fy.name, startYear: fy.startYear, endYear: fy.endYear },
    })

    revalidatePath(`/society/${societyCode}/settings/financial-years`)
    revalidatePath(`/society/${societyCode}/settings`)
    revalidatePath(`/society/${societyCode}/reports`)

    return {
      success: true,
      message: `Financial Year "${fy.name}" deleted successfully.`,
    }
  } catch (err: unknown) {
    logger.error("Failed to delete financial year", err, "deleteFinancialYear", { societyCode, id })
    const message = err instanceof Error ? err.message : "Failed to delete financial year. Please try again."
    return { error: message }
  }
}
