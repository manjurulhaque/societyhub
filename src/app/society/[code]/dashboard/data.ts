import { cache } from "react"
import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"

/**
 * Dashboard data-fetching layer.
 *
 * Aggregate statistics (counts, sums) are cached for 60 seconds via
 * `unstable_cache` — these are expensive full-table scans that rarely
 * change between page loads.
 *
 * Recent item lists are request-scoped via React `cache()` — they must
 * always be fresh when navigating to the dashboard.
 */

// ──────────────────────────────────────────────
// CACHED AGGREGATE STATS (revalidate every 60s)
// ──────────────────────────────────────────────

export function getDashboardStats(societyId: string) {
  return unstable_cache(
    async () => {
      const [flatStatusCounts, totalPeople, totalMembers, billTotal, paymentTotal, blocks] =
        await Promise.all([
          prisma.flat.groupBy({
            by: ["status"],
            where: { block: { societyId }, isActive: true, deletedAt: null },
            _count: { _all: true },
          }),

          prisma.person.count({
            where: { societyId, isActive: true, deletedAt: null },
          }),

          prisma.societyMember.count({
            where: { societyId },
          }),

          prisma.bill.aggregate({
            where: { societyId },
            _sum: { amount: true },
          }),

          prisma.payment.aggregate({
            where: { societyId },
            _sum: { amount: true },
          }),

          prisma.block.findMany({
            where: { societyId, isActive: true, deletedAt: null },
            orderBy: { name: "asc" },
            include: {
              _count: {
                select: { flats: true },
              },
            },
          }),
        ])

      return { flatStatusCounts, totalPeople, totalMembers, billTotal, paymentTotal, blocks }
    },
    [`dashboard-stats-${societyId}`],
    { revalidate: 60, tags: [`dashboard-${societyId}`] },
  )()
}

// ──────────────────────────────────────────────
// FRESH PER-REQUEST RECENT ITEMS
// ──────────────────────────────────────────────

export const getRecentBills = cache(async (societyId: string) => {
  return prisma.bill.findMany({
    where: { societyId },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      flat: {
        select: {
          number: true,
          block: { select: { name: true } },
        },
      },
    },
  })
})

export const getRecentPayments = cache(async (societyId: string) => {
  return prisma.payment.findMany({
    where: { societyId },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      paidBy: { select: { name: true } },
      bill: {
        select: {
          year: true,
          month: true,
          flat: {
            select: {
              number: true,
              block: { select: { name: true } },
            },
          },
        },
      },
    },
  })
})
