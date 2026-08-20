"use client"

import { useState, useTransition } from "react"
import { addCommitteeMember, updateMemberRoleAssignment } from "../roles/actions"
import type { SocietyRole } from "@/generated/prisma/client"

export type MemberData = {
  id?: string
  email: string
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
  { value: "MEMBER", label: "Committee Member (General)", badge: "Committee", desc: "Elected managing committee member" },
]

export function MemberRoleModal({
  isOpen,
  onClose,
  societyCode,
  member,
  availableRoles,
}: MemberRoleModalProps) {
  const isEditing = Boolean(member?.id)

  const [email, setEmail] = useState(member?.email || "")
  const [designation, setDesignation] = useState<SocietyRole>(member?.designation || "MEMBER")
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(
    () => new Set(member?.customRoleIds || [])
  )
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

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

  const handleSave = () => {
    if (!isEditing && !email.trim()) {
      setError("Please enter a valid user email.")
      return
    }

    setError(null)

    startTransition(async () => {
      try {
        let res
        if (isEditing && member?.id) {
          res = await updateMemberRoleAssignment(societyCode, member.id, {
            designation,
            customRoleIds: Array.from(selectedRoleIds),
          })
        } else {
          res = await addCommitteeMember(societyCode, {
            email: email.trim(),
            designation,
            customRoleIds: Array.from(selectedRoleIds),
          })
        }

        if (res.error) {
          setError(res.error)
        } else {
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
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between border-b border-stone-100 px-6 py-5">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-stone-950">
              {isEditing ? `Edit Role & Permissions: ${member?.email}` : "Add Committee / Staff Member"}
            </h3>
            <p className="mt-1 text-xs text-stone-500">
              {isEditing
                ? "Assign statutory designation and dynamic custom roles to this committee member."
                : "Assign an existing user or invite staff to the Managing Committee with specific roles."}
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

          {/* User Email */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
              User Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isEditing || isPending}
              placeholder="e.g. member@example.com"
              className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none disabled:bg-stone-100 disabled:text-stone-500"
            />
            {isEditing ? (
              <p className="mt-1 text-[11px] text-stone-400">
                Email identifier cannot be changed after assignment.
              </p>
            ) : null}
          </div>

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
      </div>
    </div>
  )
}
