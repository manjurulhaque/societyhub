import { Skeleton } from "@/components/ui/skeleton"

export function SocietySidebarSkeleton() {
  return (
    <aside className="hidden lg:flex w-64 shrink-0 border-r border-stone-200 bg-white p-6 flex-col justify-between animate-pulse">
      <div className="space-y-6">
        {/* Society Header Skeleton */}
        <div className="space-y-2 border-b border-stone-100 pb-5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-20 rounded-md bg-stone-200" />
            <Skeleton className="h-4 w-12 rounded-md bg-stone-200" />
          </div>

          <Skeleton className="h-6 w-44 rounded-lg bg-stone-300 mt-1" />

          {/* Profile Card Skeleton */}
          <div className="pt-1 rounded-xl p-2 -mx-2 bg-stone-50/60 border border-stone-100">
            <div className="flex items-center justify-between gap-1">
              <Skeleton className="h-3.5 w-24 rounded bg-stone-300" />
              <Skeleton className="h-4 w-16 rounded-md bg-stone-200" />
            </div>
            <Skeleton className="h-2.5 w-32 rounded bg-stone-200 mt-2" />
          </div>

          {/* Financial Year Skeleton */}
          <div className="pt-1">
            <div className="flex items-center justify-between rounded-xl border border-stone-200/80 bg-stone-50/80 px-2.5 py-1.5">
              <div className="flex items-center gap-1.5">
                <Skeleton className="h-1.5 w-1.5 rounded-full bg-stone-300 shrink-0" />
                <Skeleton className="h-3 w-20 rounded bg-stone-200" />
              </div>
              <Skeleton className="h-3 w-6 rounded bg-stone-200 shrink-0" />
            </div>
          </div>
        </div>

        {/* Navigation Links Skeleton */}
        <nav className="flex flex-col space-y-1">
          {[
            { width: "w-20", badge: false },
            { width: "w-18", badge: true },
            { width: "w-24", badge: false },
            { width: "w-32", badge: false },
            { width: "w-28", badge: false },
            { width: "w-22", badge: false },
            { width: "w-28", badge: false },
            { width: "w-32", badge: false },
            { width: "w-30", badge: false },
            { width: "w-32", badge: false },
            { width: "w-26", badge: false },
            { width: "w-32", badge: false },
            { width: "w-28", badge: false },
            { width: "w-32", badge: false },
          ].map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5"
            >
              <Skeleton className="h-4 w-4 rounded bg-stone-200 shrink-0" />
              <Skeleton className={`h-3.5 ${item.width} rounded bg-stone-200`} />
              {item.badge && (
                <Skeleton className="ml-auto h-4 w-5 rounded-full bg-stone-200 shrink-0" />
              )}
            </div>
          ))}
        </nav>
      </div>

      {/* Sidebar Footer Skeleton */}
      <div className="space-y-3 border-t border-stone-100 pt-4">
        <Skeleton className="h-8 w-full rounded-xl bg-stone-100" />
        <div className="flex items-center gap-2 px-3 py-2">
          <Skeleton className="h-4 w-4 rounded bg-stone-200 shrink-0" />
          <Skeleton className="h-3.5 w-16 rounded bg-stone-200" />
        </div>
      </div>
    </aside>
  )
}

export function SocietyMobileHeaderSkeleton() {
  return (
    <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-stone-200 bg-white px-4 py-3 lg:hidden animate-pulse">
      <Skeleton className="h-9 w-9 rounded-xl bg-stone-100 shrink-0" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-4 w-32 rounded bg-stone-300" />
        <Skeleton className="h-2.5 w-20 rounded bg-stone-200" />
      </div>
    </div>
  )
}

export function SocietyLayoutSkeleton({
  children,
}: {
  children?: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-stone-50">
      <SocietyMobileHeaderSkeleton />
      <SocietySidebarSkeleton />
      <main className="flex-1 min-w-0 w-full overflow-y-auto">{children}</main>
    </div>
  )
}
