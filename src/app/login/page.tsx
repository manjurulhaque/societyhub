"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createClient } from "@/lib/supabase/client"
import { loginSchema, type LoginInput } from "@/lib/validations/auth"
import { getSafeRedirectUrl } from "@/lib/auth/safeRedirect"
import { requestPasswordSetupLink } from "./actions"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const searchParams = useSearchParams()
  const nextParam = searchParams.get("next")
  const urlError = searchParams.get("error")
  const reasonParam = searchParams.get("reason")

  const [mode, setMode] = useState<"LOGIN" | "RESET">("LOGIN")
  const [resetEmail, setResetEmail] = useState("")
  const [resetSuccess, setResetSuccess] = useState(false)
  const [devSetupLink, setDevSetupLink] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)

  const [error, setError] = useState<string | null>(urlError || null)
  const [loading, setLoading] = useState(false)

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  async function onSubmit(values: LoginInput) {
    setLoading(true)
    setError(null)

    try {
      const email = values.email.trim().toLowerCase()

      // 1. Pre-flight brute-force check
      try {
        const limitRes = await fetch("/api/auth/login-limit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, action: "CHECK" }),
        })
        if (!limitRes.ok) {
          const limitData = await limitRes.json()
          setError(limitData.error || "Too many sign-in attempts. Please wait a few minutes.")
          setLoading(false)
          return
        }
      } catch {
        // Fall through to authentication if rate limiter endpoint is unreachable
      }

      // 2. Perform Supabase password authentication
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: values.password,
      })

      if (signInError) {
        // Record failed attempt in rate limiter
        try {
          const failRes = await fetch("/api/auth/login-limit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, action: "RECORD_FAILURE" }),
          })
          if (!failRes.ok) {
            const failData = await failRes.json()
            setError(failData.error || signInError.message)
            setLoading(false)
            return
          }
        } catch {
          // Fall through
        }

        setError(signInError.message)
        setLoading(false)
        return
      }

      // 3. Clear rate limit tally upon successful authentication
      try {
        await fetch("/api/auth/login-limit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, action: "RESET" }),
        })
      } catch {
        // Non-blocking cleanup
      }

      // If a next parameter is provided, validate through Open Redirect defense
      if (nextParam) {
        const safeUrl = getSafeRedirectUrl(nextParam, "")
        if (safeUrl) {
          router.push(safeUrl)
          router.refresh()
          return
        }
      }

      // Determine redirect URL based on user role
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
        // Fallback to admin dashboard
      }

      router.push("/admin/dashboard")
      router.refresh()
    } catch {
      setError("An unexpected error occurred. Please try again.")
      setLoading(false)
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    setResetError(null)

    const cleanEmail = resetEmail.trim().toLowerCase()
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setResetError("Please enter a valid email address.")
      return
    }

    setResetLoading(true)

    try {
      const res = await requestPasswordSetupLink(cleanEmail)

      if (!res.success && res.error) {
        setResetError(res.error)
      } else {
        setResetSuccess(true)
        if (res.devLink) {
          setDevSetupLink(res.devLink)
        }
      }
    } catch {
      setResetError("Failed to send password setup link. Please try again.")
    } finally {
      setResetLoading(false)
    }
  }

  const handleCopyDevLink = async () => {
    if (!devSetupLink) return
    try {
      await navigator.clipboard.writeText(devSetupLink)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2500)
    } catch {
      // Fallback
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
            {mode === "RESET" ? "Set or Reset Password" : "Welcome to SARWS Connect"}
          </h1>
          <p className="mt-2 text-sm text-stone-600">
            {mode === "RESET"
              ? "Enter your registered email to receive a password setup link"
              : "Sign in to access Syndicate Arena resident portal & dashboard"}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
          {mode === "RESET" ? (
            /* Reset / First-time setup mode */
            <div>
              {resetSuccess ? (
                <div className="space-y-4 text-center py-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-stone-950">Check Your Email</h3>
                    <p className="mt-1.5 text-xs text-stone-600 leading-relaxed">
                      We&apos;ve sent a password activation link to{" "}
                      <strong className="text-stone-900">{resetEmail}</strong>. Please check your inbox and click the link to set your password.
                    </p>
                  </div>

                  {devSetupLink ? (
                    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3.5 text-left space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-stone-700">
                          Direct Activation Link:
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyDevLink}
                          className="rounded-lg bg-stone-900 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-stone-800 transition"
                        >
                          {linkCopied ? "✓ Copied!" : "Copy Link"}
                        </button>
                      </div>
                      <input
                        type="text"
                        readOnly
                        value={devSetupLink}
                        className="w-full rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-[11px] text-stone-700 select-all font-mono"
                      />
                      <a
                        href={devSetupLink}
                        className="block text-center rounded-xl bg-stone-900 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition"
                      >
                        Open Password Setup Now &rarr;
                      </a>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => {
                      setMode("LOGIN")
                      setResetSuccess(false)
                      setResetEmail("")
                      setDevSetupLink(null)
                    }}
                    className="w-full rounded-full bg-stone-100 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-200 transition"
                  >
                    Return to Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-5">
                  {resetError ? (
                    <div
                      role="alert"
                      className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-medium text-rose-700"
                    >
                      <svg className="h-4 w-4 shrink-0 text-rose-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                      </svg>
                      <span>{resetError}</span>
                    </div>
                  ) : null}

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full rounded-2xl border border-stone-300 py-2.5 h-10 px-4 text-sm focus:border-stone-950 focus:outline-none focus:ring-1 focus:ring-stone-950"
                    />
                    <p className="text-[11px] text-stone-500">
                      If you were recently assigned to the committee or are a registered resident, this will send an activation link to set your password.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-stone-950 py-3 text-sm font-medium text-stone-50 shadow-sm transition-all hover:bg-stone-800 focus:outline-none disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
                  >
                    {resetLoading ? (
                      <>
                        <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        <span>Sending Link...</span>
                      </>
                    ) : (
                      "Send Password Link"
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setMode("LOGIN")}
                      className="text-xs font-semibold text-stone-600 hover:text-stone-900 transition"
                    >
                      ← Back to Sign In
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* Normal Sign-in Mode */
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                {!error && reasonParam === "session_expired" ? (
                  <div
                    role="alert"
                    className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50/90 p-3.5 text-xs font-medium text-amber-900"
                  >
                    <svg className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    <span>
                      Your session expired due to inactivity. Please sign in to resume where you left off.
                    </span>
                  </div>
                ) : null}

                {!error && reasonParam === "logged_out" ? (
                  <div
                    role="status"
                    className="flex items-center gap-2.5 rounded-2xl border border-stone-200 bg-stone-50 p-3.5 text-xs font-medium text-stone-700"
                  >
                    <svg className="h-4 w-4 shrink-0 text-stone-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>You have been safely signed out.</span>
                  </div>
                ) : null}

                {error ? (
                  <div
                    role="alert"
                    className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-medium text-rose-700"
                  >
                    <svg
                      className="h-4 w-4 shrink-0 text-rose-500"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>{error}</span>
                  </div>
                ) : null}

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                        Email Address
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          autoComplete="email"
                          placeholder="name@example.com"
                          className="rounded-2xl border-stone-300 py-2.5 h-10 px-4 text-sm focus-visible:border-stone-950 focus-visible:ring-stone-950/10"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                          Password
                        </FormLabel>
                        <button
                          type="button"
                          onClick={() => {
                            setResetEmail(form.getValues("email") || "")
                            setMode("RESET")
                            setError(null)
                          }}
                          className="text-xs font-semibold text-stone-500 hover:text-stone-950 transition"
                        >
                          Forgot or set password?
                        </button>
                      </div>
                      <FormControl>
                        <Input
                          type="password"
                          autoComplete="current-password"
                          placeholder="••••••••"
                          className="rounded-2xl border-stone-300 py-2.5 h-10 px-4 text-sm focus-visible:border-stone-950 focus-visible:ring-stone-950/10"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-stone-950 py-3 text-sm font-medium text-stone-50 shadow-sm transition-all hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-950 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <svg
                        className="h-4 w-4 animate-spin text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <span>Signing in...</span>
                    </>
                  ) : (
                    "Sign In"
                  )}
                </button>
              </form>
            </Form>
          )}
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-stone-500">
          SARWS Connect &bull; Syndicate Arena Residents&apos; Welfare Society
        </p>
      </div>
    </div>
  )
}

