"use client"

import { useState, useMemo } from "react"
import { AdminBadge, AdminStatCard } from "@/components/admin"
import { RoleEditorModal, type RoleData, type PermissionItem } from "./RoleEditorModal"
import { RoleDeleteDialog } from "./RoleDeleteDialog"
import { MODULE_ORDER } from "@/lib/auth/permissionConstants"

export type RoleListItem = {
  id: string
  name: string
  code: string | null
  description: string | null
  isSystem: boolean
  societyId: string | null
  createdAt: string
  updatedAt: string
  permissions: {
    id: string
    code: string
    name: string
    module: string
  }[]
  members: {
    societyMemberId: string
    email: string
    designation: string
  }[]
}

interface RolesClientViewProps {
  societyCode: string
  roles: RoleListItem[]
  allPermissions: PermissionItem[]
  canManageRoles: boolean
}

export function RolesClientView({
  societyCode,
  roles,
  allPermissions,
  canManageRoles,
}: RolesClientViewProps) {
  const [activeTab, setActiveTab] = useState<"ALL" | "SYSTEM" | "CUSTOM">("ALL")
  const [searchQuery, setSearchQuery] = useState("")

  // Modals state
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<RoleData | null>(null)

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deletingRole, setDeletingRole] = useState<{
    id: string
    name: string
    isSystem: boolean
    memberCount: number
  } | null>(null)

  // Filtered roles
  const filteredRoles = useMemo(() => {
    return roles.filter((role) => {
      if (activeTab === "SYSTEM" && !role.isSystem) return false
      if (activeTab === "CUSTOM" && role.isSystem) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = role.name.toLowerCase().includes(q)
        const matchCode = role.code?.toLowerCase().includes(q) || false
        const matchDesc = role.description?.toLowerCase().includes(q) || false
        return matchName || matchCode || matchDesc
      }

      return true
    })
  }, [roles, activeTab, searchQuery])

  // Stats calculation
  const totalRoles = roles.length
  const systemRolesCount = roles.filter((r) => r.isSystem).length
  const customRolesCount = roles.filter((r) => !r.isSystem).length
  const totalAssignments = roles.reduce((acc, r) => acc + r.members.length, 0)

  const openCreateModal = () => {
    setEditingRole(null)
    setIsEditorOpen(true)
  }

  const openEditModal = (role: RoleListItem) => {
    setEditingRole({
      id: role.id,
      name: role.name,
      code: role.code,
      description: role.description,
      isSystem: role.isSystem,
      permissionIds: role.permissions.map((p) => p.id),
    })
    setIsEditorOpen(true)
  }

  const openDeleteModal = (role: RoleListItem) => {
    setDeletingRole({
      id: role.id,
      name: role.name,
      isSystem: role.isSystem,
      memberCount: role.members.length,
    })
    setIsDeleteDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          title="Total Configured Roles"
          value={totalRoles}
          subtitle="System defaults + Custom roles"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        />

        <AdminStatCard
          title="System Template Roles"
          value={systemRolesCount}
          subtitle="Pre-configured statutory roles"
          icon={
            <svg className="h-5 w-5 text-purple-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />

        <AdminStatCard
          title="Society Custom Roles"
          value={customRolesCount}
          subtitle="Tailored to your society operations"
          icon={
            <svg className="h-5 w-5 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Active Role Assignments"
          value={totalAssignments}
          subtitle="Users mapped to roles"
          icon={
            <svg className="h-5 w-5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 rounded-2xl border border-stone-200 bg-stone-100/60 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("ALL")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
              activeTab === "ALL"
                ? "bg-white text-stone-950 shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            All Roles ({totalRoles})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("SYSTEM")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
              activeTab === "SYSTEM"
                ? "bg-white text-stone-950 shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            System Roles ({systemRolesCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("CUSTOM")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
              activeTab === "CUSTOM"
                ? "bg-white text-stone-950 shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Custom Roles ({customRolesCount})
          </button>
        </div>

        {/* Search & New Role Trigger */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search roles..."
              className="w-56 sm:w-64 rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2 pl-9 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none"
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

          {canManageRoles ? (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              <span>+ Create Custom Role</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Role Cards Grid */}
      {filteredRoles.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-200 p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-400">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="mt-3 text-sm font-semibold text-stone-900">No roles found</h3>
          <p className="mt-1 text-xs text-stone-500">
            {searchQuery
              ? `No roles match your search "${searchQuery}".`
              : "No roles available in this category."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredRoles.map((role) => {
            // Count permissions by module
            const moduleBreakdown = MODULE_ORDER.map((mod) => ({
              module: mod,
              count: role.permissions.filter((p) => p.module === mod).length,
            })).filter((m) => m.count > 0)

            return (
              <div
                key={role.id}
                className="flex flex-col justify-between rounded-3xl border border-stone-200/90 bg-white p-6 shadow-xs transition hover:border-stone-300 hover:shadow-md"
              >
                <div>
                  {/* Top Bar: Name & Badges */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-base font-bold text-stone-950 truncate">
                        {role.name}
                      </h4>
                      {role.code ? (
                        <span className="text-[11px] font-mono text-stone-400">
                          {role.code}
                        </span>
                      ) : null}
                    </div>

                    <AdminBadge
                      variant={role.isSystem ? "purple" : "info"}
                      size="sm"
                      dot
                    >
                      {role.isSystem ? "System" : "Custom"}
                    </AdminBadge>
                  </div>

                  {/* Description */}
                  <p className="mt-2 text-xs text-stone-600 line-clamp-2 leading-relaxed min-h-[36px]">
                    {role.description || "No description provided."}
                  </p>

                  {/* Permissions Summary */}
                  <div className="mt-4 rounded-2xl bg-stone-50/70 p-3 border border-stone-100">
                    <div className="flex items-center justify-between text-xs font-semibold text-stone-800 mb-2">
                      <span>Permissions Granted</span>
                      <span className="rounded-full bg-stone-200/80 px-2 py-0.5 text-[11px] font-bold text-stone-900">
                        {role.permissions.length} / {allPermissions.length}
                      </span>
                    </div>

                    {/* Mini Module Pills */}
                    <div className="flex flex-wrap gap-1.5">
                      {moduleBreakdown.length === 0 ? (
                        <span className="text-[11px] text-stone-400">No permissions assigned</span>
                      ) : (
                        moduleBreakdown.map((m) => (
                          <span
                            key={m.module}
                            className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-0.5 text-[10px] font-medium text-stone-600 border border-stone-200/60"
                          >
                            <span>{m.module.toLowerCase()}</span>
                            <span className="font-bold text-stone-900">({m.count})</span>
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Assigned Members */}
                  <div className="mt-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-1.5">
                      Assigned Users ({role.members.length})
                    </span>

                    {role.members.length === 0 ? (
                      <p className="text-xs text-stone-400 italic">No users currently assigned</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {role.members.slice(0, 3).map((m) => (
                          <span
                            key={m.societyMemberId}
                            className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-medium text-stone-700 truncate max-w-[180px]"
                            title={`${m.email} (${m.designation})`}
                          >
                            {m.email}
                          </span>
                        ))}
                        {role.members.length > 3 ? (
                          <span className="inline-flex items-center rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-500">
                            +{role.members.length - 3} more
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions Footer */}
                {canManageRoles ? (
                  <div className="mt-6 flex items-center justify-end gap-2 border-t border-stone-100 pt-4">
                    {!role.isSystem ? (
                      <button
                        type="button"
                        onClick={() => openDeleteModal(role)}
                        className="rounded-xl p-2 text-stone-400 hover:bg-red-50 hover:text-red-600 transition"
                        title="Delete Role"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => openEditModal(role)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
                        <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
                      </svg>
                      <span>{role.isSystem ? "Configure Permissions" : "Edit Role"}</span>
                    </button>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}

      {/* Editor Modal */}
      {isEditorOpen ? (
        <RoleEditorModal
          key={editingRole?.id || "new-role"}
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          societyCode={societyCode}
          role={editingRole}
          allPermissions={allPermissions}
        />
      ) : null}

      {/* Delete Confirmation Dialog */}
      {isDeleteDialogOpen && deletingRole ? (
        <RoleDeleteDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          societyCode={societyCode}
          role={deletingRole}
        />
      ) : null}
    </div>
  )
}
