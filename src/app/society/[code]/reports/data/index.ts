import { fetchRawSocietyReportData } from "./queries"
import { transformSocietyReportData } from "./transformers"
import type { SocietyReportData } from "../types"

export * from "./queries"
export * from "./transformers"

export async function getSocietyReportsData(
  society: SocietyReportData["society"]
): Promise<SocietyReportData> {
  const rawData = await fetchRawSocietyReportData(society.id)
  return transformSocietyReportData(society, rawData)
}
