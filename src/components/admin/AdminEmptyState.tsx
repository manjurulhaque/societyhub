import type { ReactNode } from "react"

type AdminEmptyStateProps = {
  title: string
  description?: string
  action?: ReactNode
}

export function AdminEmptyState({ title, description, action }: AdminEmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-8 text-center shadow-sm">
      <h3 className="text-lg font-semibold text-stone-900">{title}</h3>
      {description ? <p className="mt-2 text-sm text-stone-600">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  )
}
