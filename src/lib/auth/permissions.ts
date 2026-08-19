import { prisma } from "@/lib/prisma"
import type { SocietyAdminContext } from "@/lib/auth/getSocietyAdmin"
import { EXECUTIVE_ROLES } from "@/lib/auth/requireAuth"
import type { SocietyRole } from "@/generated/prisma/client"
import {
  STANDARD_PERMISSIONS,
  DEFAULT_ROLE_TEMPLATES,
  MODULE_ORDER,
  MODULE_LABELS,
  type PermissionDefinition,
} from "./permissionConstants"

export {
  STANDARD_PERMISSIONS,
  DEFAULT_ROLE_TEMPLATES,
  MODULE_ORDER,
  MODULE_LABELS,
  type PermissionDefinition,
}

/**
 * Ensures that all standard permissions and default system roles are present in the database.
 */
export async function ensurePermissionsSeeded(): Promise<void> {
  // 1. Seed standard permissions
  for (const perm of STANDARD_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: {
        name: perm.name,
        module: perm.module,
        description: perm.description,
      },
      create: {
        code: perm.code,
        name: perm.name,
        module: perm.module,
        description: perm.description,
      },
    })
  }

  // 2. Fetch all permissions to get their IDs
  const allPermissions = await prisma.permission.findMany()
  const permMap = new Map(allPermissions.map((p) => [p.code, p.id]))

  // 3. Seed default system roles (global template roles with societyId = null)
  for (const tpl of DEFAULT_ROLE_TEMPLATES) {
    let role = await prisma.role.findFirst({
      where: {
        societyId: null,
        code: tpl.code,
      },
    })

    if (!role) {
      role = await prisma.role.create({
        data: {
          name: tpl.name,
          code: tpl.code,
          description: tpl.description,
          isSystem: true,
          societyId: null,
        },
      })
    } else {
      await prisma.role.update({
        where: { id: role.id },
        data: {
          name: tpl.name,
          description: tpl.description,
          isSystem: true,
        },
      })
    }

    // Connect permissions
    const validPermIds = tpl.permissions
      .map((code) => permMap.get(code))
      .filter((id): id is string => Boolean(id))

    for (const permId of validPermIds) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permId,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permId,
        },
      })
    }
  }
}

/**
 * Returns all effective permission codes for a given user in a society.
 * Super Admins and President/Secretary/Treasurer automatically receive full permissions.
 */
export async function getMemberEffectivePermissions(
  userId: string,
  societyId: string
): Promise<Set<string>> {
  // Check user role
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { appRole: true },
  })

  if (user?.appRole === "SUPER_ADMIN") {
    return new Set(STANDARD_PERMISSIONS.map((p) => p.code))
  }

  const member = await prisma.societyMember.findFirst({
    where: {
      userId,
      societyId,
    },
    include: {
      customRoles: {
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!member) {
    return new Set()
  }

  // Executive officers have full management permissions
  if (EXECUTIVE_ROLES.includes(member.designation as SocietyRole)) {
    return new Set(STANDARD_PERMISSIONS.map((p) => p.code))
  }

  const permissions = new Set<string>()

  // Also include matching default system template for the member's designation if exists
  const matchingTemplate = DEFAULT_ROLE_TEMPLATES.find(
    (tpl) => tpl.code === member.designation
  )
  if (matchingTemplate) {
    matchingTemplate.permissions.forEach((p) => permissions.add(p))
  }

  // Add all custom assigned roles' permissions
  for (const memberRole of member.customRoles) {
    for (const rp of memberRole.role.rolePermissions) {
      permissions.add(rp.permission.code)
    }
  }

  return permissions
}

/**
 * Checks if the current society admin context has a specific permission.
 */
export function hasPermission(
  context: SocietyAdminContext,
  permissionCode: string,
  userPermissions?: Set<string>
): boolean {
  if (context.isSuperAdmin) return true
  if (EXECUTIVE_ROLES.includes(context.designation as SocietyRole)) return true
  if (userPermissions) {
    return userPermissions.has(permissionCode)
  }
  return false
}
