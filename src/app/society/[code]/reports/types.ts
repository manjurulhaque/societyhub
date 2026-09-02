export type SocietySummary = {
  totalBilled: number
  totalCollected: number
  totalOutstanding: number
  collectionRate: number
  totalBillsCount: number
  totalPaymentsCount: number
  totalExpenses: number
  totalExpensesCount: number
  netOperatingSurplus: number
  liquidCashAndBank: number
  totalFixedDeposits: number
  totalFixedAssetsBookValue: number
  totalReserves: number
  defaultersCount: number
  totalFlatsCount: number
  defaulterRate: number
  totalVendorPayables: number
  totalMemberDepositsHeld: number
}

export type BillCategoryItem = {
  billType: string
  amount: number
  count: number
  percentage: number
}

export type ExpenseCategoryItem = {
  categoryName: string
  amount: number
  count: number
  percentage: number
}

export type PaymentModeItem = {
  mode: string
  amount: number
  count: number
  percentage: number
}

export type BankAccountItem = {
  id: string
  name: string
  bankName: string | null
  accountNumber: string | null
  accountType: string
  currentBalance: number
  isDefault: boolean
}

export type FixedDepositItem = {
  id: string
  fdNumber: string
  bankName: string
  principalAmount: number
  interestRate: number
  maturityAmount: number
  maturityDate: string
  status: string
}

export type FixedAssetItem = {
  id: string
  name: string
  assetCode: string | null
  categoryName: string
  location: string | null
  purchaseCost: number
  currentBookValue: number
  amcVendorName: string | null
  status: string
}

export type AgingBucket = "OVER_90" | "DAYS_61_90" | "DAYS_31_60" | "DAYS_0_30"

export type DefaulterItem = {
  flatId: string
  flatNumber: string
  blockName: string
  occupancyStatus: string
  residentName: string
  residentPhone: string | null
  residentEmail: string | null
  unpaidBillsCount: number
  unpaidPrincipal: number
  unpaidLateFees: number
  totalOverdue: number
  oldestDueDate: string | null
  agingBucket: AgingBucket
  daysOverdue: number
  isVotingDisqualified: boolean
}

export type AgingSummary = {
  over90: { count: number; amount: number }
  days61To90: { count: number; amount: number }
  days31To60: { count: number; amount: number }
  days0To30: { count: number; amount: number }
}

export type MonthlyTrendItem = {
  key: string
  label: string
  year: number
  month: number
  billedAmount: number
  billedCount: number
  collectedAmount: number
  collectedCount: number
  collectionRate: number
  expenseAmount: number
  netCashflow: number
}

export type PnlData = {
  incomeHeads: {
    category: string
    amount: number
    count: number
  }[]
  totalIncome: number
  expenseHeads: {
    category: string
    amount: number
    count: number
  }[]
  totalExpense: number
  netSurplus: number
}

export type BalanceSheetData = {
  assets: {
    liquidBankCash: number
    maintenanceArrears: number
    fixedDeposits: number
    fixedAssetsBookValue: number
    totalAssets: number
  }
  liabilities: {
    memberDepositsHeld: number
    vendorPayables: number
    advanceCollections: number
    sinkingAndGeneralReserves: number
    totalLiabilitiesAndFunds: number
  }
  netFinancialPosition: number
}

export type BudgetVarianceItem = {
  id: string
  budgetName: string
  headName: string
  allocatedAmount: number
  utilizedAmount: number
  remainingAmount: number
  utilizationRate: number
  status: "ON_TRACK" | "WARNING" | "OVER_BUDGET"
}

export type ShareCertificateItem = {
  id: string
  flatNumber: string
  blockName: string
  memberName: string
  certificateNumber: string
  sharesCount: number
  distinctiveNumbers: string
  faceValueTotal: number
  issueDate: string
  status: string
}

export type VotingListItem = {
  flatNumber: string
  blockName: string
  memberName: string
  occupancyStatus: string
  outstandingDues: number
  isEligible: boolean
  disqualificationReason: string | null
}

export type NominationItem = {
  id: string
  flatNumber: string
  blockName: string
  memberName: string
  nomineeName: string
  relationship: string
  percentageShare: number
  nominationDate: string
  status: string
}

