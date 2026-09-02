import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 sm:py-8 md:px-8 animate-pulse">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-3.5 w-24 rounded-md bg-stone-200" />
        <Skeleton className="h-8 w-48 rounded-lg bg-stone-300" />
        <Skeleton className="h-4 w-80 max-w-full rounded-md bg-stone-200" />
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20 rounded-md bg-stone-200" />
              <Skeleton className="h-8 w-8 rounded-xl bg-stone-100" />
            </div>
            <Skeleton className="h-7 w-28 rounded-md bg-stone-300" />
            <Skeleton className="h-3.5 w-36 rounded-md bg-stone-200" />
          </div>
        ))}
      </div>

      {/* Charts Placeholder */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
          <Skeleton className="h-5 w-40 rounded-md bg-stone-300" />
          <Skeleton className="h-48 w-full rounded-xl bg-stone-100" />
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
          <Skeleton className="h-5 w-40 rounded-md bg-stone-300" />
          <Skeleton className="h-48 w-full rounded-xl bg-stone-100" />
        </div>
      </div>

      {/* Recent Activity Tables */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4"
          >
            <Skeleton className="h-5 w-36 rounded-md bg-stone-300" />
            <div className="space-y-3 border-t border-stone-100 pt-3">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="flex items-center justify-between py-2">
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-32 rounded bg-stone-200" />
                    <Skeleton className="h-3 w-20 rounded bg-stone-100" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full bg-stone-200" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
