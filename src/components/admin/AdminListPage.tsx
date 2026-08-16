import type { ReactNode } from "react"

import { AdminPageHeader } from "./AdminPageHeader"
import { AdminTable } from "./AdminTable"

type AdminListPageProps = {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
  headers: string[]
  rows: ReactNode[]
}

export function AdminListPage({
  eyebrow,
  title,
  description,
  action,
  headers,
  rows,
}: AdminListPageProps) {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 md:px-8">
      <AdminPageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        action={action}
      />

      <AdminTable headers={headers} rows={rows} />
    </div>
  )
}
