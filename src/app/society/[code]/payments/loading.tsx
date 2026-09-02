import { Skeleton } from "@/components/ui/skeleton"

export default function PaymentsLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 sm:py-8 md:px-8 animate-pulse">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-24 rounded-md bg-stone-200" />
          <Skeleton className="h-8 w-44 rounded-lg bg-stone-300" />
          <Skeleton className="h-4 w-72 max-w-full rounded-md bg-stone-200" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-xl bg-stone-200" />
          <Skeleton className="h-9 w-36 rounded-xl bg-stone-300" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-9 w-48 rounded-xl bg-stone-200" />
        <Skeleton className="h-9 w-32 rounded-xl bg-stone-200" />
        <Skeleton className="h-9 w-28 rounded-xl bg-stone-200" />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
        <div className="grid grid-cols-6 gap-4 pb-2">
          <Skeleton className="h-4 w-16 rounded bg-stone-200" />
          <Skeleton className="h-4 w-24 rounded bg-stone-200" />
          <Skeleton className="h-4 w-20 rounded bg-stone-200" />
          <Skeleton className="h-4 w-16 rounded bg-stone-200" />
          <Skeleton className="h-4 w-20 rounded bg-stone-200" />
          <Skeleton className="h-4 w-16 rounded bg-stone-200" />
        </div>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="grid grid-cols-6 gap-4 py-3 border-t border-stone-100/70">
            <Skeleton className="h-4 w-20 rounded bg-stone-100" />
            <Skeleton className="h-4 w-28 rounded bg-stone-100" />
            <Skeleton className="h-4 w-20 rounded bg-stone-100" />
            <Skeleton className="h-4 w-16 rounded bg-stone-100" />
            <Skeleton className="h-4 w-20 rounded bg-stone-100" />
            <Skeleton className="h-4 w-16 rounded-full bg-stone-200" />
          </div>
        ))}
      </div>
    </div>
  )
}
