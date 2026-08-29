import { Skeleton } from "@/components/ui/skeleton"

export default function ExpensesLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 sm:py-8 md:px-8 animate-pulse">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-24 rounded-md bg-stone-200" />
          <Skeleton className="h-8 w-40 rounded-lg bg-stone-300" />
          <Skeleton className="h-4 w-64 max-w-full rounded-md bg-stone-200" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-xl bg-stone-200" />
          <Skeleton className="h-9 w-36 rounded-xl bg-stone-300" />
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-3"
          >
            <Skeleton className="h-3 w-20 rounded-md bg-stone-200" />
            <Skeleton className="h-7 w-28 rounded-md bg-stone-300" />
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
        <div className="grid grid-cols-5 gap-4 pb-2">
          <Skeleton className="h-4 w-16 rounded bg-stone-200" />
          <Skeleton className="h-4 w-24 rounded bg-stone-200" />
          <Skeleton className="h-4 w-20 rounded bg-stone-200" />
          <Skeleton className="h-4 w-20 rounded bg-stone-200" />
          <Skeleton className="h-4 w-16 rounded bg-stone-200" />
        </div>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="grid grid-cols-5 gap-4 py-3 border-t border-stone-100/70">
            <Skeleton className="h-4 w-20 rounded bg-stone-100" />
            <Skeleton className="h-4 w-32 rounded bg-stone-100" />
            <Skeleton className="h-4 w-20 rounded bg-stone-100" />
            <Skeleton className="h-4 w-20 rounded bg-stone-100" />
            <Skeleton className="h-4 w-16 rounded-full bg-stone-200" />
          </div>
        ))}
      </div>
    </div>
  )
}
