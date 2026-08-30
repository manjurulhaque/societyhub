import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

// ─────────────────────────────────────────────────────────────────
// Route Protection Matrix
//
// All routes are PROTECTED by default. Only routes matching the
// public allowlist below bypass the authentication gate.
// This is a defense-in-depth layer — page-level auth checks in
// layouts/pages still run, but the proxy catches any route that
// might accidentally ship without an explicit auth guard.
// ─────────────────────────────────────────────────────────────────

/** Routes that are accessible without authentication */
const PUBLIC_ROUTES: string[] = [
  "/",
  "/login",
  "/auth/callback",
  "/auth/confirm",
  "/api/health",
]

/** Route prefixes that are accessible without authentication */
const PUBLIC_PREFIXES: string[] = [
  "/auth/",
  "/api/auth/",
  "/api/health/",
]

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) {
    return true
  }
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export async function updateSession(request: NextRequest) {
  // CSRF Defense: For state-mutating methods, verify Origin matches host
  const method = request.method.toUpperCase()
  if (method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE") {
    const origin = request.headers.get("origin")
    const host = request.headers.get("host") || request.nextUrl.host

    if (origin) {
      try {
        const originHost = new URL(origin).host
        if (originHost !== host) {
          return new NextResponse("Forbidden: Cross-origin request rejected.", { status: 403 })
        }
      } catch {
        return new NextResponse("Forbidden: Invalid origin header.", { status: 403 })
      }
    }
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Set standard hardened security headers
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
  )
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload"
  )
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' blob: data: https://commons.wikimedia.org https://upload.wikimedia.org; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none';"
  )
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin")
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin")

  // Pass current pathname to Server Components
  response.headers.set("x-pathname", request.nextUrl.pathname)

  // Check for auth session cookies
  const hasAuthCookies = request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"))

  // ─────────────────────────────────────────────────────────────
  // Route-Level Auth Gate
  //
  // For protected routes, redirect unauthenticated users to /login
  // with a return URL. This runs BEFORE any server component executes,
  // providing an early rejection without wasting compute.
  // ─────────────────────────────────────────────────────────────
  const pathname = request.nextUrl.pathname

  if (!isPublicRoute(pathname) && !hasAuthCookies) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = "/login"
    loginUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Refresh auth session if cookies are present
  if (hasAuthCookies) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            )
            response = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // Refresh auth token if expired
    const { data: { user } } = await supabase.auth.getUser()

    // If session token exists but is invalid/expired, redirect to login
    if (!user && !isPublicRoute(pathname)) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = "/login"
      loginUrl.searchParams.set("next", pathname)
      // Clear stale auth cookies
      response = NextResponse.redirect(loginUrl)
      request.cookies.getAll()
        .filter((cookie) => cookie.name.startsWith("sb-"))
        .forEach((cookie) => response.cookies.delete(cookie.name))
      return response
    }
  }

  return response
}

