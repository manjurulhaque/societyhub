import { prisma } from "@/lib/prisma"

export interface StandardExpenseCategoryDef {
  name: string
  code?: string
  description: string
}

export interface EnrichedExpenseCategory {
  id: string
  societyId: string
  name: string
  code: string | null
  description: string | null
  isActive: boolean
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
  _count?: {
    expenses: number
  }
}

/**
 * Standard expense categories for Indian Housing Societies, Co-operative Housing Societies,
 * and Residential Welfare Associations, aligned 1-to-1 with the society Chart of Accounts (5000 series).
 */
export const STANDARD_EXPENSE_CATEGORIES: StandardExpenseCategoryDef[] = [
  // 1. Facility & Security Overheads (5100)
  {
    code: "5110",
    name: "Security Guard Services",
    description: "Security agency personnel, night patrolling, security supervisor and gate guards",
  },
  {
    code: "5120",
    name: "Housekeeping & Cleaning Contract",
    description: "Common corridor cleaning, floor scrubbing, lobby upkeep, and sanitation supplies",
  },
  {
    code: "5125",
    name: "Waste Management & Garbage Disposal",
    description: "Door-to-door garbage collection, waste segregation, composting, and municipal dumping fees",
  },
  {
    code: "5130",
    name: "Gardening & Landscape Maintenance",
    description: "Garden upkeep, lawn mowing, plant purchases, fertilizer, and gardener charges",
  },
  {
    code: "5140",
    name: "Pest Control & Sanitization",
    description: "Mosquito fogging, termite treatment, rodent control, and disinfectant spraying",
  },

  // 2. Common Utilities (5200)
  {
    code: "5210",
    name: "Common Area Electricity Consumption",
    description: "Electricity board monthly bills for lift, common area lighting, water pumps, and clubhouse",
  },
  {
    code: "5220",
    name: "Supplementary Water Tanker Purchases",
    description: "Private water tanker supplies, drinking water delivery, and supplementary water tankers",
  },
  {
    code: "5230",
    name: "Diesel for Backup Generators",
    description: "Diesel fuel procurement for society emergency backup generators (DG sets)",
  },

  // 3. Repairs & Annual Maintenance (AMC) (5300)
  {
    code: "5310",
    name: "Lift AMC & Breakdown Repairs",
    description: "Elevator annual maintenance contracts, periodic lubrication, safety inspections, and breakdown repairs",
  },
  {
    code: "5320",
    name: "DG Set AMC & Servicing",
    description: "Diesel generator servicing, battery replacement, filter changes, and generator AMC",
  },
  {
    code: "5330",
    name: "Fire Fighting System AMC",
    description: "Fire alarm testing, smoke detector checks, sprinkler pump testing, and fire extinguisher refilling",
  },
  {
    code: "5340",
    name: "Water Pump Maintenance & Rewinding",
    description: "Hydro-pneumatic booster pump repairs, submersible motor rewinding, and water sensor repairs",
  },
  {
    code: "5345",
    name: "Water Tank Repairs, Waterproofing & Reconstruction",
    description: "Underground sump and overhead tank civil repairs, crack sealing, epoxy coating, leakages, and structural reconstruction",
  },
  {
    code: "5350",
    name: "General Civil, Electrical & Plumbing Repairs",
    description: "Masonry, pipe leakages, civil repairs, terrace waterproofing, and sanitary maintenance",
  },
  {
    code: "5360",
    name: "Building Fire & Structural Insurance Premium",
    description: "Comprehensive society insurance policy against structural damage, fire, earthquake, and third-party liabilities",
  },
  {
    code: "5370",
    name: "Solar Rooftop Plant Maintenance & Cleaning",
    description: "Solar panel cleaning, solar inverter servicing, and solar rooftop AMC",
  },
  {
    code: "5380",
    name: "Intercom, Telecom & Security Systems AMC",
    description: "CCTV camera repairs, boom barrier servicing, biometric access control, and intercom EPABX maintenance",
  },
  {
    code: "5390",
    name: "Swimming Pool & Clubhouse Maintenance",
    description: "Swimming pool chlorine chemicals, water filtration, gym equipment repairs, and clubhouse upkeep",
  },

  // 4. Administrative & Office Overheads (5400)
  {
    code: "5410",
    name: "Society Manager & Staff Salaries",
    description: "Monthly compensation for estate manager, accountant, administrative assistants, and clubhouse staff",
  },
  {
    code: "5420",
    name: "Printing, Stationery & Postage",
    description: "Physical maintenance bill printing, receipt books, stationery, postal couriers, and office consumables",
  },
  {
    code: "5430",
    name: "Software & Communication Portal Fees",
    description: "SocietyHub platform subscription, SMS gateway credits, email dispatch, and digital accounting software",
  },
  {
    code: "5440",
    name: "AGM & Committee Meeting Expenses",
    description: "Annual General Meeting (AGM) arrangements, refreshments, hall rental, and meeting notices",
  },
  {
    code: "5450",
    name: "Festival & Community Celebration Expenses",
    description: "Independence Day, Republic Day, cultural gatherings, festive decorations, and community events",
  },

  // 5. Professional & Legal Fees (5500)
  {
    code: "5510",
    name: "Statutory Auditor Fees",
    description: "Chartered accountant statutory audit fee and financial reporting compliance",
  },
  {
    code: "5520",
    name: "Legal Consultation & Court Fees",
    description: "Society legal counsel, dispute consultation, and registrar compliance filing",
  },

  // 6. Bank & Finance Charges (5600)
  {
    code: "5610",
    name: "Bank Ledger & Maintenance Charges",
    description: "Bank ledger maintenance charges, account service fees, and payment gateway processing fees",
  },
  {
    code: "5460",
    name: "Bank Stamp Duty & Franking Charges",
    description: "Stamp duty, agreement franking, and documentation charges",
  },
  {
    code: "5620",
    name: "Cheque Return & Bounce Charges",
    description: "Bank penalties for returned and bounced cheques",
  },

  // 7. Statutory Depreciation, Taxes & Miscellaneous
  {
    code: "5700",
    name: "Depreciation & Amortization",
    description: "Annual statutory depreciation on society fixed assets",
  },
  {
    code: "5810",
    name: "Property Tax & Municipal Cess",
    description: "Municipal property tax on common areas, drainage cess, and local civic assessments",
  },
  {
    code: "5900",
    name: "Miscellaneous Contingencies",
    description: "General petty outlays, ad-hoc emergency repairs, and unclassified operating disbursements",
  },
]

