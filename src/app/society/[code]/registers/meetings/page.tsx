import Link from "next/link"
import { notFound } from "next/navigation"
import { revalidatePath } from "next/cache"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { prisma } from "@/lib/prisma"
import { formatDateInAppTimeZone } from "@/lib/datetime"
import type { MeetingType } from "@/generated/prisma/client"

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

  const { society } = context

  const meetings = await prisma.meeting.findMany({
    where: { societyId: society.id },
    orderBy: { meetingDate: "desc" },
    include: {
      resolutions: true,
    },
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href={`/society/${code}/registers`}
              className="text-xs font-semibold text-stone-500 hover:text-stone-900 transition"
            >
              ← Statutory Registers
            </Link>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-stone-900 md:text-3xl">
            Meetings & Resolutions Register (Minutes Book)
          </h1>
          <p className="text-sm text-stone-500">
            Statutory records of AGM, SGM, and Managing Committee (MCM) meetings, attendance quorum, and formal resolutions for {society.name}.
          </p>
        </div>
      </div>

      {/* Record Meeting Form */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-stone-950 mb-1">
          + Record Minutes of Meeting
        </h2>
        <p className="text-xs text-stone-500 mb-5">
          Enter meeting details, quorum verification, attendee count, and passed resolutions.
        </p>

        <form action={recordMeeting} className="space-y-4">
          <input type="hidden" name="societyId" value={society.id} />
          <input type="hidden" name="code" value={code} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                Meeting Title *
              </label>
              <input
                type="text"
                name="title"
                required
                placeholder="e.g. 12th Annual General Body Meeting (AGM)"
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs font-bold text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                Meeting Type *
              </label>
              <select
                name="meetingType"
                defaultValue="MANAGING_COMMITTEE"
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
              >
                <option value="MANAGING_COMMITTEE">Managing Committee (MCM)</option>
                <option value="AGM">Annual General Meeting (AGM)</option>
                <option value="SGM">Special General Meeting (SGM)</option>
                <option value="EMERGENCY">Emergency Committee Meeting</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                Meeting Date & Time *
              </label>
              <input
                type="datetime-local"
                name="meetingDate"
                required
                defaultValue={new Date().toISOString().slice(0, 16)}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                Venue / Meeting Location
              </label>
              <input
                type="text"
                name="venue"
                placeholder="e.g. Society Clubhouse, Ground Floor / Zoom Online"
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                Attendee Count
              </label>
              <input
                type="number"
                name="attendeeCount"
                placeholder="e.g. 35 members"
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
              />
            </div>

            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 text-xs font-semibold text-stone-800 cursor-pointer">
                <input
                  type="checkbox"
                  name="quorumMet"
                  value="true"
                  defaultChecked
                  className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-950"
                />
                <span>Quorum Verified & Met</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                Meeting Agenda
              </label>
              <textarea
                name="agenda"
                rows={3}
                placeholder="1. Approval of previous minutes&#10;2. Audited financials review&#10;3. Lift modernization proposal"
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                Minutes Notes & Discussions
              </label>
              <textarea
                name="minutesNotes"
                rows={3}
                placeholder="Summary of key member discussions, points raised, and decisions taken..."
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
              />
            </div>
          </div>

          {/* Optional Resolution */}
          <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900">
              Attach Passed Resolution (Optional)
            </h3>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <input
                  type="text"
                  name="resolutionNumber"
                  placeholder="Resolution # (e.g. RES-2026-01)"
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs font-mono text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
                />
              </div>

              <div className="sm:col-span-2">
                <input
                  type="text"
                  name="resolutionTitle"
                  placeholder="Resolution Title (e.g. Approval of Building Exterior Painting Drive)"
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs font-semibold text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
                />
              </div>

              <div className="sm:col-span-3">
                <input
                  type="text"
                  name="resolutionDescription"
                  placeholder="Resolved that the society hereby approves the quotation of ₹12,00,000 for..."
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="rounded-xl bg-stone-950 px-6 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-stone-800"
            >
              Record Meeting Minutes
            </button>
          </div>
        </form>
      </div>

      {/* Meetings Table */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-stone-950">Recorded Meetings History</h2>

        {meetings.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center text-xs text-stone-500">
            No meeting minutes recorded yet. Record your first committee meeting or AGM above.
          </div>
        ) : (
          <div className="space-y-4">
            {meetings.map((m) => (
              <div
                key={m.id}
                className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-stone-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-stone-950 text-base">{m.title}</h3>
                      <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[10px] font-bold text-stone-700">
                        {m.meetingType.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {formatDateInAppTimeZone(m.meetingDate)} • {m.venue || "Venue not listed"}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    {m.attendeeCount ? (
                      <span className="font-semibold text-stone-800">
                        👥 {m.attendeeCount} Attendees
                      </span>
                    ) : null}
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        m.quorumMet
                          ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                          : "bg-rose-50 border border-rose-200 text-rose-700"
                      }`}
                    >
                      {m.quorumMet ? "Quorum Met ✓" : "Quorum Adjourned"}
                    </span>
                  </div>
                </div>

                {/* Agenda & Minutes */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
                  {m.agenda ? (
                    <div className="rounded-xl bg-stone-50 p-3.5 space-y-1">
                      <p className="font-bold uppercase tracking-wider text-stone-500 text-[10px]">Agenda</p>
                      <p className="text-stone-800 whitespace-pre-line">{m.agenda}</p>
                    </div>
                  ) : null}

                  {m.minutesNotes ? (
                    <div className="rounded-xl bg-stone-50 p-3.5 space-y-1">
                      <p className="font-bold uppercase tracking-wider text-stone-500 text-[10px]">Minutes Notes</p>
                      <p className="text-stone-800 whitespace-pre-line">{m.minutesNotes}</p>
                    </div>
                  ) : null}
                </div>

                {/* Resolutions */}
                {m.resolutions.length > 0 ? (
                  <div className="border-t border-stone-100 pt-3 space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-600">
                      Passed Resolutions ({m.resolutions.length})
                    </p>
                    {m.resolutions.map((r) => (
                      <div
                        key={r.id}
                        className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-stone-900">
                            {r.resolutionNumber ? `${r.resolutionNumber}: ` : ""}
                            {r.title}
                          </span>
                          <span className="rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5">
                            PASSED
                          </span>
                        </div>
                        <p className="text-stone-700">{r.description}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

import { requireCommitteeAccess, COMMITTEE_ROLES } from "@/lib/auth/requireAuth"
import { recordAuditLog } from "@/lib/audit"
import { sanitizeText } from "@/lib/sanitize"

async function recordMeeting(formData: FormData) {
  "use server"

  const code = formData.get("code")?.toString().trim()
  if (!code) throw new Error("Society code is required")

  const authContext = await requireCommitteeAccess(code, COMMITTEE_ROLES)
  const verifiedSocietyId = authContext.society.id

  const title = sanitizeText(formData.get("title")?.toString())
  const meetingType = formData.get("meetingType")?.toString().trim() || "MANAGING_COMMITTEE"
  const meetingDateStr = formData.get("meetingDate")?.toString().trim()
  const venue = formData.get("venue") ? sanitizeText(formData.get("venue")?.toString()) : null
  const rawAttendees = formData.get("attendeeCount")?.toString().trim()
  const quorumMet = formData.get("quorumMet") === "true"
  const agenda = formData.get("agenda") ? sanitizeText(formData.get("agenda")?.toString()) : null
  const minutesNotes = formData.get("minutesNotes") ? sanitizeText(formData.get("minutesNotes")?.toString()) : null

  const resolutionNumber = formData.get("resolutionNumber")?.toString().trim() || null
  const resolutionTitle = formData.get("resolutionTitle") ? sanitizeText(formData.get("resolutionTitle")?.toString()) : null
  const resolutionDescription = formData.get("resolutionDescription") ? sanitizeText(formData.get("resolutionDescription")?.toString()) : null


  if (!title || !meetingDateStr) {
    throw new Error("Meeting title and date are required")
  }

  const attendeeCount = rawAttendees ? parseInt(rawAttendees, 10) : null

  await prisma.$transaction(async (tx) => {
    const meeting = await tx.meeting.create({
      data: {
        societyId: verifiedSocietyId,
        title,
        meetingType: meetingType as MeetingType,
        meetingDate: new Date(meetingDateStr),
        venue,
        attendeeCount: !isNaN(Number(attendeeCount)) ? attendeeCount : null,
        quorumMet,
        agenda,
        minutesNotes,
      },
    })

    if (resolutionTitle && resolutionDescription) {
      await tx.resolution.create({
        data: {
          meetingId: meeting.id,
          resolutionNumber,
          title: resolutionTitle,
          description: resolutionDescription,
          passed: true,
        },
      })
    }

    await recordAuditLog({
      societyId: verifiedSocietyId,
      userId: authContext.user.id,
      action: "CREATE",
      entity: "Meeting",
      entityId: meeting.id,
      description: `${authContext.user.email} recorded statutory meeting: ${title} (${meetingType})`,
      newData: { title, meetingType, meetingDate: meetingDateStr, quorumMet },
    })
  })

  revalidatePath(`/society/${code}/registers/meetings`)
  revalidatePath(`/society/${code}/registers`)
  revalidatePath("/admin/registers")
}

