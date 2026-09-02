/**
 * High-Performance Tagged Data Cache Queries
 *
 * Utilizes Next.js `unstable_cache` with domain-specific cache tags
 * for sub-millisecond data retrieval with instant cache invalidation upon mutations.
 */

import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"
import { CACHE_TAGS } from "./cacheTags"

/**
 * Retrieves aggregate billing statistics for a society with cache tagging
 */
export const getCachedBillsSummary = unstable_cache(
  async (societyId: string, societyCode: string) => {
    const [totalCount, pendingCount, paidCount, overdueCount, aggregate] = await Promise.all([
      prisma.bill.count({ where: { societyId } }),
      prisma.bill.count({ where: { societyId, status: "PENDING" } }),
      prisma.bill.count({ where: { societyId, status: "PAID" } }),
      prisma.bill.count({ where: { societyId, status: "OVERDUE" } }),
      prisma.bill.aggregate({
        where: { societyId },
        _sum: { amount: true },
      }),
    ])

    return {
      totalCount,
      pendingCount,
      paidCount,
      overdueCount,
      totalAmount: Number(aggregate._sum.amount || 0),
    }
  },
  ["bills-summary"],
  {
    revalidate: 300, // 5 min background revalidation
    tags: ["bills"],
  }
)

/**
 * Retrieves aggregate payment statistics for a society with cache tagging
 */
export const getCachedPaymentsSummary = unstable_cache(
  async (societyId: string, societyCode: string) => {
    const [totalCount, successfulCount, aggregate] = await Promise.all([
      prisma.payment.count({ where: { societyId } }),
      prisma.payment.count({ where: { societyId, status: "SUCCESS" } }),
      prisma.payment.aggregate({
        where: { societyId, status: "SUCCESS" },
        _sum: { amount: true },
      }),
    ])

    return {
      totalCount,
      successfulCount,
      totalCollected: Number(aggregate._sum.amount || 0),
    }
  },
  ["payments-summary"],
  {
    revalidate: 300, // 5 min background revalidation
    tags: ["payments"],
  }
)