/**
 * Standard code map for fast Chart of Accounts lookup.
 */
export const CATEGORY_COA_CODES: Record<string, string> = {
  "security guard services": "5110",
  "security agency": "5110",
  "housekeeping & cleaning contract": "5120",
  "housekeeping & waste disposal": "5120",
  "waste management & garbage disposal": "5125",
  "gardening & landscape maintenance": "5130",
  "gardening & landscaping": "5130",
  "pest control & sanitization": "5140",
  "common area electricity consumption": "5210",
  "common electricity charges": "5210",
  "supplementary water tanker purchases": "5220",
  "water tanker & supply": "5220",
  "diesel for backup generators": "5230",
  "generator diesel & maintenance": "5230",
  "lift amc & breakdown repairs": "5310",
  "lift amc & maintenance": "5310",
  "dg set amc & servicing": "5320",
  "fire fighting system amc": "5330",
  "water pump maintenance & rewinding": "5340",
  "water tank repairs, waterproofing & reconstruction": "5345",
  "general civil, electrical & plumbing repairs": "5350",
  "building repairs & plumbing": "5350",
  "building fire & structural insurance premium": "5360",
  "solar rooftop plant maintenance & cleaning": "5370",
  "solar rooftop plant maintenance": "5370",
  "intercom, telecom & security systems amc": "5380",
  "intercom, cctv & security systems amc": "5380",
  "swimming pool & clubhouse maintenance": "5390",
  "society manager & staff salaries": "5410",
  "staff salaries & wages": "5410",
  "printing, stationery & postage": "5420",
  "office administration & printing": "5420",
  "software & communication portal fees": "5430",
  "agm & committee meeting expenses": "5440",
  "festival & community celebration expenses": "5450",
  "festival & community celebrations": "5450",
  "statutory auditor fees": "5510",
  "statutory auditor & legal fees": "5510",
  "auditor & legal fees": "5510",
  "legal consultation & court fees": "5520",
  "bank ledger & maintenance charges": "5610",
  "bank & finance charges": "5610",
  "bank stamp duty & franking charges": "5460",
  "cheque return & bounce charges": "5620",
  "depreciation & amortization": "5700",
  "property tax & municipal cess": "5810",
  "miscellaneous contingencies": "5900",
}

/**
 * Normalized merge dictionary to automatically consolidate legacy/synonym category names
 * into their official Chart of Accounts canonical counterparts.
 */
const CANONICAL_MERGE_MAP: Record<string, string> = {
  "security agency": "Security Guard Services",
  "lift amc & maintenance": "Lift AMC & Breakdown Repairs",
  "common electricity charges": "Common Area Electricity Consumption",
  "water tanker & supply": "Supplementary Water Tanker Purchases",
  "building repairs & plumbing": "General Civil, Electrical & Plumbing Repairs",
  "housekeeping & waste disposal": "Housekeeping & Cleaning Contract",
  "gardening & landscaping": "Gardening & Landscape Maintenance",
  "generator diesel & maintenance": "Diesel for Backup Generators",
  "staff salaries & wages": "Society Manager & Staff Salaries",
  "auditor & legal fees": "Statutory Auditor Fees",
  "office administration & printing": "Printing, Stationery & Postage",
  "festival & community celebrations": "Festival & Community Celebration Expenses",
  "intercom, cctv & security systems amc": "Intercom, Telecom & Security Systems AMC",
  "solar rooftop plant maintenance": "Solar Rooftop Plant Maintenance & Cleaning",
  "statutory auditor & legal fees": "Statutory Auditor Fees",
  "bank & finance charges": "Bank Ledger & Maintenance Charges",
}

/**
 * Returns the Chart of Accounts ledger code for a category name.
 */
