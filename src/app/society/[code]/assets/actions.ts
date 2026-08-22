"use server"

import { revalidatePath } from "next/cache"
import { requireCommitteeAccess, COMMITTEE_ROLES } from "@/lib/auth/requireAuth"
import { prisma } from "@/lib/prisma"
import { recordAuditLog } from "@/lib/audit"
import type { AssetStatus } from "@/generated/prisma/client"

export type AssetActionState = {
  success?: boolean
  error?: string
  message?: string
  assetId?: string
}

/**
 * Creates a new Fixed Asset with optional AMC and warranty details
 */
export async function createAsset(
  societyCode: string,
  data: {
    name: string
    categoryId: string
    assetCode?: string | null
    location?: string | null
    serialNumber?: string | null
    purchaseDate?: string | null
    purchaseCost?: number | null
    currentBookValue?: number | null
    warrantyExpiresAt?: string | null
    status?: AssetStatus
    amcVendorId?: string | null
    amcStartDate?: string | null
    amcEndDate?: string | null
    amcAmount?: number | null
  }
): Promise<AssetActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, COMMITTEE_ROLES)
    const societyId = context.society.id

    const name = data.name?.trim()
    if (!name) {
      return { error: "Asset name is required (e.g. Schindler Lift 8-Passenger Block A)." }
    }
    if (!data.categoryId) {
      return { error: "Asset category is required." }
    }

    const assetCode = data.assetCode?.trim() || null

    if (assetCode) {
      const existing = await prisma.fixedAsset.findFirst({
        where: {
          societyId,
          assetCode: { equals: assetCode, mode: "insensitive" },
          deletedAt: null,
        },
      })
      if (existing) {
        return { error: `Asset code "${assetCode}" already exists in this society.` }
      }
    }

    const asset = await prisma.fixedAsset.create({
      data: {
        societyId,
        name,
        categoryId: data.categoryId,
        assetCode,
        location: data.location?.trim() || null,
        serialNumber: data.serialNumber?.trim() || null,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        purchaseCost: data.purchaseCost !== null && data.purchaseCost !== undefined ? data.purchaseCost : null,
        currentBookValue: data.currentBookValue !== null && data.currentBookValue !== undefined ? data.currentBookValue : data.purchaseCost || null,
        warrantyExpiresAt: data.warrantyExpiresAt ? new Date(data.warrantyExpiresAt) : null,
        status: data.status || "ACTIVE",
        amcVendorId: data.amcVendorId || null,
        amcStartDate: data.amcStartDate ? new Date(data.amcStartDate) : null,
        amcEndDate: data.amcEndDate ? new Date(data.amcEndDate) : null,
        amcAmount: data.amcAmount !== null && data.amcAmount !== undefined ? data.amcAmount : null,
      },
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "CREATE",
      entity: "FixedAsset",
      entityId: asset.id,
      description: `${context.user.email} registered fixed asset "${name}" (${assetCode || "No Code"})`,
      newData: { name, categoryId: data.categoryId, assetCode, purchaseCost: data.purchaseCost },
    })

    revalidatePath(`/society/${societyCode}/assets`)
    revalidatePath(`/society/${societyCode}/dashboard`)

    return {
      success: true,
      message: `Asset "${name}" registered successfully.`,
      assetId: asset.id,
    }
  } catch (err: unknown) {
    console.error("Failed to create asset:", err)
    const message = err instanceof Error ? err.message : "Failed to create asset."
    return { error: message }
  }
}

/**
 * Updates an existing Fixed Asset's specifications, status, or AMC
 */
export async function updateAsset(
  societyCode: string,
  assetId: string,
  data: {
    name: string
    categoryId: string
    assetCode?: string | null
    location?: string | null
    serialNumber?: string | null
    purchaseDate?: string | null
    purchaseCost?: number | null
    currentBookValue?: number | null
    warrantyExpiresAt?: string | null
    status: AssetStatus
    amcVendorId?: string | null
    amcStartDate?: string | null
    amcEndDate?: string | null
    amcAmount?: number | null
  }
): Promise<AssetActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, COMMITTEE_ROLES)
    const societyId = context.society.id

    const existing = await prisma.fixedAsset.findFirst({
      where: { id: assetId, societyId, deletedAt: null },
    })
    if (!existing) {
      return { error: "Asset not found." }
    }

    const name = data.name?.trim()
    if (!name) {
      return { error: "Asset name is required." }
    }

    const assetCode = data.assetCode?.trim() || null
    if (assetCode && assetCode.toLowerCase() !== (existing.assetCode || "").toLowerCase()) {
      const duplicate = await prisma.fixedAsset.findFirst({
        where: {
          societyId,
          assetCode: { equals: assetCode, mode: "insensitive" },
          id: { not: assetId },
          deletedAt: null,
        },
      })
      if (duplicate) {
        return { error: `Asset code "${assetCode}" is already in use by another asset.` }
      }
    }

    const updated = await prisma.fixedAsset.update({
      where: { id: assetId },
      data: {
        name,
        categoryId: data.categoryId,
        assetCode,
        location: data.location?.trim() || null,
        serialNumber: data.serialNumber?.trim() || null,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        purchaseCost: data.purchaseCost !== null && data.purchaseCost !== undefined ? data.purchaseCost : null,
        currentBookValue: data.currentBookValue !== null && data.currentBookValue !== undefined ? data.currentBookValue : null,
        warrantyExpiresAt: data.warrantyExpiresAt ? new Date(data.warrantyExpiresAt) : null,
        status: data.status,
        amcVendorId: data.amcVendorId || null,
        amcStartDate: data.amcStartDate ? new Date(data.amcStartDate) : null,
        amcEndDate: data.amcEndDate ? new Date(data.amcEndDate) : null,
        amcAmount: data.amcAmount !== null && data.amcAmount !== undefined ? data.amcAmount : null,
      },
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "UPDATE",
      entity: "FixedAsset",
      entityId: assetId,
      description: `${context.user.email} updated fixed asset "${name}"`,
      oldData: existing,
      newData: updated,
    })

    revalidatePath(`/society/${societyCode}/assets`)
    revalidatePath(`/society/${societyCode}/assets/${assetId}`)

    return {
      success: true,
      message: `Asset "${name}" updated successfully.`,
      assetId: updated.id,
    }
  } catch (err: unknown) {
    console.error("Failed to update asset:", err)
    const message = err instanceof Error ? err.message : "Failed to update asset."
    return { error: message }
  }
}

