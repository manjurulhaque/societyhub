"use client"

import { forwardRef, type ComponentPropsWithoutRef } from "react"

export type AdminTextareaProps = ComponentPropsWithoutRef<"textarea"> & {
  error?: string
}

export const AdminTextarea = forwardRef<HTMLTextAreaElement, AdminTextareaProps>(
  ({ className = "", error, disabled, rows = 3, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <textarea
          ref={ref}
          rows={rows}
          disabled={disabled}
          className={`block w-full rounded-xl border bg-white px-3.5 py-2 text-sm text-stone-900 placeholder:text-stone-400 shadow-sm transition-all focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-500 ${
            error
              ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200"
              : "border-stone-300 focus:border-stone-950 focus:ring-stone-950/10"
          } ${className}`.trim()}
          {...props}
        />
        {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
      </div>
    )
  }
)

AdminTextarea.displayName = "AdminTextarea"
