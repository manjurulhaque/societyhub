import type { ReactNode } from "react"

type AdminCardProps = {
  title?: ReactNode
  description?: ReactNode
  action?: ReactNode
  footer?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
}

export function AdminCard({
  title,
  description,
  action,
  footer,
  children,
  className = "",
  contentClassName = "",
}: AdminCardProps) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm ${className}`.trim()}
    >
      {title || action || description ? (
        <div className="flex flex-col gap-1 border-b border-stone-100 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            {typeof title === "string" ? (
              <h3 className="text-base font-semibold text-stone-900">{title}</h3>
            ) : (
              title
            )}
            {description ? (
              <p className="mt-0.5 text-xs text-stone-500">{description}</p>
            ) : null}
          </div>
          {action ? <div>{action}</div> : null}
        </div>
      ) : null}

      <div className={`p-6 ${contentClassName}`.trim()}>{children}</div>

      {footer ? (
        <div className="border-t border-stone-100 bg-stone-50/50 px-6 py-3 text-xs text-stone-500">
          {footer}
        </div>
      ) : null}
    </div>
  )
}
