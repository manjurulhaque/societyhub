import { prisma } from "@/lib/prisma"
import type { AuditAction } from "@/generated/prisma/client"

export interface AuditLogPayload {
  societyId?: string | null
  userId?: string | null
  action: AuditAction
  entity: string
  entityId?: string | null
  oldData?: unknown
  newData?: unknown

  ipAddress?: string | null
  userAgent?: string | null
  description?: string | null
}

/**
 * Records an audit log entry in the database.
 * Wrapped in a safe try/catch so auditing errors never fail the primary business operation.
 */
export async function recordAuditLog(payload: AuditLogPayload): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        societyId: payload.societyId ?? null,
        userId: payload.userId ?? null,
        action: payload.action,
        entity: payload.entity,
        entityId: payload.entityId ?? null,
        oldData: payload.oldData ? JSON.parse(JSON.stringify(payload.oldData)) : undefined,
        newData: payload.newData ? JSON.parse(JSON.stringify(payload.newData)) : undefined,
        ipAddress: payload.ipAddress ?? null,
        userAgent: payload.userAgent ?? null,
        description: payload.description ?? null,
      },
    })
  } catch (error) {
    console.error("[AuditLog] Failed to record audit entry:", error)
  }
}
