import crypto from "crypto"
import { headers } from "next/headers"
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
 * Extracts client IP and User-Agent from active Next.js request headers.
 * Safely handles server actions, route handlers, and non-request contexts (CLI/scripts).
 */
async function getClientRequestMeta(): Promise<{ ipAddress: string | null; userAgent: string | null }> {
  try {
    const headerStore = await headers()
    const cfConnectingIp = headerStore.get("cf-connecting-ip")
    const forwardedFor = headerStore.get("x-forwarded-for")
    const realIp = headerStore.get("x-real-ip")
    const userAgent = headerStore.get("user-agent") || null

    const ipAddress =
      cfConnectingIp ||
      (forwardedFor ? forwardedFor.split(",")[0].trim() : null) ||
      realIp ||
      null

    return { ipAddress, userAgent }
  } catch {
    // Graceful fallback when executed outside Next.js request context (CLI, cron, tests)
    return { ipAddress: null, userAgent: null }
  }
}

/**
 * Records an audit log entry in the database.
 * Automatically extracts IP Address & User-Agent from active request headers if not provided.
 * Automatically sanitizes secrets, tokens, passwords, and masks PII in payload data.
 * Computes cryptographic HMAC-SHA256 signature chained to previous record for tamper-evidence.
 * Wrapped in a safe try/catch so auditing errors never fail the primary business operation.
 */
export async function recordAuditLog(payload: AuditLogPayload): Promise<void> {
  try {
    const sanitizedOldData = payload.oldData !== undefined ? sanitizeAuditPayload(payload.oldData) : undefined
    const sanitizedNewData = payload.newData !== undefined ? sanitizeAuditPayload(payload.newData) : undefined

    let ipAddress = payload.ipAddress ?? null
    let userAgent = payload.userAgent ?? null

    if (!ipAddress || !userAgent) {
      const meta = await getClientRequestMeta()
      if (!ipAddress) ipAddress = meta.ipAddress
      if (!userAgent) userAgent = meta.userAgent
    }

    const id = crypto.randomUUID()
    const createdAt = new Date()

    // Fetch the latest entry in this scope to continue the hash chain
    const latestLog = await prisma.auditLog.findFirst({
      where: payload.societyId ? { societyId: payload.societyId } : { societyId: null },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
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
        ipAddress,
        userAgent,
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

