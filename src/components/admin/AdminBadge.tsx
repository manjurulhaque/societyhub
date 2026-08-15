import type { ReactNode } from "react"

export type BadgeVariant = "neutral" | "success" | "warning" | "danger" | "info" | "purple"
export type BadgeSize = "sm" | "md"

type AdminBadgeProps = {
  children: ReactNode
  variant?: BadgeVariant
  size?: BadgeSize
  dot?: boolean
  className?: string
}

const variantStyles: Record<BadgeVariant, { bg: string; dot: string }> = {
  neutral: {
    bg: "bg-stone-100 text-stone-700 border-stone-200",
    dot: "bg-stone-500",
  },
  success: {
    bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  warning: {
    bg: "bg-amber-50 text-amber-800 border-amber-200",
    dot: "bg-amber-500",
  },
  danger: {
    bg: "bg-rose-50 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
  },
  info: {
    bg: "bg-sky-50 text-sky-700 border-sky-200",
    dot: "bg-sky-500",
  },
  purple: {
    bg: "bg-purple-50 text-purple-700 border-purple-200",
    dot: "bg-purple-500",
  },
}

const sizeStyles: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-xs font-medium",
}

export function AdminBadge({
  children,
  variant = "neutral",
  size = "md",
  dot = false,
  className = "",
}: AdminBadgeProps) {
  const styles = variantStyles[variant]

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium transition-colors ${styles.bg} ${sizeStyles[size]} ${className}`.trim()}
    >
      {dot ? (
        <span
          className={`h-1.5 w-1.5 rounded-full ${styles.dot}`}
          aria-hidden="true"
        />
      ) : null}
      {children}
    </span>
  )
}
