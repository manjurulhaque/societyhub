"use client"

import Link from "next/link"
import type { ComponentPropsWithoutRef, ReactNode } from "react"

export type ButtonVariant = "primary" | "secondary" | "outline" | "danger" | "ghost"
export type ButtonSize = "xs" | "sm" | "md" | "lg"

type BaseProps = {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  isLoading?: boolean
  className?: string
}

type ButtonAsButton = BaseProps &
  Omit<ComponentPropsWithoutRef<"button">, keyof BaseProps> & {
    href?: undefined
  }

type ButtonAsLink = BaseProps &
  Omit<ComponentPropsWithoutRef<typeof Link>, keyof BaseProps> & {
    href: string
  }

export type AdminButtonProps = ButtonAsButton | ButtonAsLink

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-stone-950 text-stone-50 hover:bg-stone-800 focus-visible:ring-stone-950 active:bg-stone-900 border-transparent shadow-sm",
  secondary:
    "bg-stone-100 text-stone-900 hover:bg-stone-200 focus-visible:ring-stone-400 active:bg-stone-200 border-stone-200",
  outline:
    "border-stone-300 bg-white text-stone-700 hover:bg-stone-50 hover:text-stone-900 focus-visible:ring-stone-400 active:bg-stone-100 shadow-sm",
  danger:
    "bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-600 active:bg-rose-800 border-transparent shadow-sm",
  ghost:
    "bg-transparent text-stone-600 hover:bg-stone-100 hover:text-stone-900 focus-visible:ring-stone-400 border-transparent",
}

const sizeClasses: Record<ButtonSize, string> = {
  xs: "px-2.5 py-1 text-xs gap-1 rounded-lg",
  sm: "px-3 py-1.5 text-xs font-medium gap-1.5 rounded-xl",
  md: "px-4 py-2 text-sm font-medium gap-2 rounded-full",
  lg: "px-6 py-2.5 text-base font-medium gap-2.5 rounded-full",
}

export function AdminButton({
  children,
  variant = "primary",
  size = "md",
  leftIcon,
  rightIcon,
  isLoading = false,
  className = "",
  ...props
}: AdminButtonProps) {
  const combinedClassName = `inline-flex items-center justify-center border font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`.trim()

  const content = (
    <>
      {isLoading ? (
        <svg
          className="h-4 w-4 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : leftIcon ? (
        <span className="shrink-0">{leftIcon}</span>
      ) : null}
      <span>{children}</span>
      {!isLoading && rightIcon ? <span className="shrink-0">{rightIcon}</span> : null}
    </>
  )

  if ("href" in props && props.href !== undefined) {
    const { href, rel, target, ...linkProps } = props
    const isExternal =
      typeof href === "string" &&
      (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("//"))
    const isBlank = target === "_blank"
    const safeRel = isExternal || isBlank ? rel || "noopener noreferrer" : rel

    return (
      <Link
        href={href}
        target={target}
        rel={safeRel}
        className={combinedClassName}
        {...linkProps}
      >
        {content}
      </Link>
    )
  }

  return (
    <button
      className={combinedClassName}
      disabled={isLoading || (props as ComponentPropsWithoutRef<"button">).disabled}
      {...(props as ComponentPropsWithoutRef<"button">)}
    >
      {content}
    </button>
  )
}
