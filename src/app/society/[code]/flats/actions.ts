"use server"

import { revalidatePath } from "next/cache"
import { requireCommitteeAccess, COMMITTEE_ROLES, FINANCIAL_ROLES } from "@/lib/auth/requireAuth"
import { prisma } from "@/lib/prisma"
import { recordAuditLog } from "@/lib/audit"
import { sanitizeText } from "@/lib/sanitize"
import { getSafeErrorMessage } from "@/lib/errors"
import type { UnitType, OccupancyStatus, TransferType, FlatRole } from "@/generated/prisma/client"

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

    const rawName = data.name.trim()
    const name = sanitizeText(rawName)
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
    return { error: getSafeErrorMessage(err, "Failed to create block.") }
  }
}

/**
 * Updates an existing block / tower in the society.
 */
export async function updateBlock(
  societyCode: string,
  blockId: string,
  data: { name: string; isActive?: boolean }
): Promise<FlatActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, COMMITTEE_ROLES)
    const societyId = context.society.id

    const rawName = data.name.trim()
    const name = sanitizeText(rawName)
    if (!name) {
      return { error: "Block name is required (e.g. Wing A, Tower 1)." }
    }

    const currentBlock = await prisma.block.findFirst({
      where: {
        id: blockId,
        societyId,
        deletedAt: null,
      },
    })

    if (!currentBlock) {
      return { error: "Block not found." }
    }

    // Check duplicate name on other blocks
    const duplicate = await prisma.block.findFirst({
      where: {
        societyId,
        id: { not: blockId },
        name: { equals: name, mode: "insensitive" },
        deletedAt: null,
      },
    })

    if (duplicate) {
      return { error: `Another block named "${name}" already exists in this society.` }
    }

    const updated = await prisma.block.update({
      where: { id: blockId },
      data: {
        name,
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "UPDATE",
      entity: "Block",
      entityId: blockId,
      description: `${context.user.email} renamed block from "${currentBlock.name}" to "${name}"`,
      oldData: { name: currentBlock.name, isActive: currentBlock.isActive },
      newData: { name: updated.name, isActive: updated.isActive },
    })

    revalidatePath(`/society/${societyCode}/flats`)
    revalidatePath(`/society/${societyCode}/dashboard`)
    revalidatePath(`/society/${societyCode}/members`)

    return {
      success: true,
      message: `Block "${name}" updated successfully.`,
    }
  } catch (err: unknown) {
    console.error("Failed to update block:", err)
    return { error: getSafeErrorMessage(err, "Failed to update block.") }
  }
}

/**
 * Deletes a block / tower if no active flats are associated with it.
 */
