"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  AdminCard,
  AdminInput,
  AdminSelect,
  AdminTextarea,
  AdminButton,
  AdminAlert,
} from "@/components/admin"
import { updateSocietySettings, type UpdateSocietySettingsState } from "./actions"

type SocietySettingsFormProps = {
  society: {
    id: string
    name: string
    code: string | null
    societyType: string
    phone: string | null
    email: string | null
    address: string | null
    city: string | null
    state: string | null
    pincode: string | null
    registrationNumber: string | null
    panNumber: string | null
    tanNumber: string | null
    gstin: string | null
    maintenanceType: string
    fixedRate: number | null
    ratePerSqft: number | null
    billGenerationDay: number
    dueDayOfMonth: number
    gracePeriodDays: number
    lateFeeRate: number | null
    invoicePrefix: string | null
    receiptPrefix: string | null
  }
  currentCode: string
}

export function SocietySettingsForm({ society, currentCode }: SocietySettingsFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [state, setState] = useState<UpdateSocietySettingsState | null>(null)

  const [maintenanceType, setMaintenanceType] = useState(society.maintenanceType || "FIXED")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setState(null)

    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await updateSocietySettings(society.id, currentCode, state, formData)
      setState(result)

      if (result.success) {
        const newCode = formData.get("code")?.toString().trim().toUpperCase()
        if (newCode && newCode !== currentCode) {
          router.push(`/society/${newCode}/settings`)
        } else {
          router.refresh()
        }
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {state?.success && state.message ? (
        <AdminAlert variant="success">{state.message}</AdminAlert>
      ) : null}

      {state?.error ? (
        <AdminAlert variant="danger">{state.error}</AdminAlert>
      ) : null}

      {/* 1. General Profile & Contact Information */}
      <AdminCard
        title="Society Profile & Contact Details"
        description="Core identity, address, and official communication channels"
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
              Society Name *
            </label>
            <AdminInput
              name="name"
              defaultValue={society.name}
              required
              placeholder="e.g. Green Valley Housing Society"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
              Society Code (Short Identifier)
            </label>
            <AdminInput
              name="code"
              defaultValue={society.code || ""}
              placeholder="e.g. GVH"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
              Society Type
            </label>
            <AdminSelect
              name="societyType"
              defaultValue={society.societyType}
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
              defaultValue={society.phone || ""}
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
              defaultValue={society.email || ""}
              placeholder="management@society.com"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
              Street Address
            </label>
            <AdminTextarea
              name="address"
              rows={2}
              defaultValue={society.address || ""}
              placeholder="Street name, plot number, area/locality"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
              City
            </label>
            <AdminInput
              name="city"
              defaultValue={society.city || ""}
              placeholder="e.g. Mumbai"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
              State
            </label>
            <AdminInput
              name="state"
              defaultValue={society.state || ""}
              placeholder="e.g. Maharashtra"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
              Pincode
            </label>
            <AdminInput
              name="pincode"
              defaultValue={society.pincode || ""}
              placeholder="e.g. 400001"
            />
          </div>
        </div>
      </AdminCard>

      {/* 2. Statutory & Legal Registrations */}
      <AdminCard
        title="Statutory & Tax Registrations"
        description="Official government, registrar, and taxation identification numbers"
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
              Registration Number
            </label>
            <AdminInput
              name="registrationNumber"
              defaultValue={society.registrationNumber || ""}
              placeholder="e.g. BOM/HSG/1234/2020"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
              PAN Number
            </label>
            <AdminInput
              name="panNumber"
              defaultValue={society.panNumber || ""}
              placeholder="e.g. AABCS1234F"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
              TAN Number
            </label>
            <AdminInput
              name="tanNumber"
              defaultValue={society.tanNumber || ""}
              placeholder="e.g. MUMB12345A"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
              GSTIN
            </label>
            <AdminInput
              name="gstin"
              defaultValue={society.gstin || ""}
              placeholder="e.g. 27AABCS1234F1Z5"
            />
          </div>
        </div>
      </AdminCard>

      {/* 3. Maintenance & Billing Policy */}
      <AdminCard
        title="Maintenance Billing Policy & Parameters"
        description="Rules and calculations applied when generating periodic dues and invoices"
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
              Maintenance Calculation Method
            </label>
            <AdminSelect
              name="maintenanceType"
              value={maintenanceType}
              onChange={(e) => setMaintenanceType(e.target.value)}
              options={[
                { label: "Fixed Amount per Flat", value: "FIXED" },
                { label: "Per Square Foot Area", value: "PER_SQFT" },
                { label: "Custom Formula / Tiered", value: "CUSTOM" },
              ]}
            />
          </div>

          {maintenanceType === "FIXED" || maintenanceType === "CUSTOM" ? (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Fixed Rate Amount (₹)
              </label>
              <AdminInput
                name="fixedRate"
                type="number"
                step="0.01"
                defaultValue={society.fixedRate ?? ""}
                placeholder="e.g. 2500"
              />
            </div>
          ) : null}

          {maintenanceType === "PER_SQFT" || maintenanceType === "CUSTOM" ? (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Rate per Sq. Ft. (₹ / sqft)
              </label>
              <AdminInput
                name="ratePerSqft"
                type="number"
                step="0.01"
                defaultValue={society.ratePerSqft ?? ""}
                placeholder="e.g. 3.50"
              />
            </div>
          ) : null}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
              Bill Generation Day
            </label>
            <AdminInput
              name="billGenerationDay"
              type="number"
              min="1"
              max="28"
              defaultValue={society.billGenerationDay || 1}
              placeholder="e.g. 1 (1st of month)"
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
              defaultValue={society.dueDayOfMonth || 10}
              placeholder="e.g. 10 (10th of month)"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
              Grace Period (Days)
            </label>
            <AdminInput
              name="gracePeriodDays"
              type="number"
              min="0"
              max="60"
              defaultValue={society.gracePeriodDays || 0}
              placeholder="e.g. 5"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
              Late Fee Rate (% per annum)
            </label>
            <AdminInput
              name="lateFeeRate"
              type="number"
              step="0.01"
              min="0"
              max="100"
              defaultValue={society.lateFeeRate ?? 21.0}
              placeholder="e.g. 21.00"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
              Invoice Prefix
            </label>
            <AdminInput
              name="invoicePrefix"
              defaultValue={society.invoicePrefix || "INV"}
              placeholder="e.g. INV"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
              Receipt Prefix
            </label>
            <AdminInput
              name="receiptPrefix"
              defaultValue={society.receiptPrefix || "RCPT"}
              placeholder="e.g. RCPT"
            />
          </div>
        </div>
      </AdminCard>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <AdminButton
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isPending}
          disabled={isPending}
        >
          {isPending ? "Saving Settings..." : "Save Society Settings"}
        </AdminButton>
      </div>
    </form>
  )
}
