import type { ReactNode } from "react"

type AdminSectionHeaderProps = {
  title: string
  action?: ReactNode
  description?: string
  className?: string
}

export function AdminSectionHeader({
  title,
  action,
  description,
  className = "",
}: AdminSectionHeaderProps) {
  return (
    <div className={`flex items-center justify-between gap-3 ${className}`.trim()}>
      <div>
        <h2 className="text-xl font-semibold text-stone-900">{title}</h2>
        {description ? <p className="mt-1 text-sm text-stone-500">{description}</p> : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  )
}
