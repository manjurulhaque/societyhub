import { cache } from "react"
import slugify from "slugify"
import { prisma } from "@/lib/prisma"

/**
 * Automatically generates a unique, human-friendly society code from the society name.
 * e.g., "Palm Grove Residency" -> "PALM-GROVE-RESIDENCY" (or "PALM-GROVE-RESIDENCY-2" if collision occurs)
 */
export async function generateUniqueSocietyCode(name: string, customCode?: string | null): Promise<string> {
  if (customCode && customCode.trim()) {
    return slugify(customCode.trim(), {
      strict: true,
      trim: true,
    }).toUpperCase()
  }

  const baseCode = (
    slugify(name.trim(), {
      strict: true,
      trim: true,
    }).toUpperCase() || "SOCIETY"
  ).slice(0, 20)

  let candidate = baseCode
  let count = 1

  while (true) {
    const existing = await prisma.society.findUnique({
      where: { code: candidate },
      select: { id: true },
    })

    if (!existing) {
      return candidate
    }

    count += 1
    candidate = `${baseCode}-${count}`
  }
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

