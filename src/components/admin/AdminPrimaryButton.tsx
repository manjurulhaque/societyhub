import Link from "next/link"
import type { ComponentPropsWithoutRef, ReactNode } from "react"

type AdminPrimaryButtonProps = {
  children: ReactNode
  className?: string
  href?: string
  target?: string
  rel?: string
} & Omit<ComponentPropsWithoutRef<"button">, "children" | "className">

export function AdminPrimaryButton({
  children,
  className = "",
  href,
  target,
  rel,
  ...props
}: AdminPrimaryButtonProps) {
  const baseClassName =
    "rounded-full bg-stone-950 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-stone-800"

  if (href) {
    const isExternal =
      href.startsWith("http://") || href.startsWith("https://") || href.startsWith("//")
    const isBlank = target === "_blank"
    const safeRel = isExternal || isBlank ? rel || "noopener noreferrer" : rel

    return (
      <Link
        href={href}
        target={target}
        rel={safeRel}
        className={`${baseClassName} ${className}`.trim()}
      >
        {children}
      </Link>
    )
  }

  return (
    <button className={`${baseClassName} ${className}`.trim()} {...props}>
      {children}
    </button>
  )
}
