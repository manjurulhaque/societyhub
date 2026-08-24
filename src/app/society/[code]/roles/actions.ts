"use server"

import { revalidatePath } from "next/cache"
import { requireCommitteeAccess, EXECUTIVE_ROLES } from "@/lib/auth/requireAuth"
import { prisma } from "@/lib/prisma"
import { recordAuditLog } from "@/lib/audit"
import { sanitizeText } from "@/lib/sanitize"
import { getSafeErrorMessage } from "@/lib/errors"
import type { SocietyRole } from "@/generated/prisma/client"

import { createAdminClient } from "@/lib/supabase/admin"

export type RoleActionState = {
  success?: boolean
  error?: string
  message?: string
  setupLink?: string
}

/**
 * Creates a new custom role for the society with assigned permissions.
 */
export async function createCustomRole(
  societyCode: string,
  data: {
    name: string
    code?: string
    description?: string
    permissionIds: string[]
  }
): Promise<RoleActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, EXECUTIVE_ROLES)
    const societyId = context.society.id

    const rawName = data.name.trim()
    const name = sanitizeText(rawName)
    const description = data.description ? sanitizeText(data.description) : null
    const code =
      data.code?.trim().toUpperCase().replace(/\s+/g, "_") ||
      name.toUpperCase().replace(/[^A-Z0-9]+/g, "_")

    if (!name) {
      return { error: "Role name is required." }
    }

    // Check uniqueness within society
    const existing = await prisma.role.findFirst({
      where: {
        societyId,
        name: { equals: name, mode: "insensitive" },
      },
    })

    if (existing) {
      return { error: `A role named "${name}" already exists in this society.` }
    }

    // Create role
    const newRole = await prisma.role.create({
      data: {
        societyId,
        name,
        code,
        description,
        isSystem: false,
      },
    })

    // Assign permissions
    if (data.permissionIds && data.permissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: data.permissionIds.map((permissionId) => ({
          roleId: newRole.id,
          permissionId,
        })),
        skipDuplicates: true,
      })
    }

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "CREATE",
      entity: "Role",
      entityId: newRole.id,
      description: `${context.user.email} created custom role "${name}" with ${data.permissionIds.length} permissions`,
      newData: { name, code, description, permissionCount: data.permissionIds.length },
    })

    revalidatePath(`/society/${societyCode}/roles`)
    revalidatePath(`/society/${societyCode}/members`)

    return {
      success: true,
      message: `Custom role "${name}" created successfully.`,
    }
  } catch (err: unknown) {
    console.error("Failed to create custom role:", err)
    return { error: getSafeErrorMessage(err, "Failed to create role. Please try again.") }
  }
}

/**
 * Updates a role's name, description, and permission mappings.
 */
export async function updateRole(
  societyCode: string,
  roleId: string,
  data: {
    name: string
    code?: string
    description?: string
    permissionIds: string[]
  }
): Promise<RoleActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, EXECUTIVE_ROLES)
    const societyId = context.society.id

    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        rolePermissions: true,
      },
    })

    if (!role) {
      return { error: "Role not found." }
    }

    // If it's a society-specific role, verify tenant ownership
    if (role.societyId && role.societyId !== societyId) {
      return { error: "Access denied. Role belongs to another society." }
    }

    const rawName = data.name.trim()
    const name = sanitizeText(rawName)
    const description = data.description ? sanitizeText(data.description) : null

    if (!name) {
      return { error: "Role name cannot be empty." }
    }

    // For custom roles, update name & description
    if (!role.isSystem) {
      await prisma.role.update({
        where: { id: roleId },
        data: {
          name,
          description,
        },
      })
    }

    // Sync permissions: Delete removed, add new
    await prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({
        where: { roleId },
      })

      if (data.permissionIds && data.permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: data.permissionIds.map((permissionId) => ({
            roleId,
            permissionId,
          })),
          skipDuplicates: true,
        })
      }
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "UPDATE",
      entity: "Role",
      entityId: roleId,
      description: `${context.user.email} updated permissions for role "${role.name}" (${data.permissionIds.length} permissions configured)`,
      newData: { name, description, permissionCount: data.permissionIds.length },
    })

    revalidatePath(`/society/${societyCode}/roles`)
    revalidatePath(`/society/${societyCode}/members`)

    return {
      success: true,
      message: `Role "${role.name}" updated successfully.`,
    }
  } catch (err: unknown) {
    console.error("Failed to update role:", err)
    return { error: getSafeErrorMessage(err, "Failed to update role. Please try again.") }
  }
}

/**
 * Deletes a custom role (system roles cannot be deleted).
 */
