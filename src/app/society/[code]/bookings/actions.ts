"use server"

import { revalidatePath } from "next/cache"
import { requireCommitteeAccess, COMMITTEE_ROLES } from "@/lib/auth/requireAuth"
import { prisma } from "@/lib/prisma"
import { recordAuditLog } from "@/lib/audit"
import type { BookingStatus, PaymentMode } from "@/generated/prisma/client"

export type BookingActionState = {
  success?: boolean
  error?: string
  message?: string
  bookingId?: string
}

/**
 * Creates a facility reservation
 */
export async function createBooking(
  societyCode: string,
  data: {
    amenityId: string
    flatId: string
    personId: string
    eventTitle?: string | null
    bookingDate: string
    startTime?: string | null
    endTime?: string | null
    rentAmount: number
    depositAmount: number
    paymentMode: PaymentMode
    receiptNumber?: string | null
    remarks?: string | null
  }
): Promise<BookingActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, COMMITTEE_ROLES)
    const societyId = context.society.id

    if (!data.amenityId) return { error: "Please select an amenity." }
    if (!data.flatId) return { error: "Please select the resident flat." }
    if (!data.personId) return { error: "Please select the resident person." }
    if (!data.bookingDate) return { error: "Please select the booking date." }

    const bookingDate = new Date(data.bookingDate)
    const startDateTime = data.startTime ? new Date(`${data.bookingDate}T${data.startTime}`) : null
    const endDateTime = data.endTime ? new Date(`${data.bookingDate}T${data.endTime}`) : null

    // Check for conflicting active bookings on the same date for the amenity
    const conflict = await prisma.facilityBooking.findFirst({
      where: {
        societyId,
        amenityId: data.amenityId,
        bookingDate,
        status: { in: ["CONFIRMED", "REQUESTED"] },
      },
      include: {
        flat: { select: { number: true, block: { select: { name: true } } } },
        amenity: { select: { name: true } },
      },
    })

    if (conflict) {
      return {
        error: `Conflict: ${conflict.amenity.name} is already booked on ${bookingDate.toLocaleDateString()} by Flat ${conflict.flat.block.name}-${conflict.flat.number}.`,
      }
    }

    const booking = await prisma.facilityBooking.create({
      data: {
        societyId,
        amenityId: data.amenityId,
        flatId: data.flatId,
        personId: data.personId,
        eventTitle: data.eventTitle?.trim() || "Private Gathering",
        bookingDate,
        startTime: startDateTime,
        endTime: endDateTime,
        rentAmount: Math.max(0, data.rentAmount || 0),
        depositAmount: Math.max(0, data.depositAmount || 0),
        status: "CONFIRMED",
        paymentMode: data.paymentMode,
        receiptNumber: data.receiptNumber?.trim() || `RCP-FAC-${Date.now().toString().slice(-6)}`,
        remarks: data.remarks?.trim() || null,
      },
      include: {
        amenity: { select: { name: true } },
        flat: { select: { number: true, block: { select: { name: true } } } },
        person: { select: { name: true } },
      },
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "CREATE",
      entity: "FacilityBooking",
      entityId: booking.id,
      description: `${context.user.email} reserved ${booking.amenity.name} for Flat ${booking.flat.block.name}-${booking.flat.number} (${booking.person.name}) on ${bookingDate.toLocaleDateString()}`,
      newData: {
        amenity: booking.amenity.name,
        date: data.bookingDate,
        rent: data.rentAmount,
        deposit: data.depositAmount,
      },
    })

    revalidatePath(`/society/${societyCode}/bookings`)
    revalidatePath(`/society/${societyCode}/amenities`)

    return {
      success: true,
      message: `Reservation confirmed for ${booking.amenity.name} on ${bookingDate.toLocaleDateString()}.`,
      bookingId: booking.id,
    }
  } catch (err: unknown) {
    console.error("Failed to create facility booking:", err)
    const message = err instanceof Error ? err.message : "Failed to create reservation."
    return { error: message }
  }
}

/**
 * Updates booking status (CONFIRMED, COMPLETED, CANCELLED)
 */
export async function updateBookingStatus(
  societyCode: string,
  bookingId: string,
  status: BookingStatus
): Promise<BookingActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, COMMITTEE_ROLES)
    const societyId = context.society.id

    const booking = await prisma.facilityBooking.findFirst({
      where: { id: bookingId, societyId },
      include: { amenity: true, flat: { include: { block: true } } },
    })
    if (!booking) return { error: "Booking record not found." }

    await prisma.facilityBooking.update({
      where: { id: bookingId },
      data: { status },
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "UPDATE",
      entity: "FacilityBooking",
      entityId: bookingId,
      description: `${context.user.email} marked booking for ${booking.amenity.name} (Flat ${booking.flat.block.name}-${booking.flat.number}) as ${status}`,
    })

    revalidatePath(`/society/${societyCode}/bookings`)
    revalidatePath(`/society/${societyCode}/amenities`)

    return { success: true, message: `Booking marked as ${status}.` }
  } catch (err: unknown) {
    console.error("Failed to update booking status:", err)
    const message = err instanceof Error ? err.message : "Failed to update booking."
    return { error: message }
  }
}

/**
 * Processes refund of caution / security deposit
 */
export async function refundCautionDeposit(
  societyCode: string,
  bookingId: string
): Promise<BookingActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, COMMITTEE_ROLES)
    const societyId = context.society.id

    const booking = await prisma.facilityBooking.findFirst({
      where: { id: bookingId, societyId },
      include: { amenity: true, flat: { include: { block: true } } },
    })
    if (!booking) return { error: "Booking not found." }

    await prisma.facilityBooking.update({
      where: { id: bookingId },
      data: {
        isDepositRefunded: true,
        depositRefundedOn: new Date(),
      },
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "UPDATE",
      entity: "FacilityBooking",
      entityId: bookingId,
      description: `${context.user.email} recorded caution deposit refund of ₹${booking.depositAmount} for ${booking.amenity.name} (Flat ${booking.flat.block.name}-${booking.flat.number})`,
    })

    revalidatePath(`/society/${societyCode}/bookings`)
    revalidatePath(`/society/${societyCode}/amenities`)

    return { success: true, message: "Caution deposit marked as refunded." }
  } catch (err: unknown) {
    console.error("Failed to refund deposit:", err)
    const message = err instanceof Error ? err.message : "Failed to refund deposit."
    return { error: message }
  }
}