export async function deleteBlock(
  societyCode: string,
  blockId: string
): Promise<FlatActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, COMMITTEE_ROLES)
    const societyId = context.society.id

    const block = await prisma.block.findFirst({
      where: {
        id: blockId,
        societyId,
        deletedAt: null,
      },
      include: {
        _count: {
          select: {
            flats: {
              where: { deletedAt: null },
            },
          },
        },
      },
    })

    if (!block) {
      return { error: "Block not found." }
    }

    if (block._count.flats > 0) {
      return {
        error: `Cannot delete Block "${block.name}" because it contains ${block._count.flats} active unit(s). Please move or delete the units first.`,
      }
    }

    await prisma.block.update({
      where: { id: blockId },
      data: { deletedAt: new Date() },
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "DELETE",
      entity: "Block",
      entityId: blockId,
      description: `${context.user.email} deleted block "${block.name}"`,
      oldData: { name: block.name },
    })

    revalidatePath(`/society/${societyCode}/flats`)
    revalidatePath(`/society/${societyCode}/dashboard`)
    revalidatePath(`/society/${societyCode}/members`)

    return {
      success: true,
      message: `Block "${block.name}" deleted successfully.`,
    }
  } catch (err: unknown) {
    console.error("Failed to delete block:", err)
    return { error: getSafeErrorMessage(err, "Failed to delete block.") }
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
 * Transfers ownership of a flat with full statutory chain of title recording
 */
export async function transferFlatOwnership(
  societyCode: string,
  flatId: string,
  data: {
    toPersonId: string
    transferType: TransferType
    transferDate: string
    registeredDocNumber?: string | null
    registrationDate?: string | null
    transferFeePaid?: number | null
    nocReference?: string | null
    nocIssuedDate?: string | null
    resolutionNumber?: string | null
    committeeApprovalDate?: string | null
    remarks?: string | null
    updatePrimaryOccupant?: boolean
  }
): Promise<FlatActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, COMMITTEE_ROLES)
    const societyId = context.society.id

    const flat = await prisma.flat.findFirst({
      where: { id: flatId, block: { societyId }, deletedAt: null },
      include: {
        block: true,
        people: {
          where: { role: "OWNER", toDate: null },
        },
      },
    })

    if (!flat) {
      return { error: "Flat not found." }
    }

    if (!data.toPersonId) {
      return { error: "New owner (transferee) selection is required." }
    }

    const toPerson = await prisma.person.findFirst({
      where: { id: data.toPersonId, societyId, deletedAt: null },
    })
    if (!toPerson) {
      return { error: "Selected new owner not found in society directory." }
    }

    const transferDate = data.transferDate ? new Date(data.transferDate) : new Date()
    const currentActiveOwnership = await prisma.flatOwnershipHistory.findFirst({
      where: { flatId, isCurrentOwner: true },
    })

    const fromPersonId = currentActiveOwnership?.toPersonId || flat.people[0]?.personId || null

    // Execute atomic transaction
    await prisma.$transaction(async (tx) => {
      // 1. Close current ownership if exists
      if (currentActiveOwnership) {
        await tx.flatOwnershipHistory.update({
          where: { id: currentActiveOwnership.id },
          data: {
            isCurrentOwner: false,
            toDate: transferDate,
          },
        })
      }

      // 2. Create new ownership history record
      await tx.flatOwnershipHistory.create({
        data: {
          societyId,
          flatId,
          fromPersonId,
          toPersonId: data.toPersonId,
          transferType: data.transferType,
          transferDate,
          fromDate: transferDate,
          isCurrentOwner: true,
          registeredDocNumber: data.registeredDocNumber ? sanitizeText(data.registeredDocNumber) : null,
          registrationDate: data.registrationDate ? new Date(data.registrationDate) : null,
          transferFeePaid: data.transferFeePaid !== null && data.transferFeePaid !== undefined ? data.transferFeePaid : 0,
          nocReference: data.nocReference ? sanitizeText(data.nocReference) : null,
          nocIssuedDate: data.nocIssuedDate ? new Date(data.nocIssuedDate) : null,
          resolutionNumber: data.resolutionNumber ? sanitizeText(data.resolutionNumber) : null,
          committeeApprovalDate: data.committeeApprovalDate ? new Date(data.committeeApprovalDate) : null,
          remarks: data.remarks ? sanitizeText(data.remarks) : null,
        },
      })

      // 3. Update FlatPerson records if requested
      if (data.updatePrimaryOccupant !== false) {
        // End existing primary owner tenure
        await tx.flatPerson.updateMany({
          where: { flatId, role: "OWNER", toDate: null },
          data: { toDate: transferDate, isPrimary: false },
        })

        // Add new primary owner
        await tx.flatPerson.create({
          data: {
            flatId,
            personId: data.toPersonId,
            role: "OWNER",
            isPrimary: true,
            fromDate: transferDate,
          },
        })

        // Update Flat status to OCCUPIED if currently VACANT
        if (flat.status === "VACANT") {
          await tx.flat.update({
            where: { id: flatId },
            data: { status: "OCCUPIED" },
          })
        }
      }
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "UPDATE",
      entity: "FlatOwnershipHistory",
      entityId: flatId,
      description: `${context.user.email} transferred ownership of Flat ${flat.block.name}-${flat.number} to ${toPerson.name} (${data.transferType})`,
      newData: {
        flatId,
        fromPersonId,
        toPersonId: data.toPersonId,
        transferType: data.transferType,
        registeredDocNumber: data.registeredDocNumber,
      },
    })

    revalidatePath(`/society/${societyCode}/flats`)
    revalidatePath(`/society/${societyCode}/flats/${flatId}`)
    revalidatePath(`/society/${societyCode}/members`)
    revalidatePath(`/society/${societyCode}/registers/shares`)

    return {
      success: true,
      message: `Ownership of Flat ${flat.number} successfully transferred to ${toPerson.name}.`,
    }
  } catch (err: unknown) {
    console.error("Failed to transfer flat ownership:", err)
    return { error: getSafeErrorMessage(err, "Failed to transfer ownership.") }
  }
}

/**
 * Assigns a resident, tenant, co-owner, or family member to a flat
 */
