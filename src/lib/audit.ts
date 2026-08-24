import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { sanitizeAuditPayload } from "@/lib/auditSanitizer"
import { computeAuditSignature } from "@/lib/auditCrypto"
import type { Prisma, AuditAction } from "@/generated/prisma/client"

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
 * Computes cryptographic HMAC-SHA256 signature chained to previous record for tamper-evidence.
 * Wrapped in a safe try/catch so auditing errors never fail the primary business operation.
 */
export async function recordAuditLog(payload: AuditLogPayload): Promise<void> {
  try {
    const sanitizedOldData = payload.oldData !== undefined ? sanitizeAuditPayload(payload.oldData) : undefined
    const sanitizedNewData = payload.newData !== undefined ? sanitizeAuditPayload(payload.newData) : undefined

    const id = crypto.randomUUID()
    const createdAt = new Date()

    // Fetch the latest entry in this scope to continue the hash chain
    const latestLog = await prisma.auditLog.findFirst({
      where: payload.societyId ? { societyId: payload.societyId } : {},
      orderBy: { createdAt: "desc" },
      select: { signature: true },
    })

    const previousSignature = latestLog?.signature || "GENESIS"

    const signature = computeAuditSignature({
      id,
      action: payload.action,
      entity: payload.entity,
      entityId: payload.entityId ?? null,
      userId: payload.userId ?? null,
      societyId: payload.societyId ?? null,
      createdAt,
      previousSignature,
    })

    await prisma.auditLog.create({
      data: {
        id,
        societyId: payload.societyId ?? null,
        userId: payload.userId ?? null,
        action: payload.action,
        entity: payload.entity,
        entityId: payload.entityId ?? null,
        oldData: (sanitizedOldData !== undefined ? sanitizedOldData : undefined) as Prisma.InputJsonValue | undefined,
        newData: (sanitizedNewData !== undefined ? sanitizedNewData : undefined) as Prisma.InputJsonValue | undefined,
        ipAddress: payload.ipAddress ?? null,
        userAgent: payload.userAgent ?? null,
        description: payload.description ?? null,
        signature,
        previousSignature,
        createdAt,
      },
    })
  } catch (error) {
    console.error("[AuditLog] Failed to record audit entry:", error)
  }
}

