import { NextResponse, type NextRequest } from "next/server"
import { checkRateLimit } from "@/lib/rateLimit"
import { z } from "zod"

const loginLimitSchema = z.object({
  email: z.string().email("Invalid email format"),
  action: z.enum(["CHECK", "RECORD_FAILURE", "RESET"]),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = loginLimitSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1"
    const normalizedEmail = parsed.data.email.trim().toLowerCase()

    // 5 attempts per 5 minutes (300 seconds) per IP + email
    const rateLimitKey = `login:${ip}:${normalizedEmail}`
    const result = checkRateLimit(rateLimitKey, {
      maxRequests: 5,
      windowSeconds: 300,
    })

    if (!result.allowed && parsed.data.action !== "RESET") {
      const waitSeconds = result.retryAfterSeconds || 60
      return NextResponse.json(
        {
          allowed: false,
          error: `Too many sign-in attempts. Account access is temporarily throttled. Please try again in ${waitSeconds} seconds.`,
          retryAfter: waitSeconds,
        },
        { status: 429 }
      )
    }

    return NextResponse.json({
      allowed: true,
      remaining: result.remaining,
    })

  } catch {
    // If rate limiter fails, fail open safely without blocking valid logins
    return NextResponse.json({ allowed: true, remaining: 5 })
  }
}
