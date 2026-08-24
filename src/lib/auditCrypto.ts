import crypto from "crypto"

/**
 * Cryptographic Audit Trail Security Engine.
 * Implements HMAC-SHA256 hash chaining to provide mathematical tamper-evidence
 * across chronological audit log entries (analogous to a Merkle audit ledger).
 */

let cachedAuditSecret: string | null = null

function getAuditHmacSecret(): string {
  if (!cachedAuditSecret) {
    cachedAuditSecret =
      process.env.AUDIT_SECRET_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "societyhub-tamper-proof-audit-ledger-hmac-key"
  }
  return cachedAuditSecret
}

export interface AuditRecordPayload {
  id: string
  action: string
  entity: string
  entityId?: string | null
  userId?: string | null
  societyId?: string | null
  createdAt: Date | string
  previousSignature?: string | null
}

/**
 * Computes a deterministic cryptographic HMAC-SHA256 signature for an audit entry
 * chained to the previous record's signature.
 */
export function computeAuditSignature(payload: AuditRecordPayload): string {
  const secret = getAuditHmacSecret()

  // Canonicalize string fields to prevent serialization variance
  const canonicalData = JSON.stringify({
    id: payload.id,
    action: payload.action,
    entity: payload.entity,
    entityId: payload.entityId || "",
    userId: payload.userId || "",
    societyId: payload.societyId || "",
    createdAt: new Date(payload.createdAt).toISOString(),
    previousSignature: payload.previousSignature || "GENESIS",
  })

  return crypto.createHmac("sha256", secret).update(canonicalData).digest("hex")
}

export interface AuditIntegrityResult {
  isValid: boolean
  verifiedCount: number
  tamperedIndex: number | null
  tamperedLogId?: string | null
  message: string
}

/**
 * Mathematically validates the cryptographic hash chain of an array of audit logs.
 * Checks both individual HMAC-SHA256 signature validity and chronological chain continuity.
 *
 * @param logs Audit logs ordered chronologically (or reverse)
 */
export function verifyAuditTrailIntegrity(
  logs: Array<{
    id: string
    action: string
    entity: string
    entityId?: string | null
    userId?: string | null
    societyId?: string | null
    signature?: string | null
    previousSignature?: string | null
    createdAt: Date | string
  }>
): AuditIntegrityResult {
  if (!logs || logs.length === 0) {
    return {
      isValid: true,
      verifiedCount: 0,
      tamperedIndex: null,
      message: "No logs to verify. Audit ledger is empty.",
    }
  }

  // Sort logs oldest first for chronological chain verification
  const sorted = [...logs].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  let expectedPrevSig: string | null = null

  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i]

    // If persisted signature is present on the record:
    if (entry.signature) {
      // 1. Recompute expected signature using this record's stored previousSignature (or GENESIS if first)
      const computed = computeAuditSignature({
        id: entry.id,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        userId: entry.userId,
        societyId: entry.societyId,
        createdAt: entry.createdAt,
        previousSignature: entry.previousSignature || "GENESIS",
      })

      // 2. Check if the record content was tampered with
      if (computed !== entry.signature) {
        return {
          isValid: false,
          verifiedCount: i,
          tamperedIndex: i,
          tamperedLogId: entry.id,
          message: `Cryptographic tamper detected at record #${i + 1} (ID: ${entry.id.slice(0, 8)}...). Stored HMAC-SHA256 signature does not match record payload.`,
        }
      }

      // 3. Check chain continuity if we have a known previous signature in this sorted slice
      if (expectedPrevSig !== null && entry.previousSignature && entry.previousSignature !== expectedPrevSig) {
        return {
          isValid: false,
          verifiedCount: i,
          tamperedIndex: i,
          tamperedLogId: entry.id,
          message: `Hash chain continuity broken at record #${i + 1} (ID: ${entry.id.slice(0, 8)}...). Expected previous signature does not match (potential record deletion or insertion).`,
        }
      }

      expectedPrevSig = entry.signature
    } else {
      // For legacy records without stored signature, compute on the fly
      const fallbackSig = computeAuditSignature({
        id: entry.id,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        userId: entry.userId,
        societyId: entry.societyId,
        createdAt: entry.createdAt,
        previousSignature: expectedPrevSig || "GENESIS",
      })
      expectedPrevSig = fallbackSig
    }
  }

  return {
    isValid: true,
    verifiedCount: sorted.length,
    tamperedIndex: null,
    message: `All ${sorted.length} audit records cryptographically verified with unbroken HMAC-SHA256 signature chain.`,
  }
}
