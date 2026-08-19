"use server"

import { revalidatePath } from "next/cache"
import { requireCommitteeAccess, COMMITTEE_ROLES } from "@/lib/auth/requireAuth"
import { prisma } from "@/lib/prisma"
import { recordAuditLog } from "@/lib/audit"
import type { FlatRole } from "@/generated/prisma/client"

export type ResidentActionState = {
  success?: boolean
  error?: string
  message?: string
}

/**
 * Registers a new resident / person in the society and maps them to a flat.
 */
export async function registerResident(
  societyCode: string,
  data: {
    name: string
    phone?: string | null
    email?: string | null
    panNumber?: string | null
    aadhaarNumber?: string | null
    emergencyContactName?: string | null
    emergencyContactPhone?: string | null
    permanentAddress?: string | null
    flatId?: string | null
    role?: FlatRole
    fromDate?: string | null
  }
): Promise<ResidentActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, COMMITTEE_ROLES)
    const societyId = context.society.id

    const name = data.name.trim()
    if (!name) {
      return { error: "Resident's full name is required." }
    }

    const phone = data.phone?.trim() || null
    const email = data.email?.trim().toLowerCase() || null
    const panNumber = data.panNumber?.trim().toUpperCase() || null
    const aadhaarNumber = data.aadhaarNumber?.trim() || null
    const role: FlatRole = data.role || "OWNER"

    // Create the person record
    const person = await prisma.$transaction(async (tx) => {
      const newPerson = await tx.person.create({
        data: {
          societyId,
          name,
          phone,
          email,
          panNumber,
          aadhaarNumber,
          emergencyContactName: data.emergencyContactName?.trim() || null,
          emergencyContactPhone: data.emergencyContactPhone?.trim() || null,
          permanentAddress: data.permanentAddress?.trim() || null,
        },
      })

      // If flat is selected, assign person to flat
      if (data.flatId) {
        const flat = await tx.flat.findFirst({
          where: {
            id: data.flatId,
            block: { societyId },
            deletedAt: null,
          },
        })

        if (!flat) {
          throw new Error("Selected flat does not belong to this society.")
        }

        await tx.flatPerson.create({
          data: {
            flatId: data.flatId,
            personId: newPerson.id,
            role,
            isPrimary: true,
            fromDate: data.fromDate ? new Date(data.fromDate) : new Date(),
          },
        })

        // Update flat status to OCCUPIED if currently vacant
        if (flat.status === "VACANT") {
          await tx.flat.update({
            where: { id: data.flatId },
            data: { status: "OCCUPIED" },
          })
        }
      }

      return newPerson
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "CREATE",
      entity: "Person",
      entityId: person.id,
      description: `${context.user.email} registered resident "${name}" (${role})`,
      newData: { name, phone, email, flatId: data.flatId, role },
    })

    revalidatePath(`/society/${societyCode}/members`)
    revalidatePath(`/society/${societyCode}/flats`)
    revalidatePath(`/society/${societyCode}/dashboard`)

    return {
      success: true,
      message: `Resident "${name}" registered successfully.`,
    }
  } catch (err: unknown) {
    console.error("Failed to register resident:", err)
    const message = err instanceof Error ? err.message : "Failed to register resident."
    return { error: message }
  }
}

/**
 * Removes a resident / person from the society.
 */
export async function removeResident(
  societyCode: string,
  personId: string
): Promise<ResidentActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, COMMITTEE_ROLES)
    const societyId = context.society.id

    const person = await prisma.person.findFirst({
      where: { id: personId, societyId },
      include: {
        flats: {
          include: { flat: true },
        },
      },
    })

    if (!person) {
      return { error: "Resident not found." }
    }

    await prisma.person.update({
      where: { id: personId },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "DELETE",
      entity: "Person",
      entityId: personId,
      description: `${context.user.email} archived resident profile "${person.name}"`,
    })

    revalidatePath(`/society/${societyCode}/members`)
    revalidatePath(`/society/${societyCode}/flats`)
    revalidatePath(`/society/${societyCode}/dashboard`)

    return {
      success: true,
      message: `Resident "${person.name}" was removed.`,
    }
  } catch (err: unknown) {
    console.error("Failed to remove resident:", err)
    const message = err instanceof Error ? err.message : "Failed to remove resident."
    return { error: message }
  }
}
