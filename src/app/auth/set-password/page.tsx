"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { validatePasswordStrength } from "@/lib/auth/passwordValidation"

export default function SetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState<string | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  useEffect(() => {
    let isMounted = true

    // 1. Listen for auth state events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return
      if (session?.user) {
        setEmail(session.user.email || null)
        setError(null)
        setLoadingUser(false)
      }
    })

    // 2. Comprehensive session initialization
    async function initSession() {
      try {
        // A. Check for hash parameters in URL (#access_token=... or #error=...)
        if (typeof window !== "undefined" && window.location.hash) {
          const rawHash = window.location.hash.startsWith("#")
            ? window.location.hash.substring(1)
            : window.location.hash
          const hashParams = new URLSearchParams(rawHash)

          const hashError = hashParams.get("error_description") || hashParams.get("error")
          if (hashError) {
            if (isMounted) {
              setError(decodeURIComponent(hashError.replace(/\+/g, " ")))
              setLoadingUser(false)
            }
            return
          }

          const accessToken = hashParams.get("access_token")
          const refreshToken = hashParams.get("refresh_token") || ""

          if (accessToken) {
            const { data, error: setErr } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })

            if (!setErr && data.session?.user && isMounted) {
              setEmail(data.session.user.email || null)
              setError(null)
              setLoadingUser(false)
              return
            }
          }
        }

        // B. Check for search parameters (?code=... or ?token_hash=...)
        if (typeof window !== "undefined" && window.location.search) {
          const searchParams = new URLSearchParams(window.location.search)
          const code = searchParams.get("code")
          const tokenHash = searchParams.get("token_hash")
          const type = (searchParams.get("type") || "recovery") as any

          if (code) {
            const { data, error: codeErr } = await supabase.auth.exchangeCodeForSession(code)
            if (!codeErr && data.session?.user && isMounted) {
              setEmail(data.session.user.email || null)
              setError(null)
              setLoadingUser(false)
              return
            }
          } else if (tokenHash) {
            const { data, error: otpErr } = await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type,
            })
            if (!otpErr && data.session?.user && isMounted) {
              setEmail(data.session.user.email || null)
              setError(null)
              setLoadingUser(false)
              return
            }
          }
        }

        // C. Check existing user / session
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (user && isMounted) {
          setEmail(user.email || null)
          setError(null)
          setLoadingUser(false)
          return
        }

        // D. Final fallback grace period
        setTimeout(async () => {
          if (!isMounted) return
          const {
            data: { session },
          } = await supabase.auth.getSession()

          if (session?.user) {
            setEmail(session.user.email || null)
            setError(null)
          } else {
            setError(
              "No active session found. Your link may have expired or already been used. Please request a new setup link from the login page."
            )
          }
          setLoadingUser(false)
        }, 500)
      } catch {
        if (isMounted) {
          setError("Failed to verify authentication session.")
          setLoadingUser(false)
        }
      }
    }

    initSession()

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

  // Live password validation checklist
  const hasLength = password.length >= 10
  const hasUpper = /[A-Z]/.test(password)
  const hasLower = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSymbol = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password)
  const passwordsMatch = password.length > 0 && password === confirmPassword

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!password) {
      setError("Please enter a new password.")
      return
    }

    const valResult = validatePasswordStrength(password, { email: email || undefined })
    if (!valResult.isValid) {
      setError(valResult.error || "Password does not meet security requirements.")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-type.")
      return
    }

    setIsSubmitting(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })

      if (updateError) {
        setError(updateError.message)
        setIsSubmitting(false)
        return
      }

      setIsSuccess(true)

      // Fetch user profile and redirect to destination
      setTimeout(async () => {
        try {
          const res = await fetch("/api/auth/me")
          if (res.ok) {
            const data = await res.json()
            if (data?.redirectUrl) {
              router.push(data.redirectUrl)
              router.refresh()
              return
            }
          }
        } catch {
          // Fallback
        }
        router.push("/admin/dashboard")
        router.refresh()
      }, 1500)
    } catch {
      setError("An unexpected error occurred. Please try again.")
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        {/* Brand / Logo */}
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-950 text-white font-bold text-xl shadow-md">
            S
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-stone-950 sm:text-3xl">
            {isSuccess ? "Password Activated!" : "Set Your Account Password"}
          </h1>
          <p className="mt-2 text-sm text-stone-600">
            {email ? (
              <span>
                Setting password for <strong className="font-semibold text-stone-900">{email}</strong>
              </span>
            ) : (
              "Create a strong, secure password to activate your society portal account"
            )}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
          {loadingUser ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-3">
              <svg className="h-6 w-6 animate-spin text-stone-900" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <p className="text-xs text-stone-500">Verifying activation session...</p>
            </div>
          ) : isSuccess ? (
            <div className="text-center py-6 space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-950">Password Set Successfully</h3>
                <p className="mt-1 text-xs text-stone-500">
                  Redirecting you directly to your society portal...
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error ? (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-medium text-rose-700"
                >
                  <svg className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                  </svg>
                  <span>{error}</span>
                </div>
              ) : null}

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                  New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="new-password"
                    disabled={isSubmitting}
                    className="w-full rounded-2xl border border-stone-300 py-2.5 h-10 pl-4 pr-10 text-sm focus:border-stone-950 focus:outline-none focus:ring-1 focus:ring-stone-950"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-700 transition"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                        <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="new-password"
                  disabled={isSubmitting}
                  className="w-full rounded-2xl border border-stone-300 py-2.5 h-10 px-4 text-sm focus:border-stone-950 focus:outline-none focus:ring-1 focus:ring-stone-950"
                />
              </div>

              {/* Password Requirements Checklist */}
              <div className="rounded-2xl border border-stone-100 bg-stone-50/70 p-3.5 space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-600">
                  Password Requirements:
                </p>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 text-[11px]">
                  <div className={`flex items-center gap-1.5 ${hasLength ? "text-emerald-700 font-semibold" : "text-stone-500"}`}>
                    <span>{hasLength ? "✓" : "○"}</span>
                    <span>10+ characters</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasUpper ? "text-emerald-700 font-semibold" : "text-stone-500"}`}>
                    <span>{hasUpper ? "✓" : "○"}</span>
                    <span>Uppercase (A-Z)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasLower ? "text-emerald-700 font-semibold" : "text-stone-500"}`}>
                    <span>{hasLower ? "✓" : "○"}</span>
                    <span>Lowercase (a-z)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasNumber ? "text-emerald-700 font-semibold" : "text-stone-500"}`}>
                    <span>{hasNumber ? "✓" : "○"}</span>
                    <span>Number (0-9)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasSymbol ? "text-emerald-700 font-semibold" : "text-stone-500"}`}>
                    <span>{hasSymbol ? "✓" : "○"}</span>
                    <span>Special symbol</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${passwordsMatch ? "text-emerald-700 font-semibold" : "text-stone-500"}`}>
                    <span>{passwordsMatch ? "✓" : "○"}</span>
                    <span>Passwords match</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !hasLength || !passwordsMatch}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-stone-950 py-3 text-sm font-medium text-stone-50 shadow-sm transition-all hover:bg-stone-800 focus:outline-none disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Saving Password...</span>
                  </>
                ) : (
                  "Activate Account & Set Password"
                )}
              </button>
            </form>
          )}
        </div>

        {/* Back to login */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="text-xs font-semibold text-stone-600 hover:text-stone-900 transition"
          >
            ← Back to Sign In
          </button>
        </div>
      </div>
    </div>
  )
}
