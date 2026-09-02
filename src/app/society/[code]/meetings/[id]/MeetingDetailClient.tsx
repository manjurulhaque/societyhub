"use client"

import { useState, useTransition } from "react"
import { AdminCard, AdminBadge } from "@/components/admin"
import { AddResolutionModal } from "./AddResolutionModal"
import { updateMeeting, deleteResolution } from "../actions"
import { formatDateInAppTimeZone } from "@/lib/datetime"
import type { MeetingType } from "@/generated/prisma/client"

export type ResolutionItem = {
  id: string
  resolutionNumber: string | null
  title: string
  description: string
  proposedBy: string | null
  secondedBy: string | null
  passed: boolean
  passedUnanimously: boolean
  votesInFavor: number | null
  votesAgainst: number | null
  createdAt: string
}

export type MeetingDetailData = {
  id: string
  title: string
  meetingType: MeetingType
  meetingDate: string
  venue: string | null
  agenda: string | null
  quorumMet: boolean
  attendeeCount: number | null
  minutesNotes: string | null
  resolutions: ResolutionItem[]
}

interface MeetingDetailClientProps {
  societyCode: string
  meeting: MeetingDetailData
  canManage: boolean
}

export function MeetingDetailClient({
  societyCode,
  meeting,
  canManage,
}: MeetingDetailClientProps) {
  const [isAddResolutionOpen, setIsAddResolutionOpen] = useState(false)
  const [minutesText, setMinutesText] = useState(meeting.minutesNotes || "")
  const [quorumMet, setQuorumMet] = useState(meeting.quorumMet)
  const [attendeeCount, setAttendeeCount] = useState(
    meeting.attendeeCount !== null ? meeting.attendeeCount.toString() : ""
  )
  const [venue, setVenue] = useState(meeting.venue || "")
  const [agenda, setAgenda] = useState(meeting.agenda || "")

  const [isPending, startTransition] = useTransition()
  const [saveSuccess, setSaveSuccess] = useState(false)

  const handleSaveMinutes = (e: React.FormEvent) => {
    e.preventDefault()
    setSaveSuccess(false)

    startTransition(async () => {
      const countNum = attendeeCount.trim() ? parseInt(attendeeCount) : null
      await updateMeeting(societyCode, meeting.id, {
        minutesNotes: minutesText,
        quorumMet,
        attendeeCount: countNum,
        venue,
        agenda,
      })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    })
  }

  const handleDeleteResolution = (resId: string) => {
    if (!confirm("Are you sure you want to delete this resolution?")) return
    startTransition(async () => {
      await deleteResolution(societyCode, resId, meeting.id)
    })
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AdminBadge
            variant={
              meeting.meetingType === "AGM"
                ? "purple"
                : meeting.meetingType === "SGM"
                  ? "warning"
                  : meeting.meetingType === "EXECUTIVE_COMMITTEE"
                    ? "neutral"
                    : meeting.meetingType === "EMERGENCY"
                      ? "danger"
                      : "info"
            }
            size="md"
          >
            {meeting.meetingType === "EXECUTIVE_COMMITTEE" ? "Executive Committee Meeting" : meeting.meetingType.replace(/_/g, " ")}
          </AdminBadge>
          <AdminBadge variant={quorumMet ? "success" : "danger"} size="md" dot>
            {quorumMet ? "Quorum Formed" : "Quorum Adjourned"}
          </AdminBadge>
        </div>

        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition shadow-xs"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          <span>Print / Export MOM</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Meeting Details & Quorum (1 col) */}
        <div className="space-y-6 lg:col-span-1">
          <AdminCard
            title="Meeting Logistics & Quorum"
            description="Statutory session parameters and attendance"
          >
            <form onSubmit={handleSaveMinutes} className="space-y-3.5 text-xs pt-1">
              <div>
                <label className="text-stone-400 font-medium block">Scheduled Date & Time</label>
                <div className="font-semibold text-stone-900 mt-0.5">
                  {formatDateInAppTimeZone(meeting.meetingDate)}
                </div>
              </div>

              <div>
                <label className="text-stone-400 font-medium block">Venue / Mode</label>
                {canManage ? (
                  <input
                    type="text"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    placeholder="e.g. Clubhouse Banquet Hall"
                    className="w-full mt-1 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
                  />
                ) : (
                  <div className="text-stone-800 mt-0.5">{meeting.venue || "—"}</div>
                )}
              </div>

              <div>
                <label className="text-stone-400 font-medium block">Recorded Attendee Count</label>
                {canManage ? (
                  <input
                    type="number"
                    min="0"
                    value={attendeeCount}
                    onChange={(e) => setAttendeeCount(e.target.value)}
                    placeholder="e.g. 48 members"
                    className="w-full mt-1 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-900 focus:border-stone-900 focus:outline-none font-mono"
                  />
                ) : (
                  <div className="font-mono font-semibold text-stone-900 mt-0.5">
                    {meeting.attendeeCount !== null ? `${meeting.attendeeCount} members present` : "Not recorded"}
                  </div>
                )}
              </div>

              {canManage && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="quorumCheck"
                    checked={quorumMet}
                    onChange={(e) => setQuorumMet(e.target.checked)}
                    className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
                  />
                  <label htmlFor="quorumCheck" className="text-xs font-semibold text-stone-800 cursor-pointer">
                    Statutory Quorum Met
                  </label>
                </div>
              )}

              <div>
                <label className="text-stone-400 font-medium block">Circulated Agenda Points</label>
                {canManage ? (
                  <textarea
                    rows={4}
                    value={agenda}
                    onChange={(e) => setAgenda(e.target.value)}
                    placeholder="Agenda items..."
                    className="w-full mt-1 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-900 focus:border-stone-900 focus:outline-none resize-none font-mono"
                  />
                ) : (
                  <div className="text-stone-700 mt-1 whitespace-pre-wrap font-mono text-[11px] bg-stone-50 p-2 rounded-xl">
                    {meeting.agenda || "No agenda attached"}
                  </div>
                )}
              </div>

              {canManage && (
                <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                  {saveSuccess ? (
                    <span className="text-xs font-semibold text-emerald-600">✓ Saved!</span>
                  ) : <span />}
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-xl bg-stone-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-stone-800 transition disabled:opacity-50"
                  >
                    {isPending ? "Saving..." : "Save Parameters"}
                  </button>
                </div>
              )}
            </form>
          </AdminCard>
        </div>

        {/* Right Column: Minutes & Resolutions Ledger (2 cols) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Minutes of Meeting (MOM) Notes */}
          <AdminCard
            title="Minutes of Meeting (MOM)"
            description="Formal proceedings, officer remarks, discussions, and secretary notes"
          >
            {canManage ? (
              <form onSubmit={handleSaveMinutes} className="space-y-3 pt-1">
                <textarea
                  rows={8}
                  value={minutesText}
                  onChange={(e) => setMinutesText(e.target.value)}
                  placeholder="Record full proceedings of the meeting...&#10;&#10;1. Chairman welcomed all members and called the meeting to order at 10:30 AM.&#10;2. The Secretary read the minutes of the previous AGM which were confirmed unanimously.&#10;3. The Treasurer presented the audited financial statements for FY 2025-26..."
                  className="w-full rounded-2xl border border-stone-200 bg-stone-50/50 p-3.5 text-xs leading-relaxed text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none resize-y font-mono"
                />

                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-stone-400">
                    Supports multiline notes, action items, and chairman closing remarks.
                  </span>

                  <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition disabled:opacity-50"
                  >
                    {isPending ? "Saving Minutes..." : "Save Minutes of Meeting"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="whitespace-pre-wrap text-xs text-stone-800 leading-relaxed bg-stone-50/70 p-4 rounded-2xl border border-stone-100 font-mono">
                {meeting.minutesNotes || "Minutes have not been recorded for this meeting yet."}
              </div>
            )}
          </AdminCard>

          {/* Resolutions Passed Ledger */}
          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Statutory Register</span>
                <h3 className="text-base font-bold text-stone-950">Resolutions Ledger</h3>
                <p className="text-xs text-stone-500">
                  Decisions, tenders approved, bylaw amendments, and special assessment resolutions voted upon in this session.
                </p>
              </div>

              {canManage && (
                <button
                  type="button"
                  onClick={() => setIsAddResolutionOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition"
                >
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                  </svg>
                  <span>+ Record Resolution</span>
                </button>
              )}
            </div>

            {meeting.resolutions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 p-8 text-center">
                <p className="text-xs text-stone-500">No formal resolutions recorded for this meeting yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {meeting.resolutions.map((res, idx) => (
                  <div
                    key={res.id}
                    className={`rounded-2xl border p-4 text-xs transition ${
                      res.passed
                        ? "border-emerald-200 bg-emerald-50/20"
                        : "border-red-200 bg-red-50/20"
                    }`}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-stone-100 pb-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[10px] font-bold uppercase text-stone-700 bg-stone-100 px-2 py-0.5 rounded">
                          {res.resolutionNumber || `Res #${idx + 1}`}
                        </span>
                        <AdminBadge variant={res.passed ? "success" : "danger"} size="sm">
                          {res.passed ? (res.passedUnanimously ? "PASSED UNANIMOUSLY" : "PASSED") : "REJECTED"}
                        </AdminBadge>
                        <h4 className="font-bold text-stone-950 text-sm">{res.title}</h4>
                      </div>

                      {canManage && (
                        <button
                          type="button"
                          onClick={() => handleDeleteResolution(res.id)}
                          className="text-[11px] text-stone-400 hover:text-red-600 transition"
                        >
                          Delete
                        </button>
                      )}
                    </div>

                    <p className="mt-2.5 text-stone-700 leading-relaxed font-mono text-[11px] whitespace-pre-wrap">
                      {res.description}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center justify-between border-t border-stone-100 pt-2.5 text-[11px] text-stone-500">
                      <div className="flex gap-4">
                        {res.proposedBy && <span>Proposed by: <strong className="text-stone-800">{res.proposedBy}</strong></span>}
                        {res.secondedBy && <span>Seconded by: <strong className="text-stone-800">{res.secondedBy}</strong></span>}
                      </div>

                      <div className="font-mono">
                        {res.votesInFavor !== null && (
                          <span className="text-emerald-700 font-semibold mr-3">
                            In Favor: {res.votesInFavor}
                          </span>
                        )}
                        {res.votesAgainst !== null && (
                          <span className="text-red-700 font-semibold">
                            Against: {res.votesAgainst}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Resolution Modal */}
      <AddResolutionModal
        isOpen={isAddResolutionOpen}
        onClose={() => setIsAddResolutionOpen(false)}
        societyCode={societyCode}
        meetingId={meeting.id}
      />
    </div>
  )
}
