"use server"

import { revalidatePath } from "next/cache"
import { requireCommitteeAccess, FINANCIAL_ROLES } from "@/lib/auth/requireAuth"
import { prisma } from "@/lib/prisma"
import { recordAuditLog } from "@/lib/audit"
import { Prisma } from "@/generated/prisma/client"

export type BudgetActionState = {
  success?: boolean
  error?: string
  message?: string
  budgetId?: string
}

export interface BudgetItemInput {
  id?: string
  ledgerId: string
  allocatedAmount: number
}

export interface BudgetPayload {
  name: string
  financialYearId: string
  items: BudgetItemInput[]
}

/**
 * Creates a new Annual / Project Budget with line-item ledger allocations.
 */
export async function createBudget(
  societyCode: string,
  payload: BudgetPayload
): Promise<BudgetActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, FINANCIAL_ROLES)
    const societyId = context.society.id

    const name = payload.name?.trim()
    const { financialYearId, items } = payload

    if (!name) {
      return { error: "Budget plan name is required (e.g. Annual Operating Budget 2026-27)." }
    }

    if (!financialYearId) {
      return { error: "A valid Financial Year must be selected." }
    }

    if (!items || items.length === 0) {
      return { error: "At least one ledger allocation item is required." }
    }

    // Check financial year
    const fy = await prisma.financialYear.findFirst({
      where: { id: financialYearId, societyId },
    })

    if (!fy) {
      return { error: "Selected Financial Year was not found." }
    }

    if (fy.isLocked) {
      return {
        error: `Cannot create budget for "${fy.name}" because the financial year is locked/frozen for audit.`,
      }
    }

    // Validate ledgers and amounts
    const ledgerIds = items.map((i) => i.ledgerId)
    const uniqueLedgers = new Set(ledgerIds)
    if (uniqueLedgers.size !== ledgerIds.length) {
      return { error: "Duplicate ledgers detected. Each account head can only be allocated once per budget." }
    }

    const validLedgers = await prisma.ledger.findMany({
      where: {
        id: { in: ledgerIds },
        societyId,
        isActive: true,
        deletedAt: null,
      },
    })

    if (validLedgers.length !== ledgerIds.length) {
      return { error: "One or more selected ledger accounts are invalid or inactive." }
    }

    let calculatedTotal = 0
    for (const item of items) {
      const amt = Number(item.allocatedAmount)
      if (isNaN(amt) || amt < 0) {
        return { error: "Allocated amounts must be valid non-negative numbers." }
      }
      calculatedTotal += amt
    }

    const newBudget = await prisma.$transaction(async (tx) => {
      const budget = await tx.budget.create({
        data: {
          societyId,
          financialYearId,
          name,
          totalAmount: new Prisma.Decimal(calculatedTotal),
          items: {
            create: items.map((item) => ({
              ledgerId: item.ledgerId,
              allocatedAmount: new Prisma.Decimal(Number(item.allocatedAmount) || 0),
              utilizedAmount: new Prisma.Decimal(0),
            })),
          },
        },
        include: {
          items: true,
        },
      })

      return budget
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "CREATE",
      entity: "Budget",
      entityId: newBudget.id,
      description: `${context.user.email} created budget "${name}" (Total: ₹${calculatedTotal.toLocaleString("en-IN")}) for ${fy.name}`,
    })

    revalidatePath(`/society/${societyCode}/budgets`)
    revalidatePath(`/society/${societyCode}/reports`)
    revalidatePath(`/society/${societyCode}/settings/financial-years`)

    return {
      success: true,
      budgetId: newBudget.id,
      message: `Budget plan "${name}" successfully created.`,
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to create budget."
    return { error: errorMsg }
  }
}

/**
 * Updates an existing Budget name and its line-item ledger allocations.
 */
