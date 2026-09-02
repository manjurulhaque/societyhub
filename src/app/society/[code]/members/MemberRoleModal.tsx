"use client"

import { toast } from "sonner"

import { useState, useTransition, useMemo } from "react"
import { addCommitteeMember, updateMemberRoleAssignment } from "../roles/actions"
import { type ResidentItem } from "./ResidentsDirectoryClient"
import type { SocietyRole } from "@/generated/prisma/client"

export type MemberData = {
  id?: string
  email: string
  name?: string | null
  designation: SocietyRole
  customRoleIds: string[]
}

export type AvailableRole = {
  id: string
  name: string
  description?: string | null
  isSystem: boolean
  permissionCount: number
}

interface MemberRoleModalProps {
  isOpen: boolean
  onClose: () => void
  societyCode: string
  member: MemberData | null
  availableRoles: AvailableRole[]
  residents?: ResidentItem[]
  existingMembers?: { id: string; email: string }[]
}

const DESIGNATION_OPTIONS: { value: SocietyRole; label: string; badge: string; desc: string }[] = [
  { value: "PRESIDENT", label: "President", badge: "Executive", desc: "Highest executive authority with full oversight" },
  { value: "VICE_PRESIDENT", label: "Vice President", badge: "Officer", desc: "Executive deputy officer" },
  { value: "SECRETARY", label: "Secretary", badge: "Executive", desc: "General administration, meetings & statutory registers" },
  { value: "JOINT_SECRETARY", label: "Joint Secretary", badge: "Officer", desc: "Administrative deputy officer" },
  { value: "TREASURER", label: "Treasurer", badge: "Executive", desc: "Financial controller & accounts oversight" },
  { value: "MANAGER", label: "Manager / Estate Officer", badge: "Operations", desc: "Day-to-day property maintenance and collections" },
  { value: "ACCOUNTANT", label: "Accountant", badge: "Operations", desc: "Bookkeeper for vouchers, bills, and ledgers" },
  { value: "SECURITY", label: "Security Guard / Incharge", badge: "Staff", desc: "Gatekeeping & facility access check" },
  { value: "MEMBER", label: "Management Committee Member", badge: "Committee", desc: "Elected management committee member" },
  { value: "EXECUTIVE_MEMBER", label: "Executive Committee Member", badge: "Executive", desc: "Appointed executive committee member" },
]

