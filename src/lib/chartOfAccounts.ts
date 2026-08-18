import { prisma } from "@/lib/prisma"
import { LedgerGroup, BalanceType } from "@/generated/prisma"

export interface StandardAccountNode {
  name: string
  code: string
  group: LedgerGroup
  balanceType: BalanceType
  description?: string
  subLedgers?: StandardAccountNode[]
}

export const STANDARD_CHART_OF_ACCOUNTS: StandardAccountNode[] = [
  // ===========================================================================
  // 1000 - ASSETS
  // ===========================================================================
  {
    name: "Cash & Bank Balances",
    code: "1100",
    group: LedgerGroup.ASSET,
    balanceType: BalanceType.DEBIT,
    description: "Liquid cash in hand, petty cash floats, and operational bank accounts",
    subLedgers: [
      {
        name: "Cash in Hand",
        code: "1110",
        group: LedgerGroup.ASSET,
        balanceType: BalanceType.DEBIT,
        description: "Physical currency cash in society office",
      },
      {
        name: "Petty Cash Float (Imprest)",
        code: "1120",
        group: LedgerGroup.ASSET,
        balanceType: BalanceType.DEBIT,
        description: "Imprest float for daily petty office expenses",
      },
      {
        name: "Main Operational Bank Account",
        code: "1130",
        group: LedgerGroup.ASSET,
        balanceType: BalanceType.DEBIT,
        description: "Primary society bank account for collections & expenditures",
      },
      {
        name: "Sinking Fund Savings Account",
        code: "1140",
        group: LedgerGroup.ASSET,
        balanceType: BalanceType.DEBIT,
        description: "Designated bank account for statutory sinking funds",
      },
    ],
  },
  {
    name: "Member Receivables (Sundry Debtors)",
    code: "1200",
    group: LedgerGroup.ASSET,
    balanceType: BalanceType.DEBIT,
    description: "Outstanding dues and maintenance receivables from flat owners",
    subLedgers: [
      {
        name: "Maintenance Dues Receivables",
        code: "1210",
        group: LedgerGroup.ASSET,
        balanceType: BalanceType.DEBIT,
        description: "Monthly maintenance demand arrears",
      },
      {
        name: "Interest & Late Fee Receivables",
        code: "1220",
        group: LedgerGroup.ASSET,
        balanceType: BalanceType.DEBIT,
        description: "Accumulated interest on overdue dues",
      },
      {
        name: "Special Assessment Receivables",
        code: "1230",
        group: LedgerGroup.ASSET,
        balanceType: BalanceType.DEBIT,
        description: "Receivables from painting, solar, or capital drives",
      },
    ],
  },
  {
    name: "Investments & Fixed Deposits",
    code: "1300",
    group: LedgerGroup.ASSET,
    balanceType: BalanceType.DEBIT,
    description: "Long-term bank term deposits and statutory reserve investments",
    subLedgers: [
      {
        name: "Fixed Deposits - Sinking Fund",
        code: "1310",
        group: LedgerGroup.ASSET,
        balanceType: BalanceType.DEBIT,
        description: "Term deposits earmarked for sinking fund",
      },
      {
        name: "Fixed Deposits - Major Repair Fund",
        code: "1320",
        group: LedgerGroup.ASSET,
        balanceType: BalanceType.DEBIT,
        description: "Term deposits earmarked for building repairs",
      },
      {
        name: "Fixed Deposits - General Reserve",
        code: "1330",
        group: LedgerGroup.ASSET,
        balanceType: BalanceType.DEBIT,
        description: "General society corpus term deposits",
      },
    ],
  },
  {
    name: "Utility, Security Deposits & Advances Paid",
    code: "1400",
    group: LedgerGroup.ASSET,
    balanceType: BalanceType.DEBIT,
    description: "Deposits held with electricity boards, water boards, GST ITC, and vendor advances",
    subLedgers: [
      {
        name: "Electricity Board Meter Deposit",
        code: "1410",
        group: LedgerGroup.ASSET,
        balanceType: BalanceType.DEBIT,
        description: "Security deposit with power utility for common meters",
      },
      {
        name: "Water Supply Deposit",
        code: "1420",
        group: LedgerGroup.ASSET,
        balanceType: BalanceType.DEBIT,
        description: "Security deposit with municipal water authority",
      },
      {
        name: "GST Input Tax Credit (ITC Receivable)",
        code: "1430",
        group: LedgerGroup.ASSET,
        balanceType: BalanceType.DEBIT,
        description: "GST input credit on vendor bills & AMCs available for offset",
      },
      {
        name: "Prepaid Expenses & Annual AMCs",
        code: "1440",
        group: LedgerGroup.ASSET,
        balanceType: BalanceType.DEBIT,
        description: "Prepaid insurance premiums and annual maintenance contracts spanning periods",
      },
      {
        name: "Vendor & Contractor Advances Paid",
        code: "1450",
        group: LedgerGroup.ASSET,
        balanceType: BalanceType.DEBIT,
        description: "Mobilization advances paid to contractors for repair or capital works",
      },
    ],
  },
  {
    name: "Fixed Assets & Equipment",
    code: "1500",
    group: LedgerGroup.ASSET,
    balanceType: BalanceType.DEBIT,
    description: "Society plant, machinery, lifts, and capital infrastructure",
    subLedgers: [
      {
        name: "Elevators & Lifts",
        code: "1510",
        group: LedgerGroup.ASSET,
        balanceType: BalanceType.DEBIT,
      },
      {
        name: "Diesel Generators (DG Sets)",
        code: "1520",
        group: LedgerGroup.ASSET,
        balanceType: BalanceType.DEBIT,
      },
      {
        name: "Water Pumps & Treatment Plant",
        code: "1530",
        group: LedgerGroup.ASSET,
        balanceType: BalanceType.DEBIT,
      },
      {
        name: "CCTV & Security Equipment",
        code: "1540",
        group: LedgerGroup.ASSET,
        balanceType: BalanceType.DEBIT,
      },
      {
        name: "Solar Rooftop Power System",
        code: "1550",
        group: LedgerGroup.ASSET,
        balanceType: BalanceType.DEBIT,
      },
      {
        name: "Accumulated Depreciation on Fixed Assets",
        code: "1590",
        group: LedgerGroup.ASSET,
        balanceType: BalanceType.CREDIT,
        description: "Contra-asset account for asset depreciation",
      },
    ],
  },

  // ===========================================================================
  // 2000 - LIABILITIES
  // ===========================================================================
  {
    name: "Member Advances & Caution Deposits",
    code: "2100",
    group: LedgerGroup.LIABILITY,
    balanceType: BalanceType.CREDIT,
    description: "Advance maintenance collected and refundable member/tenant deposits",
    subLedgers: [
      {
        name: "Advance Maintenance Received",
        code: "2110",
        group: LedgerGroup.LIABILITY,
        balanceType: BalanceType.CREDIT,
      },
      {
        name: "Tenant Move-In Security Deposits",
        code: "2120",
        group: LedgerGroup.LIABILITY,
        balanceType: BalanceType.CREDIT,
      },
      {
        name: "Flat Renovation / Fit-Out Caution Deposits",
        code: "2130",
        group: LedgerGroup.LIABILITY,
        balanceType: BalanceType.CREDIT,
      },
    ],
  },
  {
    name: "Trade Payables (Sundry Creditors)",
    code: "2200",
    group: LedgerGroup.LIABILITY,
    balanceType: BalanceType.CREDIT,
    description: "Outstanding bills payable to vendors, security agencies, and contractors",
    subLedgers: [
      {
        name: "Security Agency Payable",
        code: "2210",
        group: LedgerGroup.LIABILITY,
        balanceType: BalanceType.CREDIT,
      },
      {
        name: "Lift AMC Payable",
        code: "2220",
        group: LedgerGroup.LIABILITY,
        balanceType: BalanceType.CREDIT,
      },
      {
        name: "General Repairs Contractors Payable",
        code: "2230",
        group: LedgerGroup.LIABILITY,
        balanceType: BalanceType.CREDIT,
      },
    ],
  },
  {
    name: "Statutory Dues Payable",
    code: "2300",
    group: LedgerGroup.LIABILITY,
    balanceType: BalanceType.CREDIT,
    description: "TDS, GST, municipal taxes, and statutory withholdings payable to the government",
    subLedgers: [
      {
        name: "TDS Payable (Section 194C/194J)",
        code: "2310",
        group: LedgerGroup.LIABILITY,
        balanceType: BalanceType.CREDIT,
      },
      {
        name: "GST Output Tax Payable",
        code: "2320",
        group: LedgerGroup.LIABILITY,
        balanceType: BalanceType.CREDIT,
      },
      {
        name: "Property & Municipal Taxes Payable",
        code: "2330",
        group: LedgerGroup.LIABILITY,
        balanceType: BalanceType.CREDIT,
        description: "Assessed municipal property taxes & local body levies due",
      },
      {
        name: "Labour Welfare & Building Cess Payable",
        code: "2340",
        group: LedgerGroup.LIABILITY,
        balanceType: BalanceType.CREDIT,
        description: "Statutory construction/repair cess withholdings",
      },
    ],
  },
  {
    name: "Accrued Expenses & Provisions",
    code: "2400",
    group: LedgerGroup.LIABILITY,
    balanceType: BalanceType.CREDIT,
    description: "Provisions for unpaid utilities, contractor retention, and year-end audit fees",
    subLedgers: [
      {
        name: "Common Electricity Bill Accrued",
        code: "2410",
        group: LedgerGroup.LIABILITY,
        balanceType: BalanceType.CREDIT,
      },
      {
        name: "Water Tanker Charges Accrued",
        code: "2420",
        group: LedgerGroup.LIABILITY,
        balanceType: BalanceType.CREDIT,
      },
      {
        name: "Statutory Audit Fees Payable",
        code: "2430",
        group: LedgerGroup.LIABILITY,
        balanceType: BalanceType.CREDIT,
      },
      {
        name: "Contractor Retention & Security Deposits Held",
        code: "2440",
        group: LedgerGroup.LIABILITY,
        balanceType: BalanceType.CREDIT,
        description: "Retention money / earnest deposit held from contractors during defect liability",
      },
    ],
  },

  // ===========================================================================
  // 3000 - EQUITY & STATUTORY RESERVES
  // ===========================================================================
  {
    name: "Member Share Capital",
    code: "3100",
    group: LedgerGroup.EQUITY,
    balanceType: BalanceType.CREDIT,
    description: "Paid-up share capital by registered society members",
  },
  {
    name: "Sinking Fund Reserve",
    code: "3200",
    group: LedgerGroup.EQUITY,
    balanceType: BalanceType.CREDIT,
    description: "Mandatory statutory sinking fund for building structural life",
  },
  {
    name: "Major Repair & Replacement Fund",
    code: "3300",
    group: LedgerGroup.EQUITY,
    balanceType: BalanceType.CREDIT,
    description: "Statutory fund for exterior painting and structural repairs",
  },
  {
    name: "General Reserve Fund",
    code: "3400",
    group: LedgerGroup.EQUITY,
    balanceType: BalanceType.CREDIT,
    description: "Accumulated transfer premiums, entrance fees, and donations",
  },
  {
    name: "Cooperative Education & Training Fund",
    code: "3410",
    group: LedgerGroup.EQUITY,
    balanceType: BalanceType.CREDIT,
    description: "Statutory member and committee education & training fund",
  },
  {
    name: "Common Good & Community Welfare Fund",
    code: "3420",
    group: LedgerGroup.EQUITY,
    balanceType: BalanceType.CREDIT,
    description: "Earmarked reserve for resident amenities, sports, and welfare",
  },
  {
    name: "Accumulated Surplus / Deficit",
    code: "3500",
    group: LedgerGroup.EQUITY,
    balanceType: BalanceType.CREDIT,
    description: "Retained earnings and cumulative net income",
  },

  // ===========================================================================
  // 4000 - REVENUE & INCOMES
  // ===========================================================================
  {
    name: "Maintenance Billing Revenues",
    code: "4100",
    group: LedgerGroup.INCOME,
    balanceType: BalanceType.CREDIT,
    description: "Monthly maintenance service charges collected from members",
    subLedgers: [
      {
        name: "Service & Operations Charges",
        code: "4110",
        group: LedgerGroup.INCOME,
        balanceType: BalanceType.CREDIT,
      },
      {
        name: "Common Electricity Recovery",
        code: "4120",
        group: LedgerGroup.INCOME,
        balanceType: BalanceType.CREDIT,
      },
      {
        name: "Common Water Charges",
        code: "4130",
        group: LedgerGroup.INCOME,
        balanceType: BalanceType.CREDIT,
      },
      {
        name: "Parking Charges Income",
        code: "4140",
        group: LedgerGroup.INCOME,
        balanceType: BalanceType.CREDIT,
      },
    ],
  },
  {
    name: "Statutory Fund Billings",
    code: "4200",
    group: LedgerGroup.INCOME,
    balanceType: BalanceType.CREDIT,
    description: "Mandatory statutory fund contributions billed to members",
    subLedgers: [
      {
        name: "Sinking Fund Contribution",
        code: "4210",
        group: LedgerGroup.INCOME,
        balanceType: BalanceType.CREDIT,
      },
      {
        name: "Major Repair Fund Contribution",
        code: "4220",
        group: LedgerGroup.INCOME,
        balanceType: BalanceType.CREDIT,
      },
    ],
  },
  {
    name: "Non-Occupancy Charges Income",
    code: "4300",
    group: LedgerGroup.INCOME,
    balanceType: BalanceType.CREDIT,
    description: "10% service charge surcharge on rented flats",
  },
  {
    name: "Other Operational Incomes",
    code: "4400",
    group: LedgerGroup.INCOME,
    balanceType: BalanceType.CREDIT,
    description: "Transfer fees, move-in fees, solar credits, hall booking, and penalty interest",
    subLedgers: [
      {
        name: "Flat Transfer Premium Fees",
        code: "4410",
        group: LedgerGroup.INCOME,
        balanceType: BalanceType.CREDIT,
      },
      {
        name: "Move-In / Move-Out Administrative Fees",
        code: "4420",
        group: LedgerGroup.INCOME,
        balanceType: BalanceType.CREDIT,
      },
      {
        name: "Clubhouse & Hall Booking Charges",
        code: "4430",
        group: LedgerGroup.INCOME,
        balanceType: BalanceType.CREDIT,
      },
      {
        name: "Overdue Interest & Late Fee Penalties",
        code: "4440",
        group: LedgerGroup.INCOME,
        balanceType: BalanceType.CREDIT,
      },
      {
        name: "Solar Net-Metering & Feed-in Rebates",
        code: "4450",
        group: LedgerGroup.INCOME,
        balanceType: BalanceType.CREDIT,
        description: "Power export credit and feed-in tariff adjustments from rooftop solar",
      },
      {
        name: "Mobile Tower & Hoarding Advertising Rent",
        code: "4460",
        group: LedgerGroup.INCOME,
        balanceType: BalanceType.CREDIT,
        description: "Rooftop antenna, mobile tower, or billboard commercial rental",
      },
      {
        name: "NOC & Clearance Documentation Charges",
        code: "4470",
        group: LedgerGroup.INCOME,
        balanceType: BalanceType.CREDIT,
        description: "Bank loan NOC, gift deed NOC, or clearance certificate fees",
      },
    ],
  },
  {
    name: "Interest & Investment Income",
    code: "4500",
    group: LedgerGroup.INCOME,
    balanceType: BalanceType.CREDIT,
    description: "Interest earned on bank deposits and treasury investments",
    subLedgers: [
      {
        name: "Interest Earned on Fixed Deposits",
        code: "4510",
        group: LedgerGroup.INCOME,
        balanceType: BalanceType.CREDIT,
      },
      {
        name: "Savings Bank Interest",
        code: "4520",
        group: LedgerGroup.INCOME,
        balanceType: BalanceType.CREDIT,
      },
    ],
  },

  // ===========================================================================
  // 5000 - EXPENSES & OVERHEADS
  // ===========================================================================
  {
    name: "Facility & Security Overheads",
    code: "5100",
    group: LedgerGroup.EXPENSE,
    balanceType: BalanceType.DEBIT,
    description: "Guards, housekeeping, pest control, and campus maintenance",
    subLedgers: [
      {
        name: "Security Guard Services",
        code: "5110",
        group: LedgerGroup.EXPENSE,
        balanceType: BalanceType.DEBIT,
      },
      {
        name: "Housekeeping & Cleaning Contract",
        code: "5120",
        group: LedgerGroup.EXPENSE,
        balanceType: BalanceType.DEBIT,
      },
      {
        name: "Gardening & Landscape Maintenance",
        code: "5130",
        group: LedgerGroup.EXPENSE,
        balanceType: BalanceType.DEBIT,
      },
      {
        name: "Pest Control & Sanitization",
        code: "5140",
        group: LedgerGroup.EXPENSE,
        balanceType: BalanceType.DEBIT,
      },
    ],
  },
  {
    name: "Common Utilities",
    code: "5200",
    group: LedgerGroup.EXPENSE,
    balanceType: BalanceType.DEBIT,
    description: "Common electricity, diesel for generator, and supplementary water tankers",
    subLedgers: [
      {
        name: "Common Area Electricity Consumption",
        code: "5210",
        group: LedgerGroup.EXPENSE,
        balanceType: BalanceType.DEBIT,
      },
      {
        name: "Supplementary Water Tanker Purchases",
        code: "5220",
        group: LedgerGroup.EXPENSE,
        balanceType: BalanceType.DEBIT,
      },
      {
        name: "Diesel for Backup Generators",
        code: "5230",
        group: LedgerGroup.EXPENSE,
        balanceType: BalanceType.DEBIT,
      },
    ],
  },
  {
    name: "Repairs & Annual Maintenance (AMC)",
    code: "5300",
    group: LedgerGroup.EXPENSE,
    balanceType: BalanceType.DEBIT,
    description: "Lifts, DG, fire systems, pumps, insurance, solar, and general repairs",
    subLedgers: [
      {
        name: "Lift AMC & Breakdown Repairs",
        code: "5310",
        group: LedgerGroup.EXPENSE,
        balanceType: BalanceType.DEBIT,
      },
      {
        name: "DG Set AMC & Servicing",
        code: "5320",
        group: LedgerGroup.EXPENSE,
        balanceType: BalanceType.DEBIT,
      },
      {
        name: "Fire Fighting System AMC",
        code: "5330",
        group: LedgerGroup.EXPENSE,
        balanceType: BalanceType.DEBIT,
      },
      {
        name: "Water Pump Maintenance & Rewinding",
        code: "5340",
        group: LedgerGroup.EXPENSE,
        balanceType: BalanceType.DEBIT,
      },
      {
        name: "General Civil, Electrical & Plumbing Repairs",
        code: "5350",
        group: LedgerGroup.EXPENSE,
        balanceType: BalanceType.DEBIT,
      },
      {
        name: "Building Fire & Structural Insurance Premium",
        code: "5360",
        group: LedgerGroup.EXPENSE,
        balanceType: BalanceType.DEBIT,
        description: "Comprehensive structural, fire, earthquake, and third-party liability insurance",
      },
      {
        name: "Solar Rooftop Plant Maintenance & Cleaning",
        code: "5370",
        group: LedgerGroup.EXPENSE,
        balanceType: BalanceType.DEBIT,
        description: "Inverter servicing and solar panel cleaning AMC",
      },
      {
        name: "Intercom, Telecom & Security Systems AMC",
        code: "5380",
        group: LedgerGroup.EXPENSE,
        balanceType: BalanceType.DEBIT,
        description: "Intercom cabling, boom barrier, CCTV, and access control AMC",
      },
    ],
  },
  {
    name: "Administrative & Office Overheads",
    code: "5400",
    group: LedgerGroup.EXPENSE,
    balanceType: BalanceType.DEBIT,
    description: "Staff salaries, office stationery, software, festivals, and AGM expenses",
    subLedgers: [
      {
        name: "Society Manager & Staff Salaries",
        code: "5410",
        group: LedgerGroup.EXPENSE,
        balanceType: BalanceType.DEBIT,
      },
      {
        name: "Printing, Stationery & Postage",
        code: "5420",
        group: LedgerGroup.EXPENSE,
        balanceType: BalanceType.DEBIT,
      },
      {
        name: "Software & Communication Portal Fees",
        code: "5430",
        group: LedgerGroup.EXPENSE,
        balanceType: BalanceType.DEBIT,
      },
      {
        name: "AGM & Committee Meeting Expenses",
        code: "5440",
        group: LedgerGroup.EXPENSE,
        balanceType: BalanceType.DEBIT,
      },
      {
        name: "Festival & Community Celebration Expenses",
        code: "5450",
        group: LedgerGroup.EXPENSE,
        balanceType: BalanceType.DEBIT,
        description: "Independence Day, Republic Day, cultural events, and festival celebrations",
      },
      {
        name: "Bank Stamp Duty & Franking Charges",
        code: "5460",
        group: LedgerGroup.EXPENSE,
        balanceType: BalanceType.DEBIT,
        description: "Stamp duty, agreement franking, and documentation charges",
      },
    ],
  },
  {
    name: "Professional & Legal Fees",
    code: "5500",
    group: LedgerGroup.EXPENSE,
    balanceType: BalanceType.DEBIT,
    description: "Statutory audit fees, legal counsel, and filing expenses",
    subLedgers: [
      {
        name: "Statutory Auditor Fees",
        code: "5510",
        group: LedgerGroup.EXPENSE,
        balanceType: BalanceType.DEBIT,
      },
      {
        name: "Legal Consultation & Court Fees",
        code: "5520",
        group: LedgerGroup.EXPENSE,
        balanceType: BalanceType.DEBIT,
      },
    ],
  },
  {
    name: "Bank & Finance Charges",
    code: "5600",
    group: LedgerGroup.EXPENSE,
    balanceType: BalanceType.DEBIT,
    description: "Bank ledger charges, transaction fees, and cheque bounce charges",
    subLedgers: [
      {
        name: "Bank Ledger & Maintenance Charges",
        code: "5610",
        group: LedgerGroup.EXPENSE,
        balanceType: BalanceType.DEBIT,
      },
      {
        name: "Cheque Return & Bounce Charges",
        code: "5620",
        group: LedgerGroup.EXPENSE,
        balanceType: BalanceType.DEBIT,
      },
    ],
  },
  {
    name: "Depreciation & Amortization",
    code: "5700",
    group: LedgerGroup.EXPENSE,
    balanceType: BalanceType.DEBIT,
    description: "Annual statutory depreciation on society fixed assets",
  },
]

