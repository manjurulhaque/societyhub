import { createServerClient } from "@supabase/ssr"
import type { EmailOtpType } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"
import { getSafeRedirectUrl } from "@/lib/auth/safeRedirect"
import { logger } from "@/lib/logger"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const next = searchParams.get("next") || "/auth/set-password"
  const errorDescription = searchParams.get("error_description") || searchParams.get("error")

  if (errorDescription) {
    logger.error("Auth callback error", undefined, "GET /auth/callback", { errorDescription })
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errorDescription)}`)
  }

  const safeNext = getSafeRedirectUrl(next, "/auth/set-password")
  const redirectTarget = `${origin}${safeNext}`

  // 1. If code or token_hash is present in query parameters (Server-side PKCE or OTP verification)
  if (code || token_hash) {
    const cookieStore = await cookies()
    const cookiesToSetLater: { name: string; value: string; options: Record<string, unknown> }[] = []

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
              cookiesToSetLater.push({ name, value, options })
            })
          },
        },
      }
    )

    let authError = null

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      authError = error
    } else if (token_hash && type) {
      const { error } = await supabase.auth.verifyOtp({ token_hash, type })
      authError = error
    }

    if (!authError) {
      const response = NextResponse.redirect(redirectTarget)
      cookiesToSetLater.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options)
      })
      return response
    }

    logger.error("Auth token verification failed", authError, "GET /auth/callback")
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Your invitation or reset link is invalid or has expired. Please request a new one.")}`
    )
  }

  // 2. If neither code nor token_hash is in query params:
  // Supabase may have returned the session in the client-side URL hash (#access_token=...&refresh_token=...).
  // Hash fragments are NOT sent to HTTP servers, so we render a client-side forwarder script that preserves hash fragments and routes the browser to /auth/set-password.
  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Authenticating...</title>
    <script>
      (function() {
        var hash = window.location.hash || "";
        var nextUrl = ${JSON.stringify(redirectTarget)};
        if (hash) {
          window.location.replace(nextUrl + hash);
        } else {
          window.location.replace(nextUrl);
        }
      })();
    </script>
  </head>
  <body style="font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #fafaf9; color: #1c1917;">
    <p style="font-size: 14px; font-weight: 500;">Authenticating your session, please wait...</p>
  </body>
</html>`

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  })
}
