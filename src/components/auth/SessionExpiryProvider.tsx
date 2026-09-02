"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Clock, LogOut, ShieldAlert } from "lucide-react"

// Public routes where inactivity tracking is disabled
const PUBLIC_PREFIXES = ["/login", "/auth/", "/api/"]
const PUBLIC_EXACT = ["/", "/manifest.webmanifest", "/robots.txt", "/sitemap.xml"]

interface SessionExpiryProviderProps {
  children?: React.ReactNode
  /** Inactivity warning threshold in milliseconds (default: 25 minutes) */
  warningMs?: number
  /** Inactivity auto-logout timeout in milliseconds (default: 30 minutes) */
  timeoutMs?: number
}

export function SessionExpiryProvider({
  children,
  warningMs = 25 * 60 * 1000, // 25 minutes
  timeoutMs = 30 * 60 * 1000, // 30 minutes
}: SessionExpiryProviderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = React.useMemo(() => createClient(), [])

  const [isWarningOpen, setIsWarningOpen] = React.useState(false)
  const [remainingSeconds, setRemainingSeconds] = React.useState(0)
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  const lastActivityRef = React.useRef<number>(Date.now())
  const hasActiveSessionRef = React.useRef<boolean>(false)

  const isPublicRoute = React.useMemo(() => {
    if (!pathname) return true
    if (PUBLIC_EXACT.includes(pathname)) return true
    return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  }, [pathname])

  // Record user activity with throttling (at most once every 5 seconds)
  const updateActivity = React.useCallback(() => {
    const now = Date.now()
    if (now - lastActivityRef.current > 5000) {
      lastActivityRef.current = now
    }
  }, [])

  // Extend session: refresh token with Supabase and reset activity timer
  const handleStayLoggedIn = React.useCallback(async () => {
    setIsRefreshing(true)
    try {
      const { data, error } = await supabase.auth.refreshSession()
      if (error || !data.session) {
        // If refresh fails, force redirect to login
        toast.error("Session could not be extended. Please sign in again.")
        handleForceLogout("session_expired")
        return
      }

      lastActivityRef.current = Date.now()
      setIsWarningOpen(false)
      toast.success("Your session has been successfully extended.")
    } catch {
      handleForceLogout("session_expired")
    } finally {
      setIsRefreshing(false)
    }
  }, [supabase])

  // Force logout with structured reason and target redirect
  const handleForceLogout = React.useCallback(
    async (reason: "session_expired" | "logged_out" = "session_expired") => {
      setIsWarningOpen(false)
      hasActiveSessionRef.current = false

      try {
        await supabase.auth.signOut()
      } catch {
        // Fall through
      }

      const nextParam = pathname && !isPublicRoute ? `&next=${encodeURIComponent(pathname)}` : ""
      router.push(`/login?reason=${reason}${nextParam}`)
      router.refresh()
    },
    [supabase, pathname, isPublicRoute, router]
  )

  // 1. Initial Session Check & Auth State Listener
  React.useEffect(() => {
    if (isPublicRoute) {
      hasActiveSessionRef.current = false
      setIsWarningOpen(false)
      return
    }

    let isMounted = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return
      if (session) {
        hasActiveSessionRef.current = true
        lastActivityRef.current = Date.now()
      } else {
        hasActiveSessionRef.current = false
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        hasActiveSessionRef.current = true
        lastActivityRef.current = Date.now()
        setIsWarningOpen(false)
      } else if (event === "SIGNED_OUT") {
        hasActiveSessionRef.current = false
        setIsWarningOpen(false)
        if (!isPublicRoute) {
          handleForceLogout("session_expired")
        }
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [supabase, isPublicRoute, handleForceLogout])

  // 2. User Activity Event Listeners (Mouse, Keyboard, Touch, Scroll)
  React.useEffect(() => {
    if (isPublicRoute) return

    const events = ["pointerdown", "keydown", "scroll", "touchstart"]
    const onEvent = () => {
      if (!isWarningOpen) {
        updateActivity()
      }
    }

    events.forEach((evt) => window.addEventListener(evt, onEvent, { passive: true }))

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, onEvent))
    }
  }, [isPublicRoute, isWarningOpen, updateActivity])

  // 3. Periodic Inactivity & Expiry Heartbeat (Runs every second when active)
  React.useEffect(() => {
    if (isPublicRoute) return

    const interval = setInterval(() => {
      if (!hasActiveSessionRef.current) return

      const now = Date.now()
      const idleTime = now - lastActivityRef.current

      if (idleTime >= timeoutMs) {
        // Inactivity limit reached -> Auto-logout
        toast.warning("Your session has expired due to inactivity.")
        handleForceLogout("session_expired")
      } else if (idleTime >= warningMs) {
        // Warning threshold reached -> Show modal with remaining seconds countdown
        const remaining = Math.max(0, Math.ceil((timeoutMs - idleTime) / 1000))
        setRemainingSeconds(remaining)
        setIsWarningOpen(true)
      } else {
        if (isWarningOpen) {
          setIsWarningOpen(false)
        }
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [isPublicRoute, warningMs, timeoutMs, isWarningOpen, handleForceLogout])

  // Format seconds to MM:SS
  const formatTimeRemaining = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <>
      {children}

      {/* Session Expiry Warning Dialog */}
      {isWarningOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="session-warning-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-md rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl space-y-6 sm:p-8 animate-in zoom-in-95 duration-200">
            {/* Header / Icon */}
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3
                  id="session-warning-title"
                  className="text-lg font-bold tracking-tight text-stone-900"
                >
                  Session Timeout Warning
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  You have been inactive for a while. For your security and protection of financial
                  records, your session will automatically terminate soon.
                </p>
              </div>
            </div>

            {/* Countdown Badge */}
            <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3">
              <div className="flex items-center gap-2 text-xs font-medium text-amber-900">
                <Clock className="h-4 w-4 text-amber-700 animate-pulse" />
                <span>Auto sign-out in:</span>
              </div>
              <span className="font-mono text-base font-bold text-amber-950">
                {formatTimeRemaining(remainingSeconds)}
              </span>
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => handleForceLogout("logged_out")}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-stone-300 bg-white px-5 py-2.5 text-xs font-medium text-stone-700 hover:bg-stone-100 transition cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5 text-stone-500" />
                Sign Out Now
              </button>

              <button
                type="button"
                disabled={isRefreshing}
                onClick={handleStayLoggedIn}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-stone-950 px-6 py-2.5 text-xs font-medium text-white shadow-sm hover:bg-stone-800 transition disabled:opacity-50 cursor-pointer"
              >
                {isRefreshing ? (
                  <>
                    <svg className="h-3.5 w-3.5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Extending...</span>
                  </>
                ) : (
                  "Stay Logged In"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
