import { notFound } from "next/navigation"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { requireCommitteeAccess, COMMITTEE_ROLES, EXECUTIVE_ROLES } from "@/lib/auth/requireAuth"
import { prisma } from "@/lib/prisma"
import { ensurePermissionsSeeded } from "@/lib/auth/permissions"
import { AdminPageHeader } from "@/components/admin"
import { RolesClientView, type RoleListItem } from "./RolesClientView"
import type { SocietyRole } from "@/generated/prisma/client"

export default async function SocietyRolesPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const context = await getSocietyAdmin(code)

  if (!context) {
    notFound()
  }

  // Ensure committee access
  await requireCommitteeAccess(code, COMMITTEE_ROLES)

  const { society, designation, isSuperAdmin } = context
  const canManageRoles = isSuperAdmin || EXECUTIVE_ROLES.includes(designation as SocietyRole)

  // Ensure standard permissions and system role templates are seeded in DB
  await ensurePermissionsSeeded()

  // Fetch all permissions catalog
  const allPermissions = await prisma.permission.findMany({
    select: {
      id: true,
      code: true,
      name: true,
      module: true,
      description: true,
    },
    orderBy: [
      { module: "asc" },
      { code: "asc" },
    ],
  })

  // Fetch both system roles (societyId is null) and society-specific custom roles
  const dbRoles = await prisma.role.findMany({
    where: {
      OR: [
        { societyId: null },
        { societyId: society.id },
      ],
    },
    include: {
      rolePermissions: {
        include: {
          permission: {
            select: {
              id: true,
              code: true,
              name: true,
              module: true,
            },
          },
        },
      },
      memberRoles: {
        where: {
          societyMember: {
            societyId: society.id,
          },
        },
        include: {
          societyMember: {
            include: {
              user: {
                select: {
                  email: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: [
      { isSystem: "desc" },
      { name: "asc" },
    ],
  })

  const roles: RoleListItem[] = dbRoles.map((r) => ({
    id: r.id,
    name: r.name,
    code: r.code,
    description: r.description,
    isSystem: r.isSystem,
    societyId: r.societyId,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    permissions: r.rolePermissions.map((rp) => ({
      id: rp.permission.id,
      code: rp.permission.code,
      name: rp.permission.name,
      module: rp.permission.module,
    })),
    members: r.memberRoles.map((mr) => ({
      societyMemberId: mr.societyMember.id,
      email: mr.societyMember.user.email,
      designation: mr.societyMember.designation,
    })),
  }))

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-6 py-8 md:px-8">
      <AdminPageHeader
        eyebrow="Access Control & Governance"
        title="Roles & Permissions"
        description={`Manage operational roles, configure fine-grained module access, and control committee permissions for ${society.name}.`}
      />

      <RolesClientView
        societyCode={code}
        roles={roles}
        allPermissions={allPermissions}
        canManageRoles={canManageRoles}
      />
    </div>
  )
}
