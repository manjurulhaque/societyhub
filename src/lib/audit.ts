import { prisma } from "@/lib/prisma"
import { sanitizeAuditPayload } from "@/lib/auditSanitizer"
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
 * Automatically sanitizes secrets, tokens, passwords, and masks PII in payload data.
 * Wrapped in a safe try/catch so auditing errors never fail the primary business operation.
 */
export async function recordAuditLog(payload: AuditLogPayload): Promise<void> {
  try {
    const sanitizedOldData = payload.oldData !== undefined ? sanitizeAuditPayload(payload.oldData) : undefined
    const sanitizedNewData = payload.newData !== undefined ? sanitizeAuditPayload(payload.newData) : undefined

    await prisma.auditLog.create({
      data: {
        societyId: payload.societyId ?? null,
        userId: payload.userId ?? null,
        action: payload.action,
        entity: payload.entity,
        entityId: payload.entityId ?? null,
        oldData: sanitizedOldData ? JSON.parse(JSON.stringify(sanitizedOldData)) : undefined,
        newData: sanitizedNewData ? JSON.parse(JSON.stringify(sanitizedNewData)) : undefined,
        ipAddress: payload.ipAddress ?? null,
        userAgent: payload.userAgent ?? null,
        description: payload.description ?? null,
      },
    })
  } catch (error) {
    console.error("[AuditLog] Failed to record audit entry:", error)
  }
}
