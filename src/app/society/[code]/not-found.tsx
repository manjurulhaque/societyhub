import Link from "next/link"

export default function SocietyNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 text-stone-900">
      <main className="mx-auto flex max-w-lg flex-col items-center justify-center px-5 py-12">
        <div className="w-full rounded-3xl border border-stone-200 bg-white px-8 py-10 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-600">
            404 — Society not found
          </p>
          <h1 className="mt-3 text-2xl font-bold text-stone-950">
            This society doesn&apos;t exist.
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            The society code in the URL is invalid, or you don&apos;t have access to this society.
            Please check the URL or contact your society administrator.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-full bg-stone-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-stone-800"
            >
              Go Home
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-stone-200 bg-stone-100 px-5 py-2.5 text-sm font-medium text-stone-800 transition hover:bg-stone-200"
            >
              Sign In
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
