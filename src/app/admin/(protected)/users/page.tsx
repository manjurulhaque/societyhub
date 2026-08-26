import Link from "next/link"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import type { AppRole } from "@/generated/prisma/client"
import {
  AdminPageHeader,
  AdminTable,
  AdminBadge,
  AdminStatCard,
  AdminEmptyState,
} from "@/components/admin"

import { formatDateInAppTimeZone, formatTimeInAppTimeZone } from "@/lib/datetime"

export default async function UsersPage() {
  const [users, superAdminCount, regularUserCount, totalMembershipsCount, lastLoginLogs] = await Promise.all([
    prisma.user.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        memberships: {
          include: {
            society: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
        person: {
          select: {
            id: true,
            name: true,
            phone: true,
            society: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    }),
    prisma.user.count({
      where: { appRole: "SUPER_ADMIN" },
    }),
    prisma.user.count({
      where: { appRole: "USER" },
    }),
    prisma.societyMember.count(),
    prisma.auditLog.findMany({
      where: { action: "LOGIN", userId: { not: null } },
      orderBy: { createdAt: "desc" },
      distinct: ["userId"],
      select: {
        userId: true,
        createdAt: true,
        ipAddress: true,
      },
    }),
  ])

  const lastLoginMap = new Map(lastLoginLogs.map((l) => [l.userId!, l]))
  const totalUsers = users.length

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-6 py-8 md:px-8">
      {/* Header */}
      <AdminPageHeader
        eyebrow="Identity & Access Management"
        title="Platform Users"
        description="Directory of registered login accounts, platform security roles, and housing society memberships."
      />

      {/* KPI Overview */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          title="Total User Accounts"
          value={totalUsers}
          subtitle="Registered platform identities"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Super Administrators"
          value={superAdminCount}
          subtitle="Universal platform access"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Standard Users"
          value={regularUserCount}
          subtitle="Resident & committee accounts"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Active Memberships"
          value={totalMembershipsCount}
          subtitle="Assigned committee & staff roles"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />
      </div>

      {/* Users Table */}
      {users.length === 0 ? (
        <AdminEmptyState
          title="No users registered yet"
          description="User accounts created via Supabase Auth will appear here."
        />
      ) : (
        <AdminTable
          headers={[
            "User Account / Email",
            "Platform Role",
            "Assigned Society Memberships",
            "Linked Resident Profile",
            "Last Sign-in",
            "Registered Date",
            "Actions",
          ]}
          rows={users.map((user) => {
            const lastLogin = lastLoginMap.get(user.id)

            return (
              <tr
                key={user.id}
                className="border-t border-stone-100 transition-colors hover:bg-stone-50/70"
              >
                {/* User Email */}
                <td className="px-4 py-3.5">
                  <span className="font-bold text-stone-950 text-sm block">
                    {user.email}
                  </span>
                  <span className="font-mono text-[10px] text-stone-400">
                    ID: {user.id.slice(0, 12)}...
                  </span>
                </td>

                {/* Platform App Role */}
                <td className="px-4 py-3.5">
                  <AdminBadge
                    variant={user.appRole === "SUPER_ADMIN" ? "purple" : "neutral"}
                    size="sm"
                    dot
                  >
                    {user.appRole}
                  </AdminBadge>
                </td>

                {/* Society Memberships */}
                <td className="px-4 py-3.5">
                  {user.memberships.length === 0 ? (
                    <span className="text-xs text-stone-400">No society assigned</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {user.memberships.map((m) => (
                        <Link
                          key={m.id}
                          href={`/society/${m.society.code || m.society.id}/dashboard`}
                          className="inline-flex items-center gap-1 rounded-md bg-stone-100 hover:bg-stone-200 px-2 py-0.5 text-xs text-stone-800 transition"
                        >
                          <span className="font-semibold">{m.society.name}</span>
                          <span className="text-[10px] text-stone-500 font-mono">({m.designation})</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </td>

                {/* Linked Resident Profile */}
                <td className="px-4 py-3.5 text-xs text-stone-700">
                  {user.person ? (
                    <div>
                      <Link
                        href={`/admin/people/${user.person.id}`}
                        className="font-semibold text-stone-950 hover:underline block"
                      >
                        {user.person.name}
                      </Link>
                      <span className="text-[11px] text-stone-500">
                        {user.person.society.name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-stone-400">None linked</span>
                  )}
                </td>

                {/* Last Sign-in */}
                <td className="px-4 py-3.5 whitespace-nowrap">
                  {lastLogin ? (
                    <div>
                      <span className="block text-xs font-semibold text-stone-900">
                        {formatDateInAppTimeZone(lastLogin.createdAt)}
                      </span>
                      <span className="block font-mono text-[10px] text-stone-500">
                        {formatTimeInAppTimeZone(lastLogin.createdAt)}
                      </span>
                      {lastLogin.ipAddress && (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-stone-500">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                          {lastLogin.ipAddress}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-stone-400">—</span>
                  )}
                </td>

                {/* Registered Date */}
                <td className="px-4 py-3.5 text-xs text-stone-500 whitespace-nowrap">
                  {formatDateInAppTimeZone(user.createdAt)}
                </td>

                {/* Actions: Toggle Role */}
                <td className="px-4 py-3.5">
                  <form action={toggleUserRole}>
                    <input type="hidden" name="userId" value={user.id} />
                    <input
                      type="hidden"
                      name="nextRole"
                      value={user.appRole === "SUPER_ADMIN" ? "USER" : "SUPER_ADMIN"}
                    />
                    <button
                      type="submit"
                      className="rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-100 transition shadow-sm"
                    >
                      {user.appRole === "SUPER_ADMIN" ? "Demote to User" : "Make Super Admin"}
                    </button>
                  </form>
                </td>
              </tr>
            )
          })}
        />
      )}
    </div>
  )
}

import { requireSuperAdmin } from "@/lib/auth/requireAuth"
import { recordAuditLog } from "@/lib/audit"

async function toggleUserRole(formData: FormData) {
  "use server"

  const admin = await requireSuperAdmin()

  const userId = formData.get("userId")?.toString().trim()
  const nextRole = formData.get("nextRole")?.toString().trim()

  if (!userId || !nextRole || (nextRole !== "SUPER_ADMIN" && nextRole !== "USER")) {
    throw new Error("Valid user ID and role are required")
  }

  // Prevent super admin from accidentally removing their own super admin access if they are the only one
  if (userId === admin.id && nextRole !== "SUPER_ADMIN") {
    const superAdminCount = await prisma.user.count({
      where: { appRole: "SUPER_ADMIN", isActive: true, deletedAt: null },
    })
    if (superAdminCount <= 1) {
      throw new Error("Cannot demote the only remaining Super Admin.")
    }
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, appRole: true },
  })

  if (!targetUser) {
    throw new Error("Target user not found")
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      appRole: nextRole as AppRole,
    },

  })

  await recordAuditLog({
    userId: admin.id,
    action: "STATUS_CHANGE",
    entity: "User",
    entityId: userId,
    description: `Super Admin ${admin.email} changed role of ${targetUser.email} from ${targetUser.appRole} to ${nextRole}`,
    oldData: { appRole: targetUser.appRole },
    newData: { appRole: nextRole },
  })

  revalidatePath("/admin/users")
  revalidatePath("/admin/dashboard")
}

