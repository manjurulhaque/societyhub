"use client"

import { toast } from "sonner"

import { useState, useTransition } from "react"
import Link from "next/link"
import { AdminTable, AdminBadge } from "@/components/admin"
import { MemberRoleModal, type MemberData, type AvailableRole } from "./MemberRoleModal"
import { type ResidentItem } from "./ResidentsDirectoryClient"
import { removeCommitteeMember, getMemberActivationLink } from "../roles/actions"
import type { SocietyRole } from "@/generated/prisma/client"

export type CommitteeMemberItem = {
  id: string
  userId: string
  personId?: string | null
  email: string
  name?: string | null
  phone?: string | null
  flatsDisplay?: string | null
  designation: SocietyRole
  appRole: string
  createdAt: string
  customRoles: {
    id: string
    name: string
    isSystem: boolean
  }[]
}

interface CommitteeMembersClientProps {
  societyCode: string
  members: CommitteeMemberItem[]
  availableRoles: AvailableRole[]
  residents?: ResidentItem[]
  canManageMembers: boolean
}

export function CommitteeMembersClient({
  societyCode,
  members,
  availableRoles,
  residents = [],
  canManageMembers,
}: CommitteeMembersClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<MemberData | null>(null)

  const [deletingMember, setDeletingMember] = useState<CommitteeMemberItem | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, startDeleteTransition] = useTransition()

  // Setup Link Dialog State
  const [linkMember, setLinkMember] = useState<{ email: string; name?: string | null } | null>(null)
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const [linkLoading, setLinkLoading] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)

  const openAddModal = () => {
    setSelectedMember(null)
    setIsModalOpen(true)
  }

  const openEditModal = (m: CommitteeMemberItem) => {
    setSelectedMember({
      id: m.id,
      email: m.email,
      name: m.name,
      designation: m.designation,
      customRoleIds: m.customRoles.map((r) => r.id),
    })
    setIsModalOpen(true)
  }

  const handleGenerateLink = async (member: CommitteeMemberItem) => {
    setLinkMember({ email: member.email, name: member.name })
    setGeneratedLink(null)
    setLinkError(null)
    setLinkLoading(true)
    setLinkCopied(false)

    try {
      const res = await getMemberActivationLink(societyCode, member.email)
      if (res.error) {
        setLinkError(res.error)
      } else if (res.setupLink) {
        setGeneratedLink(res.setupLink)
      } else {
        setLinkError("Unable to generate setup link.")
      }
    } catch {
      setLinkError("Failed to generate link.")
    } finally {
      setLinkLoading(false)
    }
  }

  const handleCopyGeneratedLink = async () => {
    if (!generatedLink) return
    try {
      await navigator.clipboard.writeText(generatedLink)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2500)
    } catch {
      // Fallback
    }
  }

  const handleDeleteMember = () => {
    if (!deletingMember) return
    setDeleteError(null)

    startDeleteTransition(async () => {
      try {
        const res = await removeCommitteeMember(societyCode, deletingMember.id)
        if (res.error) {
          setDeleteError(res.error)
        } else {
          toast.success("Committee member removed")
          setDeletingMember(null)
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to remove member."
        setDeleteError(msg)
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-stone-900">
            Managing Committee & Staff Directory ({members.length})
          </h3>
          <p className="text-xs text-stone-500">
            Users with administrative, financial, or operational governance in this society.
          </p>
        </div>

        {canManageMembers ? (
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.75 4.75a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
            <span>+ Add Committee Member</span>
          </button>
        ) : null}
      </div>

      {/* Table */}
      {members.length === 0 ? (
        <p className="py-6 text-center text-xs text-stone-500 border border-dashed border-stone-200 rounded-2xl">
          No committee members assigned yet.
        </p>
      ) : (
        <AdminTable
          headers={[
            "Member / User",
            "Statutory Designation",
            "Assigned Custom Roles",
            "Platform Role",
            "Assigned On",
            ...(canManageMembers ? ["Actions"] : []),
          ]}
          rows={members.map((m) => {
            const isOfficer = ["PRESIDENT", "SECRETARY", "TREASURER"].includes(m.designation)
            const isStaff = ["MANAGER", "ACCOUNTANT"].includes(m.designation)
            const badgeVariant = isOfficer ? "purple" : isStaff ? "info" : "neutral"

            return (
              <tr key={m.id} className="border-t border-stone-100 hover:bg-stone-50/60 transition-colors">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-xs font-bold text-stone-700">
                      {(m.name || m.email).slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-stone-950 truncate">
                        {m.personId ? (
                          <Link
                            href={`/society/${societyCode}/members/${m.personId}`}
                            className="hover:text-blue-600 transition"
                          >
                            {m.name || m.email}
                          </Link>
                        ) : (
                          m.name || m.email
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-stone-500 truncate">
                        {m.name ? <span>{m.email}</span> : null}
                        {m.flatsDisplay ? (
                          <>
                            {m.name ? <span>•</span> : null}
                            <span className="font-medium text-stone-600">{m.flatsDisplay}</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3.5">
                  <AdminBadge variant={badgeVariant} size="sm" dot>
                    {m.designation === "MEMBER"
                      ? "Management Committee Member"
                      : m.designation === "EXECUTIVE_MEMBER"
                        ? "Executive Committee Member"
                        : m.designation.replace(/_/g, " ")}
                  </AdminBadge>
                </td>

                <td className="px-4 py-3.5">
                  {m.customRoles.length === 0 ? (
                    <span className="text-xs text-stone-400">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {m.customRoles.map((r) => (
                        <span
                          key={r.id}
                          className="inline-flex items-center rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-700"
                        >
                          {r.name}
                        </span>
                      ))}
                    </div>
                  )}
                </td>

                <td className="px-4 py-3.5 text-xs text-stone-600">
                  <AdminBadge variant={m.appRole === "SUPER_ADMIN" ? "purple" : "neutral"} size="sm">
                    {m.appRole}
                  </AdminBadge>
                </td>

                <td className="px-4 py-3.5 text-xs text-stone-500">
                  {new Date(m.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </td>

                {canManageMembers ? (
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleGenerateLink(m)}
                        className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-[11px] font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition shadow-2xs"
                        title="Generate or copy password setup link"
                      >
                        🔗 Setup Link
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(m)}
                        className="rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition"
                      >
                        Edit Role
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingMember(m)}
                        className="rounded-lg p-1 text-stone-400 hover:bg-red-50 hover:text-red-600 transition"
                        title="Remove from Committee"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                  </td>
                ) : null}
              </tr>
            )
          })}
        />
      )}

      {/* Setup Link Modal */}
      {linkMember ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="fixed inset-0 bg-stone-950/40 backdrop-blur-sm transition-opacity"
            onClick={() => setLinkMember(null)}
            aria-hidden="true"
          />

          <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl transition-all">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-stone-900 text-white font-bold">
                  🔗
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-950">Account Setup Link</h3>
                  <p className="text-xs text-stone-500">
                    For {linkMember.name || linkMember.email} ({linkMember.email})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setLinkMember(null)}
                className="rounded-full p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {linkLoading ? (
                <div className="flex items-center justify-center py-6 gap-2 text-xs text-stone-500">
                  <svg className="h-4 w-4 animate-spin text-stone-900" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Generating secure activation link...</span>
                </div>
              ) : linkError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  {linkError}
                </div>
              ) : generatedLink ? (
                <div className="space-y-3">
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Copy and share this direct activation link with the member (via WhatsApp, SMS, or direct email). When opened, it will let them create their password and sign in immediately:
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedLink}
                      className="flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-700 select-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleCopyGeneratedLink}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition shadow-2xs"
                    >
                      {linkCopied ? "✓ Copied!" : "Copy Link"}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-6 flex items-center justify-end border-t border-stone-100 pt-4">
              <button
                type="button"
                onClick={() => setLinkMember(null)}
                className="rounded-xl bg-stone-100 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-200 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Member Role Assignment Modal */}
      {isModalOpen ? (
        <MemberRoleModal
          key={selectedMember?.id || "new-member"}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          societyCode={societyCode}
          member={selectedMember}
          availableRoles={availableRoles}
          residents={residents}
          existingMembers={members}
        />
      ) : null}

      {/* Member Delete Confirmation Dialog */}
      {deletingMember ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="fixed inset-0 bg-stone-950/40 backdrop-blur-sm transition-opacity"
            onClick={() => setDeletingMember(null)}
            aria-hidden="true"
          />

          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl transition-all">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-stone-950">
                  Remove Committee Member
                </h3>
                <p className="mt-1 text-xs text-stone-500">
                  Are you sure you want to remove{" "}
                  <strong className="text-stone-900">{deletingMember.email}</strong> (
                  {deletingMember.designation}) from the society&apos;s managing committee?
                </p>

                {deleteError ? (
                  <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                    {deleteError}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-stone-100 pt-4">
              <button
                type="button"
                onClick={() => setDeletingMember(null)}
                disabled={isDeleting}
                className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteMember}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-red-700 transition disabled:opacity-50"
              >
                {isDeleting ? "Removing..." : "Remove Member"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
