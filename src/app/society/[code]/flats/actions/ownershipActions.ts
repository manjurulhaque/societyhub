"use server"

import { revalidatePath } from "next/cache"
import { requireCommitteeAccess, COMMITTEE_ROLES } from "@/lib/auth/requireAuth"
import { prisma } from "@/lib/prisma"
import { recordAuditLog } from "@/lib/audit"
import { sanitizeText } from "@/lib/sanitize"
import { getSafeErrorMessage } from "@/lib/errors"
import type { TransferType, FlatRole } from "@/generated/prisma/client"
import type { FlatActionState } from "./types"

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
