import Link from "next/link"
import { notFound } from "next/navigation"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { prisma } from "@/lib/prisma"
import { AdminBadge, AdminStatCard, AdminCard } from "@/components/admin"
import { formatDateInAppTimeZone } from "@/lib/datetime"
import { AssetDetailClient } from "./AssetDetailClient"
import { COMMITTEE_ROLES } from "@/lib/auth/requireAuth"
import type { SocietyRole } from "@/generated/prisma/client"

export default async function SocietyAssetDetailPage({
  params,
}: {
  params: Promise<{ code: string; id: string }>
}) {
  const { code, id } = await params
  const context = await getSocietyAdmin(code)

  if (!context) {
    notFound()
  }

  const { society, designation, isSuperAdmin } = context
  const canManage = isSuperAdmin || COMMITTEE_ROLES.includes(designation as SocietyRole)

  const [asset, categories, vendors] = await Promise.all([
    prisma.fixedAsset.findFirst({
      where: {
        id,
        societyId: society.id,
        deletedAt: null,
      },
      include: {
        category: true,
        amcVendor: true,
        serviceLogs: {
          include: {
            vendor: true,
          },
          orderBy: { serviceDate: "desc" },
        },
      },
    }),
    prisma.assetCategory.findMany({
      where: { societyId: society.id, deletedAt: null },
      orderBy: { name: "asc" },
    }),
    prisma.vendor.findMany({
      where: { societyId: society.id, isActive: true, deletedAt: null },
      orderBy: { name: "asc" },
    }),
  ])

  if (!asset) {
    notFound()
  }

  const currencySymbol = society.currencySymbol || "₹"
  const now = new Date()

  // Calculate total maintenance cost
  const totalMaintenanceCost = asset.serviceLogs.reduce(
    (sum, log) => sum + (log.cost ? Number(log.cost) : 0),
    0
  )

  // Determine latest next service due date
  const upcomingServiceLog = asset.serviceLogs.find(
    (l) => l.nextDueDate && new Date(l.nextDueDate) >= now
  )

  const isAmcActive = asset.amcEndDate && new Date(asset.amcEndDate) >= now
  const isWarrantyActive = asset.warrantyExpiresAt && new Date(asset.warrantyExpiresAt) >= now

  return (
    <div className="space-y-6">
      {/* Back Link & Header */}
      <div>
        <Link
          href={`/society/${code}/assets`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900 transition mb-3"
        >
          <span>←</span>
          <span>Back to Fixed Assets Register</span>
        </Link>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                {asset.category.name}
              </span>
              {asset.assetCode && (
                <span className="rounded-md bg-stone-100 px-2 py-0.5 font-mono text-xs font-bold text-stone-800">
                  {asset.assetCode}
                </span>
              )}
              <AdminBadge
                variant={
                  asset.status === "ACTIVE"
                    ? "success"
                    : asset.status === "UNDER_MAINTENANCE"
                      ? "warning"
                      : "neutral"
                }
                size="sm"
              >
                {asset.status.replace("_", " ")}
              </AdminBadge>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-stone-950 sm:text-2xl">
              {asset.name}
            </h1>
            <p className="text-xs text-stone-500">
              {asset.location ? `📍 Located at: ${asset.location}` : "No specific location recorded"}
              {asset.serialNumber ? ` • Serial No: ${asset.serialNumber}` : ""}
            </p>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          title="Current Book Value"
          value={
            asset.currentBookValue !== null
              ? `${currencySymbol}${Number(asset.currentBookValue).toLocaleString("en-IN")}`
              : "—"
          }
          subtitle={`Purchase Cost: ${asset.purchaseCost ? `${currencySymbol}${Number(asset.purchaseCost).toLocaleString("en-IN")}` : "—"}`}
          icon={
            <svg className="h-5 w-5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <AdminStatCard
          title="AMC Contract Status"
          value={isAmcActive ? "Active AMC" : asset.amcEndDate ? "Expired" : "No AMC"}
          subtitle={
            asset.amcEndDate
              ? `Valid till ${formatDateInAppTimeZone(asset.amcEndDate)}`
              : "No maintenance contract attached"
          }
          icon={
            <svg className="h-5 w-5 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Cumulative Maintenance"
          value={`${currencySymbol}${totalMaintenanceCost.toLocaleString("en-IN")}`}
          subtitle={`${asset.serviceLogs.length} servicing & repair logs`}
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Next Service Scheduled"
          value={upcomingServiceLog?.nextDueDate ? formatDateInAppTimeZone(upcomingServiceLog.nextDueDate) : "Not Scheduled"}
          subtitle={
            isWarrantyActive
              ? `Under OEM Warranty till ${formatDateInAppTimeZone(asset.warrantyExpiresAt!)}`
              : "Routine inspection / preventative"
          }
          icon={
            <svg className="h-5 w-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
      </div>

      {/* Asset Client Interactive Container */}
      <AssetDetailClient
        societyCode={code}
        currencySymbol={currencySymbol}
        asset={{
          id: asset.id,
          name: asset.name,
          assetCode: asset.assetCode,
          location: asset.location,
          serialNumber: asset.serialNumber,
          purchaseDate: asset.purchaseDate ? asset.purchaseDate.toISOString().split("T")[0] : null,
          purchaseCost: asset.purchaseCost ? Number(asset.purchaseCost) : null,
          currentBookValue: asset.currentBookValue ? Number(asset.currentBookValue) : null,
          warrantyExpiresAt: asset.warrantyExpiresAt ? asset.warrantyExpiresAt.toISOString().split("T")[0] : null,
          status: asset.status,
          categoryId: asset.categoryId,
          categoryName: asset.category.name,
          depreciationRate: asset.category.depreciationRate ? Number(asset.category.depreciationRate) : null,
          amcVendorId: asset.amcVendorId,
          amcVendorName: asset.amcVendor ? (asset.amcVendor.companyName || asset.amcVendor.name) : null,
          amcVendorPhone: asset.amcVendor?.phone || null,
          amcVendorEmail: asset.amcVendor?.email || null,
          amcStartDate: asset.amcStartDate ? asset.amcStartDate.toISOString().split("T")[0] : null,
          amcEndDate: asset.amcEndDate ? asset.amcEndDate.toISOString().split("T")[0] : null,
          amcAmount: asset.amcAmount ? Number(asset.amcAmount) : null,
        }}
        serviceLogs={asset.serviceLogs.map((log) => ({
          id: log.id,
          serviceDate: log.serviceDate.toISOString(),
          description: log.description,
          cost: Number(log.cost),
          servicedBy: log.servicedBy,
          vendorName: log.vendor ? (log.vendor.companyName || log.vendor.name) : null,
          nextDueDate: log.nextDueDate ? log.nextDueDate.toISOString() : null,
          remarks: log.remarks,
        }))}
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          depreciationRate: c.depreciationRate ? Number(c.depreciationRate) : null,
          description: c.description,
        }))}
        vendors={vendors.map((v) => ({
          id: v.id,
          name: v.name,
          companyName: v.companyName,
          phone: v.phone,
        }))}
        canManage={canManage}
      />
    </div>
  )
}
