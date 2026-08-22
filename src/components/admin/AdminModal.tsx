"use client"

import { useEffect, type ReactNode } from "react"

type AdminModalProps = {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  maxWidth?: "sm" | "md" | "lg" | "xl"
}

const maxWidthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
}

export function AdminModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = "md",
}: AdminModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }

    if (isOpen) {
      document.body.style.overflow = "hidden"
      window.addEventListener("keydown", handleKeyDown)
    }

    return () => {
      document.body.style.overflow = "unset"
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-950/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div
        className={`relative z-10 flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl transition-all ${maxWidthClasses[maxWidth]}`}
      >
        <div className="flex shrink-0 items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-stone-950">
              {title}
            </h3>
            {description ? (
              <p className="mt-1 text-sm text-stone-500">{description}</p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
            aria-label="Close dialog"
          >
            <svg
              className="h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <div className="mt-4 flex-1 overflow-y-auto pr-1">{children}</div>

        {footer ? (
          <div className="mt-6 flex shrink-0 flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 border-t border-stone-100 pt-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}
