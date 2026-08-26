import crypto from "crypto"
import { headers } from "next/headers"
import { prisma } from "@/lib/prisma"
import { sanitizeAuditPayload } from "@/lib/auditSanitizer"
import { computeAuditSignature } from "@/lib/auditCrypto"
import { dispatchAuditAlertWebhook } from "@/lib/auditAlerts"
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
 * Normalizes client IP addresses by stripping IPv4-mapped IPv6 prefixes (::ffff:),
 * converting loopbacks (::1 -> 127.0.0.1), and removing proxy ports.
 */
export function normalizeIpAddress(rawIp?: string | null): string | null {
  if (!rawIp) return null

  let ip = rawIp.trim()

  // Strip IPv4-mapped IPv6 prefix (e.g., ::ffff:127.0.0.1 -> 127.0.0.1)
  if (ip.startsWith("::ffff:")) {
    ip = ip.substring(7)
  }

  // Normalize IPv6 loopback to standard IPv4 localhost
  if (ip === "::1") {
    return "127.0.0.1"
  }

  // Remove port if present on IPv4 (e.g. 127.0.0.1:54321 -> 127.0.0.1)
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+$/.test(ip)) {
    ip = ip.split(":")[0]
  }

  return ip || null
}

/**
 * Extracts and normalizes client IP and User-Agent from active Next.js request headers.
 * Supports Cloudflare (cf-connecting-ip), AWS/Nginx (x-forwarded-for, x-real-ip),
 * Akamai (true-client-ip), and standard server action contexts.
 */
async function getClientRequestMeta(): Promise<{ ipAddress: string | null; userAgent: string | null }> {
  try {
    const headerStore = await headers()
    
    const cfConnectingIp = headerStore.get("cf-connecting-ip")
    const trueClientIp = headerStore.get("true-client-ip")
    const xRealIp = headerStore.get("x-real-ip")
    const xClientIp = headerStore.get("x-client-ip")
    const forwardedFor = headerStore.get("x-forwarded-for")
    const userAgent = headerStore.get("user-agent") || null

    let rawIp: string | null = null

    if (cfConnectingIp) {
      rawIp = cfConnectingIp.trim()
    } else if (trueClientIp) {
      rawIp = trueClientIp.trim()
    } else if (xRealIp) {
      rawIp = xRealIp.trim()
    } else if (xClientIp) {
      rawIp = xClientIp.trim()
    } else if (forwardedFor) {
      // x-forwarded-for may be "client, proxy1, proxy2" -> first is original client
      const ips = forwardedFor.split(",").map((s) => s.trim()).filter(Boolean)
      rawIp = ips[0] || null
    }

    const ipAddress = normalizeIpAddress(rawIp)

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

    // Non-blocking trigger for high-risk alerts & webhooks
    void dispatchAuditAlertWebhook({
      id,
      action: payload.action,
      entity: payload.entity,
      entityId: payload.entityId ?? null,
      userId: payload.userId ?? null,
      societyId: payload.societyId ?? null,
      description: payload.description ?? null,
      ipAddress,
      userAgent,
      oldData: sanitizedOldData,
      newData: sanitizedNewData,
      createdAt,
    })
  } catch (error) {
    console.error("[AuditLog] Failed to record audit entry:", error)
  }
}

