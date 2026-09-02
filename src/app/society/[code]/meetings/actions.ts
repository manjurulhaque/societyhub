"use server"

import { revalidatePath } from "next/cache"
import { requireCommitteeAccess, COMMITTEE_ROLES } from "@/lib/auth/requireAuth"
import { prisma } from "@/lib/prisma"
import { recordAuditLog } from "@/lib/audit"
import { sanitizeText } from "@/lib/sanitize"
import { getSafeErrorMessage } from "@/lib/errors"
import { logger } from "@/lib/logger"
import type { MeetingType } from "@/generated/prisma/client"

export type MeetingActionState = {
  success?: boolean
  error?: string
  message?: string
  meetingId?: string
  resolutionId?: string
}

/**
 * Schedules a new General Body or Managing Committee meeting
 */
export async function createMeeting(
  societyCode: string,
  data: {
    title: string
    meetingType: MeetingType
    meetingDate: string
    venue?: string | null
    agenda?: string | null
  }
): Promise<MeetingActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, COMMITTEE_ROLES)
    const societyId = context.society.id

    const rawTitle = data.title?.trim()
    const title = sanitizeText(rawTitle)
    if (!title) {
      return { error: "Meeting title is required (e.g. 12th Annual General Body Meeting)." }
    }

    if (!data.meetingDate) {
      return { error: "Meeting date and time is required." }
    }

    const meetingDate = new Date(data.meetingDate)
    const venue = data.venue ? sanitizeText(data.venue) : null
    const agenda = data.agenda ? sanitizeText(data.agenda) : null

    const meeting = await prisma.meeting.create({
      data: {
        societyId,
        title,
        meetingType: data.meetingType,
        meetingDate,
        venue,
        agenda,
        quorumMet: true,
      },
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "CREATE",
      entity: "Meeting",
      entityId: meeting.id,
      description: `${context.user.email} scheduled ${data.meetingType} "${title}" for ${meetingDate.toLocaleDateString()}`,
      newData: { title, meetingType: data.meetingType, meetingDate: data.meetingDate },
    })

    revalidatePath(`/society/${societyCode}/meetings`)

    return {
      success: true,
      message: `Meeting "${title}" scheduled successfully.`,
      meetingId: meeting.id,
    }
  } catch (err: unknown) {
    logger.error("Failed to schedule meeting", err, "createMeeting", { societyCode, title: data.title })
    return { error: getSafeErrorMessage(err, "Failed to schedule meeting.") }
  }
}

/**
 * Updates meeting details, quorum, and Minutes of Meeting (MOM) notes
 */
export async function updateMeeting(
  societyCode: string,
  meetingId: string,
  data: {
    title?: string
    meetingType?: MeetingType
    meetingDate?: string
    venue?: string | null
    agenda?: string | null
    quorumMet?: boolean
    attendeeCount?: number | null
    minutesNotes?: string | null
  }
): Promise<MeetingActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, COMMITTEE_ROLES)
    const societyId = context.society.id

    const meeting = await prisma.meeting.findFirst({
      where: { id: meetingId, societyId },
    })
    if (!meeting) return { error: "Meeting not found." }

    const sanitizedTitle = data.title ? sanitizeText(data.title) : undefined
    const sanitizedVenue = data.venue !== undefined ? (data.venue ? sanitizeText(data.venue) : null) : meeting.venue
    const sanitizedAgenda = data.agenda !== undefined ? (data.agenda ? sanitizeText(data.agenda) : null) : meeting.agenda
    const sanitizedMinutes = data.minutesNotes !== undefined ? (data.minutesNotes ? sanitizeText(data.minutesNotes) : null) : meeting.minutesNotes

    await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        ...(sanitizedTitle ? { title: sanitizedTitle } : {}),
        ...(data.meetingType ? { meetingType: data.meetingType } : {}),
        ...(data.meetingDate ? { meetingDate: new Date(data.meetingDate) } : {}),
        venue: sanitizedVenue,
        agenda: sanitizedAgenda,
        quorumMet: data.quorumMet !== undefined ? data.quorumMet : meeting.quorumMet,
        attendeeCount: data.attendeeCount !== undefined ? data.attendeeCount : meeting.attendeeCount,
        minutesNotes: sanitizedMinutes,
      },
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "UPDATE",
      entity: "Meeting",
      entityId: meetingId,
      description: `${context.user.email} updated meeting minutes & details for "${meeting.title}"`,
    })

    revalidatePath(`/society/${societyCode}/meetings`)
    revalidatePath(`/society/${societyCode}/meetings/${meetingId}`)

    return { success: true, message: "Meeting details & minutes saved." }
  } catch (err: unknown) {
    logger.error("Failed to update meeting", err, "updateMeeting", { societyCode, meetingId })
    return { error: getSafeErrorMessage(err, "Failed to update meeting.") }
  }
}

