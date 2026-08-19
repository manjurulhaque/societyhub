import { notFound } from "next/navigation"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { prisma } from "@/lib/prisma"
import { AdminPageHeader, AdminTable, AdminBadge, AdminCard } from "@/components/admin"
import { CommitteeMembersClient, type CommitteeMemberItem } from "./CommitteeMembersClient"
import { EXECUTIVE_ROLES } from "@/lib/auth/requireAuth"
import type { SocietyRole } from "@/generated/prisma/client"

export default async function SocietyMembersPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const context = await getSocietyAdmin(code)

  if (!context) {
    notFound()
  }

  const { society, designation, isSuperAdmin } = context
  const canManageMembers = isSuperAdmin || EXECUTIVE_ROLES.includes(designation as SocietyRole)

  const [rawCommitteeMembers, availableRolesData, residents] = await Promise.all([
    prisma.societyMember.findMany({
      where: { societyId: society.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            appRole: true,
          },
        },
        customRoles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                isSystem: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),

    prisma.role.findMany({
      where: {
        OR: [
          { societyId: null },
          { societyId: society.id },
        ],
      },
      include: {
        _count: {
          select: {
            rolePermissions: true,
          },
        },
      },
      orderBy: [
        { isSystem: "desc" },
        { name: "asc" },
      ],
    }),

    prisma.person.findMany({
      where: {
        societyId: society.id,
        isActive: true,
        deletedAt: null,
      },
      include: {
        flats: {
          where: { toDate: null },
          include: {
            flat: {
              select: {
                number: true,
                block: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
  ])

  const committeeMembers: CommitteeMemberItem[] = rawCommitteeMembers.map((m) => ({
    id: m.id,
    userId: m.user.id,
    email: m.user.email,
    designation: m.designation,
    appRole: m.user.appRole,
    createdAt: m.createdAt.toISOString(),
    customRoles: m.customRoles.map((cr) => ({
      id: cr.role.id,
      name: cr.role.name,
      isSystem: cr.role.isSystem,
    })),
  }))

  const availableRoles = availableRolesData.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    isSystem: r.isSystem,
    permissionCount: r._count.rolePermissions,
  }))

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-6 py-8 md:px-8">
      <AdminPageHeader
        eyebrow="Directory & Access"
        title="Members & Residents"
        description={`Manage committee roles, operational staff assignments, and resident directory for ${society.name}.`}
      />

      {/* Committee Members & Staff */}
      <AdminCard
        title="Managing Committee & Staff"
        description="Users authorized to manage, disburse funds, or administer operations for this society"
      >
        <CommitteeMembersClient
          societyCode={code}
          members={committeeMembers}
          availableRoles={availableRoles}
          canManageMembers={canManageMembers}
        />
      </AdminCard>

      {/* Residents Directory */}
      <AdminCard
        title="Registered Residents & People"
        description="Owners, tenants, and family members residing in this society"
      >
        {residents.length === 0 ? (
          <p className="py-4 text-center text-xs text-stone-500">
            No residents registered in this society yet.
          </p>
        ) : (
          <AdminTable
            headers={["Name", "Phone", "Email", "Associated Flat(s)", "Role"]}
            rows={residents.map((r) => {
              const flatList = r.flats
                .map((f) => `${f.flat.block.name} - ${f.flat.number} (${f.role})`)
                .join(", ")

              const primaryRole = r.flats[0]?.role || "RESIDENT"

              return (
                <tr key={r.id} className="border-t border-stone-100 hover:bg-stone-50/60 transition-colors">
                  <td className="px-4 py-3 text-xs font-semibold text-stone-950">
                    {r.name}
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-600">{r.phone || "—"}</td>
                  <td className="px-4 py-3 text-xs text-stone-600">{r.email || "—"}</td>
                  <td className="px-4 py-3 text-xs text-stone-700">
                    {flatList || <span className="text-stone-400">None assigned</span>}
                  </td>
                  <td className="px-4 py-3">
                    <AdminBadge
                      variant={
                        primaryRole === "OWNER"
                          ? "info"
                          : primaryRole === "TENANT"
                            ? "warning"
                            : "neutral"
                      }
                      size="sm"
                    >
                      {primaryRole}
                    </AdminBadge>
                  </td>
                </tr>
              )
            })}
          />
        )}
      </AdminCard>
    </div>
  )
}