export async function updateBudget(
  societyCode: string,
  budgetId: string,
  payload: {
    name: string
    items: BudgetItemInput[]
  }
): Promise<BudgetActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, FINANCIAL_ROLES)
    const societyId = context.society.id

    const name = payload.name?.trim()
    const { items } = payload

    if (!name) {
      return { error: "Budget plan name cannot be blank." }
    }

    if (!items || items.length === 0) {
      return { error: "At least one ledger allocation item is required." }
    }

    // Verify existing budget
    const existingBudget = await prisma.budget.findFirst({
      where: { id: budgetId, societyId },
      include: {
        financialYear: true,
        items: true,
      },
    })

    if (!existingBudget) {
      return { error: "Budget plan not found." }
    }

    if (existingBudget.financialYear.isLocked) {
      return {
        error: `Cannot modify budget because Financial Year "${existingBudget.financialYear.name}" is locked/frozen.`,
      }
    }

    // Validate ledgers
    const ledgerIds = items.map((i) => i.ledgerId)
    const uniqueLedgers = new Set(ledgerIds)
    if (uniqueLedgers.size !== ledgerIds.length) {
      return { error: "Duplicate ledgers detected. Each account head can only be allocated once." }
    }

    const validLedgers = await prisma.ledger.findMany({
      where: {
        id: { in: ledgerIds },
        societyId,
        isActive: true,
        deletedAt: null,
      },
    })

    if (validLedgers.length !== ledgerIds.length) {
      return { error: "One or more selected ledger accounts are invalid or inactive." }
    }

    let calculatedTotal = 0
    for (const item of items) {
      const amt = Number(item.allocatedAmount)
      if (isNaN(amt) || amt < 0) {
        return { error: "Allocated amounts must be valid non-negative numbers." }
      }
      calculatedTotal += amt
    }

    const existingItemIds = new Set(existingBudget.items.map((i) => i.id))
    const incomingItemIds = new Set(items.filter((i) => i.id).map((i) => i.id as string))
    const itemIdsToDelete = [...existingItemIds].filter((id) => !incomingItemIds.has(id))

    await prisma.$transaction(async (tx) => {
      // 1. Delete removed items
      if (itemIdsToDelete.length > 0) {
        await tx.budgetItem.deleteMany({
          where: {
            id: { in: itemIdsToDelete },
            budgetId,
          },
        })
      }

      // 2. Upsert / update items
      for (const item of items) {
        if (item.id && existingItemIds.has(item.id)) {
          await tx.budgetItem.update({
            where: { id: item.id },
            data: {
              ledgerId: item.ledgerId,
              allocatedAmount: new Prisma.Decimal(Number(item.allocatedAmount) || 0),
            },
          })
        } else {
          await tx.budgetItem.create({
            data: {
              budgetId,
              ledgerId: item.ledgerId,
              allocatedAmount: new Prisma.Decimal(Number(item.allocatedAmount) || 0),
              utilizedAmount: new Prisma.Decimal(0),
            },
          })
        }
      }

      // 3. Update budget header
      await tx.budget.update({
        where: { id: budgetId },
        data: {
          name,
          totalAmount: new Prisma.Decimal(calculatedTotal),
        },
      })
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "UPDATE",
      entity: "Budget",
      entityId: budgetId,
      description: `${context.user.email} updated budget "${name}" (New Total: ₹${calculatedTotal.toLocaleString("en-IN")})`,
    })

    revalidatePath(`/society/${societyCode}/budgets`)
    revalidatePath(`/society/${societyCode}/reports`)
    revalidatePath(`/society/${societyCode}/settings/financial-years`)

    return {
      success: true,
      message: `Budget "${name}" updated successfully.`,
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to update budget."
    return { error: errorMsg }
  }
}

/**
 * Deletes an existing Budget and its items.
 */
export async function deleteBudget(
  societyCode: string,
  budgetId: string
): Promise<BudgetActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, FINANCIAL_ROLES)
    const societyId = context.society.id

    const budget = await prisma.budget.findFirst({
      where: { id: budgetId, societyId },
      include: {
        financialYear: true,
      },
    })

    if (!budget) {
      return { error: "Budget plan not found." }
    }

    if (budget.financialYear.isLocked) {
      return {
        error: `Cannot delete budget because Financial Year "${budget.financialYear.name}" is locked/frozen.`,
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.budgetItem.deleteMany({
        where: { budgetId },
      })

      await tx.budget.delete({
        where: { id: budgetId },
      })
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "DELETE",
      entity: "Budget",
      entityId: budgetId,
      description: `${context.user.email} deleted budget "${budget.name}" of ${budget.financialYear.name}`,
    })

    revalidatePath(`/society/${societyCode}/budgets`)
    revalidatePath(`/society/${societyCode}/reports`)
    revalidatePath(`/society/${societyCode}/settings/financial-years`)

    return {
      success: true,
      message: `Budget "${budget.name}" was deleted successfully.`,
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to delete budget."
    return { error: errorMsg }
  }
}
