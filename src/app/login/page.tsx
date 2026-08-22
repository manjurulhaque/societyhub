"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createClient } from "@/lib/supabase/client"
import { loginSchema, type LoginInput } from "@/lib/validations/auth"
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

  const [error, setError] = useState<string | null>(null)
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


      // If a safe relative next parameter is provided, use it (prevent open redirect attacks)
      const isSafeRelativeUrl =
        nextParam &&
        nextParam.startsWith("/") &&
        !nextParam.startsWith("//") &&
        !nextParam.startsWith("/\\") &&
        !nextParam.includes("://")

      if (isSafeRelativeUrl) {
        router.push(nextParam)
        router.refresh()
        return
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        {/* Brand / Logo */}
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-950 text-white font-bold text-xl shadow-md">
            S
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-stone-950 sm:text-3xl">
            Welcome to SocietyHub
          </h1>
          <p className="mt-2 text-sm text-stone-600">
            Sign in to access your society portal & dashboard
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                      Password
                    </FormLabel>
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
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-stone-500">
          SocietyHub &bull; Modern Society & Community Management
        </p>
      </div>
    </div>
  )
}
