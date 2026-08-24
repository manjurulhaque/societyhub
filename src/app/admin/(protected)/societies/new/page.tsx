import Link from "next/link"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import type { SocietyType } from "@/generated/prisma/client"
import { generateUniqueSocietyCode } from "@/lib/society"

import { seedSocietyChartOfAccounts } from "@/lib/chartOfAccounts"
import { ensureStandardExpenseCategories } from "@/lib/expenseCategories"
import {
  AdminPageHeader,
  AdminCard,
  AdminInput,
  AdminSelect,
  AdminTextarea,
  AdminButton,
} from "@/components/admin"
import { TIMEZONE_OPTIONS } from "@/lib/datetime"
import { CURRENCY_OPTIONS } from "@/lib/currency"

export default function NewSocietyPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-8 md:px-8">
      <AdminPageHeader
        eyebrow="Society Onboarding"
        title="Create New Society"
        description="Onboard a new housing society, apartment association, or commercial complex onto SARWS Connect."
        action={
          <Link
            href="/admin/societies"
            className="rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-stone-700 transition hover:bg-stone-100 shadow-sm"
          >
            Cancel
          </Link>
        }
      />

      <form action={createSociety} className="space-y-8">
        {/* 1. Basic Society Information */}
        <AdminCard
          title="Society Profile"
          description="Name, code identifier, and legal organization type"
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Society Name *
              </label>
              <AdminInput
                name="name"
                required
                placeholder="e.g. Palm Grove Residency CHS"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Society Code (Short Identifier)
              </label>
              <AdminInput
                name="code"
                placeholder="Auto-generated if left blank"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Organization Type
              </label>
              <AdminSelect
                name="societyType"
                defaultValue="COOPERATIVE_HOUSING_SOCIETY"
                options={[
                  { label: "Cooperative Housing Society (CHS)", value: "COOPERATIVE_HOUSING_SOCIETY" },
                  { label: "Apartment Owners Association (AOA)", value: "APARTMENT_OWNERS_ASSOCIATION" },
                  { label: "Resident Welfare Association (RWA)", value: "RESIDENT_WELFARE_ASSOCIATION" },
                  { label: "Commercial Complex", value: "COMMERCIAL_COMPLEX" },
                  { label: "Plotted Community", value: "PLOTTED_COMMUNITY" },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Contact Phone
              </label>
              <AdminInput
                name="phone"
                type="tel"
                placeholder="+91 98765 43210"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Contact Email
              </label>
              <AdminInput
                name="email"
                type="email"
                placeholder="office@palmgrove.com"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Street Address
              </label>
              <AdminTextarea
                name="address"
                rows={2}
                placeholder="Plot / survey number, street name, locality"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                City
              </label>
              <AdminInput
                name="city"
                placeholder="e.g. Mumbai"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                State
              </label>
              <AdminInput
                name="state"
                placeholder="e.g. Maharashtra"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Pincode
              </label>
              <AdminInput
                name="pincode"
                placeholder="e.g. 400001"
              />
            </div>
          </div>
        </AdminCard>

        {/* 2. Statutory & Legal Identifiers */}
        <AdminCard
          title="Statutory & Tax Registrations"
          description="Official registration numbers (can also be filled later in Settings)"
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Registration Number
              </label>
              <AdminInput
                name="registrationNumber"
                placeholder="e.g. BOM/HSG/1234/2020"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                PAN Number
              </label>
              <AdminInput
                name="panNumber"
                placeholder="e.g. AABCS1234F"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                TAN Number
              </label>
              <AdminInput
                name="tanNumber"
                placeholder="e.g. MUMB12345A"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                GSTIN
              </label>
              <AdminInput
                name="gstin"
                placeholder="e.g. 27AABCS1234F1Z5"
              />
            </div>
          </div>
        </AdminCard>

        {/* 3. Maintenance Billing Defaults */}
        <AdminCard
          title="Maintenance Billing Setup"
          description="Default calculation formula and invoice parameters for this society"
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Calculation Method
              </label>
              <AdminSelect
                name="maintenanceType"
                defaultValue="FIXED"
                options={[
                  { label: "Fixed Rate per Flat", value: "FIXED" },
                  { label: "Per Square Foot Area", value: "PER_SQFT" },
                  { label: "Custom / Tiered Formula", value: "CUSTOM" },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Fixed Rate (₹ / month)
              </label>
              <AdminInput
                name="fixedRate"
                type="number"
                step="0.01"
                placeholder="e.g. 2500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Rate per Sq. Ft. (₹ / sqft)
              </label>
              <AdminInput
                name="ratePerSqft"
                type="number"
                step="0.01"
                placeholder="e.g. 3.50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Due Day of Month
              </label>
              <AdminInput
                name="dueDayOfMonth"
                type="number"
                min="1"
                max="28"
                defaultValue={10}
                placeholder="10"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Late Fee Rate (% p.a.)
              </label>
              <AdminInput
                name="lateFeeRate"
                type="number"
                step="0.01"
                defaultValue={21.0}
                placeholder="21.00"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Invoice Prefix
              </label>
              <AdminInput
                name="invoicePrefix"
                defaultValue="INV"
                placeholder="INV"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Operating Timezone
              </label>
              <AdminSelect
                name="timezone"
                defaultValue="Asia/Kolkata"
                options={TIMEZONE_OPTIONS.map((tz) => ({
                  label: `${tz.label} (${tz.offset})`,
                  value: tz.value,
                }))}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Default Currency
              </label>
              <AdminSelect
                name="currency"
                defaultValue="INR"
                options={CURRENCY_OPTIONS.map((c) => ({
                  label: c.name,
                  value: c.code,
                }))}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Currency Symbol
              </label>
              <AdminInput
                name="currencySymbol"
                defaultValue="₹"
                placeholder="₹"
              />
            </div>
          </div>
        </AdminCard>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/admin/societies"
            className="rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
          >
            Cancel
          </Link>
          <AdminButton type="submit" variant="primary" size="lg">
            Create & Seed Society
          </AdminButton>
        </div>
      </form>
    </div>
  )
}

import { requireSuperAdmin } from "@/lib/auth/requireAuth"
import { recordAuditLog } from "@/lib/audit"

async function createSociety(formData: FormData) {
  "use server"

  const admin = await requireSuperAdmin()

  const name = formData.get("name")?.toString().trim()
  const rawCode = formData.get("code")?.toString().trim().toUpperCase() || null
  const societyType = formData.get("societyType")?.toString() || "COOPERATIVE_HOUSING_SOCIETY"
  const timezone = formData.get("timezone")?.toString().trim() || "Asia/Kolkata"
  const phone = formData.get("phone")?.toString().trim() || null
  const email = formData.get("email")?.toString().trim().toLowerCase() || null
  const address = formData.get("address")?.toString().trim() || null
  const city = formData.get("city")?.toString().trim() || null
  const state = formData.get("state")?.toString().trim() || null
  const pincode = formData.get("pincode")?.toString().trim() || null

  const registrationNumber = formData.get("registrationNumber")?.toString().trim() || null
  const panNumber = formData.get("panNumber")?.toString().trim().toUpperCase() || null
  const tanNumber = formData.get("tanNumber")?.toString().trim().toUpperCase() || null
  const gstin = formData.get("gstin")?.toString().trim().toUpperCase() || null

  const maintenanceType = formData.get("maintenanceType")?.toString() || "FIXED"
  const rawFixedRate = formData.get("fixedRate")?.toString().trim()
  const rawRatePerSqft = formData.get("ratePerSqft")?.toString().trim()
  const rawDueDay = formData.get("dueDayOfMonth")?.toString().trim()
  const rawLateFee = formData.get("lateFeeRate")?.toString().trim()
  const currency = formData.get("currency")?.toString().trim() || "INR"
  const currencySymbol = formData.get("currencySymbol")?.toString().trim() || "₹"
  const invoicePrefix = formData.get("invoicePrefix")?.toString().trim().toUpperCase() || "INV"

  if (!name) {
    throw new Error("Society name is required")
  }

  const code = await generateUniqueSocietyCode(name, rawCode)

  const fixedRate = rawFixedRate ? parseFloat(rawFixedRate) : null
  const ratePerSqft = rawRatePerSqft ? parseFloat(rawRatePerSqft) : null
  const dueDayOfMonth = rawDueDay ? parseInt(rawDueDay, 10) : 10
  const lateFeeRate = rawLateFee ? parseFloat(rawLateFee) : 21.0

  const society = await prisma.society.create({
    data: {
      name,
      code,
      societyType: societyType as SocietyType,
      timezone,
      currency,
      currencySymbol,

      phone,
      email,
      address,
      city,
      state,
      pincode,
      registrationNumber,
      panNumber,
      tanNumber,
      gstin,
      maintenanceType:
        maintenanceType === "PER_SQFT"
          ? "PER_SQFT"
          : maintenanceType === "CUSTOM"
            ? "CUSTOM"
            : "FIXED",
      fixedRate: fixedRate !== null && !isNaN(fixedRate) ? fixedRate : null,
      ratePerSqft: ratePerSqft !== null && !isNaN(ratePerSqft) ? ratePerSqft : null,
      dueDayOfMonth: !isNaN(dueDayOfMonth) ? dueDayOfMonth : 10,
      lateFeeRate: !isNaN(lateFeeRate) ? lateFeeRate : 21.0,
      invoicePrefix,
    },
  })

  // Auto-seed standard Chart of Accounts & Expense Categories for the society
  await seedSocietyChartOfAccounts(society.id)
  await ensureStandardExpenseCategories(society.id)

  await recordAuditLog({
    societyId: society.id,
    userId: admin.id,
    action: "CREATE",
    entity: "Society",
    entityId: society.id,
    description: `Super Admin ${admin.email} created new society ${society.name} (${society.code})`,
    newData: { name: society.name, code: society.code },
  })

  revalidatePath("/admin/societies")
  redirect(`/admin/societies/${society.id}`)
}

