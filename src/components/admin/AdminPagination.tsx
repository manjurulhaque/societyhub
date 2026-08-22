"use client"

import Link from "next/link"
import type { ReactNode } from "react"

type AdminPaginationProps = {
  currentPage: number
  totalPages: number
  totalItems?: number
  itemsPerPage?: number
  createPageUrl?: (page: number) => string
  onPageChange?: (page: number) => void
  className?: string
}

export function AdminPagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  createPageUrl,
  onPageChange,
  className = "",
}: AdminPaginationProps) {
  if (totalPages <= 1) {
    return null
  }

  const startItem = totalItems && itemsPerPage ? (currentPage - 1) * itemsPerPage + 1 : undefined
  const endItem =
    totalItems && itemsPerPage
      ? Math.min(currentPage * itemsPerPage, totalItems)
      : undefined

  const renderButton = (page: number, label: ReactNode, disabled: boolean) => {
    const isCurrent = page === currentPage
    const baseClass = `inline-flex items-center justify-center rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
      isCurrent
        ? "bg-stone-950 text-white shadow-sm"
        : "text-stone-700 hover:bg-stone-100 border border-stone-200 bg-white"
    } ${disabled ? "pointer-events-none opacity-40" : ""}`

    if (createPageUrl && !disabled) {
      return (
        <Link href={createPageUrl(page)} className={baseClass}>
          {label}
        </Link>
      )
    }

    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => onPageChange?.(page)}
        className={baseClass}
      >
        {label}
      </button>
    )
  }

  // Generate page numbers to show
  const pageNumbers: number[] = []
  const maxPagesToShow = 5
  let startPage = Math.max(1, currentPage - 2)
  const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1)


  if (endPage - startPage < maxPagesToShow - 1) {
    startPage = Math.max(1, endPage - maxPagesToShow + 1)
  }

  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i)
  }

  return (
    <div
      className={`flex flex-col items-center justify-between gap-4 border-t border-stone-200 pt-4 sm:flex-row ${className}`.trim()}
    >
      {totalItems !== undefined ? (
        <p className="text-xs text-stone-500">
          Showing{" "}
          <span className="font-medium text-stone-900">{startItem}</span> to{" "}
          <span className="font-medium text-stone-900">{endItem}</span> of{" "}
          <span className="font-medium text-stone-900">{totalItems}</span> results
        </p>
      ) : (
        <p className="text-xs text-stone-500">
          Page <span className="font-medium text-stone-900">{currentPage}</span> of{" "}
          <span className="font-medium text-stone-900">{totalPages}</span>
        </p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {renderButton(currentPage - 1, "Previous", currentPage <= 1)}

        {startPage > 1 ? (
          <>
            {renderButton(1, "1", false)}
            {startPage > 2 ? (
              <span className="px-1 text-xs text-stone-400">...</span>
            ) : null}
          </>
        ) : null}

        {pageNumbers.map((page) => (
          <span key={page}>{renderButton(page, page, false)}</span>
        ))}

        {endPage < totalPages ? (
          <>
            {endPage < totalPages - 1 ? (
              <span className="px-1 text-xs text-stone-400">...</span>
            ) : null}
            {renderButton(totalPages, totalPages, false)}
          </>
        ) : null}

        {renderButton(currentPage + 1, "Next", currentPage >= totalPages)}
      </div>
    </div>
  )
}