export type PropertyLienItem = {
  id: string
  flatNumber: string
  blockName: string
  memberName: string
  bankName: string
  loanAccountNumber: string | null
  sanctionAmount: number | null
  nocIssuedDate: string | null
  nocReference: string | null
  status: string
}

export type StatutoryData = {
  shares: ShareCertificateItem[]
  votingList: VotingListItem[]
  nominations: NominationItem[]
  propertyLiens: PropertyLienItem[]
}

export type VendorAgingItem = {
  vendorId: string
  vendorName: string
  companyName: string | null
  phone: string | null
  totalBilledAmount: number
  totalPaidAmount: number
  outstandingDue: number
  tdsDeducted: number
  pendingBillsCount: number
  agingBucket: "OVER_60" | "DAYS_31_60" | "DAYS_0_30"
}

export type ChequeItem = {
  id: string
  chequeNumber: string
  direction: "INWARD" | "OUTWARD"
  partyName: string
  bankName: string | null
  accountName: string | null
  amount: number
  status: string
  chequeDate: string
  clearedOn: string | null
  bouncedReason: string | null
  bounceCharges: number
}

export type UnitLedgerItem = {
  flatId: string
  flatNumber: string
  blockName: string
  unitType: string | null
  area: number | null
  areaUnit: string
  occupancyStatus: string
  residentName: string
  totalInvoicesCount: number
  totalBilledAmount: number
  totalPaidAmount: number
  outstandingAmount: number
  advanceAmount: number
  accountStatus: "CLEAR" | "PENDING" | "OVERDUE" | "ADVANCE" | "NO_BILLS"
}

export type CampaignAllocationItem = {
  id: string
  flatId: string
  flatNumber: string
  blockName: string
  residentName: string
  area: number | null
  totalAmount: number
  paidAmount: number
  balanceAmount: number
  status: string
  installmentsCount: number
  clearedInstallmentsCount: number
}

export type OneTimeCampaignItem = {
  id: string
  title: string
  description: string | null
  totalTargetAmount: number
  totalAllocatedAmount: number
  totalCollectedAmount: number
  totalOutstandingAmount: number
  realizationRate: number
  calculationType: string
  ratePerSqft: number | null
  fixedAmountPerFlat: number | null
  paymentPlan: string
  numberOfInstallments: number
  startDate: string
  dueDate: string | null
  status: string
  approvedInMeeting: string | null
  remarks: string | null
  allocations: CampaignAllocationItem[]
}

export type MemberDepositItem = {
  id: string
  flatNumber: string
  blockName: string
  memberName: string
  phone: string | null
  depositType: string
  amount: number
  status: string
  receivedOn: string
  refundedOn: string | null
  reference: string | null
  remarks: string | null
}

export type OneTimeFundsData = {
  campaigns: OneTimeCampaignItem[]
  deposits: MemberDepositItem[]
  totalTargetedAllCampaigns: number
  totalCollectedAllCampaigns: number
  totalOutstandingAllCampaigns: number
  totalDepositsHeld: number
  totalCorpusDeposits: number
  totalSecurityDeposits: number
}

export type FinancialYearItem = {
  id: string
  name: string
  startYear: number
  endYear: number
  isCurrent: boolean
}

export type SocietyReportData = {
  society: {
    id: string
    name: string
    code: string | null
    currencySymbol: string
    address?: string | null
    city?: string | null
    state?: string | null
    pincode?: string | null
    registrationNumber?: string | null
    panNumber?: string | null
    gstin?: string | null
  }
  summary: SocietySummary
  billsByCategory: BillCategoryItem[]
  expensesByCategory: ExpenseCategoryItem[]
  paymentsByMode: PaymentModeItem[]
  bankAccounts: BankAccountItem[]
  fixedDeposits: FixedDepositItem[]
  fixedAssets: FixedAssetItem[]
  defaulters: DefaulterItem[]
  agingSummary: AgingSummary
  monthlyTrends: MonthlyTrendItem[]
  pnl: PnlData
  balanceSheet: BalanceSheetData
  budgetVariance: BudgetVarianceItem[]
  statutory: StatutoryData
  vendorAging: VendorAgingItem[]
  cheques: ChequeItem[]
  unitLedger: UnitLedgerItem[]
  oneTimeFunds: OneTimeFundsData
  blocks: string[]
  financialYears: FinancialYearItem[]
}
