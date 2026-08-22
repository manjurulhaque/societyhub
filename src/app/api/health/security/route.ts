import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { encryptData, decryptData, isEncrypted } from "@/lib/crypto"
import { computeAuditSignature } from "@/lib/auditCrypto"
import { peekRateLimit, incrementRateLimit, resetRateLimit } from "@/lib/rateLimit"

export async function GET() {
  const timestamp = new Date().toISOString()
  const checks: Record<
    string,
    { status: "pass" | "fail"; latencyMs?: number; message?: string }
  > = {}

  let isHealthy = true

  // 1. Database Connectivity Probe
  const dbStart = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = {
      status: "pass",
      latencyMs: Date.now() - dbStart,
    }
  } catch (error) {
    isHealthy = false
    checks.database = {
      status: "fail",
      latencyMs: Date.now() - dbStart,
      message: error instanceof Error ? error.message : "Database probe failed",
    }
  }

  // 2. AES-256-GCM Cryptographic Engine Round-Trip Test
  const cryptoStart = Date.now()
  try {
    const canary = "societyhub-canary-token-998877"
    const encrypted = encryptData(canary)
    const decrypted = decryptData(encrypted)

    if (isEncrypted(encrypted) && decrypted === canary) {
      checks.encryption = {
        status: "pass",
        latencyMs: Date.now() - cryptoStart,
      }
    } else {
      isHealthy = false
      checks.encryption = {
        status: "fail",
        message: "Encryption cipher verification failed parity check",
      }
    }
  } catch (error) {
    isHealthy = false
    checks.encryption = {
      status: "fail",
      message: error instanceof Error ? error.message : "Crypto subsystem failed",
    }
  }

  // 3. HMAC-SHA256 Audit Trail Cryptographic Engine
  try {
    const sig = computeAuditSignature({
      id: "health-test",
      action: "LOGIN",
      entity: "HealthProbe",
      createdAt: timestamp,
    })

    if (sig && sig.length === 64) {
      checks.auditCrypto = { status: "pass" }
    } else {
      isHealthy = false
      checks.auditCrypto = { status: "fail", message: "Invalid signature length" }
    }
  } catch (error) {
    isHealthy = false
    checks.auditCrypto = {
      status: "fail",
      message: error instanceof Error ? error.message : "Audit crypto failed",
    }
  }

  // 4. In-Memory Sliding-Window Rate Limiter Engine
  try {
    const probeKey = `health:probe:${Date.now()}`
    const peekResult = peekRateLimit(probeKey, {
      maxRequests: 5,
      windowSeconds: 60,
    })
    const incResult = incrementRateLimit(probeKey, {
      maxRequests: 5,
      windowSeconds: 60,
    })
    resetRateLimit(probeKey)

    if (peekResult.allowed && incResult.allowed && incResult.remaining === 4) {
      checks.rateLimiter = { status: "pass" }
    } else {
      isHealthy = false
      checks.rateLimiter = { status: "fail", message: "Rate limiter cycle check failed" }
    }
  } catch (error) {
    isHealthy = false
    checks.rateLimiter = {
      status: "fail",
      message: error instanceof Error ? error.message : "Rate limiter failed",
    }
  }

  return NextResponse.json(
    {
      status: isHealthy ? "healthy" : "degraded",
      timestamp,
      checks,
    },
    {
      status: isHealthy ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
      },
    }
  )
}
