import type { ReactNode } from "react"

type AdminFormFieldProps = {
  label: string
  children: ReactNode
  description?: string
  className?: string
}

export function AdminFormField({
  label,
  children,
  description,
  className = "",
}: AdminFormFieldProps) {
  return (
    <label className={`block space-y-2 text-sm font-medium text-stone-700 ${className}`.trim()}>
      <span>{label}</span>
      {children}
      {description ? <span className="text-xs font-normal text-stone-500">{description}</span> : null}
    </label>
  )
}
