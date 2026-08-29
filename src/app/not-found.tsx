import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 text-stone-900">
      <main className="mx-auto flex max-w-lg flex-col items-center justify-center px-5 py-12">
        <div className="w-full rounded-3xl border border-stone-200 bg-white px-8 py-10 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-600">
            404 — Page not found
          </p>
          <h1 className="mt-3 text-2xl font-bold text-stone-950">
            We couldn&apos;t find that page.
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
            Check the URL or head back to a safe starting point.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-full bg-stone-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-stone-800"
            >
              Go Home
            </Link>
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
