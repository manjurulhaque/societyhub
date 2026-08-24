export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 text-stone-900">
      <main className="mx-auto flex flex-col items-center justify-center px-5 py-12">
        <div className="w-full max-w-md rounded-3xl border border-stone-200 bg-white px-8 py-10 text-center shadow-sm">
          <div
            className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-stone-200 border-t-stone-950"
            role="status"
            aria-label="Loading"
          />
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
            SARWS Connect
          </p>
          <p className="mt-2 text-lg font-semibold text-stone-950">Loading...</p>
          <p className="mt-1 text-sm text-stone-500">
            Please wait while we load your information.
          </p>
        </div>
      </main>
    </div>
  )
}
