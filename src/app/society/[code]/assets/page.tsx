import { notFound } from "next/navigation"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { prisma } from "@/lib/prisma"
import { AdminPageHeader } from "@/components/admin"
import { AssetsClientView, type FixedAssetListItem } from "./AssetsClientView"
import { type AssetCategoryItem } from "./AssetCategoriesModal"
import { type VendorOption } from "./AddAssetModal"
import { COMMITTEE_ROLES } from "@/lib/auth/requireAuth"
import type { SocietyRole } from "@/generated/prisma/client"

export default async function SocietyAssetsPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const context = await getSocietyAdmin(code)

  if (!context) {
    notFound()
  }

  const { society, designation, isSuperAdmin } = context

  const canManageAssets =
    isSuperAdmin || COMMITTEE_ROLES.includes(designation as SocietyRole)

  // Fetch all assets, categories, and vendors for this society
  const [rawAssets, rawCategories, rawVendors] = await Promise.all([
    prisma.fixedAsset.findMany({
      where: {
        societyId: society.id,
        deletedAt: null,
      },
      include: {
        category: true,
        amcVendor: {
          select: {
            id: true,
            name: true,
            companyName: true,
            phone: true,
          },
        },
        _count: {
          select: {
            serviceLogs: true,
          },
        },
      },
      orderBy: [
        { category: { name: "asc" } },
        { name: "asc" },
      ],
    }),
    prisma.assetCategory.findMany({
      where: {
        societyId: society.id,
        deletedAt: null,
      },
      include: {
        _count: {
          select: {
            assets: {
              where: { deletedAt: null },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.vendor.findMany({
      where: {
        societyId: society.id,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        companyName: true,
        phone: true,
      },
      orderBy: { name: "asc" },
    }),
  ])

  const assets: FixedAssetListItem[] = rawAssets.map((a) => ({
    id: a.id,
    name: a.name,
    assetCode: a.assetCode,
    location: a.location,
    serialNumber: a.serialNumber,
    purchaseDate: a.purchaseDate ? a.purchaseDate.toISOString().split("T")[0] : null,
    purchaseCost: a.purchaseCost ? Number(a.purchaseCost) : null,
    currentBookValue: a.currentBookValue ? Number(a.currentBookValue) : null,
    warrantyExpiresAt: a.warrantyExpiresAt ? a.warrantyExpiresAt.toISOString().split("T")[0] : null,
    status: a.status,
    categoryId: a.categoryId,
    categoryName: a.category.name,
    depreciationRate: a.category.depreciationRate ? Number(a.category.depreciationRate) : null,
    amcVendorId: a.amcVendorId,
    amcVendorName: a.amcVendor ? (a.amcVendor.companyName || a.amcVendor.name) : null,
    amcStartDate: a.amcStartDate ? a.amcStartDate.toISOString().split("T")[0] : null,
    amcEndDate: a.amcEndDate ? a.amcEndDate.toISOString().split("T")[0] : null,
    amcAmount: a.amcAmount ? Number(a.amcAmount) : null,
    serviceLogsCount: a._count.serviceLogs,
  }))

  const categories: AssetCategoryItem[] = rawCategories.map((c) => ({
    id: c.id,
    name: c.name,
    depreciationRate: c.depreciationRate ? Number(c.depreciationRate) : null,
    description: c.description,
    _count: {
      assets: c._count.assets,
    },
  }))

  const vendors: VendorOption[] = rawVendors.map((v) => ({
    id: v.id,
    name: v.name,
    companyName: v.companyName,
    phone: v.phone,
  }))

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Capital Assets & Infrastructure"
        title="Fixed Asset Register & AMC"
        description={`Statutory Dead Stock Register, machinery warranties, and Annual Maintenance Contracts for ${society.name}.`}
      />

      <AssetsClientView
        societyCode={code}
        currencySymbol={society.currencySymbol || "₹"}
        assets={assets}
        categories={categories}
        vendors={vendors}
        canManageAssets={canManageAssets}
        currentDateIso={new Date().toISOString()}
      />
    </div>
  )
}