export async function addFlatPerson(
  societyCode: string,
  flatId: string,
  data: {
    personId: string
    role: FlatRole
    isPrimary?: boolean
    fromDate?: string | null
  }
): Promise<FlatActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, COMMITTEE_ROLES)
    const societyId = context.society.id

    const flat = await prisma.flat.findFirst({
      where: { id: flatId, block: { societyId }, deletedAt: null },
      include: { block: true },
    })
    if (!flat) return { error: "Flat not found." }

    const person = await prisma.person.findFirst({
      where: { id: data.personId, societyId, deletedAt: null },
    })
    if (!person) return { error: "Person not found." }

    const fromDate = data.fromDate ? new Date(data.fromDate) : new Date()

    if (data.isPrimary) {
      await prisma.flatPerson.updateMany({
        where: { flatId, isPrimary: true, toDate: null },
        data: { isPrimary: false },
      })
    }

    await prisma.flatPerson.create({
      data: {
        flatId,
        personId: data.personId,
        role: data.role,
        isPrimary: Boolean(data.isPrimary),
        fromDate,
      },
    })

    if (data.role === "TENANT" || data.role === "OWNER") {
      await prisma.flat.update({
        where: { id: flatId },
        data: { status: "OCCUPIED" },
      })
    }

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "CREATE",
      entity: "FlatPerson",
      entityId: flatId,
      description: `${context.user.email} assigned ${person.name} as ${data.role} to Flat ${flat.block.name}-${flat.number}`,
    })

    revalidatePath(`/society/${societyCode}/flats/${flatId}`)
    revalidatePath(`/society/${societyCode}/flats`)
    revalidatePath(`/society/${societyCode}/members`)
    revalidatePath(`/society/${societyCode}/members/${data.personId}`)

    return { success: true, message: `${person.name} assigned to Flat ${flat.number} as ${data.role}.` }
  } catch (err: unknown) {
    console.error("Failed to add flat resident:", err)
    return { error: getSafeErrorMessage(err, "Failed to add flat resident.") }
  }
}

/**
 * Ends tenancy/occupancy for a person attached to a flat
 */
export async function removeFlatPerson(
  societyCode: string,
  flatPersonId: string,
  flatId: string
): Promise<FlatActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, COMMITTEE_ROLES)
    const societyId = context.society.id

    const record = await prisma.flatPerson.findFirst({
      where: { id: flatPersonId, flatId },
      include: { person: true, flat: { include: { block: true } } },
    })
    if (!record || record.flat.block.societyId !== societyId) {
      return { error: "Record not found." }
    }

    const toDate = new Date()

    await prisma.flatPerson.update({
      where: { id: flatPersonId },
      data: { toDate, isPrimary: false },
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "UPDATE",
      entity: "FlatPerson",
      entityId: flatId,
      description: `${context.user.email} ended occupancy for ${record.person.name} in Flat ${record.flat.block.name}-${record.flat.number}`,
    })

    revalidatePath(`/society/${societyCode}/flats/${flatId}`)
    revalidatePath(`/society/${societyCode}/flats`)
    revalidatePath(`/society/${societyCode}/members`)
    revalidatePath(`/society/${societyCode}/members/${record.personId}`)

    return { success: true, message: `Occupancy ended for ${record.person.name}.` }
  } catch (err: unknown) {
    console.error("Failed to remove flat resident:", err)
    return { error: getSafeErrorMessage(err, "Failed to end occupancy.") }
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
 * Records a Caution / Move-in / Fit-out / Renovation Member Deposit
 */
export async function recordMemberDeposit(
  societyCode: string,
  flatId: string,
  data: {
    personId?: string | null
    depositType: "SECURITY" | "FIT_OUT" | "CORPUS" | "OTHER"
    amount: number
    reference?: string | null
    remarks?: string | null
  }
): Promise<FlatActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, FINANCIAL_ROLES)
    const societyId = context.society.id

    const flat = await prisma.flat.findFirst({
      where: { id: flatId, block: { societyId } },
      include: { block: true },
    })
    if (!flat) return { error: "Flat not found." }

    if (!data.amount || data.amount <= 0) {
      return { error: "Deposit amount must be greater than zero." }
    }

    const deposit = await prisma.memberDeposit.create({
      data: {
        societyId,
        flatId,
        personId: data.personId || null,
        depositType: data.depositType,
        amount: data.amount,
        status: "HELD",
        receivedOn: new Date(),
        reference: data.reference ? sanitizeText(data.reference) : null,
        remarks: data.remarks ? sanitizeText(data.remarks) : null,
      },
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "CREATE",
      entity: "MemberDeposit",
      entityId: deposit.id,
      description: `${context.user.email} recorded ${data.depositType} deposit of ₹${data.amount} for Flat ${flat.block.name}-${flat.number}`,
      newData: { flatId, depositType: data.depositType, amount: data.amount },
    })

    revalidatePath(`/society/${societyCode}/flats/${flatId}`)
    return { success: true, message: "Deposit recorded successfully." }
  } catch (err: unknown) {
    console.error("Failed to record deposit:", err)
    return { error: getSafeErrorMessage(err, "Failed to record deposit.") }
  }
}

