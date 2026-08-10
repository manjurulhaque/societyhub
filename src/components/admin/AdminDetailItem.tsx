import type { ReactNode } from "react"

type AdminDetailItemProps = {
  label: string
  value: ReactNode
  className?: string
}

export function AdminDetailItem({ label, value, className = "" }: AdminDetailItemProps) {
  return (
    <div className={`rounded-2xl border border-stone-200 bg-white p-5 shadow-sm ${className}`.trim()}>
      <p className="text-sm text-stone-500">{label}</p>
      <div className="mt-2 font-semibold text-stone-900">{value}</div>
    </div>
  )
}
