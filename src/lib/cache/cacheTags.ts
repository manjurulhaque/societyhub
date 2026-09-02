/**
 * Centralized Cache Tag & Keyed Revalidation Architecture
 *
 * Provides standardized cache tag generators and revalidation utilities
 * for high-performance cached data fetching and instant atomic invalidation
 * across billing, payments, accounts, ledgers, and reporting domains.
 */

import { revalidateTag, updateTag, revalidatePath } from "next/cache"
import { logger } from "@/lib/logger"

/**
 * Standardized Cache Tag Generators
 */
export const CACHE_TAGS = {
  // Billing tags
  bills: (societyCode: string) => `bills:${societyCode.toLowerCase()}`,
  billDetail: (billId: string) => `bill:${billId}`,
  flatBills: (flatId: string) => `bills:flat:${flatId}`,

  // Payments tags
  payments: (societyCode: string) => `payments:${societyCode.toLowerCase()}`,
  paymentDetail: (paymentId: string) => `payment:${paymentId}`,
  flatPayments: (flatId: string) => `payments:flat:${flatId}`,

  // Accounts & Treasury tags
  accounts: (societyCode: string) => `accounts:${societyCode.toLowerCase()}`,
  accountDetail: (accountId: string) => `account:${accountId}`,

  // Ledgers & Vouchers tags
  ledgers: (societyCode: string) => `ledgers:${societyCode.toLowerCase()}`,
  vouchers: (societyCode: string) => `vouchers:${societyCode.toLowerCase()}`,

  // Reports & Analytics tags
  reports: (societyCode: string) => `reports:${societyCode.toLowerCase()}`,
  dashboard: (societyCode: string) => `dashboard:${societyCode.toLowerCase()}`,

  // Flats & Members tags
  flats: (societyCode: string) => `flats:${societyCode.toLowerCase()}`,
  flatDetail: (flatId: string) => `flat:${flatId}`,
  members: (societyCode: string) => `members:${societyCode.toLowerCase()}`,
} as const

export interface InvalidationOptions {
  flatId?: string
  billId?: string
  paymentId?: string
  accountId?: string
}

/**
 * Atomically invalidates billing cache tags and associated page routes
 */
export function revalidateBillCache(societyCode: string, options?: InvalidationOptions) {
  const code = societyCode.toLowerCase()
  const tagsToInvalidate: string[] = [
    CACHE_TAGS.bills(code),
    CACHE_TAGS.reports(code),
    CACHE_TAGS.dashboard(code),
  ]

  if (options?.billId) {
    tagsToInvalidate.push(CACHE_TAGS.billDetail(options.billId))
  }
  if (options?.flatId) {
    tagsToInvalidate.push(CACHE_TAGS.flatBills(options.flatId))
    tagsToInvalidate.push(CACHE_TAGS.flatDetail(options.flatId))
  }

  // Invalidate cache tags
  for (const tag of tagsToInvalidate) {
    try {
      updateTag(tag)
    } catch {
      try {
        revalidateTag(tag, { expire: 0 })
      } catch {
        // Non-fatal if called outside cache context
      }
    }
  }

  // Invalidate Next.js route paths
  revalidatePath(`/society/${societyCode}/bills`)
  revalidatePath(`/society/${societyCode}/payments`)
  revalidatePath(`/society/${societyCode}/reports`)
  revalidatePath(`/society/${societyCode}/dashboard`)
  if (options?.flatId) {
    revalidatePath(`/society/${societyCode}/flats/${options.flatId}`)
  }

  logger.debug(`Invalidated bill cache tags for society ${societyCode}`, "revalidateBillCache", {
    tags: tagsToInvalidate,
    options,
  })
}

/**
 * Atomically invalidates payment cache tags and associated billing/account routes
 */
export function revalidatePaymentCache(societyCode: string, options?: InvalidationOptions) {
  const code = societyCode.toLowerCase()
  const tagsToInvalidate: string[] = [
    CACHE_TAGS.payments(code),
    CACHE_TAGS.bills(code),
    CACHE_TAGS.accounts(code),
    CACHE_TAGS.reports(code),
    CACHE_TAGS.dashboard(code),
  ]

  if (options?.paymentId) {
    tagsToInvalidate.push(CACHE_TAGS.paymentDetail(options.paymentId))
  }
  if (options?.flatId) {
    tagsToInvalidate.push(CACHE_TAGS.flatPayments(options.flatId))
    tagsToInvalidate.push(CACHE_TAGS.flatBills(options.flatId))
    tagsToInvalidate.push(CACHE_TAGS.flatDetail(options.flatId))
  }
  if (options?.accountId) {
    tagsToInvalidate.push(CACHE_TAGS.accountDetail(options.accountId))
  }

  // Invalidate cache tags
  for (const tag of tagsToInvalidate) {
    try {
      updateTag(tag)
    } catch {
      try {
        revalidateTag(tag, { expire: 0 })
      } catch {
        // Non-fatal if called outside cache context
      }
    }
  }

  // Invalidate Next.js route paths
  revalidatePath(`/society/${societyCode}/payments`)
  revalidatePath(`/society/${societyCode}/bills`)
  revalidatePath(`/society/${societyCode}/accounts`)
  revalidatePath(`/society/${societyCode}/reports`)
  revalidatePath(`/society/${societyCode}/dashboard`)
  if (options?.flatId) {
    revalidatePath(`/society/${societyCode}/flats/${options.flatId}`)
  }

  logger.debug(`Invalidated payment cache tags for society ${societyCode}`, "revalidatePaymentCache", {
    tags: tagsToInvalidate,
    options,
  })
}

/**
 * Invalidates complete society treasury and accounting cache
 */
export function revalidateSocietyTreasuryCache(societyCode: string) {
  const code = societyCode.toLowerCase()
  const tagsToInvalidate: string[] = [
    CACHE_TAGS.payments(code),
    CACHE_TAGS.bills(code),
    CACHE_TAGS.accounts(code),
    CACHE_TAGS.ledgers(code),
    CACHE_TAGS.vouchers(code),
    CACHE_TAGS.reports(code),
    CACHE_TAGS.dashboard(code),
  ]

  for (const tag of tagsToInvalidate) {
    try {
      updateTag(tag)
    } catch {
      try {
        revalidateTag(tag, { expire: 0 })
      } catch {
        // Non-fatal
      }
    }
  }

  revalidatePath(`/society/${societyCode}/payments`)
  revalidatePath(`/society/${societyCode}/bills`)
  revalidatePath(`/society/${societyCode}/accounts`)
  revalidatePath(`/society/${societyCode}/ledgers`)
  revalidatePath(`/society/${societyCode}/reports`)
  revalidatePath(`/society/${societyCode}/dashboard`)

  logger.debug(`Invalidated treasury cache tags for society ${societyCode}`, "revalidateSocietyTreasuryCache", {
    tags: tagsToInvalidate,
  })
}
