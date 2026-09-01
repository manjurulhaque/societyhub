"use client"

import { toast } from "sonner"

import { useState, useTransition } from "react"
import { AdminModal } from "@/components/admin"
import { createResolution } from "../actions"

interface AddResolutionModalProps {
  isOpen: boolean
  onClose: () => void
  societyCode: string
  meetingId: string
}

export function AddResolutionModal({
  isOpen,
  onClose,
  societyCode,
  meetingId,
}: AddResolutionModalProps) {
  const [resolutionNumber, setResolutionNumber] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [proposedBy, setProposedBy] = useState("")
  const [secondedBy, setSecondedBy] = useState("")
  const [passed, setPassed] = useState(true)
  const [passedUnanimously, setPassedUnanimously] = useState(false)
  const [votesInFavor, setVotesInFavor] = useState("")
  const [votesAgainst, setVotesAgainst] = useState("")

  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim() || !description.trim()) {
      setError("Please provide resolution title and full text description.")
      return
    }

    startTransition(async () => {
      try {
        const inFavorNum = votesInFavor.trim() ? parseInt(votesInFavor) : null
        const againstNum = votesAgainst.trim() ? parseInt(votesAgainst) : null

        const res = await createResolution(societyCode, meetingId, {
          resolutionNumber: resolutionNumber || null,
          title,
          description,
          proposedBy: proposedBy || null,
          secondedBy: secondedBy || null,
          passed,
          passedUnanimously,
          votesInFavor: inFavorNum,
          votesAgainst: againstNum,
        })

        if (res.error) {
          setError(res.error)
        } else {
          toast.success("Resolution added successfully")
          onClose()
          setResolutionNumber("")
          setTitle("")
          setDescription("")
          setProposedBy("")
          setSecondedBy("")
          setPassed(true)
          setPassedUnanimously(false)
          setVotesInFavor("")
          setVotesAgainst("")
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to record resolution."
        setError(msg)
      }
    })
  }

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Formal Meeting Resolution"
      description="Add a statutory resolution passed or deliberated in this meeting."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Resolution Number */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Resolution Reference No.</label>
            <input
              type="text"
              value={resolutionNumber}
              onChange={(e) => setResolutionNumber(e.target.value)}
              placeholder="e.g. RES/2026/01 or Item #3"
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
            />
          </div>

          {/* Title */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Resolution Subject / Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Approval of Exterior Painting Contract to Apex Infra"
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
            />
          </div>

          {/* Full Resolution Description */}
          <div className="sm:col-span-2 space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Full Resolution Text / Deliberation *</label>
            <textarea
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="RESOLVED THAT the Managing Committee is hereby authorized to award the exterior painting and terrace waterproofing contract to M/s Apex Infra at an agreed sum of ₹15,00,000..."
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none resize-none font-mono"
            />
          </div>

          {/* Proposer */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Proposed By</label>
            <input
              type="text"
              value={proposedBy}
              onChange={(e) => setProposedBy(e.target.value)}
              placeholder="e.g. Rajesh Sharma (Secretary)"
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
            />
          </div>

          {/* Seconder */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Seconded By</label>
            <input
              type="text"
              value={secondedBy}
              onChange={(e) => setSecondedBy(e.target.value)}
              placeholder="e.g. Meera Patel (Treasurer)"
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
            />
          </div>

          {/* Voting Result */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Voting Outcome</label>
            <select
              value={passed ? "PASSED" : "REJECTED"}
              onChange={(e) => setPassed(e.target.value === "PASSED")}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none font-semibold"
            >
              <option value="PASSED">PASSED / ADOPTED</option>
              <option value="REJECTED">REJECTED / DEFEATED</option>
            </select>
          </div>

          {/* Votes Count */}
          <div className="space-y-1">
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <label className="text-[11px] font-semibold text-stone-700">Votes in Favor</label>
                <input
                  type="number"
                  min="0"
                  value={votesInFavor}
                  onChange={(e) => setVotesInFavor(e.target.value)}
                  placeholder="e.g. 42"
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none font-mono"
                />
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-[11px] font-semibold text-stone-700">Votes Against</label>
                <input
                  type="number"
                  min="0"
                  value={votesAgainst}
                  onChange={(e) => setVotesAgainst(e.target.value)}
                  placeholder="e.g. 2"
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="unanimousCheck"
            checked={passedUnanimously}
            onChange={(e) => setPassedUnanimously(e.target.checked)}
            className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
          />
          <label htmlFor="unanimousCheck" className="text-xs font-semibold text-stone-800 cursor-pointer">
            Passed Unanimously with 100% member consensus
          </label>
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
            disabled={isPending || !title.trim() || !description.trim()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition disabled:opacity-50"
          >
            {isPending ? "Recording..." : "Record Resolution"}
          </button>
        </div>
      </form>
    </AdminModal>
  )
}
