import { getAdmin } from "@/lib/auth/getAdmin"
import { getSocietyAdmin, type SocietyAdminContext } from "@/lib/auth/getSocietyAdmin"
import { getCurrentUser } from "@/lib/auth/getCurrentUser"
import type { SocietyRole } from "@/generated/prisma/client"

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized. Please log in to continue.") {
    super(message)
    this.name = "UnauthorizedError"
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden. You do not have permission to perform this action.") {
    super(message)
    this.name = "ForbiddenError"
  }
}

/**
 * Standard Managing Committee roles with operational authority
 */
export const COMMITTEE_ROLES: SocietyRole[] = [
  "PRESIDENT",
  "VICE_PRESIDENT",
  "SECRETARY",
  "JOINT_SECRETARY",
  "TREASURER",
  "MANAGER",
  "ACCOUNTANT",
]

/**
 * Roles with authority to disburse funds, manage accounts, and modify ledgers
 */
export const FINANCIAL_ROLES: SocietyRole[] = [
  "PRESIDENT",
  "TREASURER",
  "ACCOUNTANT",
  "MANAGER",
]

/**
 * Executive officers for governance and high-impact statutory alterations
 */
export const EXECUTIVE_ROLES: SocietyRole[] = [
  "PRESIDENT",
  "SECRETARY",
  "TREASURER",
]

/**
 * Roles with legal authority to approve data entries and disbursements entered by managers
 */
export const APPROVAL_ROLES: SocietyRole[] = [
  "PRESIDENT",
  "SECRETARY",
  "TREASURER",
]

/**
 * Helper to check if a user designation has approval authority
 */
export function canApproveDataEntry(designation?: string, isSuperAdmin = false): boolean {
  if (isSuperAdmin) return true
  if (!designation) return false
  return APPROVAL_ROLES.includes(designation as SocietyRole)
}

/**
 * Helper to check if a user is in a manager/operational data entry role
 */
export function isManagerRole(designation?: string, isSuperAdmin = false): boolean {
  if (isSuperAdmin) return false
  return designation === "MANAGER" || designation === "ACCOUNTANT"
}

/**
 * Enforces that the current authenticated user is a SUPER_ADMIN.
 * Throws UnauthorizedError or ForbiddenError if check fails.
 */
export async function requireSuperAdmin() {
  const admin = await getAdmin()

  if (!admin) {
    const user = await getCurrentUser()
    if (!user) {
      throw new UnauthorizedError()
    }
    throw new ForbiddenError("Super Admin privileges are required to perform this action.")
  }

  return admin
}

/**
 * Enforces that the current authenticated user has active membership or admin access
 * to the specified society (by code or ID).
 * Throws UnauthorizedError or ForbiddenError if check fails.
 * Returns the resolved SocietyAdminContext with tenant-scoped society details.
 */
export async function requireSocietyAccess(societyCodeOrId: string): Promise<SocietyAdminContext> {
  if (!societyCodeOrId || typeof societyCodeOrId !== "string") {
    throw new ForbiddenError("A valid society identifier is required.")
  }

  const context = await getSocietyAdmin(societyCodeOrId)

  if (!context) {
    const user = await getCurrentUser()
    if (!user) {
      throw new UnauthorizedError()
    }
    throw new ForbiddenError("You do not have access to this society.")
  }

  return context
}

/**
 * Enforces that the current authenticated user belongs to the Managing Committee
 * with one of the specified roles (or is a Super Admin).
 * Throws ForbiddenError if user is a regular resident member or security guard.
 */
export async function requireCommitteeAccess(
  societyCodeOrId: string,
  allowedRoles: SocietyRole[] = COMMITTEE_ROLES
): Promise<SocietyAdminContext> {
  const context = await requireSocietyAccess(societyCodeOrId)

  if (context.isSuperAdmin) {
    return context
  }

  const designation = context.designation as SocietyRole
  if (!allowedRoles.includes(designation)) {
    throw new ForbiddenError(
      `Permission denied: Committee role (${allowedRoles.join(", ")}) required for this operation.`
    )
  }

  return context
}

/**
 * Enforces that the current authenticated user is a Treasurer, Secretary, President, or Super Admin
 * who has authority to approve or reject pending data entries submitted by managers.
 */
export async function requireApprovalAccess(societyCodeOrId: string): Promise<SocietyAdminContext> {
  return requireCommitteeAccess(societyCodeOrId, APPROVAL_ROLES)
}


