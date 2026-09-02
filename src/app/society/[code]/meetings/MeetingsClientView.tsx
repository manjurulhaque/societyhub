"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { AdminStatCard, AdminBadge, AdminTable } from "@/components/admin"
import { CreateMeetingModal } from "./CreateMeetingModal"
import { formatDateInAppTimeZone } from "@/lib/datetime"
import type { MeetingType } from "@/generated/prisma/client"

export type MeetingListItem = {
  id: string
  title: string
  meetingType: MeetingType
  meetingDate: string
  venue: string | null
  agenda: string | null
  quorumMet: boolean
  attendeeCount: number | null
  hasMinutes: boolean
  resolutionsCount: number
  passedResolutionsCount: number
  isUpcoming: boolean
}

interface MeetingsClientViewProps {
  societyCode: string
  meetings: MeetingListItem[]
  canManage: boolean
}

export function MeetingsClientView({
  societyCode,
  meetings,
  canManage,
}: MeetingsClientViewProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedType, setSelectedType] = useState<string>("ALL")

  // Statistics
  const totalMeetings = meetings.length
  const totalResolutions = meetings.reduce((sum, m) => sum + m.resolutionsCount, 0)
  const passedResolutions = meetings.reduce((sum, m) => sum + m.passedResolutionsCount, 0)
  const pastMeetings = meetings.filter((m) => !m.isUpcoming)
  const quorumMetCount = pastMeetings.filter((m) => m.quorumMet).length
  const quorumRate = pastMeetings.length > 0 ? Math.round((quorumMetCount / pastMeetings.length) * 100) : 100
  const upcomingCount = meetings.filter((m) => m.isUpcoming).length

  const filteredMeetings = useMemo(() => {
    return meetings.filter((m) => {
      if (selectedType !== "ALL" && m.meetingType !== selectedType) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          m.title.toLowerCase().includes(q) ||
          (m.venue || "").toLowerCase().includes(q) ||
          (m.agenda || "").toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [meetings, selectedType, searchQuery])

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          title="Meetings Conducted"
          value={totalMeetings}
          subtitle={`${upcomingCount} upcoming scheduled`}
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Resolutions Passed"
          value={`${passedResolutions} / ${totalResolutions}`}
          subtitle="Formal statutory decisions enacted"
          icon={
            <svg className="h-5 w-5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Quorum Adherence"
          value={`${quorumRate}%`}
          subtitle={`${quorumMetCount} of ${pastMeetings.length} meetings met quorum`}
          icon={
            <svg className="h-5 w-5 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Upcoming Agenda"
          value={upcomingCount}
          subtitle="Notice & agenda dispatched"
          icon={
            <svg className="h-5 w-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search meetings by title, agenda..."
              className="w-56 sm:w-64 rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2 pl-9 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none"
            />
            <svg
              className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-stone-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-700 focus:border-stone-900 focus:outline-none"
          >
            <option value="ALL">All Meeting Types</option>
            <option value="AGM">Annual General Meeting (AGM)</option>
            <option value="SGM">Special General Meeting (SGM)</option>
            <option value="MANAGING_COMMITTEE">Managing Committee (MCM)</option>
            <option value="EXECUTIVE_COMMITTEE">Executive Committee (ECM)</option>
            <option value="EMERGENCY">Emergency Executive</option>
          </select>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            <span>+ Schedule Meeting</span>
          </button>
        )}
      </div>

      {/* Meetings Table */}
      {filteredMeetings.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-200 bg-white p-12 text-center shadow-xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-400">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="mt-3 text-sm font-semibold text-stone-900">No meetings recorded</h3>
          <p className="mt-1 text-xs text-stone-500">
            Record upcoming or past General Body (AGM/SGM) and Managing Committee meetings.
          </p>
          {canManage && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition"
              >
                + Schedule First Meeting
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs">
          <AdminTable
            headers={[
              "Date & Time",
              "Meeting Type",
              "Meeting Title",
              "Venue / Location",
              "Quorum Status",
              "Resolutions",
              "Minutes (MOM)",
              "Action",
            ]}
            rows={filteredMeetings.map((m) => (
              <tr key={m.id} className="border-t border-stone-100 text-xs hover:bg-stone-50/60 transition">
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <span className="font-bold text-stone-950 block">
                    {formatDateInAppTimeZone(m.meetingDate)}
                  </span>
                  {m.isUpcoming ? (
                    <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 rounded px-1.5 py-0.2">
                      Upcoming
                    </span>
                  ) : (
                    <span className="text-[10px] text-stone-400">Concluded</span>
                  )}
                </td>

                <td className="px-4 py-3.5">
                  <AdminBadge
                    variant={
                      m.meetingType === "AGM"
                        ? "purple"
                        : m.meetingType === "SGM"
                          ? "warning"
                          : m.meetingType === "EXECUTIVE_COMMITTEE"
                            ? "neutral"
                            : m.meetingType === "EMERGENCY"
                              ? "danger"
                              : "info"
                    }
                    size="sm"
                  >
                    {m.meetingType === "EXECUTIVE_COMMITTEE" ? "Executive Committee" : m.meetingType.replace(/_/g, " ")}
                  </AdminBadge>
                </td>

                <td className="px-4 py-3.5 font-bold text-stone-900">
                  <Link
                    href={`/society/${societyCode}/meetings/${m.id}`}
                    className="hover:text-blue-600 transition block"
                  >
                    {m.title}
                  </Link>
                  {m.agenda && (
                    <span className="text-[11px] text-stone-400 font-normal line-clamp-1 block mt-0.5">
                      {m.agenda}
                    </span>
                  )}
                </td>

                <td className="px-4 py-3.5 text-stone-600">
                  {m.venue || "—"}
                </td>

                <td className="px-4 py-3.5">
                  <AdminBadge variant={m.quorumMet ? "success" : "danger"} size="sm" dot>
                    {m.quorumMet ? "Quorum Met" : "Quorum Adjourned"}
                  </AdminBadge>
                  {m.attendeeCount !== null && (
                    <span className="text-[10px] text-stone-400 block mt-0.5">
                      {m.attendeeCount} attendees
                    </span>
                  )}
                </td>

                <td className="px-4 py-3.5 font-mono text-stone-700">
                  {m.resolutionsCount > 0 ? (
                    <span className="font-semibold text-emerald-700">
                      {m.passedResolutionsCount} Passed ({m.resolutionsCount} total)
                    </span>
                  ) : (
                    <span className="text-stone-400">0</span>
                  )}
                </td>

                <td className="px-4 py-3.5">
                  {m.hasMinutes ? (
                    <AdminBadge variant="success" size="sm">
                      MOM Recorded
                    </AdminBadge>
                  ) : (
                    <span className="text-stone-400 italic">Pending MOM</span>
                  )}
                </td>

                <td className="px-4 py-3.5 text-right whitespace-nowrap">
                  <Link
                    href={`/society/${societyCode}/meetings/${m.id}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition"
                  >
                    <span>Open Console</span>
                    <span>→</span>
                  </Link>
                </td>
              </tr>
            ))}
          />
        </div>
      )}

      {/* Create Modal */}
      <CreateMeetingModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        societyCode={societyCode}
      />
    </div>
  )
}
