import Link from "next/link"
import { notFound } from "next/navigation"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { prisma } from "@/lib/prisma"
import { AdminBadge } from "@/components/admin"
import { MeetingDetailClient, type ResolutionItem } from "./MeetingDetailClient"
import { formatDateInAppTimeZone } from "@/lib/datetime"
import { COMMITTEE_ROLES } from "@/lib/auth/requireAuth"
import type { SocietyRole } from "@/generated/prisma/client"

export default async function SocietyMeetingDetailPage({
  params,
}: {
  params: Promise<{ code: string; id: string }>
}) {
  const { code, id } = await params
  const context = await getSocietyAdmin(code)

  if (!context) {
    notFound()
  }

  const { society, designation, isSuperAdmin } = context
  const canManage = isSuperAdmin || COMMITTEE_ROLES.includes(designation as SocietyRole)

  const meeting = await prisma.meeting.findFirst({
    where: {
      id,
      societyId: society.id,
    },
    include: {
      resolutions: {
        orderBy: { createdAt: "asc" },
      },
    },
  })

  if (!meeting) {
    notFound()
  }

  const resolutions: ResolutionItem[] = meeting.resolutions.map((r) => ({
    id: r.id,
    resolutionNumber: r.resolutionNumber,
    title: r.title,
    description: r.description,
    proposedBy: r.proposedBy,
    secondedBy: r.secondedBy,
    passed: r.passed,
    passedUnanimously: r.passedUnanimously,
    votesInFavor: r.votesInFavor,
    votesAgainst: r.votesAgainst,
    createdAt: r.createdAt.toISOString(),
  }))

  return (
    <div className="space-y-6">
      {/* Back Link & Header */}
      <div>
        <Link
          href={`/society/${code}/meetings`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900 transition mb-3"
        >
          <span>←</span>
          <span>Back to Meetings Register</span>
        </Link>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                {formatDateInAppTimeZone(meeting.meetingDate)}
              </span>
              <AdminBadge
                variant={
                  meeting.meetingType === "AGM"
                    ? "purple"
                    : meeting.meetingType === "SGM"
                      ? "warning"
                      : "info"
                }
                size="sm"
              >
                {meeting.meetingType.replace(/_/g, " ")}
              </AdminBadge>
              {meeting.venue && (
                <span className="text-xs text-stone-600 font-medium">
                  📍 {meeting.venue}
                </span>
              )}
            </div>

            <h1 className="text-xl font-bold tracking-tight text-stone-950 sm:text-2xl">
              {meeting.title}
            </h1>
          </div>
        </div>
      </div>

      {/* Meeting Detail Client Component */}
      <MeetingDetailClient
        societyCode={code}
        meeting={{
          id: meeting.id,
          title: meeting.title,
          meetingType: meeting.meetingType,
          meetingDate: meeting.meetingDate.toISOString(),
          venue: meeting.venue,
          agenda: meeting.agenda,
          quorumMet: meeting.quorumMet,
          attendeeCount: meeting.attendeeCount,
          minutesNotes: meeting.minutesNotes,
          resolutions,
        }}
        canManage={canManage}
      />
    </div>
  )
}
