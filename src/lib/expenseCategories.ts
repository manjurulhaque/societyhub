import { prisma } from "@/lib/prisma"

export interface StandardExpenseCategoryDef {
  name: string
  description: string
}

/**
 * Standard expense categories for Indian Housing Societies, Co-operative Housing Societies,
 * and Residential Welfare Associations, aligned with the society Chart of Accounts (5000 series).
 */
export const STANDARD_EXPENSE_CATEGORIES: StandardExpenseCategoryDef[] = [
  // 1. Facility & Security Overheads (5100)
  {
    name: "Security Guard Services",
    description: "Security agency personnel, night patrolling, security supervisor and gate guards",
  },
  {
    name: "Housekeeping & Cleaning Contract",
    description: "Common corridor cleaning, floor scrubbing, lobby upkeep, and sanitation supplies",
  },
  {
    name: "Gardening & Landscape Maintenance",
    description: "Garden upkeep, lawn mowing, plant purchases, fertilizer, and gardener charges",
  },
  {
    name: "Pest Control & Sanitization",
    description: "Mosquito fogging, termite treatment, rodent control, and disinfectant spraying",
  },
  {
    name: "Waste Management & Garbage Disposal",
    description: "Door-to-door garbage collection, waste segregation, composting, and municipal dumping fees",
  },

  // 2. Common Utilities (5200)
  {
    name: "Common Area Electricity Consumption",
    description: "Electricity board monthly bills for lift, common area lighting, water pumps, and clubhouse",
  },
  {
    name: "Supplementary Water Tanker Purchases",
    description: "Private water tanker supplies, drinking water delivery, and supplementary water tankers",
  },
  {
    name: "Diesel for Backup Generators",
    description: "Diesel fuel procurement for society emergency backup generators (DG sets)",
  },

  // 3. Repairs & Annual Maintenance (AMC) (5300)
  {
    name: "Lift AMC & Maintenance",
    description: "Elevator annual maintenance contracts, periodic lubrication, safety inspections, and breakdown repairs",
  },
  {
    name: "DG Set AMC & Servicing",
    description: "Diesel generator servicing, battery replacement, filter changes, and generator AMC",
  },
  {
    name: "Fire Fighting System AMC",
    description: "Fire alarm testing, smoke detector checks, sprinkler pump testing, and fire extinguisher refilling",
  },
  {
    name: "Water Pump Maintenance & Rewinding",
    description: "Hydro-pneumatic booster pump repairs, submersible motor rewinding, and water sensor repairs",
  },
  {
    name: "Water Tank Repairs, Waterproofing & Reconstruction",
    description: "Underground sump and overhead tank civil repairs, crack sealing, epoxy coating, leakages, and structural reconstruction",
  },
  {
    name: "Building Repairs & Plumbing",
    description: "Masonry, pipe leakages, civil repairs, terrace waterproofing, and sanitary maintenance",
  },
  {
    name: "Building Fire & Structural Insurance Premium",
    description: "Comprehensive society insurance policy against structural damage, fire, earthquake, and third-party liabilities",
  },
  {
    name: "Solar Rooftop Plant Maintenance",
    description: "Solar panel cleaning, solar inverter servicing, and solar rooftop AMC",
  },
  {
    name: "Intercom, CCTV & Security Systems AMC",
    description: "CCTV camera repairs, boom barrier servicing, biometric access control, and intercom EPABX maintenance",
  },
  {
    name: "Swimming Pool & Clubhouse Maintenance",
    description: "Swimming pool chlorine chemicals, water filtration, gym equipment repairs, and clubhouse upkeep",
  },

  // 4. Administrative & Office Overheads (5400)
  {
    name: "Society Manager & Staff Salaries",
    description: "Monthly compensation for estate manager, accountant, administrative assistants, and clubhouse staff",
  },
  {
    name: "Printing, Stationery & Postage",
    description: "Physical maintenance bill printing, receipt books, stationery, postal couriers, and office consumables",
  },
  {
    name: "Software & Communication Portal Fees",
    description: "SocietyHub platform subscription, SMS gateway credits, email dispatch, and digital accounting software",
  },
  {
    name: "AGM & Committee Meeting Expenses",
    description: "Annual General Meeting (AGM) arrangements, refreshments, hall rental, and meeting notices",
  },
  {
    name: "Festival & Community Celebrations",
    description: "Independence Day, Republic Day, cultural gatherings, festive decorations, and community events",
  },

  // 5. Professional & Legal Fees (5500)
  {
    name: "Statutory Auditor & Legal Fees",
    description: "Chartered accountant statutory audit fee, tax filing, legal counsel, and registrar compliance",
  },

  // 6. Bank & Finance Charges (5600)
  {
    name: "Bank & Finance Charges",
    description: "Bank ledger maintenance charges, cheque return fees, stamp duty, and payment gateway processing fees",
  },

  // 7. Statutory Taxes & Miscellaneous
  {
    name: "Property Tax & Municipal Cess",
    description: "Municipal property tax on common areas, drainage cess, and local civic assessments",
  },
  {
    name: "Miscellaneous Contingencies",
    description: "General petty outlays, ad-hoc emergency repairs, and unclassified operating disbursements",
  },
]

