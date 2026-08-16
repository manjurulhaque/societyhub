"use client"

import { forwardRef, type ComponentPropsWithoutRef } from "react"

export type AdminSearchBarProps = Omit<ComponentPropsWithoutRef<"input">, "type"> & {
  onClear?: () => void
}

export const AdminSearchBar = forwardRef<HTMLInputElement, AdminSearchBarProps>(
  ({ className = "", placeholder = "Search...", value, onClear, ...props }, ref) => {
    const hasValue = Boolean(value && String(value).length > 0)

    return (
      <div className={`relative w-full max-w-full sm:max-w-sm ${className}`.trim()}>
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400">
          <svg
            className="h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
        </div>

        <input
          ref={ref}
          type="search"
          value={value}
          placeholder={placeholder}
          className="block w-full rounded-full border border-stone-300 bg-white py-2 pl-9 pr-8 text-sm text-stone-900 placeholder:text-stone-400 shadow-sm transition-all focus:border-stone-950 focus:outline-none focus:ring-2 focus:ring-stone-950/10"
          {...props}
        />

        {hasValue && onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-stone-400 hover:text-stone-600"
            aria-label="Clear search"
          >
            <svg
              className="h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        ) : null}
      </div>
    )
  }
)

AdminSearchBar.displayName = "AdminSearchBar"
