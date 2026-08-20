"use server"

import { revalidatePath } from "next/cache"
import { requireCommitteeAccess, COMMITTEE_ROLES } from "@/lib/auth/requireAuth"
import { prisma } from "@/lib/prisma"
import { recordAuditLog } from "@/lib/audit"
import type { UnitType, OccupancyStatus } from "@/generated/prisma/client"

export type FlatActionState = {
  success?: boolean
  error?: string
  message?: string
}

/**
 * Creates a new block / tower in the society.
 */
export async function createBlock(
  societyCode: string,
  data: { name: string }
): Promise<FlatActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, COMMITTEE_ROLES)
    const societyId = context.society.id

    const name = data.name.trim()
    if (!name) {
      return { error: "Block name is required (e.g. Wing A, Tower 1)." }
    }

    // Check duplicate
    const existing = await prisma.block.findFirst({
      where: {
        societyId,
        name: { equals: name, mode: "insensitive" },
        deletedAt: null,
      },
    })

    if (existing) {
      return { error: `Block "${name}" already exists in this society.` }
    }

    const block = await prisma.block.create({
      data: {
        societyId,
        name,
      },
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "CREATE",
      entity: "Block",
      entityId: block.id,
      description: `${context.user.email} created block "${name}"`,
      newData: { name },
    })

    revalidatePath(`/society/${societyCode}/flats`)
    revalidatePath(`/society/${societyCode}/dashboard`)

    return {
      success: true,
      message: `Block "${name}" created successfully.`,
    }
  } catch (err: unknown) {
    console.error("Failed to create block:", err)
    const message = err instanceof Error ? err.message : "Failed to create block."
    return { error: message }
  }
}

/**
 * Creates a new flat / unit in a specified block.
 */
export async function createFlat(
  societyCode: string,
  data: {
    blockId: string
    number: string
    floor?: number | null
    unitType?: UnitType | null
    area?: number | null
    areaUnit?: string
    status?: OccupancyStatus
    intercomNumber?: string | null
    parkingSlot?: string | null
  }
): Promise<FlatActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, COMMITTEE_ROLES)
    const societyId = context.society.id

    const number = data.number.trim()
    if (!data.blockId || !number) {
      return { error: "Block selection and Flat Number are required." }
    }

    // Validate block belongs to this society
    const block = await prisma.block.findFirst({
      where: { id: data.blockId, societyId, deletedAt: null },
    })

    if (!block) {
      return { error: "Selected block is invalid for this society." }
    }

    // Check uniqueness within block
    const existing = await prisma.flat.findFirst({
      where: {
        blockId: data.blockId,
        number: { equals: number, mode: "insensitive" },
        deletedAt: null,
      },
    })

    if (existing) {
      return { error: `Flat "${number}" already exists in ${block.name}.` }
    }

    const flat = await prisma.flat.create({
      data: {
        blockId: data.blockId,
        number,
        floor: data.floor !== undefined && data.floor !== null && !isNaN(data.floor) ? data.floor : null,
        unitType: data.unitType || null,
        area: data.area && !isNaN(data.area) ? data.area : null,
        areaUnit: data.areaUnit || "sqft",
        status: data.status || "VACANT",
        intercomNumber: data.intercomNumber?.trim() || null,
        parkingSlot: data.parkingSlot?.trim() || null,
      },
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "CREATE",
      entity: "Flat",
      entityId: flat.id,
      description: `${context.user.email} created Flat ${block.name}-${number}`,
      newData: { blockName: block.name, number, floor: data.floor, unitType: data.unitType, area: data.area },
    })

    revalidatePath(`/society/${societyCode}/flats`)
    revalidatePath(`/society/${societyCode}/members`)
    revalidatePath(`/society/${societyCode}/dashboard`)

    return {
      success: true,
      message: `Flat "${number}" in ${block.name} created successfully.`,
    }
  } catch (err: unknown) {
    console.error("Failed to create flat:", err)
    const message = err instanceof Error ? err.message : "Failed to create flat."
    return { error: message }
  }
}

/**
 * Deletes a flat (soft delete or check if has historical bills).
 */
export async function deleteFlat(
  societyCode: string,
  flatId: string
): Promise<FlatActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, COMMITTEE_ROLES)
    const societyId = context.society.id

    const flat = await prisma.flat.findUnique({
      where: { id: flatId },
      include: {
        block: true,
        _count: {
          select: {
            bills: true,
            people: true,
          },
        },
      },
    })

    if (!flat || flat.block.societyId !== societyId) {
      return { error: "Flat not found in this society." }
    }

    if (flat._count.bills > 0) {
      return { error: `Cannot delete Flat ${flat.number} as it has existing billing records.` }
    }

    await prisma.flat.update({
      where: { id: flatId },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "DELETE",
      entity: "Flat",
      entityId: flatId,
      description: `${context.user.email} deleted Flat ${flat.block.name}-${flat.number}`,
    })

    revalidatePath(`/society/${societyCode}/flats`)
    revalidatePath(`/society/${societyCode}/members`)
    revalidatePath(`/society/${societyCode}/dashboard`)

    return {
      success: true,
      message: `Flat "${flat.number}" deleted successfully.`,
    }
  } catch (err: unknown) {
    console.error("Failed to delete flat:", err)
    const message = err instanceof Error ? err.message : "Failed to delete flat."
    return { error: message }
  }
}
