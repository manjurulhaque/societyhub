"use server"

import { revalidatePath } from "next/cache"
import { requireCommitteeAccess, COMMITTEE_ROLES } from "@/lib/auth/requireAuth"
import { prisma } from "@/lib/prisma"
import { recordAuditLog } from "@/lib/audit"
import type { AmenityType } from "@/generated/prisma/client"

export type AmenityActionState = {
  success?: boolean
  error?: string
  message?: string
  amenityId?: string
}

/**
 * Creates a new society amenity / facility
 */
export async function createAmenity(
  societyCode: string,
  data: {
    name: string
    type: AmenityType
    description?: string | null
    defaultRent: number
    defaultDeposit: number
    capacity?: number | null
  }
): Promise<AmenityActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, COMMITTEE_ROLES)
    const societyId = context.society.id

    const name = data.name?.trim()
    if (!name) {
      return { error: "Amenity name is required (e.g. Main Clubhouse Banquet Hall)." }
    }

    const existing = await prisma.amenity.findFirst({
      where: { societyId, name, deletedAt: null },
    })
    if (existing) {
      return { error: "An amenity with this name already exists in this society." }
    }

    const amenity = await prisma.amenity.create({
      data: {
        societyId,
        name,
        type: data.type,
        description: data.description?.trim() || null,
        defaultRent: Math.max(0, data.defaultRent || 0),
        defaultDeposit: Math.max(0, data.defaultDeposit || 0),
        capacity: data.capacity || null,
        isActive: true,
      },
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "CREATE",
      entity: "Amenity",
      entityId: amenity.id,
      description: `${context.user.email} added new amenity "${name}" (${data.type})`,
      newData: { name, type: data.type, defaultRent: data.defaultRent, defaultDeposit: data.defaultDeposit },
    })

    revalidatePath(`/society/${societyCode}/amenities`)
    revalidatePath(`/society/${societyCode}/bookings`)

    return {
      success: true,
      message: `Amenity "${name}" created successfully.`,
      amenityId: amenity.id,
    }
  } catch (err: unknown) {
    console.error("Failed to create amenity:", err)
    const message = err instanceof Error ? err.message : "Failed to create amenity."
    return { error: message }
  }
}

/**
 * Updates an existing society amenity
 */
export async function updateAmenity(
  societyCode: string,
  amenityId: string,
  data: {
    name?: string
    type?: AmenityType
    description?: string | null
    defaultRent?: number
    defaultDeposit?: number
    capacity?: number | null
    isActive?: boolean
  }
): Promise<AmenityActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, COMMITTEE_ROLES)
    const societyId = context.society.id

    const amenity = await prisma.amenity.findFirst({
      where: { id: amenityId, societyId, deletedAt: null },
    })
    if (!amenity) return { error: "Amenity not found." }

    await prisma.amenity.update({
      where: { id: amenityId },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.type ? { type: data.type } : {}),
        description: data.description !== undefined ? data.description?.trim() || null : amenity.description,
        ...(data.defaultRent !== undefined ? { defaultRent: Math.max(0, data.defaultRent) } : {}),
        ...(data.defaultDeposit !== undefined ? { defaultDeposit: Math.max(0, data.defaultDeposit) } : {}),
        capacity: data.capacity !== undefined ? data.capacity : amenity.capacity,
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "UPDATE",
      entity: "Amenity",
      entityId: amenityId,
      description: `${context.user.email} updated amenity "${amenity.name}"`,
    })

    revalidatePath(`/society/${societyCode}/amenities`)
    revalidatePath(`/society/${societyCode}/bookings`)

    return { success: true, message: "Amenity updated successfully." }
  } catch (err: unknown) {
    console.error("Failed to update amenity:", err)
    const message = err instanceof Error ? err.message : "Failed to update amenity."
    return { error: message }
  }
}

/**
 * Soft deletes an amenity
 */
export async function deleteAmenity(
  societyCode: string,
  amenityId: string
): Promise<AmenityActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, COMMITTEE_ROLES)
    const societyId = context.society.id

    const amenity = await prisma.amenity.findFirst({
      where: { id: amenityId, societyId, deletedAt: null },
    })
    if (!amenity) return { error: "Amenity not found." }

    await prisma.amenity.update({
      where: { id: amenityId },
      data: { deletedAt: new Date(), isActive: false },
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "DELETE",
      entity: "Amenity",
      entityId: amenityId,
      description: `${context.user.email} deleted amenity "${amenity.name}"`,
    })

    revalidatePath(`/society/${societyCode}/amenities`)
    revalidatePath(`/society/${societyCode}/bookings`)

    return { success: true, message: "Amenity deleted." }
  } catch (err: unknown) {
    console.error("Failed to delete amenity:", err)
    const message = err instanceof Error ? err.message : "Failed to delete amenity."
    return { error: message }
  }
}