/**
 * Marks a held Member Deposit as REFUNDED
 */
export async function refundMemberDeposit(
  societyCode: string,
  flatId: string,
  depositId: string
): Promise<FlatActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, FINANCIAL_ROLES)
    const societyId = context.society.id

    const deposit = await prisma.memberDeposit.findFirst({
      where: { id: depositId, flatId, societyId },
    })
    if (!deposit) return { error: "Deposit record not found." }

    await prisma.memberDeposit.update({
      where: { id: depositId },
      data: {
        status: "REFUNDED",
        refundedOn: new Date(),
      },
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "STATUS_CHANGE",
      entity: "MemberDeposit",
      entityId: depositId,
      description: `${context.user.email} marked ${deposit.depositType} deposit of ₹${deposit.amount} as REFUNDED`,
    })

    revalidatePath(`/society/${societyCode}/flats/${flatId}`)
    return { success: true, message: "Deposit marked as REFUNDED." }
  } catch (err: unknown) {
    console.error("Failed to refund deposit:", err)
    return { error: getSafeErrorMessage(err, "Failed to refund deposit.") }
  }
}

/**
 * Marks a held Member Deposit as FORFEITED (e.g. damages deduction)
 */
export async function forfeitMemberDeposit(
  societyCode: string,
  flatId: string,
  depositId: string
): Promise<FlatActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, FINANCIAL_ROLES)
    const societyId = context.society.id

    const deposit = await prisma.memberDeposit.findFirst({
      where: { id: depositId, flatId, societyId },
    })
    if (!deposit) return { error: "Deposit record not found." }

    await prisma.memberDeposit.update({
      where: { id: depositId },
      data: { status: "FORFEITED" },
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "STATUS_CHANGE",
      entity: "MemberDeposit",
      entityId: depositId,
      description: `${context.user.email} marked ${deposit.depositType} deposit of ₹${deposit.amount} as FORFEITED`,
    })

    revalidatePath(`/society/${societyCode}/flats/${flatId}`)
    return { success: true, message: "Deposit marked as FORFEITED." }
  } catch (err: unknown) {
    console.error("Failed to forfeit deposit:", err)
    return { error: getSafeErrorMessage(err, "Failed to forfeit deposit.") }
  }
}

