export interface RecurringMatchingRule {
  id: string
  name: string
  categoryCode: string
  categorySearch: string
  keywords: string[]
  description: string
  defaultAction: "RECORD_VENDOR_EXPENSE" | "RECORD_BANK_CHARGE_EXPENSE" | "RECORD_BANK_INTEREST"
}

export const BUILTIN_SOCIETY_RECURRING_RULES: RecurringMatchingRule[] = [
  // 1. Electricity Utilities (DISCOMs)
  {
    id: "RULE_ELECTRICITY",
    name: "Common Electricity",
    categoryCode: "5210",
    categorySearch: "Electricity",
    keywords: [
      "BESCOM",
      "TATA POWER",
      "ADANI ELEC",
      "ADANI POWER",
      "MSEDCL",
      "CESC",
      "DHBVN",
      "UPPCL",
      "BSES",
      "TSSPDCL",
      "ELECTRICITY",
      "POWER CORP",
      "DISCOM",
      "ELECTRIC BILL",
    ],
    description: "Auto-categorized under Common Area Electricity Consumption (5210)",
    defaultAction: "RECORD_VENDOR_EXPENSE",
  },
  // 2. Water Supply & Tankers
  {
    id: "RULE_WATER",
    name: "Water Supply / Tanker",
    categoryCode: "5220",
    categorySearch: "Water",
    keywords: [
      "BWSSB",
      "DELHI JAL BOARD",
      "DJB",
      "MCGM WATER",
      "HMWSSB",
      "WATER TANKER",
      "WATER SUPPLY",
      "TANKER WATER",
      "SUPPLEMENTARY WATER",
      "DRINKING WATER",
      "WATER TANK",
    ],
    description: "Auto-categorized under Supplementary Water Tanker Purchases (5220)",
    defaultAction: "RECORD_VENDOR_EXPENSE",
  },
  // 3. Lift & Elevator AMCs
  {
    id: "RULE_LIFT_AMC",
    name: "Lift AMC & Maintenance",
    categoryCode: "5310",
    categorySearch: "Lift",
    keywords: [
      "OTIS",
      "SCHINDLER",
      "KONE",
      "THYSSENKRUPP",
      "TK ELEVATOR",
      "MITSUBISHI ELEV",
      "JOHNSON LIFTS",
      "LIFT AMC",
      "ELEVATOR AMC",
      "ELEVATOR REPAIR",
    ],
    description: "Auto-categorized under Lift AMC & Breakdown Repairs (5310)",
    defaultAction: "RECORD_VENDOR_EXPENSE",
  },
  // 4. Security Guard Agency
  {
    id: "RULE_SECURITY",
    name: "Security Guard Agency",
    categoryCode: "5110",
    categorySearch: "Security",
    keywords: [
      "SIS INDIA",
      "SECURITAS",
      "G4S",
      "SECURITY SERVICES",
      "SECURITY FORCE",
      "GUARD FORCE",
      "NIGHT PATROL",
      "SECURITY GUARDS",
      "SECURITY AGENCY",
    ],
    description: "Auto-categorized under Security Guard Services (5110)",
    defaultAction: "RECORD_VENDOR_EXPENSE",
  },
  // 5. Housekeeping & Sanitation
  {
    id: "RULE_HOUSEKEEPING",
    name: "Housekeeping & Facility AMC",
    categoryCode: "5120",
    categorySearch: "Housekeeping",
    keywords: [
      "HOUSEKEEPING",
      "FACILITY MGMT",
      "CLEANING SERVICES",
      "DUSTING CONTRACT",
      "FLOOR SCRUBBING",
      "WASTE MGMT",
      "GARBAGE COLLECTION",
    ],
    description: "Auto-categorized under Housekeeping & Cleaning Contract (5120)",
    defaultAction: "RECORD_VENDOR_EXPENSE",
  },
  // 6. DG Generator Fuel & Diesel
  {
    id: "RULE_DG_FUEL",
    name: "DG Generator Fuel",
    categoryCode: "5230",
    categorySearch: "Diesel",
    keywords: [
      "DIESEL FOR DG",
      "GENERATOR FUEL",
      "IOCL PETROL",
      "HPCL FUEL",
      "BPCL DIESEL",
      "FUEL FOR GENERATOR",
      "DIESEL TANK",
    ],
    description: "Auto-categorized under Diesel for Backup Generators (5230)",
    defaultAction: "RECORD_VENDOR_EXPENSE",
  },
  // 7. Fire Safety & Extinguishers
  {
    id: "RULE_FIRE_SAFETY",
    name: "Fire Fighting AMC",
    categoryCode: "5330",
    categorySearch: "Fire",
    keywords: [
      "FIRE FIGHTING",
      "FIRE EXTIN",
      "CEASEFIRE",
      "FIRE SAFETY",
      "FIRE ALARM",
      "SPRINKLER SYSTEM",
    ],
    description: "Auto-categorized under Fire Fighting System AMC (5330)",
    defaultAction: "RECORD_VENDOR_EXPENSE",
  },
  // 8. Pest Control & Fogging
  {
    id: "RULE_PEST_CONTROL",
    name: "Pest Control & Fogging",
    categoryCode: "5140",
    categorySearch: "Pest",
    keywords: [
      "PEST CONTROL",
      "FUMIGATION",
      "TERMITE TREATMENT",
      "MOSQUITO FOGGING",
      "RODENT CONTROL",
    ],
    description: "Auto-categorized under Pest Control & Sanitization (5140)",
    defaultAction: "RECORD_VENDOR_EXPENSE",
  },
]

export interface RuleMatchResult {
  matchedRule: RecurringMatchingRule
  matchedKeyword: string
  categoryName: string
  categoryId?: string
  confidence: "HIGH" | "MEDIUM"
  score: number
}

/**
 * Evaluates narration against recurring utility, AMC, and overhead patterns.
 */
export function matchRecurringUtilityRule(
  narration: string,
  categories: { id: string; name: string }[] = []
): RuleMatchResult | null {
  const norm = narration.toUpperCase()

  for (const rule of BUILTIN_SOCIETY_RECURRING_RULES) {
    for (const kw of rule.keywords) {
      if (norm.includes(kw.toUpperCase())) {
        // Find matching category in society's active categories
        const cat =
          categories.find((c) =>
            c.name.toLowerCase().includes(rule.categorySearch.toLowerCase())
          ) || categories.find((c) => c.name.toLowerCase().includes(rule.name.toLowerCase()))

        return {
          matchedRule: rule,
          matchedKeyword: kw,
          categoryName: cat?.name || rule.name,
          categoryId: cat?.id,
          confidence: "HIGH",
          score: 88,
        }
      }
    }
  }

  return null
}
