"use server"

import { revalidatePath } from "next/cache"
import { requireCommitteeAccess, COMMITTEE_ROLES } from "@/lib/auth/requireAuth"
import { prisma } from "@/lib/prisma"
import { recordAuditLog } from "@/lib/audit"
import { sanitizeText } from "@/lib/sanitize"
import { getSafeErrorMessage } from "@/lib/errors"
import type { FlatActionState } from "./types"

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
 * Batch updates the structural prefix (Wing / Tower / Block / Building) for all blocks in the society.
 * e.g., converts "Block A", "Block B" -> "Wing A", "Wing B" or "Tower A", "Tower B".
 */
export async function batchUpdateBlockPrefix(
  societyCode: string,
  newPrefix: "Wing" | "Tower" | "Block" | "Building"
): Promise<FlatActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, COMMITTEE_ROLES)
    const societyId = context.society.id

    const blocks = await prisma.block.findMany({
      where: {
        societyId,
        deletedAt: null,
      },
    })

    if (blocks.length === 0) {
      return { error: "No blocks found to update." }
    }

    const regex = /^(Wing|Tower|Block|Building)\s*/i
    const updates = blocks.map((b) => {
      const remainder = b.name.replace(regex, "").trim()
      const newName = `${newPrefix} ${remainder}`.trim()
      return {
        id: b.id,
        oldName: b.name,
        newName,
      }
    })

    // Perform atomic transaction
    await prisma.$transaction(
      updates.map((u) =>
        prisma.block.update({
          where: { id: u.id },
          data: { name: u.newName },
        })
      )
    )

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "UPDATE",
      entity: "Block",
      description: `${context.user.email} batch-updated all block prefixes to "${newPrefix}"`,
      newData: { newPrefix, count: blocks.length },
    })

    revalidatePath(`/society/${societyCode}/flats`)
    revalidatePath(`/society/${societyCode}/dashboard`)
    revalidatePath(`/society/${societyCode}/members`)

    return {
      success: true,
      message: `Successfully updated all ${blocks.length} block(s) to use "${newPrefix}" prefix.`,
    }
  } catch (err: unknown) {
    console.error("Failed to batch update block prefixes:", err)
    return { error: getSafeErrorMessage(err, "Failed to batch update block prefixes.") }
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
 * Fetches comprehensive tower/block roster data with letterhead, specs, occupants, parking, and dues
 * for generating official Tower Directory PDF and CSV exports.
 */
export async function getTowerDirectoryData(
  societyCode: string,
  blockId: string
) {
  try {
    const context = await requireCommitteeAccess(societyCode)
    const society = context.society

    const block = await prisma.block.findFirst({
      where: {
        id: blockId,
        societyId: society.id,
        deletedAt: null,
      },
      include: {
        flats: {
          where: {
            isActive: true,
            deletedAt: null,
          },
          orderBy: [
            { floor: "asc" },
            { number: "asc" },
          ],
          include: {
            people: {
              where: { toDate: null },
              include: {
                person: {
                  select: {
                    id: true,
                    name: true,
                    phone: true,
                    email: true,
                  },
                },
              },
            },
            bills: {
              select: {
                amount: true,
                status: true,
                payments: {
                  where: { status: "SUCCESS" },
                  select: { amount: true },
                },
              },
            },
            shareCertificate: {
              select: {
                certificateNumber: true,
              },
            },
          },
        },
      },
    })

    if (!block) return { error: "Block not found." }

    const flatItems = block.flats.map((flat) => {
      const primaryPerson = flat.people.find((p) => p.isPrimary) || flat.people[0]
      const totalBilled = flat.bills.reduce((s, b) => s + Number(b.amount), 0)
      const totalPaid = flat.bills.reduce((s, b) => {
        const paid = b.payments.reduce((pS, p) => pS + Number(p.amount), 0)
        return s + paid
      }, 0)

      const unpaidBills = flat.bills.filter(
        (b) => b.status === "PENDING" || b.status === "OVERDUE" || b.status === "PARTIALLY_PAID"
      )

      const unpaidDues = unpaidBills.reduce((s, b) => {
        const paid = b.payments.reduce((pS, p) => pS + Number(p.amount), 0)
        return s + Math.max(0, Number(b.amount) - paid)
      }, 0)

      const isDefaulter = unpaidDues > 0 && flat.bills.some((b) => b.status === "OVERDUE")

      return {
        number: flat.number,
        floor: flat.floor,
        unitType: flat.unitType,
        area: flat.area ? Number(flat.area) : null,
        areaUnit: flat.areaUnit,
        status: flat.status,
        parkingSlot: flat.parkingSlot,
        intercomNumber: flat.intercomNumber,
        shareCertificateNumber: flat.shareCertificate?.certificateNumber || null,
        primaryResident: primaryPerson
          ? {
              name: primaryPerson.person.name,
              role: primaryPerson.role,
              phone: primaryPerson.person.phone,
              email: primaryPerson.person.email,
            }
          : null,
        allOccupantsCount: flat.people.length,
        unpaidDues,
        isDefaulter,
      }
    })

    const totalUnits = flatItems.length
    const occupiedUnits = flatItems.filter((f) => f.status === "OCCUPIED").length
    const vacantUnits = flatItems.filter((f) => f.status === "VACANT").length
    const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0
    const totalBilled = block.flats.reduce(
      (sum, f) => sum + f.bills.reduce((bSum, b) => bSum + Number(b.amount), 0),
      0
    )
    const totalPaid = block.flats.reduce(
      (sum, f) =>
        sum +
        f.bills.reduce(
          (bSum, b) =>
            bSum +
            b.payments.reduce((pSum, p) => pSum + Number(p.amount), 0),
          0
        ),
      0
    )
    const totalOutstanding = flatItems.reduce((sum, f) => sum + f.unpaidDues, 0)
    const defaultersCount = flatItems.filter((f) => f.isDefaulter || f.unpaidDues > 0).length
    const collectionRate = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 100

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
        block: {
          id: block.id,
          name: block.name,
          totalUnits,
          occupiedUnits,
          vacantUnits,
          occupancyRate,
          totalBilled,
          totalPaid,
          totalOutstanding,
          collectionRate,
          defaultersCount,
        },
        flats: flatItems,
      },
    }
  } catch (err: unknown) {
    console.error("Failed to fetch tower directory data:", err)
    return { error: getSafeErrorMessage(err, "Failed to load tower directory data.") }
  }
}
