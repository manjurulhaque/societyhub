"use server"

import { revalidatePath } from "next/cache"
import { requireCommitteeAccess, COMMITTEE_ROLES } from "@/lib/auth/requireAuth"
import { prisma } from "@/lib/prisma"
import { recordAuditLog } from "@/lib/audit"
import { sanitizeText } from "@/lib/sanitize"
import { getSafeErrorMessage } from "@/lib/errors"
import type { UnitType, OccupancyStatus } from "@/generated/prisma/client"
import type { FlatActionState, BulkFlatItemInput, BulkCreateFlatsResult } from "./types"

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

    const rawNumber = data.number.trim()
    const number = sanitizeText(rawNumber)
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
        areaUnit: data.areaUnit ? sanitizeText(data.areaUnit) : "sqft",
        status: data.status || "VACANT",
        intercomNumber: data.intercomNumber ? sanitizeText(data.intercomNumber) : null,
        parkingSlot: data.parkingSlot ? sanitizeText(data.parkingSlot) : null,
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
    return { error: getSafeErrorMessage(err, "Failed to create flat.") }
  }
}

/**
 * Updates flat physical specifications and occupancy status
 */
export async function updateFlatDetails(
  societyCode: string,
  flatId: string,
  data: {
    blockId?: string | null
    number: string
    floor?: number | null
    unitType?: UnitType | null
    area?: number | null
    areaUnit?: string
    status: OccupancyStatus
    intercomNumber?: string | null
    parkingSlot?: string | null
  }
): Promise<FlatActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, COMMITTEE_ROLES)
    const societyId = context.society.id

    const flat = await prisma.flat.findFirst({
      where: { id: flatId, block: { societyId }, deletedAt: null },
      include: { block: true },
    })

    if (!flat) {
      return { error: "Flat not found in this society." }
    }

    const rawNumber = data.number?.trim()
    const number = sanitizeText(rawNumber)
    if (!number) {
      return { error: "Flat number is required." }
    }

    const targetBlockId = data.blockId || flat.blockId

    // Validate block belongs to this society if changed
    if (data.blockId && data.blockId !== flat.blockId) {
      const block = await prisma.block.findFirst({
        where: { id: data.blockId, societyId, deletedAt: null },
      })
      if (!block) {
        return { error: "Selected block is invalid for this society." }
      }
    }

    // Check uniqueness within target block
    const existing = await prisma.flat.findFirst({
      where: {
        blockId: targetBlockId,
        number: { equals: number, mode: "insensitive" },
        id: { not: flatId },
        deletedAt: null,
      },
      include: { block: true },
    })

    if (existing) {
      return { error: `Flat "${number}" already exists in ${existing.block.name}.` }
    }

    const updated = await prisma.flat.update({
      where: { id: flatId },
      data: {
        blockId: targetBlockId,
        number,
        floor: data.floor !== undefined && data.floor !== null && !isNaN(data.floor) ? data.floor : null,
        unitType: data.unitType || null,
        area: data.area && !isNaN(data.area) ? data.area : null,
        areaUnit: data.areaUnit ? sanitizeText(data.areaUnit) : "sqft",
        status: data.status,
        intercomNumber: data.intercomNumber ? sanitizeText(data.intercomNumber) : null,
        parkingSlot: data.parkingSlot ? sanitizeText(data.parkingSlot) : null,
      },
      include: { block: true },
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "UPDATE",
      entity: "Flat",
      entityId: flatId,
      description: `${context.user.email} updated details for Flat ${updated.block.name}-${number}`,
      oldData: flat,
      newData: updated,
    })

    revalidatePath(`/society/${societyCode}/flats`)
    revalidatePath(`/society/${societyCode}/flats/${flatId}`)
    revalidatePath(`/society/${societyCode}/members`)
    revalidatePath(`/society/${societyCode}/dashboard`)

    return { success: true, message: "Flat details updated successfully." }
  } catch (err: unknown) {
    console.error("Failed to update flat details:", err)
    return { error: getSafeErrorMessage(err, "Failed to update flat details.") }
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
    return { error: getSafeErrorMessage(err, "Failed to delete flat.") }
  }
}

/**
 * Creates multiple flats in bulk with duplicate protection and audit logging.
 */
