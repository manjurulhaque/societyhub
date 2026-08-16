import Link from "next/link"
import type { ReactNode } from "react"

export type TrendDirection = "up" | "down" | "neutral"

type AdminStatCardProps = {
  title: string
  value: ReactNode
  subtitle?: ReactNode
  icon?: ReactNode
  trend?: {
    value: string
    direction?: TrendDirection
    label?: string
  }
  href?: string
  className?: string
}

export function AdminStatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  href,
  className = "",
}: AdminStatCardProps) {
  const content = (
    <div
      className={`relative overflow-hidden rounded-2xl border border-stone-200 bg-white p-4 sm:p-6 shadow-sm transition-all duration-200 ${
        href ? "hover:border-stone-400 hover:shadow-md cursor-pointer" : ""
      } ${className}`.trim()}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-stone-500">{title}</p>
          <div className="mt-2 text-2xl font-bold tracking-tight text-stone-900 md:text-3xl">
            {value}
          </div>
        </div>

        {icon ? (
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-stone-100 text-stone-700">
            {icon}
          </div>
        ) : null}
      </div>

      {trend || subtitle ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          {trend ? (
            <span
              className={`inline-flex items-center rounded-md px-1.5 py-0.5 font-medium ${
                trend.direction === "up"
                  ? "bg-emerald-50 text-emerald-700"
                  : trend.direction === "down"
                    ? "bg-rose-50 text-rose-700"
                    : "bg-stone-100 text-stone-700"
              }`}
            >
              {trend.direction === "up" ? "↑ " : trend.direction === "down" ? "↓ " : ""}
              {trend.value}
            </span>
          ) : null}

          {trend?.label ? (
            <span className="text-stone-500">{trend.label}</span>
          ) : null}

          {subtitle && !trend ? (
            <span className="text-stone-500">{subtitle}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  return content
}
