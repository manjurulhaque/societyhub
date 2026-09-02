"use client"

import { toast } from "sonner"

import { useState, useTransition } from "react"
import { AdminModal } from "@/components/admin"
import { createMeeting } from "./actions"
import type { MeetingType } from "@/generated/prisma/client"

interface CreateMeetingModalProps {
  isOpen: boolean
  onClose: () => void
  societyCode: string
}

export function CreateMeetingModal({
  isOpen,
  onClose,
  societyCode,
}: CreateMeetingModalProps) {
  const [title, setTitle] = useState("")
  const [meetingType, setMeetingType] = useState<MeetingType>("MANAGING_COMMITTEE")
  const [meetingDate, setMeetingDate] = useState("")
  const [venue, setVenue] = useState("")
  const [agenda, setAgenda] = useState("")

  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError("Please enter a meeting title.")
      return
    }

    if (!meetingDate) {
      setError("Please specify the scheduled date and time.")
      return
    }

    startTransition(async () => {
      try {
        const res = await createMeeting(societyCode, {
          title,
          meetingType,
          meetingDate,
          venue: venue || null,
          agenda: agenda || null,
        })

        if (res.error) {
          setError(res.error)
        } else {
          toast.success("Meeting scheduled successfully")
          onClose()
          setTitle("")
          setMeetingType("MANAGING_COMMITTEE")
          setMeetingDate("")
          setVenue("")
          setAgenda("")
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to schedule meeting."
        setError(msg)
      }
    })
  }

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title="Schedule General Body / Committee Meeting"
      description="Record an upcoming AGM, SGM, Managing Committee, Executive Committee, or Emergency meeting."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Title */}
          <div className="sm:col-span-2 space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Meeting Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 14th Annual General Body Meeting (AGM) 2026"
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
            />
          </div>

          {/* Meeting Type */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Meeting Classification *</label>
            <select
              value={meetingType}
              onChange={(e) => setMeetingType(e.target.value as MeetingType)}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
            >
              <option value="MANAGING_COMMITTEE">Managing Committee Meeting (MCM)</option>
              <option value="EXECUTIVE_COMMITTEE">Executive Committee Meeting (ECM)</option>
              <option value="AGM">Annual General Meeting (AGM)</option>
              <option value="SGM">Special General Meeting (SGM / EGM)</option>
              <option value="EMERGENCY">Emergency Executive Meeting</option>
            </select>
          </div>

          {/* Meeting Date and Time */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Date & Time *</label>
            <input
              type="datetime-local"
              required
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
            />
          </div>

          {/* Venue */}
          <div className="sm:col-span-2 space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Meeting Venue / Location</label>
            <input
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="e.g. Clubhouse Main Banquet Hall / Google Meet link"
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
            />
          </div>

          {/* Agenda */}
          <div className="sm:col-span-2 space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Agenda Points</label>
            <textarea
              rows={3}
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              placeholder="1. Review of annual audit report&#10;2. Approval of building painting special assessment&#10;3. Election of committee office bearers"
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none resize-none font-mono"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending || !title.trim() || !meetingDate}
            className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition disabled:opacity-50"
          >
            {isPending ? "Scheduling..." : "Schedule Meeting"}
          </button>
        </div>
      </form>
    </AdminModal>
  )
}
