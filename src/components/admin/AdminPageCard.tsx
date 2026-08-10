import type { ReactNode } from "react"

type AdminPageCardProps = {
  title: string
  value: ReactNode
  subtitle?: ReactNode
}

export function AdminPageCard({ title, value, subtitle }: AdminPageCardProps) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-stone-500">{title}</p>
      <div className="mt-2 text-2xl font-semibold text-stone-900">{value}</div>
      {subtitle ? <p className="mt-1 text-sm text-stone-500">{subtitle}</p> : null}
    </div>
  )
}
