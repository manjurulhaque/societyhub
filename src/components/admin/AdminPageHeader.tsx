import type { ReactNode } from "react"

type AdminPageHeaderProps = {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  action,
  className = "",
}: AdminPageHeaderProps) {
  return (
    <div className={`flex flex-col gap-4 md:flex-row md:items-center md:justify-between ${className}`.trim()}>
      <div>
        {eyebrow ? (
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-stone-600">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-2xl font-bold tracking-tight text-stone-950 sm:text-3xl">{title}</h1>
        {description ? <p className="mt-2 text-sm text-stone-600">{description}</p> : null}
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
