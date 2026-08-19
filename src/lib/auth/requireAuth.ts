import { getAdmin } from "@/lib/auth/getAdmin"
import { getSocietyAdmin, type SocietyAdminContext } from "@/lib/auth/getSocietyAdmin"
import { getCurrentUser } from "@/lib/auth/getCurrentUser"

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
 * Enforces that the current authenticated user has administrative / management access
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
    throw new ForbiddenError("You do not have administrative access to this society.")
  }

  return context
}
