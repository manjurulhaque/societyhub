"use client"

import Link from "next/link"

type ErrorPageProps = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorPageProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 text-stone-900">
      <main className="mx-auto flex max-w-lg flex-col items-center justify-center px-5 py-12">
        <div className="w-full rounded-3xl border border-stone-200 bg-white px-8 py-10 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-600">
            Something went wrong
          </p>
          <h1 className="mt-3 text-2xl font-bold text-stone-950">
            This page could not be loaded.
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            SocietyHub encountered an unexpected error while loading this view. You can try again or return to the dashboard.
          </p>

          {process.env.NODE_ENV === "development" && error.message ? (
            <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-left text-xs font-mono text-rose-900">
              {error.message}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={reset}
              className="rounded-full bg-stone-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-stone-800"
            >
              Try again
            </button>
            <Link
              href="/admin/dashboard"
              className="rounded-full border border-stone-200 bg-stone-100 px-5 py-2.5 text-sm font-medium text-stone-800 transition hover:bg-stone-200"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
