import type { ReactNode } from "react"

type AdminFormCardProps = {
  children: ReactNode
  className?: string
}

export function AdminFormCard({ children, className = "" }: AdminFormCardProps) {
  return (
    <div className={`space-y-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm ${className}`.trim()}>
      {children}
    </div>
  )
}
