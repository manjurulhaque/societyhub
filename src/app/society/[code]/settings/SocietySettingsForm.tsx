"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  AdminCard,
  AdminInput,
  AdminSelect,
  AdminTextarea,
  AdminButton,
  AdminAlert,
} from "@/components/admin"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  societySettingsSchema,
  type SocietySettingsInput,
} from "@/lib/validations/society"
import { TIMEZONE_OPTIONS, formatCurrentTimeInTimeZone } from "@/lib/datetime"
import { updateSocietySettings, type UpdateSocietySettingsState } from "./actions"

import { CURRENCY_OPTIONS } from "@/lib/currency"

type SocietySettingsFormProps = {
  society: {
    id: string
    name: string
    code: string | null
    societyType: string
    timezone?: string | null
    currency?: string | null
    currencySymbol?: string | null
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

  const form = useForm({
    resolver: zodResolver(societySettingsSchema),
    defaultValues: {
      name: society.name || "",
      code: society.code || "",
      societyType: society.societyType || "COOPERATIVE_HOUSING_SOCIETY",
      phone: society.phone || "",
      email: society.email || "",
      address: society.address || "",
      city: society.city || "",
      state: society.state || "",
      pincode: society.pincode || "",
      registrationNumber: society.registrationNumber || "",
      panNumber: society.panNumber || "",
      tanNumber: society.tanNumber || "",
      gstin: society.gstin || "",
      maintenanceType: society.maintenanceType || "FIXED",
      fixedRate: society.fixedRate !== null ? String(society.fixedRate) : "",
      ratePerSqft: society.ratePerSqft !== null ? String(society.ratePerSqft) : "",
      billGenerationDay: society.billGenerationDay || 1,
      dueDayOfMonth: society.dueDayOfMonth || 10,
      gracePeriodDays: society.gracePeriodDays || 0,
      lateFeeRate: society.lateFeeRate ?? 21.0,
      timezone: society.timezone || "Asia/Kolkata",
      currency: society.currency || "INR",
      currencySymbol: society.currencySymbol || "₹",
      invoicePrefix: society.invoicePrefix || "INV",
      receiptPrefix: society.receiptPrefix || "RCPT",
    },
  })

  const maintenanceType = useWatch({
    control: form.control,
    name: "maintenanceType",
  })

  const selectedTimezone = useWatch({
    control: form.control,
    name: "timezone",
  })

  function onSubmit(values: SocietySettingsInput) {
    setState(null)

    const formData = new FormData()
    formData.append("name", values.name)
    formData.append("code", values.code || "")
    formData.append("societyType", values.societyType)
    formData.append("phone", values.phone || "")
    formData.append("email", values.email || "")
    formData.append("address", values.address || "")
    formData.append("city", values.city || "")
    formData.append("state", values.state || "")
    formData.append("pincode", values.pincode || "")

    formData.append("registrationNumber", values.registrationNumber || "")
    formData.append("panNumber", values.panNumber || "")
    formData.append("tanNumber", values.tanNumber || "")
    formData.append("gstin", values.gstin || "")

    formData.append("maintenanceType", values.maintenanceType)
    formData.append("fixedRate", values.fixedRate || "")
    formData.append("ratePerSqft", values.ratePerSqft || "")
    formData.append("billGenerationDay", String(values.billGenerationDay))
    formData.append("dueDayOfMonth", String(values.dueDayOfMonth))
    formData.append("gracePeriodDays", String(values.gracePeriodDays))
    formData.append("lateFeeRate", String(values.lateFeeRate))
    formData.append("timezone", values.timezone || "Asia/Kolkata")
    formData.append("invoicePrefix", values.invoicePrefix || "INV")
    formData.append("receiptPrefix", values.receiptPrefix || "RCPT")

    startTransition(async () => {
      const result = await updateSocietySettings(society.id, currentCode, state, formData)
      setState(result)

      if (result.success) {
        const newCode = values.code?.trim().toUpperCase()
        if (newCode && newCode !== currentCode) {
          router.push(`/society/${newCode}/settings`)
        } else {
          router.refresh()
        }
      }
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                      Society Name *
                    </FormLabel>
                    <FormControl>
                      <AdminInput
                        placeholder="e.g. Green Valley Housing Society"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <div>
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                      Society Code (Short Identifier)
                    </FormLabel>
                    <FormControl>
                      <AdminInput
                        placeholder="e.g. GVH"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <div>
              <FormField
                control={form.control}
                name="societyType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                      Society Type
                    </FormLabel>
                    <FormControl>
                      <AdminSelect
                        options={[
                          { label: "Cooperative Housing Society (CHS)", value: "COOPERATIVE_HOUSING_SOCIETY" },
                          { label: "Apartment Owners Association (AOA)", value: "APARTMENT_OWNERS_ASSOCIATION" },
                          { label: "Resident Welfare Association (RWA)", value: "RESIDENT_WELFARE_ASSOCIATION" },
                          { label: "Commercial Complex", value: "COMMERCIAL_COMPLEX" },
                          { label: "Plotted Community", value: "PLOTTED_COMMUNITY" },
                        ]}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <div>
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                      Contact Phone
                    </FormLabel>
                    <FormControl>
                      <AdminInput
                        type="tel"
                        placeholder="+91 98765 43210"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <div>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                      Contact Email
                    </FormLabel>
                    <FormControl>
                      <AdminInput
                        type="email"
                        placeholder="management@society.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                      Street Address
                    </FormLabel>
                    <FormControl>
                      <AdminTextarea
                        rows={2}
                        placeholder="Street name, plot number, area/locality"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <div>
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                      City
                    </FormLabel>
                    <FormControl>
                      <AdminInput
                        placeholder="e.g. Mumbai"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <div>
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                      State
                    </FormLabel>
                    <FormControl>
                      <AdminInput
                        placeholder="e.g. Maharashtra"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <div>
              <FormField
                control={form.control}
                name="pincode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                      Pincode
                    </FormLabel>
                    <FormControl>
                      <AdminInput
                        placeholder="e.g. 400001"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
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
              <FormField
                control={form.control}
                name="registrationNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                      Registration Number
                    </FormLabel>
                    <FormControl>
                      <AdminInput
                        placeholder="e.g. BOM/HSG/1234/2020"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <div>
              <FormField
                control={form.control}
                name="panNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                      PAN Number
                    </FormLabel>
                    <FormControl>
                      <AdminInput
                        placeholder="e.g. AABCS1234F"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <div>
              <FormField
                control={form.control}
                name="tanNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                      TAN Number
                    </FormLabel>
                    <FormControl>
                      <AdminInput
                        placeholder="e.g. MUMB12345A"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <div>
              <FormField
                control={form.control}
                name="gstin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                      GSTIN
                    </FormLabel>
                    <FormControl>
                      <AdminInput
                        placeholder="e.g. 27AABCS1234F1Z5"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </AdminCard>

        {/* 3. Regional & Localization Settings */}
        <AdminCard
          title="Regional & Timezone Settings"
          description="Localization preferences used across billing, receipt issuance, audit logs, and meeting notices"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-2">
                <FormField
                  control={form.control}
                  name="timezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                        Operating Timezone
                      </FormLabel>
                      <FormControl>
                        <AdminSelect
                          options={TIMEZONE_OPTIONS.map((tz) => ({
                            label: `${tz.label} (${tz.offset})`,
                            value: tz.value,
                          }))}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-2">
                  Live Timezone Preview
                </label>
                <div className="flex h-[42px] items-center gap-2.5 rounded-xl border border-stone-200 bg-stone-50/80 px-3.5 text-xs text-stone-700">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                  </span>
                  <span className="font-mono font-medium text-stone-900 truncate">
                    {formatCurrentTimeInTimeZone(selectedTimezone || "Asia/Kolkata")}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 border-t border-stone-100 pt-4">
              <div className="sm:col-span-2">
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                        Default Accounting Currency
                      </FormLabel>
                      <FormControl>
                        <AdminSelect
                          options={CURRENCY_OPTIONS.map((c) => ({
                            label: c.name,
                            value: c.code,
                          }))}
                          {...field}
                          onChange={(e) => {
                            field.onChange(e)
                            const selected = CURRENCY_OPTIONS.find((c) => c.code === e.target.value)
                            if (selected) {
                              form.setValue("currencySymbol", selected.symbol)
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <FormField
                  control={form.control}
                  name="currencySymbol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                        Currency Display Symbol
                      </FormLabel>
                      <FormControl>
                        <AdminInput
                          placeholder="e.g. ₹, $, €, AED"
                          className="font-mono font-bold"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
              <svg className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                All statutory financial statements, PDF receipt generation timestamps, currency notations, audit log trails, and meeting notices for this society will be computed according to these selected regional settings.
              </span>
            </div>
          </div>
        </AdminCard>

        {/* 4. Maintenance & Billing Policy */}
        <AdminCard
          title="Maintenance Billing Policy & Parameters"
          description="Rules and calculations applied when generating periodic dues and invoices"
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <FormField
                control={form.control}
                name="maintenanceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                      Maintenance Calculation Method
                    </FormLabel>
                    <FormControl>
                      <AdminSelect
                        options={[
                          { label: "Fixed Amount per Flat", value: "FIXED" },
                          { label: "Per Square Foot Area", value: "PER_SQFT" },
                          { label: "Custom Formula / Tiered", value: "CUSTOM" },
                        ]}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            {maintenanceType === "FIXED" || maintenanceType === "CUSTOM" ? (
              <div>
                <FormField
                  control={form.control}
                  name="fixedRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                        Fixed Rate Amount (₹)
                      </FormLabel>
                      <FormControl>
                        <AdminInput
                          type="number"
                          step="0.01"
                          placeholder="e.g. 2500"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>
            ) : null}

            {maintenanceType === "PER_SQFT" || maintenanceType === "CUSTOM" ? (
              <div>
                <FormField
                  control={form.control}
                  name="ratePerSqft"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                        Rate per Sq. Ft. (₹ / sqft)
                      </FormLabel>
                      <FormControl>
                        <AdminInput
                          type="number"
                          step="0.01"
                          placeholder="e.g. 3.50"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>
            ) : null}

            <div>
              <FormField
                control={form.control}
                name="billGenerationDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                      Bill Generation Day
                    </FormLabel>
                    <FormControl>
                      <AdminInput
                        type="number"
                        min="1"
                        max="28"
                        placeholder="e.g. 1 (1st of month)"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value === "" ? 1 : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <div>
              <FormField
                control={form.control}
                name="dueDayOfMonth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                      Due Day of Month
                    </FormLabel>
                    <FormControl>
                      <AdminInput
                        type="number"
                        min="1"
                        max="28"
                        placeholder="e.g. 10 (10th of month)"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value === "" ? 10 : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <div>
              <FormField
                control={form.control}
                name="gracePeriodDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                      Grace Period (Days)
                    </FormLabel>
                    <FormControl>
                      <AdminInput
                        type="number"
                        min="0"
                        max="60"
                        placeholder="e.g. 5"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <div>
              <FormField
                control={form.control}
                name="lateFeeRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                      Late Fee Rate (% per annum)
                    </FormLabel>
                    <FormControl>
                      <AdminInput
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        placeholder="e.g. 21.00"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <div>
              <FormField
                control={form.control}
                name="invoicePrefix"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                      Invoice Prefix
                    </FormLabel>
                    <FormControl>
                      <AdminInput
                        placeholder="e.g. INV"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <div>
              <FormField
                control={form.control}
                name="receiptPrefix"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                      Receipt Prefix
                    </FormLabel>
                    <FormControl>
                      <AdminInput
                        placeholder="e.g. RCPT"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
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
    </Form>
  )
}
