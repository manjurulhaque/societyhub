"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"

type SocietySidebarLinkProps = {
  href: string
  children: ReactNode
}

export function SocietySidebarLink({ href, children }: SocietySidebarLinkProps) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all text-xs font-medium ${
        isActive
          ? "bg-stone-950 text-white shadow-sm font-semibold"
          : "text-stone-600 hover:bg-stone-100 hover:text-stone-950"
      }`}
    >
      {children}
    </Link>
  )
}
