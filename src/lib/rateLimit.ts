interface RateLimitRecord {
  count: number
  expiresAt: number
}

// In-memory store for rate limiting by identifier (e.g. IP, user ID, or composite key)
const rateLimitMap = new Map<string, RateLimitRecord>()

// Periodically clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of rateLimitMap.entries()) {
    if (record.expiresAt < now) {
      rateLimitMap.delete(key)
    }
  }
}, 5 * 60 * 1000)

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
 * Checks and updates rate limit for a given key.
 *
 * @param key Unique key (e.g. `login:192.168.1.1` or `update-profile:user123`)
 * @param options maxRequests and windowSeconds
 */
export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
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