export async function deleteCustomRole(
  societyCode: string,
  roleId: string
): Promise<RoleActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, EXECUTIVE_ROLES)
    const societyId = context.society.id

    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        _count: {
          select: {
            memberRoles: true,
          },
        },
      },
    })

    if (!role) {
      return { error: "Role not found." }
    }

    if (role.isSystem) {
      return { error: "Default system roles cannot be deleted." }
    }

    if (role.societyId !== societyId) {
      return { error: "Access denied. Role belongs to another society." }
    }

    if (role._count.memberRoles > 0) {
      return {
        error: `Cannot delete role "${role.name}" because it is currently assigned to ${role._count.memberRoles} member(s). Please reassign them first.`,
      }
    }

    await prisma.role.delete({
      where: { id: roleId },
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "DELETE",
      entity: "Role",
      entityId: roleId,
      description: `${context.user.email} deleted custom role "${role.name}"`,
    })

    revalidatePath(`/society/${societyCode}/roles`)
    revalidatePath(`/society/${societyCode}/members`)

    return {
      success: true,
      message: `Role "${role.name}" was deleted successfully.`,
    }
  } catch (err: unknown) {
    console.error("Failed to delete role:", err)
    return { error: getSafeErrorMessage(err, "Failed to delete role. Please try again.") }
  }
}

/**
 * Updates a society member's committee designation and assigned custom roles.
 */
export async function updateMemberRoleAssignment(
  societyCode: string,
  memberId: string,
  data: {
    designation: SocietyRole
    customRoleIds: string[]
  }
): Promise<RoleActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, EXECUTIVE_ROLES)
    const societyId = context.society.id

    const member = await prisma.societyMember.findUnique({
      where: { id: memberId },
      include: {
        user: { select: { email: true } },
      },
    })

    if (!member || member.societyId !== societyId) {
      return { error: "Society member not found." }
    }

    await prisma.$transaction(async (tx) => {
      // Update designation
      await tx.societyMember.update({
        where: { id: memberId },
        data: {
          designation: data.designation,
        },
      })

      // Sync custom roles
      await tx.societyMemberRole.deleteMany({
        where: { societyMemberId: memberId },
      })

      if (data.customRoleIds && data.customRoleIds.length > 0) {
        await tx.societyMemberRole.createMany({
          data: data.customRoleIds.map((roleId) => ({
            societyMemberId: memberId,
            roleId,
          })),
          skipDuplicates: true,
        })
      }
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "UPDATE",
      entity: "SocietyMember",
      entityId: memberId,
      description: `${context.user.email} updated role assignment for ${member.user.email} (Designation: ${data.designation}, Custom Roles: ${data.customRoleIds.length})`,
      newData: { designation: data.designation, customRoleIds: data.customRoleIds },
    })

    revalidatePath(`/society/${societyCode}/members`)
    revalidatePath(`/society/${societyCode}/roles`)

    return {
      success: true,
      message: `Role assignment for ${member.user.email} updated successfully.`,
    }
  } catch (err: unknown) {
    console.error("Failed to update member role assignment:", err)
    return { error: getSafeErrorMessage(err, "Failed to update member assignment.") }
  }
}

/**
 * Adds a user to the society's committee/staff with designation and roles.
 */
export async function addCommitteeMember(
  societyCode: string,
  data: {
    email: string
    designation: SocietyRole
    customRoleIds: string[]
    personId?: string | null
  }
): Promise<RoleActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, EXECUTIVE_ROLES)
    const societyId = context.society.id

    const rawEmail = data.email.trim().toLowerCase()
    const email = sanitizeText(rawEmail)
    if (!email) {
      return { error: "User email is required." }
    }

    // If personId provided, fetch and validate person
    let person = null
    if (data.personId) {
      person = await prisma.person.findFirst({
        where: {
          id: data.personId,
          societyId,
          deletedAt: null,
        },
      })

      if (!person) {
        return { error: "Selected resident not found in this society." }
      }

      // If person has no email recorded, update it
      if (!person.email) {
        await prisma.person.update({
          where: { id: person.id },
          data: { email },
        })
      }
    } else {
      // Check if person exists with this email in this society
      person = await prisma.person.findFirst({
        where: {
          societyId,
          email,
          deletedAt: null,
        },
      })
    }

    // Find user in database
    let user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      // Create user if not present (placeholder account for login activation)
      user = await prisma.user.create({
        data: {
          email,
          appRole: "USER",
        },
      })
    }

    // Link Person to User if not already linked
    if (person && !person.userId) {
      await prisma.person.update({
        where: { id: person.id },
        data: { userId: user.id },
      })
    }

    // Check if already a member
    const existing = await prisma.societyMember.findUnique({
      where: {
        societyId_userId: {
          societyId,
          userId: user.id,
        },
      },
    })

    if (existing) {
      return {
        error: `User ${email} is already a member of this society. You can edit their roles from the table.`,
      }
    }

    const newMember = await prisma.societyMember.create({
      data: {
        societyId,
        userId: user.id,
        designation: data.designation,
      },
    })

    if (data.customRoleIds && data.customRoleIds.length > 0) {
      await prisma.societyMemberRole.createMany({
        data: data.customRoleIds.map((roleId) => ({
          societyMemberId: newMember.id,
          roleId,
        })),
        skipDuplicates: true,
      })
    }

    const identifier = person ? `${person.name} (${email})` : email

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "CREATE",
      entity: "SocietyMember",
      entityId: newMember.id,
      description: `${context.user.email} added ${identifier} to Managing Committee with designation ${data.designation}`,
      newData: { email, personId: data.personId, designation: data.designation, customRoleIds: data.customRoleIds },
    })

    let setupLink: string | undefined = undefined

    // Trigger Supabase Auth invitation / activation email & generate setup link
    try {
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const supabaseAdmin = createAdminClient()
        const appUrl =
          process.env.NEXT_PUBLIC_SITE_URL ||
          process.env.NEXT_PUBLIC_APP_URL ||
          "http://localhost:3000"
        const redirectTo = `${appUrl}/auth/callback?next=/auth/set-password`

        // 1. Generate direct setup link
        try {
          const linkRes = await supabaseAdmin.auth.admin.generateLink({
            type: "invite",
            email,
            options: {
              redirectTo,
            },
          })

          if (!linkRes.error && linkRes.data?.properties?.action_link) {
            setupLink = linkRes.data.properties.action_link
          }
        } catch (linkErr) {
          console.log("Direct link note:", linkErr)
        }

        // 2. Also dispatch outbound email
        try {
          const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            redirectTo,
            data: {
              name: person?.name || undefined,
              societyName: context.society.name,
              designation: data.designation,
            },
          })

          if (inviteError) {
            console.log(`Supabase invite note for ${email}:`, inviteError.message)
          }
        } catch (inviteErr) {
          console.warn("Outbound invite email could not be sent:", inviteErr)
        }
      }
    } catch (authErr) {
      console.warn("Supabase auth integration note:", authErr)
    }

    revalidatePath(`/society/${societyCode}/members`)
    revalidatePath(`/society/${societyCode}/roles`)

    return {
      success: true,
      setupLink,
      message: `${identifier} was added as ${data.designation.replace(/_/g, " ")}.`,
    }
  } catch (err: unknown) {
    console.error("Failed to add committee member:", err)
    return { error: getSafeErrorMessage(err, "Failed to add member.") }
  }
}