export function MemberRoleModal({
  isOpen,
  onClose,
  societyCode,
  member,
  availableRoles,
  residents = [],
  existingMembers = [],
}: MemberRoleModalProps) {
  const isEditing = Boolean(member?.id)

  // Modes: "RESIDENT" (pick from directory) or "EXTERNAL" (enter custom email/staff)
  const [sourceMode, setSourceMode] = useState<"RESIDENT" | "EXTERNAL">(
    residents.length > 0 ? "RESIDENT" : "EXTERNAL"
  )

  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [manualEmail, setManualEmail] = useState(member?.email || "")
  const [residentEmailInput, setResidentEmailInput] = useState("")

  const [designation, setDesignation] = useState<SocietyRole>(member?.designation || "MEMBER")
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(
    () => new Set(member?.customRoleIds || [])
  )
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [createdSetupLink, setCreatedSetupLink] = useState<{ email: string; link: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const existingEmailSet = useMemo(() => {
    return new Set(existingMembers.map((m) => m.email.toLowerCase().trim()))
  }, [existingMembers])

  const selectedResident = useMemo(() => {
    return residents.find((r) => r.id === selectedResidentId) || null
  }, [residents, selectedResidentId])

  // Filter residents by search query
  const filteredResidents = useMemo(() => {
    if (!searchQuery.trim()) return residents

    const q = searchQuery.toLowerCase().trim()
    return residents.filter((r) => {
      const matchName = r.name.toLowerCase().includes(q)
      const matchEmail = r.email?.toLowerCase().includes(q) || false
      const matchPhone = r.phone?.includes(q) || false
      const matchFlats = r.flatsDisplay.toLowerCase().includes(q)
      return matchName || matchEmail || matchPhone || matchFlats
    })
  }, [residents, searchQuery])

  const toggleRole = (roleId: string) => {
    setSelectedRoleIds((prev) => {
      const next = new Set(prev)
      if (next.has(roleId)) {
        next.delete(roleId)
      } else {
        next.add(roleId)
      }
      return next
    })
  }

  const handleSelectResident = (res: ResidentItem) => {
    setSelectedResidentId(res.id)
    if (res.email) {
      setResidentEmailInput(res.email)
    } else {
      setResidentEmailInput("")
    }
    setError(null)
  }

  const handleCopyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Fallback
    }
  }

  const handleSave = () => {
    setError(null)

    if (isEditing && member?.id) {
      startTransition(async () => {
        try {
          const res = await updateMemberRoleAssignment(societyCode, member.id!, {
            designation,
            customRoleIds: Array.from(selectedRoleIds),
          })

          if (res.error) {
            setError(res.error)
          } else {
            toast.success("Role updated successfully")
            onClose()
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "An unexpected error occurred."
          setError(msg)
        }
      })
      return
    }

    // Creating new committee member
    let targetEmail = ""
    let personId: string | null = null

    if (sourceMode === "RESIDENT") {
      if (!selectedResident) {
        setError("Please select a resident from the directory.")
        return
      }

      const emailCandidate = selectedResident.email || residentEmailInput.trim()
      if (!emailCandidate) {
        setError("Please enter an email address for this resident to create their login account.")
        return
      }

      targetEmail = emailCandidate
      personId = selectedResident.id
    } else {
      targetEmail = manualEmail.trim()
      if (!targetEmail) {
        setError("Please enter a valid user email.")
        return
      }
    }

    startTransition(async () => {
      try {
        const res = await addCommitteeMember(societyCode, {
          email: targetEmail,
          designation,
          customRoleIds: Array.from(selectedRoleIds),
          personId,
        })

        if (res.error) {
          setError(res.error)
        } else if (res.setupLink) {
          toast.success("Committee member added successfully")
          setCreatedSetupLink({ email: targetEmail, link: res.setupLink })
        } else {
          toast.success("Committee member added successfully")
          onClose()
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "An unexpected error occurred."
        setError(msg)
      }
    })
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-stone-950/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl transition-all">
        {createdSetupLink ? (
          /* Success Screen with Copy Link */
          <div>
            <div className="flex shrink-0 items-start justify-between border-b border-stone-100 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-950">Member Added Successfully</h3>
                  <p className="text-xs text-stone-500">
                    Assigned {createdSetupLink.email} to Managing Committee
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                  <span>✉️ Email Invitation Dispatched</span>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  An activation email with a password setup link was dispatched to{" "}
                  <strong>{createdSetupLink.email}</strong>.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                  Instant Account Setup Link (WhatsApp / Message)
                </label>
                <p className="text-xs text-stone-500">
                  In addition to the email, you can copy this direct link and send it directly to the member:
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={createdSetupLink.link}
                    className="flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-700 select-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopyLink(createdSetupLink.link)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition"
                  >
                    {copied ? "✓ Copied!" : "Copy Link"}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end border-t border-stone-100 bg-stone-50/50 px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-stone-900 px-5 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex shrink-0 items-start justify-between border-b border-stone-100 px-6 py-5">
              <div>
                <h3 className="text-xl font-bold tracking-tight text-stone-950">
                  {isEditing ? `Edit Role & Permissions` : "Add Committee / Staff Member"}
                </h3>
                <p className="mt-1 text-xs text-stone-500">
                  {isEditing
                    ? `Assign statutory designation and dynamic custom roles to ${member?.name || member?.email}.`
                    : "Select a registered resident or invite operational staff to the Managing Committee."}
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
                aria-label="Close"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {error ? (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
              <svg className="h-4 w-4 shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          ) : null}

          {/* Member Selection / Identification */}
          {isEditing ? (
            <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-900 text-sm font-bold text-white">
                  {(member?.name || member?.email || "?").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-stone-950 truncate">
                    {member?.name || member?.email}
                  </h4>
                  <p className="text-xs text-stone-500 truncate">{member?.email}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Tab Selector */}
              <div className="flex rounded-xl bg-stone-100 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setSourceMode("RESIDENT")
                    setError(null)
                  }}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition ${
                    sourceMode === "RESIDENT"
                      ? "bg-white text-stone-950 shadow-xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                  </svg>
                  <span>Select from Residents ({residents.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSourceMode("EXTERNAL")
                    setError(null)
                  }}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition ${
                    sourceMode === "EXTERNAL"
                      ? "bg-white text-stone-950 shadow-xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>External Staff / Email</span>
                </button>
              </div>

              {/* Mode A: Select from Residents */}
              {sourceMode === "RESIDENT" ? (
                <div className="space-y-3">
                  {selectedResident ? (
                    <div className="rounded-2xl border border-stone-300 bg-stone-50/80 p-4 transition-all">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-900 text-sm font-bold text-white shadow-xs">
                            {selectedResident.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-stone-950">{selectedResident.name}</h4>
                              <span className="rounded-md bg-stone-200/80 px-1.5 py-0.5 text-[10px] font-semibold text-stone-700">
                                {selectedResident.primaryRole}
                              </span>
                            </div>
                            <p className="text-xs text-stone-600 font-medium">
                              {selectedResident.flatsDisplay || "No flat mapped"}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedResidentId(null)}
                          className="rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-700 hover:bg-stone-100 transition shadow-2xs"
                        >
                          Change Resident
                        </button>
                      </div>

                      {/* Email on file vs missing */}
                      <div className="mt-3 pt-3 border-t border-stone-200/60">
                        {selectedResident.email ? (
                          <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50/80 px-3 py-2 rounded-xl border border-emerald-100">
                            <svg className="h-4 w-4 shrink-0 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span>
                              Login email: <strong className="font-semibold">{selectedResident.email}</strong>
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-amber-800">
                              Resident Login Email <span className="text-red-500">*</span>
                            </label>
                            <p className="text-[11px] text-amber-700 leading-tight">
                              This resident has no email recorded in the directory. Enter an email to create their login account and save it to their profile:
                            </p>
                            <input
                              type="email"
                              value={residentEmailInput}
                              onChange={(e) => setResidentEmailInput(e.target.value)}
                              placeholder="e.g. resident@example.com"
                              className="mt-1 w-full rounded-xl border border-amber-300 bg-white px-3.5 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Search Bar */}
                      <div className="relative">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search resident by name, flat (e.g. 101), or phone..."
                          className="w-full rounded-xl border border-stone-200 bg-stone-50/50 pl-9 pr-3.5 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none"
                        />
                        <svg
                          className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-stone-400"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>

                      {/* Filtered Residents List */}
                      <div className="max-h-56 overflow-y-auto rounded-2xl border border-stone-200 divide-y divide-stone-100 bg-white">
                        {filteredResidents.length === 0 ? (
                          <div className="p-4 text-center text-xs text-stone-500">
                            No residents found matching &quot;{searchQuery}&quot;
                          </div>
                        ) : (
                          filteredResidents.map((r) => {
                            const isAlreadyMember = r.email ? existingEmailSet.has(r.email.toLowerCase().trim()) : false

                            return (
                              <button
                                key={r.id}
                                type="button"
                                onClick={() => !isAlreadyMember && handleSelectResident(r)}
                                disabled={isAlreadyMember}
                                className={`w-full flex items-center justify-between p-3 text-left transition ${
                                  isAlreadyMember
                                    ? "bg-stone-50 opacity-60 cursor-not-allowed"
                                    : "hover:bg-stone-50 cursor-pointer"
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-xs font-bold text-stone-700">
                                    {r.name.slice(0, 2).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-stone-900 truncate">
                                        {r.name}
                                      </span>
                                      <span className="rounded bg-stone-100 px-1 py-0.2 text-[9px] font-semibold text-stone-600">
                                        {r.primaryRole}
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-stone-500 truncate">
                                      {r.flatsDisplay ? (
                                        <span className="font-medium text-stone-700">{r.flatsDisplay}</span>
                                      ) : (
                                        "No flat assigned"
                                      )}
                                      {r.email ? ` • ${r.email}` : ""}
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  {isAlreadyMember ? (
                                    <span className="rounded-md bg-stone-200 px-2 py-0.5 text-[10px] font-bold text-stone-600">
                                      Already in Committee
                                    </span>
                                  ) : (
                                    <span className="rounded-md border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-700 hover:border-stone-900 transition shadow-2xs">
                                      Select
                                    </span>
                                  )}
                                </div>
                              </button>
                            )
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Mode B: External Staff / Non-Resident */
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                    User Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    disabled={isPending}
                    placeholder="e.g. manager@example.com"
                    className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none"
                  />
                  <p className="mt-1.5 text-[11px] text-stone-500">
                    Use this for external facility managers, accountants, auditors, or security supervisors who do not reside in the society.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Committee Designation */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
              Primary Statutory Designation <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {DESIGNATION_OPTIONS.map((opt) => {
                const isSelected = designation === opt.value

                return (
                  <label
                    key={opt.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition-colors ${
                      isSelected
                        ? "border-stone-900 bg-stone-50 shadow-2xs"
                        : "border-stone-200 bg-white hover:border-stone-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="designation"
                      value={opt.value}
                      checked={isSelected}
                      onChange={() => setDesignation(opt.value)}
                      disabled={isPending}
                      className="mt-0.5 h-4 w-4 shrink-0 text-stone-900 focus:ring-stone-900"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-stone-900">{opt.label}</span>
                        <span className="rounded-md bg-stone-200/70 px-1.5 py-0.5 text-[9px] font-bold text-stone-600">
                          {opt.badge}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-stone-500 leading-tight">
                        {opt.desc}
                      </p>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Assigned Custom Roles */}
          {availableRoles.length > 0 ? (
            <div className="space-y-3 pt-2 border-t border-stone-100">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                  Assigned Custom & Specialized Roles
                </label>
                <p className="text-xs text-stone-500">
                  Grant additional role-based permission sets configured for this society.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {availableRoles.map((role) => {
                  const isChecked = selectedRoleIds.has(role.id)

                  return (
                    <label
                      key={role.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition-colors ${
                        isChecked
                          ? "border-stone-900/40 bg-stone-50/70 shadow-2xs"
                          : "border-stone-200 bg-white hover:border-stone-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleRole(role.id)}
                        disabled={isPending}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-stone-900 truncate">
                            {role.name}
                          </span>
                          <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-600">
                            {role.permissionCount} perms
                          </span>
                        </div>
                        {role.description ? (
                          <p className="mt-0.5 text-[11px] text-stone-500 line-clamp-1">
                            {role.description}
                          </p>
                        ) : null}
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-stone-100 bg-stone-50/50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition disabled:opacity-50"
          >
            {isPending ? (
              <>
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Saving...</span>
              </>
            ) : (
              <span>{isEditing ? "Save Role Assignment" : "Add Member"}</span>
            )}
          </button>
        </div>
          </>
        )}
      </div>
    </div>
  )
}
