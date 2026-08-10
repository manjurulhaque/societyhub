import Link from "next/link"
import type { ComponentPropsWithoutRef, ReactNode } from "react"

type AdminPrimaryButtonProps = {
  children: ReactNode
  className?: string
  href?: string
} & Omit<ComponentPropsWithoutRef<"button">, "children" | "className">

export function AdminPrimaryButton({
  children,
  className = "",
  href,
  ...props
}: AdminPrimaryButtonProps) {
  const baseClassName =
    "rounded-full bg-stone-950 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-stone-800"

  if (href) {
    return (
      <Link href={href} className={`${baseClassName} ${className}`.trim()}>
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