/**
 * Generates an activation or password recovery link for a committee member on demand.
 */
export async function getMemberActivationLink(
  societyCode: string,
  email: string
): Promise<{ success?: boolean; error?: string; setupLink?: string }> {
  try {
    await requireCommitteeAccess(societyCode, EXECUTIVE_ROLES)
    const rawEmail = email.trim().toLowerCase()

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return { error: "Supabase service role key is not configured in .env." }
    }

    const supabaseAdmin = createAdminClient()
    const appUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000"
    const redirectTo = `${appUrl}/auth/callback?next=/auth/set-password`

    // 1. Try generating an invite link
    const inviteRes = await supabaseAdmin.auth.admin.generateLink({
      type: "invite",
      email: rawEmail,
      options: {
        redirectTo,
      },
    })

    if (!inviteRes.error && inviteRes.data?.properties?.action_link) {
      return {
        success: true,
        setupLink: inviteRes.data.properties.action_link,
      }
    }

    // 2. If user already exists in Supabase Auth, generate a recovery link
    const recoveryRes = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: rawEmail,
      options: {
        redirectTo,
      },
    })

    if (recoveryRes.error) {
      return { error: recoveryRes.error.message }
    }

    return {
      success: true,
      setupLink: recoveryRes.data?.properties?.action_link,
    }
  } catch (err: unknown) {
    console.error("Failed to generate activation link:", err)
    return { error: getSafeErrorMessage(err, "Failed to generate link.") }
  }
}

/**
 * Removes a member from the society committee.
 */
export async function removeCommitteeMember(
  societyCode: string,
  memberId: string
): Promise<RoleActionState> {
  try {
    const context = await requireCommitteeAccess(societyCode, EXECUTIVE_ROLES)
    const societyId = context.society.id

    const member = await prisma.societyMember.findUnique({
      where: { id: memberId },
      include: {
        user: { select: { email: true } },
      },
    })

    if (!member || member.societyId !== societyId) {
      return { error: "Society member not found." }
    }

    // Safety: Prevent removing self if doing so leaves no executive
    if (member.userId === context.user.id && !context.isSuperAdmin) {
      const executiveCount = await prisma.societyMember.count({
        where: {
          societyId,
          designation: { in: ["PRESIDENT", "SECRETARY", "TREASURER"] },
        },
      })
      if (executiveCount <= 1) {
        return {
          error: "You cannot remove yourself when you are the only remaining executive officer.",
        }
      }
    }

    await prisma.societyMember.delete({
      where: { id: memberId },
    })

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "DELETE",
      entity: "SocietyMember",
      entityId: memberId,
      description: `${context.user.email} removed ${member.user.email} (${member.designation}) from the committee`,
    })

    revalidatePath(`/society/${societyCode}/members`)
    revalidatePath(`/society/${societyCode}/roles`)

    return {
      success: true,
      message: `${member.user.email} was removed from the committee.`,
    }
  } catch (err: unknown) {
    console.error("Failed to remove committee member:", err)
    return { error: getSafeErrorMessage(err, "Failed to remove member.") }
  }
}
