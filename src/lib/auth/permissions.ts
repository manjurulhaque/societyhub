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

let isPermissionsSeededCached = false

/**
 * Ensures that all standard permissions and default system roles are present in the database.
 */
export async function ensurePermissionsSeeded(force = false): Promise<void> {
  if (isPermissionsSeededCached && !force) {
    return
  }

  // Fast check: If permissions and system roles are already populated, skip heavy loop
  try {
    const [permCount, systemRoleCount] = await Promise.all([
      prisma.permission.count(),
      prisma.role.count({ where: { societyId: null, isSystem: true } }),
    ])

    if (!force && permCount >= STANDARD_PERMISSIONS.length && systemRoleCount >= DEFAULT_ROLE_TEMPLATES.length) {
      isPermissionsSeededCached = true
      return
    }
  } catch {
    // If table not ready, continue to seed
  }

  // 1. Batch seed standard permissions
  await prisma.permission.createMany({
    data: STANDARD_PERMISSIONS.map((perm) => ({
      code: perm.code,
      name: perm.name,
      module: perm.module,
      description: perm.description,
    })),
    skipDuplicates: true,
  })

  // 2. Fetch all permissions to get their IDs
  const allPermissions = await prisma.permission.findMany()
  const permMap = new Map(allPermissions.map((p) => [p.code, p.id]))

  // 3. Clean up legacy/duplicate system roles (e.g. ESTATE_MANAGER replaced by MANAGER)
  const validCodes = DEFAULT_ROLE_TEMPLATES.map((t) => t.code)

  const legacySystemRoles = await prisma.role.findMany({
    where: {
      societyId: null,
      isSystem: true,
      code: { notIn: validCodes },
    },
    include: {
      memberRoles: true,
    },
  })

  for (const legacyRole of legacySystemRoles) {
    if (legacyRole.code === "ESTATE_MANAGER") {
      const managerRole = await prisma.role.findFirst({
        where: { societyId: null, code: "MANAGER" },
      })
      if (managerRole) {
        for (const mr of legacyRole.memberRoles) {
          await prisma.societyMemberRole.upsert({
            where: {
              societyMemberId_roleId: {
                societyMemberId: mr.societyMemberId,
                roleId: managerRole.id,
              },
            },
            update: {},
            create: {
              societyMemberId: mr.societyMemberId,
              roleId: managerRole.id,
            },
          })
        }
      }
    }
    await prisma.role.delete({
      where: { id: legacyRole.id },
    })
  }

  // 4. Seed and deduplicate default system roles (global template roles with societyId = null)
  for (const tpl of DEFAULT_ROLE_TEMPLATES) {
    const existingRoles = await prisma.role.findMany({
      where: {
        societyId: null,
        OR: [
          { code: tpl.code },
          { name: tpl.name, isSystem: true },
        ],
      },
    })

    let role = existingRoles[0]

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
          code: tpl.code,
          description: tpl.description,
          isSystem: true,
        },
      })

      // Delete any duplicate roles with the same name or code
      if (existingRoles.length > 1) {
        for (let i = 1; i < existingRoles.length; i++) {
          await prisma.role.delete({ where: { id: existingRoles[i].id } })
        }
      }
    }

    // Connect permissions in batch
    const validPermIds = tpl.permissions
      .map((code) => permMap.get(code))
      .filter((id): id is string => Boolean(id))

    if (validPermIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: validPermIds.map((permId) => ({
          roleId: role.id,
          permissionId: permId,
        })),
        skipDuplicates: true,
      })
    }
  }

  isPermissionsSeededCached = true
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
