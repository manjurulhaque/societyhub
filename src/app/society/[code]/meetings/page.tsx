import { notFound } from "next/navigation"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { prisma } from "@/lib/prisma"
import { AdminPageHeader } from "@/components/admin"
import { MeetingsClientView, type MeetingListItem } from "./MeetingsClientView"
import { COMMITTEE_ROLES } from "@/lib/auth/requireAuth"
import type { SocietyRole } from "@/generated/prisma/client"

export default async function SocietyMeetingsPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const context = await getSocietyAdmin(code)

  if (!context) {
    notFound()
  }

  const { society, designation, isSuperAdmin } = context
  const canManage = isSuperAdmin || COMMITTEE_ROLES.includes(designation as SocietyRole)

  const rawMeetings = await prisma.meeting.findMany({
    where: { societyId: society.id },
    include: {
      resolutions: true,
    },
    orderBy: { meetingDate: "desc" },
  })

  const now = new Date()

  const meetings: MeetingListItem[] = rawMeetings.map((m) => {
    const resolutionsCount = m.resolutions.length
    const passedResolutionsCount = m.resolutions.filter((r) => r.passed).length
    const isUpcoming = m.meetingDate.getTime() > now.getTime()

    return {
      id: m.id,
      title: m.title,
      meetingType: m.meetingType,
      meetingDate: m.meetingDate.toISOString(),
      venue: m.venue,
      agenda: m.agenda,
      quorumMet: m.quorumMet,
      attendeeCount: m.attendeeCount,
      hasMinutes: Boolean(m.minutesNotes && m.minutesNotes.trim().length > 0),
      resolutionsCount,
      passedResolutionsCount,
      isUpcoming,
    }
  })

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Governance & General Body"
        title="Meetings & Minutes (MOM)"
        description={`Statutory General Body (AGM/SGM) and Managing Committee meeting records, resolutions ledger, and attendance register for ${society.name}.`}
      />

      <MeetingsClientView
        societyCode={code}
        meetings={meetings}
        canManage={canManage}
      />
    </div>
  )
}
