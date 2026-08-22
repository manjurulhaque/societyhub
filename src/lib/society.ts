import { cache } from "react"
import slugify from "slugify"
import { prisma } from "@/lib/prisma"

/**
 * Automatically generates a unique, human-friendly society code from the society name.
 * e.g., "Palm Grove Residency" -> "PALM-GROVE-RESIDENCY" (or "PALM-GROVE-RESIDENCY-2" if collision occurs)
 * Uses a single batch database query and in-memory resolution to avoid sequential DB roundtrips.
 */
export async function generateUniqueSocietyCode(name: string, customCode?: string | null): Promise<string> {
  const baseCode = (
    customCode?.trim()
      ? slugify(customCode.trim(), { strict: true, trim: true })
      : slugify(name.trim(), { strict: true, trim: true }) || "SOCIETY"
  )
    .toUpperCase()
    .slice(0, 30)

  // Fetch all existing codes matching the base prefix in a single query
  const existingSocieties = await prisma.society.findMany({
    where: {
      code: {
        startsWith: baseCode,
        mode: "insensitive",
      },
    },
    select: { code: true },
  })

  const existingCodes = new Set(
    existingSocieties.map((s) => s.code?.toUpperCase()).filter((c): c is string => Boolean(c))
  )

  if (!existingCodes.has(baseCode)) {
    return baseCode
  }

  let count = 1
  while (existingCodes.has(`${baseCode}-${count}`)) {
    count += 1
  }

  return `${baseCode}-${count}`
}

/**
 * Request-scoped cached getter for the current active Financial Year of a society.
 * Memoizes across layout, page, and subcomponents during a single HTTP request.
 */
export const getCurrentFinancialYear = cache(async (societyId: string) => {
  return await prisma.financialYear.findFirst({
    where: { societyId, isCurrent: true },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      isLocked: true,
    },
  })
})

/**
 * Request-scoped cached getter for pending expense approval count and sum.
 * Memoizes across layout sidebar badge and dashboard/approvals page.
 */
export const getPendingExpenseSummary = cache(async (societyId: string) => {
  const result = await prisma.expense.aggregate({
    where: { societyId, status: "PENDING" },
    _count: { _all: true },
    _sum: { amount: true },
  })
  return {
    count: result._count._all,
    amount: Number(result._sum.amount ?? 0),
  }
})

