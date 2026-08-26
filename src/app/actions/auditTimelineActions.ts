"use server"

import { prisma } from "@/lib/prisma"
import { computeAuditSignature } from "@/lib/auditCrypto"
import { createClient } from "@/lib/supabase/server"
import type { AuditLogDetailData } from "@/components/audit/AuditLogDetailModal"

export interface GetEntityAuditHistoryParams {
  entity: string
  entityId: string
  societyId?: string | null
  relatedEntityIds?: string[]
}

export interface EntityAuditHistoryResponse {
  success: boolean
  logs: AuditLogDetailData[]
  error?: string
}

/**
 * Server action to fetch and cryptographically verify all chronological audit logs
 * associated with a specific entity (and optional related entities like ownership links).
 */
export async function getEntityAuditHistory(
  params: GetEntityAuditHistoryParams
): Promise<EntityAuditHistoryResponse> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, logs: [], error: "Unauthorized" }
    }

    const { entity, entityId, societyId, relatedEntityIds = [] } = params
    const allEntityIds = Array.from(
      new Set([entityId, ...relatedEntityIds].filter(Boolean))
    )

    const logs = await prisma.auditLog.findMany({
      where: {
        AND: [
          societyId ? { societyId } : {},
          {
            OR: [
              { entityId: { in: allEntityIds } },
              { entity, entityId },
            ],
          },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            appRole: true,
          },
        },
        society: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    })

    const validatedLogs: AuditLogDetailData[] = logs.map((log) => {
      const isSealValid = log.signature
        ? computeAuditSignature({
            id: log.id,
            action: log.action,
            entity: log.entity,
            entityId: log.entityId,
            userId: log.userId,
            societyId: log.societyId,
            createdAt: log.createdAt,
            previousSignature: log.previousSignature || "GENESIS",
          }) === log.signature
        : false

      return {
        id: log.id,
        societyId: log.societyId,
        userId: log.userId,
        action: log.action,
        entity: log.entity,
        entityId: log.entityId,
        oldData: log.oldData,
        newData: log.newData,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        description: log.description,
        signature: log.signature,
        previousSignature: log.previousSignature,
        createdAt: log.createdAt.toISOString(),
        isSealValid,
        user: log.user,
        society: log.society,
      }
    })

    return {
      success: true,
      logs: validatedLogs,
    }
  } catch (error) {
    console.error("[AuditTimeline] Error fetching entity audit history:", error)
    return {
      success: false,
      logs: [],
      error: "Failed to retrieve audit history.",
    }
  }
}
