"use server"

import { revalidatePath } from "next/cache"
import { requireCommitteeAccess, EXECUTIVE_ROLES } from "@/lib/auth/requireAuth"
import { prisma } from "@/lib/prisma"
import { recordAuditLog } from "@/lib/audit"
import { sanitizeText } from "@/lib/sanitize"
import { getSafeErrorMessage } from "@/lib/errors"
import type { SocietyType, MaintenanceType } from "@/generated/prisma/client"

export type UpdateSocietySettingsState = {
  success?: boolean
  error?: string
  message?: string
}

export async function updateSocietySettings(
  societyId: string,
  societyCode: string,
  prevState: UpdateSocietySettingsState | null,
  formData: FormData
): Promise<UpdateSocietySettingsState> {
  try {
    const context = await requireCommitteeAccess(societyCode, EXECUTIVE_ROLES)
    if (context.society.id !== societyId) {
      return { error: "Tenant mismatch. The specified society does not match your active session." }
    }

    const rawName = formData.get("name")?.toString().trim()
    const name = sanitizeText(rawName)
    const rawCode = formData.get("code")?.toString().trim().toUpperCase() || null
    const code = rawCode ? sanitizeText(rawCode) : null
    const societyType = formData.get("societyType")?.toString() || "COOPERATIVE_HOUSING_SOCIETY"
    const rawPhone = formData.get("phone")?.toString().trim() || null
    const phone = rawPhone ? sanitizeText(rawPhone) : null
    const rawEmail = formData.get("email")?.toString().trim().toLowerCase() || null
    const email = rawEmail ? sanitizeText(rawEmail) : null
    const rawAddress = formData.get("address")?.toString().trim() || null
    const address = rawAddress ? sanitizeText(rawAddress) : null
    const rawCity = formData.get("city")?.toString().trim() || null
    const city = rawCity ? sanitizeText(rawCity) : null
    const rawState = formData.get("state")?.toString().trim() || null
    const state = rawState ? sanitizeText(rawState) : null
    const rawPincode = formData.get("pincode")?.toString().trim() || null
    const pincode = rawPincode ? sanitizeText(rawPincode) : null

    const rawRegNum = formData.get("registrationNumber")?.toString().trim() || null
    const registrationNumber = rawRegNum ? sanitizeText(rawRegNum) : null
    const rawPan = formData.get("panNumber")?.toString().trim().toUpperCase() || null
    const panNumber = rawPan ? sanitizeText(rawPan) : null
    const rawTan = formData.get("tanNumber")?.toString().trim().toUpperCase() || null
    const tanNumber = rawTan ? sanitizeText(rawTan) : null
    const rawGst = formData.get("gstin")?.toString().trim().toUpperCase() || null
    const gstin = rawGst ? sanitizeText(rawGst) : null

    const maintenanceType = formData.get("maintenanceType")?.toString() || "FIXED"
    const rawFixedRate = formData.get("fixedRate")?.toString().trim()
    const rawRatePerSqft = formData.get("ratePerSqft")?.toString().trim()
    const rawBillGenDay = formData.get("billGenerationDay")?.toString().trim()
    const rawDueDay = formData.get("dueDayOfMonth")?.toString().trim()
    const rawGraceDays = formData.get("gracePeriodDays")?.toString().trim()
    const rawLateFeeRate = formData.get("lateFeeRate")?.toString().trim()
    const rawInvPrefix = formData.get("invoicePrefix")?.toString().trim().toUpperCase() || "INV"
    const invoicePrefix = sanitizeText(rawInvPrefix)
    const rawRcptPrefix = formData.get("receiptPrefix")?.toString().trim().toUpperCase() || "RCPT"
    const receiptPrefix = sanitizeText(rawRcptPrefix)

    if (!name) {
      return { error: "Society name is required." }
    }

    // Check code uniqueness if changed
    if (code && code !== context.society.code) {
      const existing = await prisma.society.findFirst({
        where: {
          code: { equals: code, mode: "insensitive" },
          id: { not: societyId },
        },
      })

      if (existing) {
        return { error: `Society code "${code}" is already taken by another society.` }
      }
    }

    const fixedRate = rawFixedRate ? parseFloat(rawFixedRate) : null
    const ratePerSqft = rawRatePerSqft ? parseFloat(rawRatePerSqft) : null
    const billGenerationDay = rawBillGenDay ? parseInt(rawBillGenDay, 10) : 1
    const dueDayOfMonth = rawDueDay ? parseInt(rawDueDay, 10) : 10
    const gracePeriodDays = rawGraceDays ? parseInt(rawGraceDays, 10) : 0
    const lateFeeRate = rawLateFeeRate ? parseFloat(rawLateFeeRate) : 21.0
    const rawTz = formData.get("timezone")?.toString().trim() || "Asia/Kolkata"
    const timezone = sanitizeText(rawTz)
    const rawCurr = formData.get("currency")?.toString().trim() || "INR"
    const currency = sanitizeText(rawCurr)
    const rawCurrSym = formData.get("currencySymbol")?.toString().trim() || "₹"
    const currencySymbol = sanitizeText(rawCurrSym)

    await prisma.society.update({
      where: { id: societyId },
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
        maintenanceType: maintenanceType as MaintenanceType,
        fixedRate: fixedRate !== null && !isNaN(fixedRate) ? fixedRate : null,
        ratePerSqft: ratePerSqft !== null && !isNaN(ratePerSqft) ? ratePerSqft : null,
        billGenerationDay: !isNaN(billGenerationDay) ? billGenerationDay : 1,
        dueDayOfMonth: !isNaN(dueDayOfMonth) ? dueDayOfMonth : 10,
        gracePeriodDays: !isNaN(gracePeriodDays) ? gracePeriodDays : 0,
        lateFeeRate: !isNaN(lateFeeRate) ? lateFeeRate : 21.0,
        invoicePrefix,
        receiptPrefix,
      },
    })

    const updatedCode = code || societyId

    await recordAuditLog({
      societyId,
      userId: context.user.id,
      action: "UPDATE",
      entity: "Society",
      entityId: societyId,
      description: `${context.user.email} updated society profile and settings for ${name}`,
      newData: { name, code, societyType, maintenanceType, timezone },
    })

    revalidatePath(`/society/${societyCode}/settings`)
    revalidatePath(`/society/${updatedCode}/settings`)
    revalidatePath(`/society/${updatedCode}/dashboard`)
    revalidatePath("/admin/societies")

    return {
      success: true,
      message: "Society settings updated successfully.",
    }
  } catch (err: unknown) {
    console.error("Failed to update society settings:", err)
    return { error: getSafeErrorMessage(err, "Failed to update society settings. Please try again.") }
  }
}
