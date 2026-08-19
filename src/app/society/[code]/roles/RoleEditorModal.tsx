"use client"

import { useState, useMemo, useTransition } from "react"
import { MODULE_ORDER, MODULE_LABELS } from "@/lib/auth/permissionConstants"
import { createCustomRole, updateRole } from "./actions"
import { AdminBadge } from "@/components/admin"

export type RoleData = {
  id?: string
  name: string
  code?: string | null
  description?: string | null
  isSystem?: boolean
  permissionIds: string[]
}

export type PermissionItem = {
  id: string
  code: string
  name: string
  module: string
  description?: string | null
}

interface RoleEditorModalProps {
  isOpen: boolean
  onClose: () => void
  societyCode: string
  role: RoleData | null
  allPermissions: PermissionItem[]
}

export function RoleEditorModal({
  isOpen,
  onClose,
  societyCode,
  role,
  allPermissions,
}: RoleEditorModalProps) {
  const isEditing = Boolean(role?.id)
  const isSystem = Boolean(role?.isSystem)

  const [name, setName] = useState(role?.name || "")
  const [description, setDescription] = useState(role?.description || "")
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<Set<string>>(
    () => new Set(role?.permissionIds || [])
  )
  const [searchQuery, setSearchQuery] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Group permissions by module
  const permissionsByModule = useMemo(() => {
    const map: Record<string, PermissionItem[]> = {}
    for (const perm of allPermissions) {
      const mod = perm.module || "OTHER"
      if (!map[mod]) map[mod] = []

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const match =
          perm.name.toLowerCase().includes(q) ||
          perm.code.toLowerCase().includes(q) ||
          (perm.description && perm.description.toLowerCase().includes(q))
        if (match) {
          map[mod].push(perm)
        }
      } else {
        map[mod].push(perm)
      }
    }
    return map
  }, [allPermissions, searchQuery])

  const togglePermission = (permId: string) => {
    setSelectedPermissionIds((prev) => {
      const next = new Set(prev)
      if (next.has(permId)) {
        next.delete(permId)
      } else {
        next.add(permId)
      }
      return next
    })
  }

  const toggleModulePermissions = (moduleName: string) => {
    const modulePerms = allPermissions.filter((p) => p.module === moduleName)
    const allSelected = modulePerms.every((p) => selectedPermissionIds.has(p.id))

    setSelectedPermissionIds((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        modulePerms.forEach((p) => next.delete(p.id))
      } else {
        modulePerms.forEach((p) => next.add(p.id))
      }
      return next
    })
  }

  const toggleAllPermissions = () => {
    if (selectedPermissionIds.size === allPermissions.length) {
      setSelectedPermissionIds(new Set())
    } else {
      setSelectedPermissionIds(new Set(allPermissions.map((p) => p.id)))
    }
  }

  const handleSave = () => {
    if (!name.trim()) {
      setError("Please provide a role name.")
      return
    }

    setError(null)

    startTransition(async () => {
      try {
        const payload = {
          name: name.trim(),
          description: description.trim() || undefined,
          permissionIds: Array.from(selectedPermissionIds),
        }

        let res
        if (isEditing && role?.id) {
          res = await updateRole(societyCode, role.id, payload)
        } else {
          res = await createCustomRole(societyCode, payload)
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
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-950/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Box */}
      <div className="relative z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl transition-all">
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between border-b border-stone-100 px-6 py-5">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold tracking-tight text-stone-950">
                {isEditing
                  ? isSystem
                    ? `Configure Permissions: ${role?.name}`
                    : `Edit Role: ${role?.name}`
                  : "Create Custom Role"}
              </h3>
              {isSystem ? (
                <AdminBadge variant="purple" size="sm">
                  System Role
                </AdminBadge>
              ) : isEditing ? (
                <AdminBadge variant="info" size="sm">
                  Custom Role
                </AdminBadge>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-stone-500">
              {isSystem
                ? "System roles have predefined standard designations; configure the granular functional permissions granted to members assigned to this role."
                : "Define the role name, description, and assign modular permissions for day-to-day society operations."}
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

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {error ? (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
              <svg className="h-4 w-4 shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          ) : null}

          {/* Role Metadata Fields */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Role Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSystem || isPending}
                placeholder="e.g. Facilities Manager, Auditor, Assistant Treasurer"
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none disabled:bg-stone-100 disabled:text-stone-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isPending}
                placeholder="Short summary of this role's purpose"
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none disabled:bg-stone-100"
              />
            </div>
          </div>

          {/* Permission Matrix Header & Search */}
          <div className="space-y-3 pt-2 border-t border-stone-100">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-sm font-bold text-stone-950">
                  Assigned Permissions ({selectedPermissionIds.size} / {allPermissions.length})
                </h4>
                <p className="text-xs text-stone-500">
                  Select which operations members with this role are permitted to execute.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter permissions..."
                  className="w-44 sm:w-56 rounded-xl border border-stone-200 bg-stone-50/50 px-3 py-1.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={toggleAllPermissions}
                  className="shrink-0 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition"
                >
                  {selectedPermissionIds.size === allPermissions.length
                    ? "Deselect All"
                    : "Select All"}
                </button>
              </div>
            </div>

            {/* Modules Accordion / List */}
            <div className="space-y-4 pt-2">
              {MODULE_ORDER.map((moduleKey) => {
                const perms = permissionsByModule[moduleKey] || []
                if (perms.length === 0) return null

                const moduleInfo = MODULE_LABELS[moduleKey] || {
                  label: moduleKey,
                  description: "",
                }
                const allSelected = perms.every((p) => selectedPermissionIds.has(p.id))
                const selectedCount = perms.filter((p) =>
                  selectedPermissionIds.has(p.id)
                ).length

                return (
                  <div
                    key={moduleKey}
                    className="rounded-2xl border border-stone-200/80 bg-stone-50/40 p-4 transition-all"
                  >
                    {/* Module Header */}
                    <div className="flex items-center justify-between border-b border-stone-200/60 pb-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-stone-900">
                            {moduleInfo.label}
                          </span>
                          <span className="rounded-full bg-stone-200/70 px-2 py-0.5 text-[10px] font-semibold text-stone-700">
                            {selectedCount} / {perms.length}
                          </span>
                        </div>
                        {moduleInfo.description ? (
                          <p className="text-[11px] text-stone-500 mt-0.5">
                            {moduleInfo.description}
                          </p>
                        ) : null}
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleModulePermissions(moduleKey)}
                        className="text-[11px] font-semibold text-stone-600 hover:text-stone-950 underline-offset-2 hover:underline"
                      >
                        {allSelected ? "Uncheck Module" : "Check Module"}
                      </button>
                    </div>

                    {/* Permissions Grid */}
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {perms.map((perm) => {
                        const isChecked = selectedPermissionIds.has(perm.id)

                        return (
                          <label
                            key={perm.id}
                            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-2.5 transition-colors ${
                              isChecked
                                ? "border-stone-900/30 bg-white shadow-2xs"
                                : "border-stone-200/60 bg-white/60 hover:bg-white"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => togglePermission(perm.id)}
                              disabled={isPending}
                              className="mt-0.5 h-4 w-4 shrink-0 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
                            />
                            <div className="min-w-0 flex-1">
                              <span className="block text-xs font-semibold text-stone-900 truncate">
                                {perm.name}
                              </span>
                              {perm.description ? (
                                <p className="text-[11px] text-stone-500 line-clamp-2 leading-relaxed">
                                  {perm.description}
                                </p>
                              ) : null}
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-stone-100 bg-stone-50/50 px-6 py-4">
          <div className="text-xs text-stone-500">
            <span className="font-semibold text-stone-900">
              {selectedPermissionIds.size}
            </span>{" "}
            permissions selected
          </div>

          <div className="flex items-center gap-3">
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
                <span>{isEditing ? "Update Role" : "Create Role"}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
