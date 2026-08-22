"use server"

import { revalidatePath } from "next/cache"
import { requireCommitteeAccess, COMMITTEE_ROLES, FINANCIAL_ROLES } from "@/lib/auth/requireAuth"
import { prisma } from "@/lib/prisma"
import { recordAuditLog } from "@/lib/audit"
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
 * Updates flat physical specifications and occupancy status
 */
export async function updateFlatDetails(
  societyCode: string,
  flatId: string,
  data: {
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
      return { error: "Flat not found." }
    }

    const number = data.number?.trim()
    if (!number) {
      return { error: "Flat number is required." }
    }

    const updated = await prisma.flat.update({
      where: { id: flatId },
      data: {
        number,
        floor: data.floor !== undefined && data.floor !== null && !isNaN(data.floor) ? data.floor : null,
        unitType: data.unitType || null,
        area: data.area && !isNaN(data.area) ? data.area : null,
        areaUnit: data.areaUnit || "sqft",
        status: data.status,
        intercomNumber: data.intercomNumber?.trim() || null,
        parkingSlot: data.parkingSlot?.trim() || null,
      },
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "UPDATE",
      entity: "Flat",
      entityId: flatId,
      description: `${context.user.email} updated details for Flat ${flat.block.name}-${number}`,
      oldData: flat,
      newData: updated,
    })

    revalidatePath(`/society/${societyCode}/flats`)
    revalidatePath(`/society/${societyCode}/flats/${flatId}`)

    return { success: true, message: "Flat details updated successfully." }
  } catch (err: unknown) {
    console.error("Failed to update flat details:", err)
    const message = err instanceof Error ? err.message : "Failed to update flat details."
    return { error: message }
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
          registeredDocNumber: data.registeredDocNumber?.trim() || null,
          registrationDate: data.registrationDate ? new Date(data.registrationDate) : null,
          transferFeePaid: data.transferFeePaid !== null && data.transferFeePaid !== undefined ? data.transferFeePaid : 0,
          nocReference: data.nocReference?.trim() || null,
          nocIssuedDate: data.nocIssuedDate ? new Date(data.nocIssuedDate) : null,
          resolutionNumber: data.resolutionNumber?.trim() || null,
          committeeApprovalDate: data.committeeApprovalDate ? new Date(data.committeeApprovalDate) : null,
          remarks: data.remarks?.trim() || null,
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
    const message = err instanceof Error ? err.message : "Failed to transfer ownership."
    return { error: message }
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

    return { success: true, message: `${person.name} assigned to Flat ${flat.number} as ${data.role}.` }
  } catch (err: unknown) {
    console.error("Failed to add flat resident:", err)
    const message = err instanceof Error ? err.message : "Failed to add flat resident."
    return { error: message }
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

    await prisma.flatPerson.update({
      where: { id: flatPersonId },
      data: { toDate: new Date(), isPrimary: false },
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "UPDATE",
      entity: "FlatPerson",
      entityId: flatPersonId,
      description: `${context.user.email} ended occupancy for ${record.person.name} in Flat ${record.flat.block.name}-${record.flat.number}`,
    })

    revalidatePath(`/society/${societyCode}/flats/${flatId}`)
    revalidatePath(`/society/${societyCode}/flats`)

    return { success: true, message: `Occupancy ended for ${record.person.name}.` }
  } catch (err: unknown) {
    console.error("Failed to remove flat resident:", err)
    const message = err instanceof Error ? err.message : "Failed to end occupancy."
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
        reference: data.reference?.trim() || null,
        remarks: data.remarks?.trim() || null,
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
    const message = err instanceof Error ? err.message : "Failed to record deposit."
    return { error: message }
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
    const message = err instanceof Error ? err.message : "Failed to refund deposit."
    return { error: message }
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
    const message = err instanceof Error ? err.message : "Failed to forfeit deposit."
    return { error: message }
  }
}
