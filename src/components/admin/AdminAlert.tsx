import type { ReactNode } from "react"

export type AlertVariant = "info" | "success" | "warning" | "danger"

type AdminAlertProps = {
  title?: string
  children: ReactNode
  variant?: AlertVariant
  action?: ReactNode
  className?: string
}

const variantStyles: Record<
  AlertVariant,
  {
    container: string
    title: string
    body: string
    icon: ReactNode
  }
> = {
  info: {
    container: "bg-sky-50 border-sky-200 text-sky-900",
    title: "text-sky-900",
    body: "text-sky-800",
    icon: (
      <svg
        className="h-5 w-5 text-sky-500 shrink-0"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  success: {
    container: "bg-emerald-50 border-emerald-200 text-emerald-900",
    title: "text-emerald-900",
    body: "text-emerald-800",
    icon: (
      <svg
        className="h-5 w-5 text-emerald-500 shrink-0"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  warning: {
    container: "bg-amber-50 border-amber-200 text-amber-900",
    title: "text-amber-900",
    body: "text-amber-800",
    icon: (
      <svg
        className="h-5 w-5 text-amber-500 shrink-0"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  danger: {
    container: "bg-rose-50 border-rose-200 text-rose-900",
    title: "text-rose-900",
    body: "text-rose-800",
    icon: (
      <svg
        className="h-5 w-5 text-rose-500 shrink-0"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
}

export function AdminAlert({
  title,
  children,
  variant = "info",
  action,
  className = "",
}: AdminAlertProps) {
  const styles = variantStyles[variant]

  return (
    <div
      role="alert"
      className={`flex flex-col sm:flex-row items-start gap-3 rounded-2xl border p-4 shadow-sm ${styles.container} ${className}`.trim()}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="mt-0.5 shrink-0">{styles.icon}</div>
        <div className="flex-1 min-w-0 text-sm">
          {title ? (
            <h4 className={`font-semibold mb-1 ${styles.title}`}>{title}</h4>
          ) : null}
          <div className={styles.body}>{children}</div>
        </div>
      </div>
      {action ? <div className="shrink-0 w-full sm:w-auto mt-2 sm:mt-0 flex justify-end">{action}</div> : null}
    </div>
  )
}