/**
 * Deletes a meeting
 */
export async function deleteMeeting(
  societyCode: string,
  meetingId: string
): Promise<MeetingActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, COMMITTEE_ROLES)
    const societyId = context.society.id

    const meeting = await prisma.meeting.findFirst({
      where: { id: meetingId, societyId },
    })
    if (!meeting) return { error: "Meeting not found." }

    await prisma.meeting.delete({
      where: { id: meetingId },
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "DELETE",
      entity: "Meeting",
      entityId: meetingId,
      description: `${context.user.email} deleted meeting "${meeting.title}"`,
    })

    revalidatePath(`/society/${societyCode}/meetings`)

    return { success: true, message: "Meeting deleted successfully." }
  } catch (err: unknown) {
    logger.error("Failed to delete meeting", err, "deleteMeeting", { societyCode, meetingId })
    return { error: getSafeErrorMessage(err, "Failed to delete meeting.") }
  }
}

/**
 * Adds a formal resolution to a meeting
 */
export async function createResolution(
  societyCode: string,
  meetingId: string,
  data: {
    resolutionNumber?: string | null
    title: string
    description: string
    proposedBy?: string | null
    secondedBy?: string | null
    passed?: boolean
    passedUnanimously?: boolean
    votesInFavor?: number | null
    votesAgainst?: number | null
  }
): Promise<MeetingActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, COMMITTEE_ROLES)
    const societyId = context.society.id

    const meeting = await prisma.meeting.findFirst({
      where: { id: meetingId, societyId },
    })
    if (!meeting) return { error: "Meeting not found." }

    const rawTitle = data.title?.trim()
    const title = sanitizeText(rawTitle)
    const rawDesc = data.description?.trim()
    const description = sanitizeText(rawDesc)

    if (!title || !description) {
      return { error: "Resolution title and description are required." }
    }

    const resolutionNumber = data.resolutionNumber ? sanitizeText(data.resolutionNumber) : null
    const proposedBy = data.proposedBy ? sanitizeText(data.proposedBy) : null
    const secondedBy = data.secondedBy ? sanitizeText(data.secondedBy) : null

    const resolution = await prisma.resolution.create({
      data: {
        meetingId,
        resolutionNumber,
        title,
        description,
        proposedBy,
        secondedBy,
        passed: data.passed !== false,
        passedUnanimously: Boolean(data.passedUnanimously),
        votesInFavor: data.votesInFavor || null,
        votesAgainst: data.votesAgainst || null,
      },
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "CREATE",
      entity: "Resolution",
      entityId: resolution.id,
      description: `${context.user.email} passed resolution "${title}" (${resolution.resolutionNumber || "No Res. #"}) for meeting "${meeting.title}"`,
    })

    revalidatePath(`/society/${societyCode}/meetings/${meetingId}`)

    return { success: true, message: "Resolution recorded successfully.", resolutionId: resolution.id }
  } catch (err: unknown) {
    logger.error("Failed to create resolution", err, "createResolution", { societyCode, meetingId, title: data.title })
    return { error: getSafeErrorMessage(err, "Failed to create resolution.") }
  }
}

/**
 * Deletes a resolution
 */
export async function deleteResolution(
  societyCode: string,
  resolutionId: string,
  meetingId: string
): Promise<MeetingActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, COMMITTEE_ROLES)
    const societyId = context.society.id

    const resolution = await prisma.resolution.findFirst({
      where: { id: resolutionId, meeting: { societyId } },
    })
    if (!resolution) return { error: "Resolution not found." }

    await prisma.resolution.delete({
      where: { id: resolutionId },
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "DELETE",
      entity: "Resolution",
      entityId: resolutionId,
      description: `${context.user.email} removed resolution "${resolution.title}"`,
    })

    revalidatePath(`/society/${societyCode}/meetings/${meetingId}`)

    return { success: true, message: "Resolution deleted." }
  } catch (err: unknown) {
    logger.error("Failed to delete resolution", err, "deleteResolution", { societyCode, resolutionId, meetingId })
    return { error: getSafeErrorMessage(err, "Failed to delete resolution.") }
  }
}
