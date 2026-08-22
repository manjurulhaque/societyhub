interface RateLimitRecord {
  count: number
  expiresAt: number
}

const MAX_RATE_LIMIT_ENTRIES = 10000

// In-memory store for rate limiting by identifier (e.g. IP, user ID, or composite key)
const rateLimitMap = new Map<string, RateLimitRecord>()

/**
 * Sweeps expired records and ensures memory map does not exceed MAX_RATE_LIMIT_ENTRIES.
 */
function pruneRateLimitStore(): void {
  const now = Date.now()
  for (const [key, record] of rateLimitMap.entries()) {
    if (record.expiresAt < now) {
      rateLimitMap.delete(key)
    }
  }

  // If still above threshold after sweeping expired keys, evict oldest entries
  if (rateLimitMap.size > MAX_RATE_LIMIT_ENTRIES) {
    const overflow = rateLimitMap.size - MAX_RATE_LIMIT_ENTRIES
    let evicted = 0
    for (const key of rateLimitMap.keys()) {
      rateLimitMap.delete(key)
      evicted++
      if (evicted >= overflow) break
    }
  }
}

// Periodically clean up expired entries every 5 minutes
if (typeof setInterval !== "undefined") {
  const cleanupTimer = setInterval(pruneRateLimitStore, 5 * 60 * 1000)

  if (typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    cleanupTimer.unref()
  }
}

export interface RateLimitOptions {
  /** Maximum number of allowed requests in the time window */
  maxRequests: number
  /** Time window in seconds */
  windowSeconds: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds?: number
}

/**
 * Peeks at the current rate limit status without consuming an attempt.
 * Useful for pre-flight probes before credential evaluation.
 */
export function peekRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  const current = rateLimitMap.get(key)

  if (!current || current.expiresAt < now) {
    return {
      allowed: true,
      remaining: options.maxRequests,
    }
  }

  if (current.count >= options.maxRequests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.expiresAt - now) / 1000))
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    }
  }

  return {
    allowed: true,
    remaining: Math.max(0, options.maxRequests - current.count),
  }
}

/**
 * Increments and checks rate limit for a given key.
 *
 * @param key Unique key (e.g. `login:192.168.1.1` or `update-profile:user123`)
 * @param options maxRequests and windowSeconds
 */
export function incrementRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  const windowMs = options.windowSeconds * 1000

  const current = rateLimitMap.get(key)

  if (!current || current.expiresAt < now) {
    rateLimitMap.set(key, {
      count: 1,
      expiresAt: now + windowMs,
    })
    return {
      allowed: true,
      remaining: options.maxRequests - 1,
    }
  }

  if (current.count >= options.maxRequests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.expiresAt - now) / 1000))
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    }
  }

  current.count += 1
  return {
    allowed: true,
    remaining: options.maxRequests - current.count,
  }
}

/**
 * Backwards-compatible alias for incrementRateLimit.
 */
export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  return incrementRateLimit(key, options)
}

/**
 * Resets the rate limit counter for a key (e.g. upon successful authentication).
 */
export function resetRateLimit(key: string): void {
  rateLimitMap.delete(key)
}
