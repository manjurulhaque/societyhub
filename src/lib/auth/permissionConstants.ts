export interface PermissionDefinition {
  code: string
  name: string
  module: string
  description: string
}

export const MODULE_ORDER = [
  "BILLING",
  "PAYMENTS",
  "EXPENSES",
  "ACCOUNTS",
  "REGISTERS",
  "MEMBERS",
  "AMENITIES",
  "REPORTS",
  "SETTINGS",
] as const

export type PermissionModule = typeof MODULE_ORDER[number]

export const MODULE_LABELS: Record<string, { label: string; description: string }> = {
  BILLING: {
    label: "Billing & Invoicing",
    description: "Maintenance dues, ad-hoc billing, and invoice generation",
  },
  PAYMENTS: {
    label: "Payments & Collections",
    description: "Payment collection, receipt generation, and refunds",
  },
  EXPENSES: {
    label: "Expenses & Payables",
    description: "Vendor bills, expense authorizations, and disbursements",
  },
  ACCOUNTS: {
    label: "Banking & Petty Cash",
    description: "Bank ledgers, petty cash book, cheques, and investments",
  },
  REGISTERS: {
    label: "Statutory Registers",
    description: "I/J registers, share certificates, nominations, and meetings",
  },
  MEMBERS: {
    label: "Members & Residents",
    description: "Owner/tenant directories, flat allocations, and committee assignments",
  },
  AMENITIES: {
    label: "Amenities & Bookings",
    description: "Clubhouse, halls, facility pricing, and booking approvals",
  },
  REPORTS: {
    label: "Reports & Financials",
    description: "Balance sheets, income/expenditure, defaulters, and audit logs",
  },
  SETTINGS: {
    label: "Society Governance",
    description: "Society profile, billing rules, and role permission policies",
  },
}

export const STANDARD_PERMISSIONS: PermissionDefinition[] = [
  // BILLING
  {
    code: "BILLS_VIEW",
    name: "View Bills & Invoices",
    module: "BILLING",
    description: "Can view maintenance bills, one-time charges, and history",
  },
  {
    code: "BILLS_CREATE",
    name: "Create Individual Bills",
    module: "BILLING",
    description: "Can create ad-hoc bills and special assessment allocations",
  },
  {
    code: "BILLS_GENERATE",
    name: "Batch Generate Bills",
    module: "BILLING",
    description: "Can execute automated monthly maintenance bill generation runs",
  },
  {
    code: "BILLS_CANCEL",
    name: "Cancel / Void Bills",
    module: "BILLING",
    description: "Can void incorrect invoices or write off penalties",
  },

  // PAYMENTS
  {
    code: "PAYMENTS_VIEW",
    name: "View Payments & Receipts",
    module: "PAYMENTS",
    description: "Can view collection history and payment receipts",
  },
  {
    code: "PAYMENTS_COLLECT",
    name: "Record Payments",
    module: "PAYMENTS",
    description: "Can enter offline payments (Cash, Cheque, Bank Transfer, UPI)",
  },
  {
    code: "PAYMENTS_REFUND",
    name: "Issue Refunds",
    module: "PAYMENTS",
    description: "Can record payment reversals and security deposit refunds",
  },

  // EXPENSES
  {
    code: "EXPENSES_VIEW",
    name: "View Expenses & Payables",
    module: "EXPENSES",
    description: "Can view vendor vouchers, payment orders, and bill status",
  },
  {
    code: "EXPENSES_CREATE",
    name: "Submit Expenses",
    module: "EXPENSES",
    description: "Can create expense vouchers and upload vendor invoices",
  },
  {
    code: "EXPENSES_APPROVE",
    name: "Approve Expenses",
    module: "EXPENSES",
    description: "Can authorize operational and capital expenditure items",
  },
  {
    code: "EXPENSES_PAY",
    name: "Disburse Payments",
    module: "EXPENSES",
    description: "Can mark approved expenses as paid and disburse funds",
  },

  // ACCOUNTS
  {
    code: "ACCOUNTS_VIEW",
    name: "View Bank & Cash Accounts",
    module: "ACCOUNTS",
    description: "Can view bank accounts, ledger statements, and closing balances",
  },
  {
    code: "ACCOUNTS_MANAGE",
    name: "Manage Accounts & Ledgers",
    module: "ACCOUNTS",
    description: "Can add bank accounts, edit Chart of Accounts, and post journal entries",
  },
  {
    code: "PETTY_CASH_MANAGE",
    name: "Manage Petty Cash Book",
    module: "ACCOUNTS",
    description: "Can record daily petty cash expenses and top-up receipts",
  },
  {
    code: "CHEQUES_MANAGE",
    name: "Manage Cheque Register",
    module: "ACCOUNTS",
    description: "Can track inward/outward cheques and update clearance status",
  },
  {
    code: "INVESTMENTS_MANAGE",
    name: "Manage Fixed Deposits",
    module: "ACCOUNTS",
    description: "Can record FDs, interest payouts, and maturities",
  },

  // REGISTERS
  {
    code: "REGISTERS_VIEW",
    name: "View Statutory Registers",
    module: "REGISTERS",
    description: "Can view Form I (Members), Form J (List), Share, and Meeting registers",
  },
  {
    code: "REGISTERS_MANAGE",
    name: "Update Statutory Registers",
    module: "REGISTERS",
    description: "Can add entries to statutory property and membership registers",
  },
  {
    code: "MEETINGS_MANAGE",
    name: "Manage Meetings & Minutes",
    module: "REGISTERS",
    description: "Can convene AGM/SGM/MCM meetings and draft official minutes",
  },
  {
    code: "NOMINATIONS_MANAGE",
    name: "Manage Nominations & Liens",
    module: "REGISTERS",
    description: "Can record nomination filings, bank mortgages, and disputes",
  },
  {
    code: "SHARES_MANAGE",
    name: "Issue & Transfer Shares",
    module: "REGISTERS",
    description: "Can record share certificate issuances and ownership transfers",
  },

  // MEMBERS
  {
    code: "MEMBERS_VIEW",
    name: "View Resident Directory",
    module: "MEMBERS",
    description: "Can view owners, tenants, family members, and flat mapping",
  },
  {
    code: "MEMBERS_MANAGE",
    name: "Manage Residents & Flats",
    module: "MEMBERS",
    description: "Can register residents, map flat occupancies, and manage contact info",
  },
  {
    code: "ROLES_ASSIGN",
    name: "Assign Committee Roles",
    module: "MEMBERS",
    description: "Can assign designations and RBAC roles to committee members",
  },

  // AMENITIES
  {
    code: "AMENITIES_VIEW",
    name: "View Amenities & Bookings",
    module: "AMENITIES",
    description: "Can view facility calendars, rates, and resident booking requests",
  },
  {
    code: "AMENITIES_MANAGE",
    name: "Manage Facilities",
    module: "AMENITIES",
    description: "Can configure clubhouse, swimming pool, party hall, and rules",
  },
  {
    code: "BOOKINGS_APPROVE",
    name: "Approve Facility Bookings",
    module: "AMENITIES",
    description: "Can approve or reject facility reservation requests",
  },

  // REPORTS
  {
    code: "REPORTS_VIEW",
    name: "View Financial & Audit Reports",
    module: "REPORTS",
    description: "Can view Balance Sheet, Income & Expenditure, and Defaulters lists",
  },
  {
    code: "AUDIT_LOGS_VIEW",
    name: "View System Audit Trail",
    module: "REPORTS",
    description: "Can inspect immutable security and change audit logs",
  },

  // SETTINGS
  {
    code: "SETTINGS_VIEW",
    name: "View Society Settings",
    module: "SETTINGS",
    description: "Can view society details, bank config, and billing policies",
  },
  {
    code: "SETTINGS_EDIT",
    name: "Edit Society Profile",
    module: "SETTINGS",
    description: "Can modify society registration numbers, billing rules, and tax IDs",
  },
  {
    code: "ROLES_MANAGE",
    name: "Manage Roles & Permissions",
    module: "SETTINGS",
    description: "Can create, modify, and delete custom society roles and permission policies",
  },
]