export type BulkFlatItemInput = {
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

export type BulkCreateFlatsResult = {
  success?: boolean
  error?: string
  message?: string
  createdCount?: number
  skippedCount?: number
  createdFlats?: { id: string; number: string; blockName: string }[]
  skippedFlats?: { number: string; blockName: string; reason: string }[]
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

/**
 * Fetches comprehensive statement and financial ledger payload for a single flat
 * to generate and download official PDF statement from anywhere in the UI.
 */
export async function getFlatStatementData(
  societyCode: string,
  flatId: string
) {
  try {
    const context = await requireCommitteeAccess(societyCode, COMMITTEE_ROLES)
    const society = context.society

    const flat = await prisma.flat.findFirst({
      where: {
        id: flatId,
        block: { societyId: society.id },
        deletedAt: null,
      },
      include: {
        block: true,
        people: {
          include: { person: true },
          orderBy: { fromDate: "desc" },
        },
        ownershipHistory: {
          include: {
            fromPerson: true,
            toPerson: true,
          },
          orderBy: { transferDate: "desc" },
        },
        shareCertificate: true,
        propertyLiens: {
          orderBy: { createdAt: "desc" },
        },
        bills: {
          orderBy: [{ year: "desc" }, { month: "desc" }],
          take: 50,
        },
        memberDeposits: {
          orderBy: { receivedOn: "desc" },
        },
      },
    })

    if (!flat) return { error: "Flat record not found." }

    const flatPayments = await prisma.payment.findMany({
      where: {
        flatId,
        societyId: society.id,
      },
      orderBy: { paidOn: "desc" },
      take: 50,
    })

    // 1. Build combined chronological ledger
    const allEvents: {
      date: string
      type: "BILL" | "PAYMENT"
      description: string
      refNumber: string
      debit: number
      credit: number
      status: string
    }[] = []

    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ]

    flat.bills.forEach((b) => {
      const period = `${monthNames[(b.month || 1) - 1]} ${b.year}`
      allEvents.push({
        date: b.dueDate ? b.dueDate.toISOString() : new Date(b.year, (b.month || 1) - 1, 1).toISOString(),
        type: "BILL",
        description: `Maintenance Bill (${period})`,
        refNumber: b.billNumber || "—",
        debit: Number(b.amount),
        credit: 0,
        status: b.status,
      })
    })

    flatPayments.forEach((p) => {
      allEvents.push({
        date: p.paidOn.toISOString(),
        type: "PAYMENT",
        description: `Maintenance Collection (${p.mode})`,
        refNumber: p.receiptNumber || "—",
        debit: 0,
        credit: Number(p.amount),
        status: p.status,
      })
    })

    allEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    let runningBalance = 0
    const ledger = allEvents.map((evt) => {
      runningBalance += evt.debit - evt.credit
      return {
        ...evt,
        balance: runningBalance,
      }
    })

    ledger.reverse()

    const totalDemanded = flat.bills.reduce((s, b) => s + Number(b.amount), 0)
    const totalPaid = flatPayments.filter((p) => p.status === "SUCCESS").reduce((s, p) => s + Number(p.amount), 0)
    const unpaidBills = flat.bills.filter((b) => b.status === "PENDING" || b.status === "OVERDUE")
    const unpaidDues = unpaidBills.reduce((s, b) => s + Number(b.amount), 0)
    const activeDepositsTotal = flat.memberDeposits
      .filter((d) => d.status === "HELD")
      .reduce((s, d) => s + Number(d.amount), 0)

    const owner = flat.ownershipHistory.find((h) => h.isCurrentOwner) || flat.ownershipHistory[0]

    return {
      success: true,
      data: {
        society: {
          name: society.name,
          code: society.code,
          address: society.address,
          city: society.city,
          state: society.state,
          pincode: society.pincode,
          registrationNumber: society.registrationNumber,
          panNumber: society.panNumber,
          gstin: society.gstin,
          currencySymbol: society.currencySymbol || "₹",
        },
        flat: {
          number: flat.number,
          blockName: flat.block.name,
          floor: flat.floor,
          unitType: flat.unitType,
          area: flat.area ? Number(flat.area) : null,
          areaUnit: flat.areaUnit,
          status: flat.status,
          parkingSlot: flat.parkingSlot,
          intercomNumber: flat.intercomNumber,
        },
        currentOwner: owner
          ? {
              name: owner.toPerson.name,
              fromDate: owner.fromDate.toISOString(),
              registrationDoc: owner.registeredDocNumber,
            }
          : null,
        activeOccupants: flat.people
          .filter((p) => !p.toDate)
          .map((p) => ({
            name: p.person.name,
            role: p.role,
            phone: p.person.phone,
            email: p.person.email,
            fromDate: p.fromDate.toISOString(),
          })),
        statutory: {
          shareCertificate: flat.shareCertificate
            ? {
                certificateNumber: flat.shareCertificate.certificateNumber,
                sharesCount: flat.shareCertificate.sharesCount,
                distinctiveRange:
                  flat.shareCertificate.shareDistinctFrom && flat.shareCertificate.shareDistinctTo
                    ? `${flat.shareCertificate.shareDistinctFrom} – ${flat.shareCertificate.shareDistinctTo}`
                    : null,
                faceValue: Number(flat.shareCertificate.faceValuePerShare) * flat.shareCertificate.sharesCount,
                issueDate: flat.shareCertificate.issueDate.toISOString(),
                status: flat.shareCertificate.status,
              }
            : null,
          activeLiens: flat.propertyLiens
            .filter((l) => !l.isCleared)
            .map((l) => ({
              bankName: l.bankName,
              loanAccountNumber: l.loanAccountNumber,
              sanctionAmount: l.sanctionAmount ? Number(l.sanctionAmount) : null,
              nocReference: l.nocReference,
            })),
        },
        summary: {
          totalDemanded,
          totalPaid,
          currentOutstanding: unpaidDues,
          activeDeposits: activeDepositsTotal,
          unpaidBillsCount: unpaidBills.length,
        },
        ledger,
        deposits: flat.memberDeposits.map((d) => ({
          depositType: d.depositType,
          amount: Number(d.amount),
          status: d.status,
          receivedOn: d.receivedOn.toISOString(),
          refundedOn: d.refundedOn ? d.refundedOn.toISOString() : null,
        })),
      },
    }
  } catch (err: unknown) {
    console.error("Failed to fetch flat statement data:", err)
    return { error: getSafeErrorMessage(err, "Failed to generate statement data.") }
  }
}


