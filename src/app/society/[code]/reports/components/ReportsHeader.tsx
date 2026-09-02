import { AdminPageHeader } from "@/components/admin"
import type { SocietyReportData } from "../types"

interface ReportsHeaderProps {
  society: SocietyReportData["society"]
}

export function ReportsHeader({ society }: ReportsHeaderProps) {
  return (
    <AdminPageHeader
      eyebrow="Financial Intelligence & Audit"
      title="Reports & Analytics"
      description={`Comprehensive financial audit, Balance Sheet, statutory registers, and expenditure statements for ${society.name}.`}
    />
  )
}