export const DEFAULT_ROLE_TEMPLATES: {
  code: string
  name: string
  description: string
  permissions: string[]
}[] = [
  {
    code: "PRESIDENT",
    name: "President",
    description: "Chief executive authority: full governance, financial approvals, policy changes, and society oversight.",
    permissions: STANDARD_PERMISSIONS.map((p) => p.code),
  },
  {
    code: "VICE_PRESIDENT",
    name: "Vice President",
    description: "Executive deputy officer: governance oversight, approvals, registers, and operations management.",
    permissions: [
      "BILLS_VIEW", "BILLS_CREATE", "BILLS_GENERATE",
      "PAYMENTS_VIEW", "PAYMENTS_COLLECT", "PAYMENTS_REFUND",
      "EXPENSES_VIEW", "EXPENSES_CREATE", "EXPENSES_APPROVE", "EXPENSES_PAY",
      "ACCOUNTS_VIEW", "ACCOUNTS_MANAGE", "PETTY_CASH_MANAGE", "CHEQUES_MANAGE", "INVESTMENTS_MANAGE",
      "REGISTERS_VIEW", "REGISTERS_MANAGE", "MEETINGS_MANAGE", "NOMINATIONS_MANAGE", "SHARES_MANAGE",
      "MEMBERS_VIEW", "MEMBERS_MANAGE", "ROLES_ASSIGN",
      "AMENITIES_VIEW", "AMENITIES_MANAGE", "BOOKINGS_APPROVE",
      "REPORTS_VIEW", "AUDIT_LOGS_VIEW", "SETTINGS_VIEW", "ROLES_MANAGE",
    ],
  },
  {
    code: "SECRETARY",
    name: "Secretary",
    description: "Administrative & statutory governance: meetings, registers, members, amenities, and approvals.",
    permissions: [
      "BILLS_VIEW", "PAYMENTS_VIEW", "EXPENSES_VIEW", "EXPENSES_CREATE", "EXPENSES_APPROVE",
      "REGISTERS_VIEW", "REGISTERS_MANAGE", "MEETINGS_MANAGE", "NOMINATIONS_MANAGE", "SHARES_MANAGE",
      "MEMBERS_VIEW", "MEMBERS_MANAGE", "ROLES_ASSIGN",
      "AMENITIES_VIEW", "AMENITIES_MANAGE", "BOOKINGS_APPROVE",
      "REPORTS_VIEW", "AUDIT_LOGS_VIEW", "SETTINGS_VIEW", "SETTINGS_EDIT", "ROLES_MANAGE",
    ],
  },
  {
    code: "JOINT_SECRETARY",
    name: "Joint Secretary",
    description: "Administrative officer: assist with meetings, member records, statutory registers, and amenities.",
    permissions: [
      "BILLS_VIEW", "PAYMENTS_VIEW", "EXPENSES_VIEW", "EXPENSES_CREATE",
      "REGISTERS_VIEW", "REGISTERS_MANAGE", "MEETINGS_MANAGE", "NOMINATIONS_MANAGE", "SHARES_MANAGE",
      "MEMBERS_VIEW", "MEMBERS_MANAGE",
      "AMENITIES_VIEW", "AMENITIES_MANAGE", "BOOKINGS_APPROVE",
      "REPORTS_VIEW", "SETTINGS_VIEW",
    ],
  },
  {
    code: "TREASURER",
    name: "Treasurer",
    description: "Full financial authority: accounts, ledgers, vouchers, billing, approvals, and reports.",
    permissions: [
      "BILLS_VIEW", "BILLS_CREATE", "BILLS_GENERATE", "BILLS_CANCEL",
      "PAYMENTS_VIEW", "PAYMENTS_COLLECT", "PAYMENTS_REFUND",
      "EXPENSES_VIEW", "EXPENSES_CREATE", "EXPENSES_APPROVE", "EXPENSES_PAY",
      "ACCOUNTS_VIEW", "ACCOUNTS_MANAGE", "PETTY_CASH_MANAGE", "CHEQUES_MANAGE", "INVESTMENTS_MANAGE",
      "REGISTERS_VIEW", "MEMBERS_VIEW", "REPORTS_VIEW", "SETTINGS_VIEW",
    ],
  },
  {
    code: "MANAGER",
    name: "Estate Manager",
    description: "Day-to-day operations: billing, collections, petty cash, facility bookings, and vendor entries.",
    permissions: [
      "BILLS_VIEW", "BILLS_CREATE", "BILLS_GENERATE",
      "PAYMENTS_VIEW", "PAYMENTS_COLLECT",
      "EXPENSES_VIEW", "EXPENSES_CREATE",
      "PETTY_CASH_MANAGE", "CHEQUES_MANAGE",
      "REGISTERS_VIEW", "MEMBERS_VIEW", "MEMBERS_MANAGE",
      "AMENITIES_VIEW", "AMENITIES_MANAGE", "BOOKINGS_APPROVE",
      "REPORTS_VIEW", "SETTINGS_VIEW",
    ],
  },
  {
    code: "ACCOUNTANT",
    name: "Accountant",
    description: "Bookkeeping & record-keeping: ledgers, vouchers, payments, billing generation, and reconciliation.",
    permissions: [
      "BILLS_VIEW", "BILLS_CREATE", "BILLS_GENERATE",
      "PAYMENTS_VIEW", "PAYMENTS_COLLECT",
      "EXPENSES_VIEW", "EXPENSES_CREATE",
      "ACCOUNTS_VIEW", "ACCOUNTS_MANAGE", "PETTY_CASH_MANAGE", "CHEQUES_MANAGE", "INVESTMENTS_MANAGE",
      "REPORTS_VIEW", "SETTINGS_VIEW",
    ],
  },
  {
    code: "AUDITOR",
    name: "Auditor",
    description: "Read-only inspection authority for accounting records, registers, reports, and audit logs.",
    permissions: [
      "BILLS_VIEW", "PAYMENTS_VIEW", "EXPENSES_VIEW", "ACCOUNTS_VIEW",
      "REGISTERS_VIEW", "MEMBERS_VIEW", "REPORTS_VIEW", "AUDIT_LOGS_VIEW", "SETTINGS_VIEW",
    ],
  },
  {
    code: "SECURITY",
    name: "Security Incharge",
    description: "Gatekeeping operations: resident directory access and amenity reservation check-ins.",
    permissions: [
      "MEMBERS_VIEW", "AMENITIES_VIEW",
    ],
  },
  {
    code: "MEMBER",
    name: "Managing Committee Member",
    description: "General committee review authority for meetings, reports, registers, and directory.",
    permissions: [
      "BILLS_VIEW", "PAYMENTS_VIEW", "EXPENSES_VIEW",
      "REGISTERS_VIEW", "MEMBERS_VIEW", "AMENITIES_VIEW", "REPORTS_VIEW",
    ],
  },
]
