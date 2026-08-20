import { cache } from "react"
import { getCurrentUser } from "@/lib/auth/getCurrentUser"
import { prisma } from "@/lib/prisma"

export type SocietyAdminContext = {
  user: {
    id: string
    email: string
    appRole: string
  }
  society: {
    id: string
    name: string
    code: string | null
    societyType: string
    timezone: string
    address: string | null
    city: string | null
    state: string | null
    pincode: string | null
    maintenanceType: string
    fixedRate: number | null
    ratePerSqft: number | null
    phone: string | null
    email: string | null
    registrationNumber: string | null
    panNumber: string | null
    tanNumber: string | null
    gstin: string | null
    currencySymbol: string
    currency: string
    billGenerationDay: number
    dueDayOfMonth: number | null
    gracePeriodDays: number
    lateFeeRate: number | null
    invoicePrefix: string | null
    receiptPrefix: string | null
    _count?: {
      blocks?: number
      members?: number
      people?: number
      bills?: number
      payments?: number
    }
  }
  isSuperAdmin: boolean
  designation: string
  memberId?: string
}

export const getSocietyAdmin = cache(
  async (societyCode: string): Promise<SocietyAdminContext | null> => {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return null
    }

    const decodedCode = decodeURIComponent(societyCode)

    const society = await prisma.society.findFirst({
      where: {
        OR: [
          { code: { equals: decodedCode, mode: "insensitive" } },
          { id: decodedCode },
        ],
      },
      select: {
        id: true,
        name: true,
        code: true,
        societyType: true,
        timezone: true,
        currencySymbol: true,
        currency: true,
        phone: true,
        email: true,
        address: true,
        city: true,
        state: true,
        pincode: true,
        registrationNumber: true,
        panNumber: true,
        tanNumber: true,
        gstin: true,
        maintenanceType: true,
        fixedRate: true,
        ratePerSqft: true,
        billGenerationDay: true,
        dueDayOfMonth: true,
        gracePeriodDays: true,
        lateFeeRate: true,
        invoicePrefix: true,
        receiptPrefix: true,
      },
    })

    if (!society) {
      return null
    }

    // Super Admins have universal administrative access to all societies
    if (currentUser.appRole === "SUPER_ADMIN") {
      return {
        user: {
          id: currentUser.id,
          email: currentUser.email,
          appRole: currentUser.appRole,
        },
        society: {
          ...society,
          timezone: society.timezone || "Asia/Kolkata",
          fixedRate: society.fixedRate ? Number(society.fixedRate) : null,
          ratePerSqft: society.ratePerSqft ? Number(society.ratePerSqft) : null,
          dueDayOfMonth: society.dueDayOfMonth,
          lateFeeRate: society.lateFeeRate ? Number(society.lateFeeRate) : null,
        },
        isSuperAdmin: true,
        designation: "SUPER_ADMIN",
      }
    }

    // Regular users must have an active SocietyMember record in this society
    const member = await prisma.societyMember.findFirst({
      where: {
        societyId: society.id,
        userId: currentUser.id,
      },
      select: {
        id: true,
        designation: true,
      },
    })

    if (!member) {
      return null
    }

    return {
      user: {
        id: currentUser.id,
        email: currentUser.email,
        appRole: currentUser.appRole,
      },
      society: {
        ...society,
        timezone: society.timezone || "Asia/Kolkata",
        fixedRate: society.fixedRate ? Number(society.fixedRate) : null,
        ratePerSqft: society.ratePerSqft ? Number(society.ratePerSqft) : null,
        dueDayOfMonth: society.dueDayOfMonth,
        lateFeeRate: society.lateFeeRate ? Number(society.lateFeeRate) : null,
      },
      isSuperAdmin: false,
      designation: member.designation,
      memberId: member.id,
    }
  }
)

