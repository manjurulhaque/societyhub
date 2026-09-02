import { notFound } from "next/navigation"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { getSocietyReportsData } from "./data"
import { ReportsHeader } from "./components"
import { SocietyReportsClient } from "./SocietyReportsClient"

export default async function SocietyReportsPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const context = await getSocietyAdmin(code)

  if (!context) {
    notFound()
  }

  const { society } = context
  const reportData = await getSocietyReportsData({
    id: society.id,
    name: society.name,
    code: society.code,
    currencySymbol: society.currencySymbol || "₹",
    address: society.address,
    city: society.city,
    state: society.state,
    pincode: society.pincode,
    registrationNumber: society.registrationNumber,
    panNumber: society.panNumber,
    gstin: society.gstin,
  })

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 sm:py-8 md:px-8">
      <ReportsHeader society={reportData.society} />
      <SocietyReportsClient data={reportData} />
    </div>
  )
}