export function getCategoryCoaCode(name: string, ledgerCodeMap?: Map<string, string>): string | null {
  const lower = name.trim().toLowerCase()
  if (ledgerCodeMap && ledgerCodeMap.has(lower)) {
    return ledgerCodeMap.get(lower) || null
  }
  return CATEGORY_COA_CODES[lower] || null
}

/**
 * Ensures all standard and society Chart of Accounts (COA) expense categories exist for a given society.
 * Dynamically synchronizes active EXPENSE ledgers from the Chart of Accounts into ExpenseCategory records.
 * Automatically cleans up and merges any legacy/duplicate category aliases.
 * Returns all active, non-deleted categories for the society enriched with their Chart of Accounts code.
 */
export async function ensureStandardExpenseCategories(societyId: string): Promise<EnrichedExpenseCategory[]> {
  // 1. Fetch all existing expense categories and active COA expense ledgers for this society in parallel
  const [existingCategories, coaExpenseLedgers] = await Promise.all([
    prisma.expenseCategory.findMany({
      where: {
        societyId,
      },
      include: {
        _count: { select: { expenses: true } },
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
        code: true,
        description: true,
        subLedgers: { select: { id: true } },
      },
    }),
  ])

  // Map of ledger names to codes for fast lookup
  const ledgerCodeMap = new Map<string, string>()
  for (const l of coaExpenseLedgers) {
    if (l.code) {
      ledgerCodeMap.set(l.name.trim().toLowerCase(), l.code)
    }
  }

  // 2. Perform Automatic Deduplication & Alias Consolidation
  const catMapByName = new Map<string, typeof existingCategories[0]>()
  for (const c of existingCategories) {
    catMapByName.set(c.name.trim().toLowerCase(), c)
  }

  for (const [aliasLower, canonicalName] of Object.entries(CANONICAL_MERGE_MAP)) {
    const aliasCat = catMapByName.get(aliasLower)
    const canonicalCat = catMapByName.get(canonicalName.toLowerCase())

    if (aliasCat && canonicalCat && aliasCat.id !== canonicalCat.id) {
      // Migrate any existing expenses from alias to canonical
      if (aliasCat._count.expenses > 0) {
        await prisma.expense.updateMany({
          where: { categoryId: aliasCat.id },
          data: { categoryId: canonicalCat.id },
        })
      }
      // Remove redundant duplicate record
      try {
        await prisma.expenseCategory.delete({
          where: { id: aliasCat.id },
        })
        catMapByName.delete(aliasLower)
      } catch {
        // Continue safely if already deleted
      }
    } else if (aliasCat && !canonicalCat) {
      // Rename alias directly to canonical name
      try {
        const updated = await prisma.expenseCategory.update({
          where: { id: aliasCat.id },
          data: { name: canonicalName },
        })
        catMapByName.delete(aliasLower)
        catMapByName.set(canonicalName.toLowerCase(), {
          ...updated,
          _count: aliasCat._count,
        })
      } catch {
        // Continue safely
      }
    }
  }

  // 3. Create updated fast lookup set of remaining category names
  const activeExisting = await prisma.expenseCategory.findMany({
    where: { societyId, deletedAt: null },
  })
  const existingNamesLower = new Set(
    activeExisting.map((c: { name: string }) => c.name.trim().toLowerCase())
  )

  // 4. Identify missing standard catalog categories
  const categoriesToCreate: { name: string; description?: string | null }[] = []

  for (const std of STANDARD_EXPENSE_CATEGORIES) {
    const stdLower = std.name.trim().toLowerCase()
    if (!existingNamesLower.has(stdLower)) {
      categoriesToCreate.push(std)
      existingNamesLower.add(stdLower)
    }
  }

  // 5. Dynamically sync any leaf Expense Ledgers from Chart of Accounts
  for (const ledger of coaExpenseLedgers) {
    // Only sync leaf ledgers or standalone ledgers (avoid parent group headers with sub-ledgers)
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

  // 6. Batch create any missing standard/COA categories in a single bulk query
  if (categoriesToCreate.length > 0) {
    try {
      await prisma.expenseCategory.createMany({
        data: categoriesToCreate.map((item) => ({
          societyId,
          name: item.name,
          description: item.description ?? null,
          isActive: true,
        })),
        skipDuplicates: true,
      })
    } catch {
      // Continue safely on unique constraint race
    }
  }

  // 7. Return complete refreshed deduplicated list enriched with COA code
  const refreshedList = await prisma.expenseCategory.findMany({
    where: {
      societyId,
      isActive: true,
      deletedAt: null,
    },
    orderBy: {
      name: "asc",
    },
  })

  // Enrich with Chart of Accounts codes and sort logically by code then name
  const enriched: EnrichedExpenseCategory[] = refreshedList.map((c) => ({
    ...c,
    code: getCategoryCoaCode(c.name, ledgerCodeMap),
  }))

  enriched.sort((a, b) => {
    if (a.code && b.code) {
      return a.code.localeCompare(b.code)
    }
    if (a.code) return -1
    if (b.code) return 1
    return a.name.localeCompare(b.name)
  })

  return enriched
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
