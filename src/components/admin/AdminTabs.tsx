"use client"

import Link from "next/link"
import type { ReactNode } from "react"

export type AdminTabItem = {
  id: string
  label: string
  href?: string
  count?: number
  icon?: ReactNode
}

type AdminTabsProps = {
  items: AdminTabItem[]
  activeId: string
  onChange?: (id: string) => void
  className?: string
  wrap?: boolean
}

export function AdminTabs({
  items,
  activeId,
  onChange,
  className = "",
  wrap = false,
}: AdminTabsProps) {
  if (wrap) {
    return (
      <div className={`w-full min-w-0 ${className}`.trim()}>
        <div
          className="flex flex-wrap w-full items-center gap-1.5 rounded-2xl border border-stone-200 bg-stone-100/90 p-1.5 shadow-xs"
          role="tablist"
        >
          {items.map((tab) => {
            const isActive = tab.id === activeId

            const tabClasses = `inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
              isActive
                ? "bg-white text-stone-950 font-bold shadow-xs ring-1 ring-stone-900/5"
                : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/70"
            }`

            const content = (
              <>
                {tab.icon ? <span className="shrink-0">{tab.icon}</span> : null}
                <span>{tab.label}</span>
                {tab.count !== undefined ? (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                      isActive
                        ? "bg-stone-950 text-white"
                        : "bg-stone-200 text-stone-700"
                    }`}
                  >
                    {tab.count}
                  </span>
                ) : null}
              </>
            )

            if (tab.href) {
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  className={tabClasses}
                  role="tab"
                  aria-selected={isActive}
                >
                  {content}
                </Link>
              )
            }

            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onChange?.(tab.id)}
                className={tabClasses}
              >
                {content}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className={`w-full min-w-0 max-w-full overflow-x-auto pb-1 sm:pb-0 ${className}`.trim()}>
      <div
        className="inline-flex min-w-full sm:min-w-0 items-center gap-1 rounded-2xl border border-stone-200 bg-stone-100 p-1.5"
        role="tablist"
      >
        {items.map((tab) => {
          const isActive = tab.id === activeId

          const tabClasses = `inline-flex shrink-0 whitespace-nowrap items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all ${
            isActive
              ? "bg-white text-stone-950 shadow-sm"
              : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/60"
          }`

        const content = (
          <>
            {tab.icon ? <span className="shrink-0">{tab.icon}</span> : null}
            <span>{tab.label}</span>
            {tab.count !== undefined ? (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  isActive
                    ? "bg-stone-950 text-white"
                    : "bg-stone-200 text-stone-700"
                }`}
              >
                {tab.count}
              </span>
            ) : null}
          </>
        )

        if (tab.href) {
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={tabClasses}
              role="tab"
              aria-selected={isActive}
            >
              {content}
            </Link>
          )
        }

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange?.(tab.id)}
            className={tabClasses}
          >
            {content}
          </button>
        )
      })}
    </div>
  </div>
  )
}