/**
 * Automatically seeds the complete standard Chart of Accounts for a Housing Society.
 * Supports hierarchical sub-ledgers, idempotent upserting, and system flags.
 */
export async function seedSocietyChartOfAccounts(societyId: string): Promise<void> {
  async function createNodes(nodes: StandardAccountNode[], parentLedgerId?: string) {
    for (const node of nodes) {
      const existing = await prisma.ledger.findUnique({
        where: {
          societyId_name: {
            societyId,
            name: node.name,
          },
        },
      })

      const ledger = existing
        ? await prisma.ledger.update({
            where: { id: existing.id },
            data: {
              code: node.code,
              group: node.group,
              balanceType: node.balanceType,
              description: node.description,
              parentLedgerId: parentLedgerId || null,
              isSystem: true,
            },
          })
        : await prisma.ledger.create({
            data: {
              societyId,
              name: node.name,
              code: node.code,
              group: node.group,
              balanceType: node.balanceType,
              description: node.description,
              parentLedgerId: parentLedgerId || null,
              isSystem: true,
            },
          })

      if (node.subLedgers && node.subLedgers.length > 0) {
        await createNodes(node.subLedgers, ledger.id)
      }
    }
  }

  await createNodes(STANDARD_CHART_OF_ACCOUNTS)
}