/**
 * Normalized alias dictionary to match legacy/short names to standard categories.
 */
const LEGACY_ALIASES: Record<string, string> = {
  "security agency": "Security Guard Services",
  "lift amc & maintenance": "Lift AMC & Maintenance",
  "common electricity charges": "Common Area Electricity Consumption",
  "water tanker & supply": "Supplementary Water Tanker Purchases",
  "building repairs & plumbing": "Building Repairs & Plumbing",
  "housekeeping & waste disposal": "Housekeeping & Cleaning Contract",
  "gardening & landscaping": "Gardening & Landscape Maintenance",
  "generator diesel & maintenance": "Diesel for Backup Generators",
  "staff salaries & wages": "Society Manager & Staff Salaries",
  "auditor & legal fees": "Statutory Auditor & Legal Fees",
  "office administration & printing": "Printing, Stationery & Postage",
}

/**
 * Ensures all standard and society Chart of Accounts (COA) expense categories exist for a given society.
 * Dynamically synchronizes active EXPENSE ledgers from the Chart of Accounts into ExpenseCategory records.
 * Idempotently creates any missing categories.
 * Returns all active, non-deleted categories for the society sorted alphabetically.
 */
export async function ensureStandardExpenseCategories(societyId: string) {
  // 1. Fetch all existing expense categories and active COA expense ledgers for this society in parallel
  const [existingCategories, coaExpenseLedgers] = await Promise.all([
    prisma.expenseCategory.findMany({
      where: {
        societyId,
        deletedAt: null,
      },
    }),
    prisma.ledger.findMany({
      where: {
        societyId,
        group: "EXPENSE",
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        subLedgers: { select: { id: true } },
      },
    }),
  ])

  // Create a fast lookup map of lowercase existing names
  const existingNamesLower = new Set(
    existingCategories.map((c: { name: string }) => c.name.trim().toLowerCase())
  )

  // 2. Identify missing standard catalog categories
  const categoriesToCreate: { name: string; description?: string | null }[] = []

  for (const std of STANDARD_EXPENSE_CATEGORIES) {
    const stdLower = std.name.trim().toLowerCase()
    if (!existingNamesLower.has(stdLower)) {
      // Check if a known legacy alias exists
      let aliasMatched = false
      for (const [legacyName, standardTarget] of Object.entries(LEGACY_ALIASES)) {
        if (standardTarget.toLowerCase() === stdLower && existingNamesLower.has(legacyName)) {
          aliasMatched = true
          break
        }
      }

      if (!aliasMatched) {
        categoriesToCreate.push(std)
        existingNamesLower.add(stdLower)
      }
    }
  }

  // 3. Dynamically sync any leaf Expense Ledgers from Chart of Accounts
  for (const ledger of coaExpenseLedgers) {
    // Only sync leaf ledgers or standalone ledgers (avoid parent headers with sub-ledgers)
    if (ledger.subLedgers && ledger.subLedgers.length > 0) continue

    const ledgerNameLower = ledger.name.trim().toLowerCase()
    if (!existingNamesLower.has(ledgerNameLower)) {
      categoriesToCreate.push({
        name: ledger.name.trim(),
        description: ledger.description?.trim() || null,
      })
      existingNamesLower.add(ledgerNameLower)
    }
  }

  // 3. Batch create any missing standard categories
  if (categoriesToCreate.length > 0) {
    for (const item of categoriesToCreate) {
      try {
        await prisma.expenseCategory.upsert({
          where: {
            societyId_name: {
              societyId,
              name: item.name,
            },
          },
          update: {
            isActive: true,
            deletedAt: null,
          },
          create: {
            societyId,
            name: item.name,
            description: item.description,
            isActive: true,
          },
        })
      } catch {
        // If unique constraint race occurs, continue safely
      }
    }
  }

  // 4. Return complete refreshed list
  return prisma.expenseCategory.findMany({
    where: {
      societyId,
      isActive: true,
      deletedAt: null,
    },
    orderBy: {
      name: "asc",
    },
  })
}

/**
 * Creates a custom expense category for a society.
 */
export async function createCustomExpenseCategory(
  societyId: string,
  name: string,
  description?: string | null
) {
  const trimmedName = name.trim()
  if (!trimmedName) {
    throw new Error("Category name is required")
  }

  // Check if category already exists (active or inactive)
  const existing = await prisma.expenseCategory.findUnique({
    where: {
      societyId_name: {
        societyId,
        name: trimmedName,
      },
    },
  })

  if (existing) {
    if (!existing.isActive || existing.deletedAt) {
      // Reactivate it
      return prisma.expenseCategory.update({
        where: { id: existing.id },
        data: {
          isActive: true,
          deletedAt: null,
          description: description ?? existing.description,
        },
      })
    }
    return existing
  }

  return prisma.expenseCategory.create({
    data: {
      societyId,
      name: trimmedName,
      description: description?.trim() || null,
      isActive: true,
    },
  })
}
