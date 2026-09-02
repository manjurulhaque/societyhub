import { loadEnvFile } from "node:process"
try {
  loadEnvFile()
} catch {}

/**
 * Backfills cryptographic HMAC-SHA256 signatures for any legacy or unsealed audit logs
 * in the database, establishing unbroken Merkle hash chains from GENESIS.
 */
async function backfillAuditSignatures() {
  const { prisma } = await import("../src/lib/prisma")
  const { computeAuditSignature, verifyAuditTrailIntegrity } = await import("../src/lib/auditCrypto")

  console.log("================================================================================")
  console.log("       SARWS CONNECT AUDIT TRAIL CRYPTOGRAPHIC SEAL BACKFILL ENGINE              ")
  console.log("================================================================================\n")

  const societies = await prisma.society.findMany({ select: { id: true, name: true, code: true } })
  const scopes: Array<{ id: string | null; name: string }> = [
    ...societies.map((s) => ({ id: s.id, name: `${s.name} (${s.code})` })),
    { id: null, name: "GLOBAL / SYSTEM SCOPE" },
  ]

  let totalUpdated = 0

  for (const scope of scopes) {
    const logs = await prisma.auditLog.findMany({
      where: scope.id ? { societyId: scope.id } : { societyId: null },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    })

    if (logs.length === 0) {
      console.log(`▶ Scope [${scope.name}]: 0 logs found. Skipping.`)
      continue
    }

    console.log(`▶ Scope [${scope.name}]: Processing ${logs.length} records...`)

    let prevSig = "GENESIS"
    let scopeUpdates = 0

    for (const log of logs) {
      const expectedSig = computeAuditSignature({
        id: log.id,
        action: log.action,
        entity: log.entity,
        entityId: log.entityId,
        userId: log.userId,
        societyId: log.societyId,
        createdAt: log.createdAt,
        previousSignature: prevSig,
      })

      // If missing signature, mismatched previousSignature, or mismatched signature, update it
      if (log.signature !== expectedSig || log.previousSignature !== prevSig) {
        await prisma.auditLog.update({
          where: { id: log.id },
          data: {
            previousSignature: prevSig,
            signature: expectedSig,
          },
        })
        scopeUpdates++
        totalUpdated++
      }

      prevSig = expectedSig
    }

    // Verify unbroken chain after backfill
    const updatedLogs = await prisma.auditLog.findMany({
      where: scope.id ? { societyId: scope.id } : { societyId: null },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    })

    const verification = verifyAuditTrailIntegrity(updatedLogs)
    if (verification.isValid) {
      console.log(`  ✓ Successfully verified unbroken cryptographic chain for [${scope.name}] (${verification.verifiedCount} sealed records, ${scopeUpdates} updated).`)
    } else {
      console.error(`  ✗ Verification failed for [${scope.name}]: ${verification.message}`)
    }
  }

  console.log("\n================================================================================")
  console.log(`BACKFILL COMPLETE: ${totalUpdated} total audit records sealed & chained.`)
  console.log("================================================================================\n")
}

backfillAuditSignatures()
  .catch((e) => {
    console.error("Backfill failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    const { prisma } = await import("../src/lib/prisma")
    await prisma.$disconnect()
  })
