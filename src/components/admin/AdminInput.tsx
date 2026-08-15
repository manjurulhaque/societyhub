"use client"

import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react"

export type AdminInputProps = ComponentPropsWithoutRef<"input"> & {
  error?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

export const AdminInput = forwardRef<HTMLInputElement, AdminInputProps>(
  ({ className = "", error, leftIcon, rightIcon, disabled, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {leftIcon ? (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400">
            {leftIcon}
          </div>
        ) : null}

        <input
          ref={ref}
          disabled={disabled}
          className={`block w-full rounded-xl border bg-white px-3.5 py-2 text-sm text-stone-900 placeholder:text-stone-400 shadow-sm transition-all focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-500 ${
            leftIcon ? "pl-10" : ""
          } ${rightIcon ? "pr-10" : ""} ${
            error
              ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200"
              : "border-stone-300 focus:border-stone-950 focus:ring-stone-950/10"
          } ${className}`.trim()}
          {...props}
        />

        {rightIcon ? (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-stone-400">
            {rightIcon}
          </div>
        ) : null}

        {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
      </div>
    )
  }
)

AdminInput.displayName = "AdminInput"