export async function bulkCreateFlats(
  societyCode: string,
  flats: BulkFlatItemInput[]
): Promise<BulkCreateFlatsResult> {
  try {
    const context = await requireCommitteeAccess(societyCode, COMMITTEE_ROLES)
    const societyId = context.society.id

    if (!Array.isArray(flats) || flats.length === 0) {
      return { error: "No flat items provided for bulk creation." }
    }

    if (flats.length > 500) {
      return { error: "Maximum batch limit is 500 flats per operation." }
    }

    // 1. Fetch valid blocks for this society
    const societyBlocks = await prisma.block.findMany({
      where: { societyId, deletedAt: null },
      select: { id: true, name: true },
    })
    const blockMap = new Map(societyBlocks.map((b) => [b.id, b.name]))

    // 2. Fetch existing flats in these blocks
    const blockIds = Array.from(new Set(flats.map((f) => f.blockId).filter(Boolean)))
    const existingFlats = await prisma.flat.findMany({
      where: {
        blockId: { in: blockIds },
        deletedAt: null,
      },
      select: {
        blockId: true,
        number: true,
      },
    })

    const existingKeySet = new Set(
      existingFlats.map((f) => `${f.blockId}::${f.number.toLowerCase()}`)
    )

    // 3. Process and filter batch items
    const toCreate: {
      blockId: string
      number: string
      floor: number | null
      unitType: UnitType | null
      area: number | null
      areaUnit: string
      status: OccupancyStatus
      intercomNumber: string | null
      parkingSlot: string | null
    }[] = []

    const skippedFlats: { number: string; blockName: string; reason: string }[] = []
    const seenBatchKeys = new Set<string>()

    for (const item of flats) {
      const rawNumber = item.number?.trim()
      const number = sanitizeText(rawNumber)
      const blockName = blockMap.get(item.blockId) || "Unknown Block"

      if (!item.blockId || !blockMap.has(item.blockId)) {
        skippedFlats.push({
          number: number || "N/A",
          blockName,
          reason: "Invalid or missing block assignment.",
        })
        continue
      }

      if (!number) {
        skippedFlats.push({
          number: "Blank",
          blockName,
          reason: "Missing flat / unit number.",
        })
        continue
      }

      const key = `${item.blockId}::${number.toLowerCase()}`

      if (existingKeySet.has(key)) {
        skippedFlats.push({
          number,
          blockName,
          reason: `Flat ${number} already exists in ${blockName}.`,
        })
        continue
      }

      if (seenBatchKeys.has(key)) {
        skippedFlats.push({
          number,
          blockName,
          reason: `Duplicate flat number ${number} within the import batch.`,
        })
        continue
      }

      seenBatchKeys.add(key)

      toCreate.push({
        blockId: item.blockId,
        number,
        floor: item.floor !== undefined && item.floor !== null && !isNaN(item.floor) ? item.floor : null,
        unitType: item.unitType || null,
        area: item.area && !isNaN(item.area) ? item.area : null,
        areaUnit: item.areaUnit ? sanitizeText(item.areaUnit) : "sqft",
        status: item.status || "VACANT",
        intercomNumber: item.intercomNumber ? sanitizeText(item.intercomNumber) : null,
        parkingSlot: item.parkingSlot ? sanitizeText(item.parkingSlot) : null,
      })
    }

    if (toCreate.length === 0) {
      return {
        error: "No valid new flats to create. All items were duplicates or invalid.",
        createdCount: 0,
        skippedCount: skippedFlats.length,
        skippedFlats,
      }
    }

    // 4. Create flats in transaction
    const createdRecords = await prisma.$transaction(
      toCreate.map((data) =>
        prisma.flat.create({
          data,
          include: { block: { select: { name: true } } },
        })
      )
    )

    // 5. Record bulk audit log
    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "CREATE",
      entity: "Flat",
      description: `${context.user.email} bulk-created ${createdRecords.length} flats across ${blockIds.length} block(s).`,
      newData: {
        createdCount: createdRecords.length,
        skippedCount: skippedFlats.length,
        blocksInvolved: Array.from(new Set(createdRecords.map((r) => r.block.name))),
      },
    })

    revalidatePath(`/society/${societyCode}/flats`)
    revalidatePath(`/society/${societyCode}/members`)
    revalidatePath(`/society/${societyCode}/dashboard`)

    return {
      success: true,
      createdCount: createdRecords.length,
      skippedCount: skippedFlats.length,
      createdFlats: createdRecords.map((r) => ({
        id: r.id,
        number: r.number,
        blockName: r.block.name,
      })),
      skippedFlats,
      message: `Successfully generated ${createdRecords.length} unit(s)${skippedFlats.length > 0 ? ` (${skippedFlats.length} skipped as duplicates/invalid)` : ""}.`,
    }
  } catch (err: unknown) {
    console.error("Failed to bulk create flats:", err)
    return { error: getSafeErrorMessage(err, "Failed to bulk create flats.") }
  }
}