/**
 * Soft-deletes a fixed asset
 */
export async function deleteAsset(
  societyCode: string,
  assetId: string
): Promise<AssetActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, COMMITTEE_ROLES)
    const societyId = context.society.id

    const existing = await prisma.fixedAsset.findFirst({
      where: { id: assetId, societyId, deletedAt: null },
    })
    if (!existing) {
      return { error: "Asset not found." }
    }

    await prisma.fixedAsset.update({
      where: { id: assetId },
      data: { deletedAt: new Date(), isActive: false },
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "DELETE",
      entity: "FixedAsset",
      entityId: assetId,
      description: `${context.user.email} deleted fixed asset "${existing.name}"`,
    })

    revalidatePath(`/society/${societyCode}/assets`)
    return { success: true, message: `Asset "${existing.name}" deleted successfully.` }
  } catch (err: unknown) {
    console.error("Failed to delete asset:", err)
    const message = err instanceof Error ? err.message : "Failed to delete asset."
    return { error: message }
  }
}

/**
 * Creates an Asset Category with optional depreciation percentage
 */
export async function createAssetCategory(
  societyCode: string,
  data: {
    name: string
    depreciationRate?: number | null
    description?: string | null
  }
): Promise<AssetActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, COMMITTEE_ROLES)
    const societyId = context.society.id

    const name = data.name?.trim()
    if (!name) {
      return { error: "Category name is required (e.g. Elevators & Lifts)." }
    }

    const existing = await prisma.assetCategory.findFirst({
      where: {
        societyId,
        name: { equals: name, mode: "insensitive" },
        deletedAt: null,
      },
    })
    if (existing) {
      return { error: `Category "${name}" already exists.` }
    }

    const category = await prisma.assetCategory.create({
      data: {
        societyId,
        name,
        depreciationRate: data.depreciationRate !== null && data.depreciationRate !== undefined ? data.depreciationRate : null,
        description: data.description?.trim() || null,
      },
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "CREATE",
      entity: "AssetCategory",
      entityId: category.id,
      description: `${context.user.email} created asset category "${name}"`,
    })

    revalidatePath(`/society/${societyCode}/assets`)
    return { success: true, message: `Category "${name}" created successfully.` }
  } catch (err: unknown) {
    console.error("Failed to create category:", err)
    const message = err instanceof Error ? err.message : "Failed to create category."
    return { error: message }
  }
}

/**
 * Logs a routine servicing or breakdown repair record for an asset
 */
export async function createServiceLog(
  societyCode: string,
  assetId: string,
  data: {
    serviceDate: string
    description: string
    cost?: number | null
    vendorId?: string | null
    servicedBy?: string | null
    nextDueDate?: string | null
    remarks?: string | null
  }
): Promise<AssetActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, COMMITTEE_ROLES)
    const societyId = context.society.id

    const asset = await prisma.fixedAsset.findFirst({
      where: { id: assetId, societyId, deletedAt: null },
    })
    if (!asset) {
      return { error: "Asset not found." }
    }

    const description = data.description?.trim()
    if (!description) {
      return { error: "Service description is required." }
    }

    const serviceDate = data.serviceDate ? new Date(data.serviceDate) : new Date()

    const log = await prisma.assetServiceLog.create({
      data: {
        assetId,
        vendorId: data.vendorId || null,
        serviceDate,
        description,
        cost: data.cost || 0,
        servicedBy: data.servicedBy?.trim() || null,
        nextDueDate: data.nextDueDate ? new Date(data.nextDueDate) : null,
        remarks: data.remarks?.trim() || null,
      },
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "CREATE",
      entity: "AssetServiceLog",
      entityId: log.id,
      description: `${context.user.email} logged service/repair for asset "${asset.name}": ${description}`,
    })

    revalidatePath(`/society/${societyCode}/assets/${assetId}`)
    return { success: true, message: "Service record logged successfully." }
  } catch (err: unknown) {
    console.error("Failed to log service record:", err)
    const message = err instanceof Error ? err.message : "Failed to log service record."
    return { error: message }
  }
}

/**
 * Deletes a service log entry
 */
export async function deleteServiceLog(
  societyCode: string,
  assetId: string,
  logId: string
): Promise<AssetActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, COMMITTEE_ROLES)
    const societyId = context.society.id

    const asset = await prisma.fixedAsset.findFirst({
      where: { id: assetId, societyId, deletedAt: null },
    })
    if (!asset) {
      return { error: "Asset not found." }
    }

    await prisma.assetServiceLog.delete({
      where: { id: logId },
    })

    revalidatePath(`/society/${societyCode}/assets/${assetId}`)
    return { success: true, message: "Service log removed." }
  } catch (err: unknown) {
    console.error("Failed to delete service log:", err)
    const message = err instanceof Error ? err.message : "Failed to delete service log."
    return { error: message }
  }
}
