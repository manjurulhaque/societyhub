"use client"

import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react"

export type AdminSelectOption = {
  label: string
  value: string | number
  disabled?: boolean
}

export type AdminSelectProps = Omit<ComponentPropsWithoutRef<"select">, "children"> & {
  options?: AdminSelectOption[]
  children?: ReactNode
  error?: string
}

export const AdminSelect = forwardRef<HTMLSelectElement, AdminSelectProps>(
  ({ className = "", error, options, children, disabled, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <select
          ref={ref}
          disabled={disabled}
          className={`block w-full appearance-none rounded-xl border bg-white px-3.5 py-2 pr-10 text-sm text-stone-900 shadow-sm transition-all focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-500 ${
            error
              ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200"
              : "border-stone-300 focus:border-stone-950 focus:ring-stone-950/10"
          } ${className}`.trim()}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>

        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-stone-500">
          <svg
            className="h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
      </div>
    )
  }
)

AdminSelect.displayName = "AdminSelect"
