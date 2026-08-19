import { prisma } from "@/lib/prisma"
import { LedgerGroup, BalanceType, VoucherStatus, VoucherType, AccountType, DepositType, Prisma } from "@/generated/prisma"

type Decimal = Prisma.Decimal
const Decimal = Prisma.Decimal

export interface TrialBalanceRow {
  ledgerId: string
  code: string | null
  name: string
  group: LedgerGroup
  parentLedgerId: string | null
  openingDebit: string
  openingCredit: string
  currentDebit: string
  currentCredit: string
  closingDebit: string
  closingCredit: string
}

export interface GroupSummary {
  group: LedgerGroup
  totalOpeningDebit: string
  totalOpeningCredit: string
  totalCurrentDebit: string
  totalCurrentCredit: string
  totalClosingDebit: string
  totalClosingCredit: string
  rows: TrialBalanceRow[]
}

export interface TrialBalanceReport {
  societyId: string
  societyName: string
  asOfDate: string
  startDate?: string
  endDate?: string
  financialYearName?: string
  isBalanced: boolean
  difference: string
  grandTotalDebit: string
  grandTotalCredit: string
  groups: Record<LedgerGroup, GroupSummary>
}

/**
 * Calculates a full, double-entry verified Trial Balance for a Housing Society.
 *
 * Checks that Total Debits === Total Credits across all 5 ledger groups:
 * ASSET, LIABILITY, EQUITY, INCOME, EXPENSE.
 */
export async function getTrialBalance(params: {
  societyId: string
  financialYearId?: string
  startDate?: Date
  endDate?: Date
}): Promise<TrialBalanceReport> {
  const { societyId, financialYearId, startDate, endDate } = params

  const society = await prisma.society.findUnique({
    where: { id: societyId },
    select: { name: true },
  })

  if (!society) {
    throw new Error(`Society with ID ${societyId} not found`)
  }

  let financialYearName: string | undefined
  if (financialYearId) {
    const fy = await prisma.financialYear.findUnique({
      where: { id: financialYearId },
      select: { name: true },
    })
    financialYearName = fy?.name
  }

  // Fetch all active ledgers for the society
  const ledgers = await prisma.ledger.findMany({
    where: {
      societyId,
      isActive: true,
    },
    orderBy: [{ code: "asc" }, { name: "asc" }],
  })

  // Build entry date filters
  const dateFilter: { gte?: Date; lte?: Date } = {}
  if (startDate) dateFilter.gte = startDate
  if (endDate) dateFilter.lte = endDate

  // Fetch all posted ledger entries within the period
  const entries = await prisma.ledgerEntry.findMany({
    where: {
      ledger: { societyId },
      journalEntry: {
        societyId,
        status: VoucherStatus.POSTED,
        ...(financialYearId ? { financialYearId } : {}),
        ...(Object.keys(dateFilter).length > 0 ? { entryDate: dateFilter } : {}),
      },
    },
    select: {
      ledgerId: true,
      debit: true,
      credit: true,
    },
  })

  // Aggregate debit and credit totals per ledger
  const activityMap = new Map<string, { debitTotal: Decimal; creditTotal: Decimal }>()
  for (const entry of entries) {
    const current = activityMap.get(entry.ledgerId) || {
      debitTotal: new Decimal(0),
      creditTotal: new Decimal(0),
    }
    current.debitTotal = current.debitTotal.plus(entry.debit ? entry.debit.toString() : 0)
    current.creditTotal = current.creditTotal.plus(entry.credit ? entry.credit.toString() : 0)
    activityMap.set(entry.ledgerId, current)
  }

  const initialGroupSummary = (group: LedgerGroup): GroupSummary => ({
    group,
    totalOpeningDebit: "0.00",
    totalOpeningCredit: "0.00",
    totalCurrentDebit: "0.00",
    totalCurrentCredit: "0.00",
    totalClosingDebit: "0.00",
    totalClosingCredit: "0.00",
    rows: [],
  })

  const groups: Record<LedgerGroup, GroupSummary> = {
    [LedgerGroup.ASSET]: initialGroupSummary(LedgerGroup.ASSET),
    [LedgerGroup.LIABILITY]: initialGroupSummary(LedgerGroup.LIABILITY),
    [LedgerGroup.EQUITY]: initialGroupSummary(LedgerGroup.EQUITY),
    [LedgerGroup.INCOME]: initialGroupSummary(LedgerGroup.INCOME),
    [LedgerGroup.EXPENSE]: initialGroupSummary(LedgerGroup.EXPENSE),
  }

  let grandTotalClosingDebit = new Decimal(0)
  let grandTotalClosingCredit = new Decimal(0)

  for (const ledger of ledgers) {
    const opening = new Decimal(ledger.openingBalance ? ledger.openingBalance.toString() : 0)
    let openingDebit = new Decimal(0)
    let openingCredit = new Decimal(0)

    if (ledger.balanceType === BalanceType.DEBIT) {
      openingDebit = opening
    } else {
      openingCredit = opening
    }

    const activity = activityMap.get(ledger.id) || {
      debitTotal: new Decimal(0),
      creditTotal: new Decimal(0),
    }

    const totalDebitSide = openingDebit.plus(activity.debitTotal)
    const totalCreditSide = openingCredit.plus(activity.creditTotal)

    let closingDebit = new Decimal(0)
    let closingCredit = new Decimal(0)

    if (totalDebitSide.greaterThan(totalCreditSide)) {
      closingDebit = totalDebitSide.minus(totalCreditSide)
    } else if (totalCreditSide.greaterThan(totalDebitSide)) {
      closingCredit = totalCreditSide.minus(totalDebitSide)
    }

    grandTotalClosingDebit = grandTotalClosingDebit.plus(closingDebit)
    grandTotalClosingCredit = grandTotalClosingCredit.plus(closingCredit)

    const row: TrialBalanceRow = {
      ledgerId: ledger.id,
      code: ledger.code,
      name: ledger.name,
      group: ledger.group,
      parentLedgerId: ledger.parentLedgerId,
      openingDebit: openingDebit.toFixed(2),
      openingCredit: openingCredit.toFixed(2),
      currentDebit: activity.debitTotal.toFixed(2),
      currentCredit: activity.creditTotal.toFixed(2),
      closingDebit: closingDebit.toFixed(2),
      closingCredit: closingCredit.toFixed(2),
    }

    const groupBucket = groups[ledger.group]
    groupBucket.rows.push(row)
    groupBucket.totalOpeningDebit = new Decimal(groupBucket.totalOpeningDebit).plus(openingDebit).toFixed(2)
    groupBucket.totalOpeningCredit = new Decimal(groupBucket.totalOpeningCredit).plus(openingCredit).toFixed(2)
    groupBucket.totalCurrentDebit = new Decimal(groupBucket.totalCurrentDebit).plus(activity.debitTotal).toFixed(2)
    groupBucket.totalCurrentCredit = new Decimal(groupBucket.totalCurrentCredit).plus(activity.creditTotal).toFixed(2)
    groupBucket.totalClosingDebit = new Decimal(groupBucket.totalClosingDebit).plus(closingDebit).toFixed(2)
    groupBucket.totalClosingCredit = new Decimal(groupBucket.totalClosingCredit).plus(closingCredit).toFixed(2)
  }

  const difference = grandTotalClosingDebit.minus(grandTotalClosingCredit)
  const isBalanced = difference.abs().lessThan(0.01)

  return {
    societyId,
    societyName: society.name,
    asOfDate: (endDate || new Date()).toISOString(),
    startDate: startDate?.toISOString(),
    endDate: endDate?.toISOString(),
    financialYearName,
    isBalanced,
    difference: difference.toFixed(2),
    grandTotalDebit: grandTotalClosingDebit.toFixed(2),
    grandTotalCredit: grandTotalClosingCredit.toFixed(2),
    groups,
  }
}

// ===========================================================================
// GENERAL LEDGER STATEMENT (ACCOUNT LEDGER BOOK)
// ===========================================================================

export interface GeneralLedgerTransaction {
  entryId: string
  journalEntryId: string
  entryDate: string
  voucherNumber: string | null
  voucherType: string
  narration: string | null
  contraAccounts: string // Opposite accounts in the double-entry voucher
  debit: string
  credit: string
  runningBalance: string
  runningBalanceType: BalanceType
}

export interface GeneralLedgerStatement {
  societyId: string
  societyName: string
  ledgerId: string
  ledgerName: string
  ledgerCode: string | null
  ledgerGroup: LedgerGroup
  normalBalanceType: BalanceType

  startDate?: string
  endDate?: string
  financialYearName?: string

  openingBalance: string
  openingBalanceType: BalanceType

  totalPeriodDebit: string
  totalPeriodCredit: string

  closingBalance: string
  closingBalanceType: BalanceType

  transactions: GeneralLedgerTransaction[]
}

/**
 * Generates a full chronological General Ledger Statement (Account Book)
 * with Running Balances for any specific ledger account.
 */
export async function getGeneralLedgerStatement(params: {
  societyId: string
  ledgerId: string
  financialYearId?: string
  startDate?: Date
  endDate?: Date
}): Promise<GeneralLedgerStatement> {
  const { societyId, ledgerId, financialYearId, startDate, endDate } = params

  const society = await prisma.society.findUnique({
    where: { id: societyId },
    select: { name: true },
  })

  if (!society) {
    throw new Error(`Society with ID ${societyId} not found`)
  }

  const ledger = await prisma.ledger.findFirst({
    where: { id: ledgerId, societyId },
  })

  if (!ledger) {
    throw new Error(`Ledger with ID ${ledgerId} not found in society ${societyId}`)
  }

  let financialYearName: string | undefined
  if (financialYearId) {
    const fy = await prisma.financialYear.findUnique({
      where: { id: financialYearId },
      select: { name: true },
    })
    financialYearName = fy?.name
  }

  // 1. Calculate Opening Balance as of startDate
  const initialOpening = new Decimal(ledger.openingBalance ? ledger.openingBalance.toString() : 0)
  let priorDebit = new Decimal(0)
  let priorCredit = new Decimal(0)

  if (ledger.balanceType === BalanceType.DEBIT) {
    priorDebit = initialOpening
  } else {
    priorCredit = initialOpening
  }

  // Add prior transactions before startDate
  if (startDate) {
    const priorEntries = await prisma.ledgerEntry.findMany({
      where: {
        ledgerId,
        journalEntry: {
          societyId,
          status: VoucherStatus.POSTED,
          entryDate: { lt: startDate },
        },
      },
      select: { debit: true, credit: true },
    })

    for (const entry of priorEntries) {
      priorDebit = priorDebit.plus(entry.debit ? entry.debit.toString() : 0)
      priorCredit = priorCredit.plus(entry.credit ? entry.credit.toString() : 0)
    }
  }

  let openingBalance = new Decimal(0)
  let openingBalanceType: BalanceType = ledger.balanceType

  if (priorDebit.greaterThan(priorCredit)) {
    openingBalance = priorDebit.minus(priorCredit)
    openingBalanceType = BalanceType.DEBIT
  } else if (priorCredit.greaterThan(priorDebit)) {
    openingBalance = priorCredit.minus(priorDebit)
    openingBalanceType = BalanceType.CREDIT
  }

  // 2. Fetch Period Transactions
  const dateFilter: { gte?: Date; lte?: Date } = {}
  if (startDate) dateFilter.gte = startDate
  if (endDate) dateFilter.lte = endDate

  const periodEntries = await prisma.ledgerEntry.findMany({
    where: {
      ledgerId,
      journalEntry: {
        societyId,
        status: VoucherStatus.POSTED,
        ...(financialYearId ? { financialYearId } : {}),
        ...(Object.keys(dateFilter).length > 0 ? { entryDate: dateFilter } : {}),
      },
    },
    include: {
      journalEntry: {
        include: {
          entries: {
            include: {
              ledger: {
                select: { name: true },
              },
            },
          },
        },
      },
    },
    orderBy: [
      { journalEntry: { entryDate: "asc" } },
      { journalEntry: { createdAt: "asc" } },
    ],
  })

  // 3. Compute Running Balances
  let currentRunningDebit = openingBalanceType === BalanceType.DEBIT ? openingBalance : new Decimal(0)
  let currentRunningCredit = openingBalanceType === BalanceType.CREDIT ? openingBalance : new Decimal(0)

  let totalPeriodDebit = new Decimal(0)
  let totalPeriodCredit = new Decimal(0)

  const transactions: GeneralLedgerTransaction[] = []

  for (const entry of periodEntries) {
    const d = new Decimal(entry.debit ? entry.debit.toString() : 0)
    const c = new Decimal(entry.credit ? entry.credit.toString() : 0)

    totalPeriodDebit = totalPeriodDebit.plus(d)
    totalPeriodCredit = totalPeriodCredit.plus(c)

    currentRunningDebit = currentRunningDebit.plus(d)
    currentRunningCredit = currentRunningCredit.plus(c)

    let runningBal = new Decimal(0)
    let runningType: BalanceType = ledger.balanceType

    if (currentRunningDebit.greaterThan(currentRunningCredit)) {
      runningBal = currentRunningDebit.minus(currentRunningCredit)
      runningType = BalanceType.DEBIT
    } else if (currentRunningCredit.greaterThan(currentRunningDebit)) {
      runningBal = currentRunningCredit.minus(currentRunningDebit)
      runningType = BalanceType.CREDIT
    }

    // Find other ledgers in the same journal entry (Contra accounts)
    const otherLedgers = entry.journalEntry.entries
      .filter((e) => e.ledgerId !== ledgerId)
      .map((e) => e.ledger.name)

    const contraAccounts = otherLedgers.length > 0 ? otherLedgers.join(", ") : "Self"

    transactions.push({
      entryId: entry.id,
      journalEntryId: entry.journalEntryId,
      entryDate: entry.journalEntry.entryDate.toISOString(),
      voucherNumber: entry.journalEntry.voucherNumber,
      voucherType: entry.journalEntry.voucherType,
      narration: entry.narration || entry.journalEntry.narration,
      contraAccounts,
      debit: d.toFixed(2),
      credit: c.toFixed(2),
      runningBalance: runningBal.toFixed(2),
      runningBalanceType: runningType,
    })
  }

  let finalClosing = new Decimal(0)
  let finalClosingType: BalanceType = ledger.balanceType

  if (currentRunningDebit.greaterThan(currentRunningCredit)) {
    finalClosing = currentRunningDebit.minus(currentRunningCredit)
    finalClosingType = BalanceType.DEBIT
  } else if (currentRunningCredit.greaterThan(currentRunningDebit)) {
    finalClosing = currentRunningCredit.minus(currentRunningDebit)
    finalClosingType = BalanceType.CREDIT
  }

  return {
    societyId,
    societyName: society.name,
    ledgerId: ledger.id,
    ledgerName: ledger.name,
    ledgerCode: ledger.code,
    ledgerGroup: ledger.group,
    normalBalanceType: ledger.balanceType,
    startDate: startDate?.toISOString(),
    endDate: endDate?.toISOString(),
    financialYearName,
    openingBalance: openingBalance.toFixed(2),
    openingBalanceType,
    totalPeriodDebit: totalPeriodDebit.toFixed(2),
    totalPeriodCredit: totalPeriodCredit.toFixed(2),
    closingBalance: finalClosing.toFixed(2),
    closingBalanceType: finalClosingType,
    transactions,
  }
}

// ===========================================================================
// JOURNAL REGISTER (JOURNAL BOOK / DAY BOOK)
// ===========================================================================

export interface JournalVoucherLine {
  id: string
  ledgerId: string
  ledgerName: string
  ledgerCode: string | null
  ledgerGroup: LedgerGroup
  debit: string
  credit: string
  narration: string | null
}

export interface JournalVoucherItem {
  id: string
  voucherNumber: string | null
  voucherType: VoucherType
  status: VoucherStatus
  entryDate: string
  narration: string | null
  reference: string | null
  totalAmount: string
  isBalanced: boolean
  lines: JournalVoucherLine[]
}

export interface JournalRegisterReport {
  societyId: string
  societyName: string
  startDate?: string
  endDate?: string
  financialYearName?: string
  voucherTypeFilter?: VoucherType
  statusFilter?: VoucherStatus
  totalVouchersCount: number
  grandTotalDebit: string
  grandTotalCredit: string
  isBalanced: boolean
  vouchers: JournalVoucherItem[]
}

/**
 * Generates the complete Journal Register (Day Book) for a Housing Society.
 * Supports filtering by voucher type (JOURNAL, RECEIPT, PAYMENT, CONTRA), status, date, or FY.
 */
export async function getJournalRegister(params: {
  societyId: string
  financialYearId?: string
  voucherType?: VoucherType
  status?: VoucherStatus
  startDate?: Date
  endDate?: Date
}): Promise<JournalRegisterReport> {
  const { societyId, financialYearId, voucherType, status, startDate, endDate } = params

  const society = await prisma.society.findUnique({
    where: { id: societyId },
    select: { name: true },
  })

  if (!society) {
    throw new Error(`Society with ID ${societyId} not found`)
  }

  let financialYearName: string | undefined
  if (financialYearId) {
    const fy = await prisma.financialYear.findUnique({
      where: { id: financialYearId },
      select: { name: true },
    })
    financialYearName = fy?.name
  }

  const dateFilter: { gte?: Date; lte?: Date } = {}
  if (startDate) dateFilter.gte = startDate
  if (endDate) dateFilter.lte = endDate

  const journalEntries = await prisma.journalEntry.findMany({
    where: {
      societyId,
      ...(voucherType ? { voucherType } : {}),
      ...(status ? { status } : {}),
      ...(financialYearId ? { financialYearId } : {}),
      ...(Object.keys(dateFilter).length > 0 ? { entryDate: dateFilter } : {}),
    },
    include: {
      entries: {
        include: {
          ledger: {
            select: {
              id: true,
              name: true,
              code: true,
              group: true,
            },
          },
        },
        orderBy: [{ debit: "desc" }, { credit: "desc" }],
      },
    },
    orderBy: [{ entryDate: "asc" }, { createdAt: "asc" }],
  })

  let grandTotalDebit = new Decimal(0)
  let grandTotalCredit = new Decimal(0)

  const vouchers: JournalVoucherItem[] = []

  for (const jv of journalEntries) {
    let voucherDebit = new Decimal(0)
    let voucherCredit = new Decimal(0)

    const lines: JournalVoucherLine[] = jv.entries.map((e) => {
      const d = new Decimal(e.debit ? e.debit.toString() : 0)
      const c = new Decimal(e.credit ? e.credit.toString() : 0)

      voucherDebit = voucherDebit.plus(d)
      voucherCredit = voucherCredit.plus(c)

      return {
        id: e.id,
        ledgerId: e.ledger.id,
        ledgerName: e.ledger.name,
        ledgerCode: e.ledger.code,
        ledgerGroup: e.ledger.group,
        debit: d.toFixed(2),
        credit: c.toFixed(2),
        narration: e.narration,
      }
    })

    grandTotalDebit = grandTotalDebit.plus(voucherDebit)
    grandTotalCredit = grandTotalCredit.plus(voucherCredit)

    const isVoucherBalanced = voucherDebit.minus(voucherCredit).abs().lessThan(0.01)

    vouchers.push({
      id: jv.id,
      voucherNumber: jv.voucherNumber,
      voucherType: jv.voucherType,
      status: jv.status,
      entryDate: jv.entryDate.toISOString(),
      narration: jv.narration,
      reference: jv.reference,
      totalAmount: voucherDebit.toFixed(2),
      isBalanced: isVoucherBalanced,
      lines,
    })
  }

  const isBalanced = grandTotalDebit.minus(grandTotalCredit).abs().lessThan(0.01)

  return {
    societyId,
    societyName: society.name,
    startDate: startDate?.toISOString(),
    endDate: endDate?.toISOString(),
    financialYearName,
    voucherTypeFilter: voucherType,
    statusFilter: status,
    totalVouchersCount: vouchers.length,
    grandTotalDebit: grandTotalDebit.toFixed(2),
    grandTotalCredit: grandTotalCredit.toFixed(2),
    isBalanced,
    vouchers,
  }
}

// ===========================================================================
// CASH BOOK (CASH IN HAND & CLOSING REGISTER)
// ===========================================================================

export interface CashBookEntry {
  id: string
  entryDate: string
  voucherNumber: string | null
  voucherType: VoucherType
  particulars: string // Opposite / Contra account
  narration: string | null
  receiptAmount: string // Cash Inflow (Dr)
  paymentAmount: string // Cash Outflow (Cr)
  runningCashBalance: string
}

export interface CashDenominationSnapshot {
  id: string
  closingDate: string
  calculatedBalance: string
  actualPhysicalCash: string
  difference: string
  note500: number
  note200: number
  note100: number
  note50: number
  note20: number
  note10: number
  coins: string
  verifiedBy: string | null
  notes: string | null
}

export interface CashBookReport {
  societyId: string
  societyName: string
  accountName: string
  startDate?: string
  endDate?: string
  financialYearName?: string
  openingCashBalance: string
  totalCashReceipts: string
  totalCashPayments: string
  closingCashBalance: string
  entries: CashBookEntry[]
  closingLogs: CashDenominationSnapshot[]
}

/**
 * Generates the complete Cash Book for a Housing Society.
 * Tracks cash receipts, cash expenses, bank withdrawals/deposits (contra),
 * and physical cash closing denomination counts.
 */
export async function getCashBook(params: {
  societyId: string
  accountId?: string
  financialYearId?: string
  startDate?: Date
  endDate?: Date
}): Promise<CashBookReport> {
  const { societyId, accountId, financialYearId, startDate, endDate } = params

  const society = await prisma.society.findUnique({
    where: { id: societyId },
    select: { name: true },
  })

  if (!society) {
    throw new Error(`Society with ID ${societyId} not found`)
  }

  // Find the society Cash account
  const cashAccount = accountId
    ? await prisma.account.findFirst({ where: { id: accountId, societyId } })
    : await prisma.account.findFirst({
        where: {
          societyId,
          accountType: AccountType.CASH,
          isActive: true,
        },
      }) ||
      await prisma.account.findFirst({
        where: {
          societyId,
          isActive: true,
        },
      })

  if (!cashAccount) {
    throw new Error(`No cash account found for society ${societyId}`)
  }

  // Find corresponding Cash in Hand ledger
  const cashLedger = await prisma.ledger.findFirst({
    where: {
      societyId,
      OR: [
        { code: "1110" },
        { name: { contains: "Cash in Hand", mode: "insensitive" } },
        { name: { contains: cashAccount.name, mode: "insensitive" } },
      ],
    },
  }) ||
  await prisma.ledger.findFirst({
    where: {
      societyId,
      group: LedgerGroup.ASSET,
    },
  })

  let financialYearName: string | undefined
  if (financialYearId) {
    const fy = await prisma.financialYear.findUnique({
      where: { id: financialYearId },
      select: { name: true },
    })
    financialYearName = fy?.name
  }

  const initialOpening = new Decimal(cashAccount.openingBalance ? cashAccount.openingBalance.toString() : 0)
  let priorReceipts = new Decimal(0)
  let priorPayments = new Decimal(0)

  // Add prior transactions if startDate is provided
  if (startDate && cashLedger) {
    const priorEntries = await prisma.ledgerEntry.findMany({
      where: {
        ledgerId: cashLedger.id,
        journalEntry: {
          societyId,
          status: VoucherStatus.POSTED,
          entryDate: { lt: startDate },
        },
      },
      select: { debit: true, credit: true },
    })

    for (const pe of priorEntries) {
      priorReceipts = priorReceipts.plus(pe.debit ? pe.debit.toString() : 0)
      priorPayments = priorPayments.plus(pe.credit ? pe.credit.toString() : 0)
    }
  }

  const openingCashBalance = initialOpening.plus(priorReceipts).minus(priorPayments)

  // Fetch period entries
  const dateFilter: { gte?: Date; lte?: Date } = {}
  if (startDate) dateFilter.gte = startDate
  if (endDate) dateFilter.lte = endDate

  const periodEntries = cashLedger
    ? await prisma.ledgerEntry.findMany({
        where: {
          ledgerId: cashLedger.id,
          journalEntry: {
            societyId,
            status: VoucherStatus.POSTED,
            ...(financialYearId ? { financialYearId } : {}),
            ...(Object.keys(dateFilter).length > 0 ? { entryDate: dateFilter } : {}),
          },
        },
        include: {
          journalEntry: {
            include: {
              entries: {
                include: {
                  ledger: { select: { name: true } },
                },
              },
            },
          },
        },
        orderBy: [
          { journalEntry: { entryDate: "asc" } },
          { journalEntry: { createdAt: "asc" } },
        ],
      })
    : []

  let runningCash = openingCashBalance
  let totalReceipts = new Decimal(0)
  let totalPayments = new Decimal(0)

  const entries: CashBookEntry[] = []

  for (const entry of periodEntries) {
    const r = new Decimal(entry.debit ? entry.debit.toString() : 0)
    const p = new Decimal(entry.credit ? entry.credit.toString() : 0)

    totalReceipts = totalReceipts.plus(r)
    totalPayments = totalPayments.plus(p)
    runningCash = runningCash.plus(r).minus(p)

    const otherLedgers = entry.journalEntry.entries
      .filter((e) => e.ledgerId !== cashLedger?.id)
      .map((e) => e.ledger.name)

    const particulars = otherLedgers.length > 0 ? otherLedgers.join(", ") : "Self / Sundry"

    entries.push({
      id: entry.id,
      entryDate: entry.journalEntry.entryDate.toISOString(),
      voucherNumber: entry.journalEntry.voucherNumber,
      voucherType: entry.journalEntry.voucherType,
      particulars,
      narration: entry.narration || entry.journalEntry.narration,
      receiptAmount: r.toFixed(2),
      paymentAmount: p.toFixed(2),
      runningCashBalance: runningCash.toFixed(2),
    })
  }

  // Fetch physical denomination closing logs
  const closingLogsData = await prisma.cashClosingLog.findMany({
    where: {
      societyId,
      accountId: cashAccount.id,
      ...(Object.keys(dateFilter).length > 0 ? { closingDate: dateFilter } : {}),
    },
    orderBy: { closingDate: "desc" },
  })

  const closingLogs: CashDenominationSnapshot[] = closingLogsData.map((log) => ({
    id: log.id,
    closingDate: log.closingDate.toISOString(),
    calculatedBalance: new Decimal(log.calculatedBalance.toString()).toFixed(2),
    actualPhysicalCash: new Decimal(log.actualPhysicalCash.toString()).toFixed(2),
    difference: new Decimal(log.difference.toString()).toFixed(2),
    note500: log.note500,
    note200: log.note200,
    note100: log.note100,
    note50: log.note50,
    note20: log.note20,
    note10: log.note10,
    coins: new Decimal(log.coins.toString()).toFixed(2),
    verifiedBy: log.verifiedBy,
    notes: log.notes,
  }))

  return {
    societyId,
    societyName: society.name,
    accountName: cashAccount.name,
    startDate: startDate?.toISOString(),
    endDate: endDate?.toISOString(),
    financialYearName,
    openingCashBalance: openingCashBalance.toFixed(2),
    totalCashReceipts: totalReceipts.toFixed(2),
    totalCashPayments: totalPayments.toFixed(2),
    closingCashBalance: runningCash.toFixed(2),
    entries,
    closingLogs,
  }
}

// ===========================================================================
// BANK BOOK (BANK PASSBOOK & TRANSACTION REGISTER)
// ===========================================================================

export interface BankBookEntry {
  id: string
  entryDate: string
  voucherNumber: string | null
  voucherType: VoucherType
  particulars: string // Opposite / Contra account
  narration: string | null
  reference: string | null // Cheque number / UTR / Transaction ID
  depositAmount: string // Bank Deposit / Inflow (Dr)
  withdrawalAmount: string // Bank Withdrawal / Outflow (Cr)
  runningBankBalance: string
}

export interface BankBookReport {
  societyId: string
  societyName: string
  accountId: string
  accountName: string
  bankName: string | null
  accountNumber: string | null
  accountType: AccountType
  startDate?: string
  endDate?: string
  financialYearName?: string
  openingBankBalance: string
  totalDeposits: string
  totalWithdrawals: string
  closingBankBalance: string
  entries: BankBookEntry[]
}

/**
 * Generates the complete Bank Book for a Housing Society's bank account.
 * Tracks bank deposits, online collections, vendor payments, and running balances.
 */
export async function getBankBook(params: {
  societyId: string
  accountId?: string
  financialYearId?: string
  startDate?: Date
  endDate?: Date
}): Promise<BankBookReport> {
  const { societyId, accountId, financialYearId, startDate, endDate } = params

  const society = await prisma.society.findUnique({
    where: { id: societyId },
    select: { name: true },
  })

  if (!society) {
    throw new Error(`Society with ID ${societyId} not found`)
  }

  // Find designated bank account
  const bankAccount = accountId
    ? await prisma.account.findFirst({ where: { id: accountId, societyId } })
    : await prisma.account.findFirst({
        where: {
          societyId,
          accountType: AccountType.BANK,
          isActive: true,
        },
      }) ||
      await prisma.account.findFirst({
        where: {
          societyId,
          isActive: true,
        },
      })

  if (!bankAccount) {
    throw new Error(`No bank account found for society ${societyId}`)
  }

  // Find corresponding Bank General Ledger account
  const bankLedger = await prisma.ledger.findFirst({
    where: {
      societyId,
      OR: [
        { code: "1130" },
        { code: "1140" },
        { name: { contains: bankAccount.name, mode: "insensitive" } },
        { name: { contains: "Bank", mode: "insensitive" } },
      ],
    },
  }) ||
  await prisma.ledger.findFirst({
    where: {
      societyId,
      group: LedgerGroup.ASSET,
    },
  })

  let financialYearName: string | undefined
  if (financialYearId) {
    const fy = await prisma.financialYear.findUnique({
      where: { id: financialYearId },
      select: { name: true },
    })
    financialYearName = fy?.name
  }

  const initialOpening = new Decimal(bankAccount.openingBalance ? bankAccount.openingBalance.toString() : 0)
  let priorDeposits = new Decimal(0)
  let priorWithdrawals = new Decimal(0)

  // Add prior transactions before startDate
  if (startDate && bankLedger) {
    const priorEntries = await prisma.ledgerEntry.findMany({
      where: {
        ledgerId: bankLedger.id,
        journalEntry: {
          societyId,
          status: VoucherStatus.POSTED,
          entryDate: { lt: startDate },
        },
      },
      select: { debit: true, credit: true },
    })

    for (const pe of priorEntries) {
      priorDeposits = priorDeposits.plus(pe.debit ? pe.debit.toString() : 0)
      priorWithdrawals = priorWithdrawals.plus(pe.credit ? pe.credit.toString() : 0)
    }
  }

  const openingBankBalance = initialOpening.plus(priorDeposits).minus(priorWithdrawals)

  // Fetch period entries
  const dateFilter: { gte?: Date; lte?: Date } = {}
  if (startDate) dateFilter.gte = startDate
  if (endDate) dateFilter.lte = endDate

  const periodEntries = bankLedger
    ? await prisma.ledgerEntry.findMany({
        where: {
          ledgerId: bankLedger.id,
          journalEntry: {
            societyId,
            status: VoucherStatus.POSTED,
            ...(financialYearId ? { financialYearId } : {}),
            ...(Object.keys(dateFilter).length > 0 ? { entryDate: dateFilter } : {}),
          },
        },
        include: {
          journalEntry: {
            include: {
              entries: {
                include: {
                  ledger: { select: { name: true } },
                },
              },
            },
          },
        },
        orderBy: [
          { journalEntry: { entryDate: "asc" } },
          { journalEntry: { createdAt: "asc" } },
        ],
      })
    : []

  let runningBank = openingBankBalance
  let totalDeposits = new Decimal(0)
  let totalWithdrawals = new Decimal(0)

  const entries: BankBookEntry[] = []

  for (const entry of periodEntries) {
    const dep = new Decimal(entry.debit ? entry.debit.toString() : 0)
    const wth = new Decimal(entry.credit ? entry.credit.toString() : 0)

    totalDeposits = totalDeposits.plus(dep)
    totalWithdrawals = totalWithdrawals.plus(wth)
    runningBank = runningBank.plus(dep).minus(wth)

    const otherLedgers = entry.journalEntry.entries
      .filter((e) => e.ledgerId !== bankLedger?.id)
      .map((e) => e.ledger.name)

    const particulars = otherLedgers.length > 0 ? otherLedgers.join(", ") : "Self / Sundry"

    entries.push({
      id: entry.id,
      entryDate: entry.journalEntry.entryDate.toISOString(),
      voucherNumber: entry.journalEntry.voucherNumber,
      voucherType: entry.journalEntry.voucherType,
      particulars,
      narration: entry.narration || entry.journalEntry.narration,
      reference: entry.journalEntry.reference,
      depositAmount: dep.toFixed(2),
      withdrawalAmount: wth.toFixed(2),
      runningBankBalance: runningBank.toFixed(2),
    })
  }

  return {
    societyId,
    societyName: society.name,
    accountId: bankAccount.id,
    accountName: bankAccount.name,
    bankName: bankAccount.bankName,
    accountNumber: bankAccount.accountNumber,
    accountType: bankAccount.accountType,
    startDate: startDate?.toISOString(),
    endDate: endDate?.toISOString(),
    financialYearName,
    openingBankBalance: openingBankBalance.toFixed(2),
    totalDeposits: totalDeposits.toFixed(2),
    totalWithdrawals: totalWithdrawals.toFixed(2),
    closingBankBalance: runningBank.toFixed(2),
    entries,
  }
}

// ===========================================================================
// MEMBER MAINTENANCE & DUES REGISTER (COLLECTIONS & DEFAULTERS)
// ===========================================================================

export type DefaulterCategory =
  | "CLEAR"
  | "ADVANCE_PAID"
  | "CURRENT_DUE"
  | "DEFAULTER_30_DAYS"
  | "DEFAULTER_60_DAYS"
  | "CRITICAL_90_PLUS_DAYS"

export interface MemberDuesRow {
  flatId: string
  flatNumber: string
  blockName: string
  unitType: string | null
  areaSqft: string | null
  ownerName: string
  ownerPhone: string | null
  ownerEmail: string | null
  occupancyStatus: string

  openingArrears: string
  billedDemands: string
  lateFeesAssessed: string
  collectionsReceived: string
  closingOutstanding: string // > 0 is Dues, < 0 is Advance

  defaulterCategory: DefaulterCategory
  overdueDays: number
  oldestUnpaidBillDate: string | null
}

export interface MemberDuesRegisterReport {
  societyId: string
  societyName: string
  asOfDate: string
  startDate?: string
  endDate?: string
  blockFilter?: string

  totalFlatsCount: number
  defaultersCount: number
  clearFlatsCount: number
  advanceCount: number
  collectionEfficiencyRate: string // Collections / (Opening + Billed) %

  grandOpeningArrears: string
  grandBilledDemands: string
  grandCollectionsReceived: string
  grandClosingOutstanding: string
  grandAdvanceHeld: string

  rows: MemberDuesRow[]
}

/**
 * Generates the complete Member Maintenance & Dues Register for a Housing Society.
 * Tracks per-flat opening arrears, billing demands, collections, closing balance,
 * aging analysis, and defaulter categorization.
 */
export async function getMemberDuesRegister(params: {
  societyId: string
  blockId?: string
  startDate?: Date
  endDate?: Date
  onlyDefaulters?: boolean
}): Promise<MemberDuesRegisterReport> {
  const { societyId, blockId, startDate, endDate, onlyDefaulters } = params
  const asOf = endDate || new Date()

  const society = await prisma.society.findUnique({
    where: { id: societyId },
    select: { name: true },
  })

  if (!society) {
    throw new Error(`Society with ID ${societyId} not found`)
  }

  // Fetch all flats for the society
  const flats = await prisma.flat.findMany({
    where: {
      block: { societyId },
      ...(blockId ? { blockId } : {}),
      isActive: true,
    },
    include: {
      block: { select: { name: true } },
      people: {
        where: { isPrimary: true },
        include: {
          person: {
            select: {
              name: true,
              phone: true,
              email: true,
            },
          },
        },
      },
      bills: {
        where: {
          createdAt: { lte: asOf },
        },
        include: {
          payments: {
            where: {
              status: "SUCCESS",
              paidOn: { lte: asOf },
            },
          },
        },
        orderBy: { dueDate: "asc" },
      },
    },
    orderBy: [{ block: { name: "asc" } }, { number: "asc" }],
  })

  let grandOpeningArrears = new Decimal(0)
  let grandBilledDemands = new Decimal(0)
  let grandCollections = new Decimal(0)
  let grandClosingOutstanding = new Decimal(0)
  let grandAdvanceHeld = new Decimal(0)

  let defaultersCount = 0
  let clearCount = 0
  let advanceCount = 0

  const rows: MemberDuesRow[] = []

  for (const flat of flats) {
    const primaryPerson = flat.people[0]?.person
    const ownerName = primaryPerson?.name || "Unregistered Owner"
    const ownerPhone = primaryPerson?.phone || null
    const ownerEmail = primaryPerson?.email || null

    let priorBilled = new Decimal(0)
    let priorCollected = new Decimal(0)
    let currentBilled = new Decimal(0)
    let currentCollected = new Decimal(0)
    let oldestUnpaidDueDate: Date | null = null

    for (const bill of flat.bills) {
      const bAmount = new Decimal(bill.amount ? bill.amount.toString() : 0)
        .plus(bill.lateFeeAmount ? bill.lateFeeAmount.toString() : 0)
        .minus(bill.discountAmount ? bill.discountAmount.toString() : 0)

      const isPrior = startDate ? bill.createdAt < startDate : false

      if (isPrior) {
        priorBilled = priorBilled.plus(bAmount)
      } else {
        currentBilled = currentBilled.plus(bAmount)
      }

      if (bill.status !== "PAID" && !oldestUnpaidDueDate) {
        oldestUnpaidDueDate = bill.dueDate
      }

      for (const pmt of bill.payments) {
        const pAmount = new Decimal(pmt.amount ? pmt.amount.toString() : 0)
        const isPaymentPrior = startDate ? pmt.paidOn < startDate : false

        if (isPaymentPrior) {
          priorCollected = priorCollected.plus(pAmount)
        } else {
          currentCollected = currentCollected.plus(pAmount)
        }
      }
    }

    const openingArrears = priorBilled.minus(priorCollected)
    const closingOutstanding = openingArrears.plus(currentBilled).minus(currentCollected)

    // Defaulter categorization and overdue aging
    let defaulterCategory: DefaulterCategory = "CLEAR"
    let overdueDays = 0

    if (closingOutstanding.greaterThan(0)) {
      defaultersCount++
      grandClosingOutstanding = grandClosingOutstanding.plus(closingOutstanding)

      if (oldestUnpaidDueDate) {
        const diffMs = asOf.getTime() - oldestUnpaidDueDate.getTime()
        overdueDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
      }

      if (overdueDays > 90) {
        defaulterCategory = "CRITICAL_90_PLUS_DAYS"
      } else if (overdueDays > 60) {
        defaulterCategory = "DEFAULTER_60_DAYS"
      } else if (overdueDays > 30) {
        defaulterCategory = "DEFAULTER_30_DAYS"
      } else {
        defaulterCategory = "CURRENT_DUE"
      }
    } else if (closingOutstanding.lessThan(0)) {
      advanceCount++
      defaulterCategory = "ADVANCE_PAID"
      grandAdvanceHeld = grandAdvanceHeld.plus(closingOutstanding.abs())
    } else {
      clearCount++
      defaulterCategory = "CLEAR"
    }

    grandOpeningArrears = grandOpeningArrears.plus(openingArrears.greaterThan(0) ? openingArrears : 0)
    grandBilledDemands = grandBilledDemands.plus(currentBilled)
    grandCollections = grandCollections.plus(currentCollected)

    if (onlyDefaulters && closingOutstanding.lessThanOrEqualTo(0)) {
      continue
    }

    rows.push({
      flatId: flat.id,
      flatNumber: flat.number,
      blockName: flat.block.name,
      unitType: flat.unitType,
      areaSqft: flat.area ? flat.area.toString() : null,
      ownerName,
      ownerPhone,
      ownerEmail,
      occupancyStatus: flat.status,
      openingArrears: openingArrears.toFixed(2),
      billedDemands: currentBilled.toFixed(2),
      lateFeesAssessed: "0.00",
      collectionsReceived: currentCollected.toFixed(2),
      closingOutstanding: closingOutstanding.toFixed(2),
      defaulterCategory,
      overdueDays,
      oldestUnpaidBillDate: oldestUnpaidDueDate?.toISOString() || null,
    })
  }

  const totalDemand = grandOpeningArrears.plus(grandBilledDemands)
  const collectionEfficiency = totalDemand.greaterThan(0)
    ? grandCollections.dividedBy(totalDemand).times(100).toFixed(2)
    : "100.00"

  return {
    societyId,
    societyName: society.name,
    asOfDate: asOf.toISOString(),
    startDate: startDate?.toISOString(),
    endDate: endDate?.toISOString(),
    blockFilter: blockId,
    totalFlatsCount: flats.length,
    defaultersCount,
    clearFlatsCount: clearCount,
    advanceCount,
    collectionEfficiencyRate: `${collectionEfficiency}%`,
    grandOpeningArrears: grandOpeningArrears.toFixed(2),
    grandBilledDemands: grandBilledDemands.toFixed(2),
    grandCollectionsReceived: grandCollections.toFixed(2),
    grandClosingOutstanding: grandClosingOutstanding.toFixed(2),
    grandAdvanceHeld: grandAdvanceHeld.toFixed(2),
    rows,
  }
}

// ===========================================================================
// BUDGET REGISTER (BUDGET VS ACTUAL VARIANCE REPORT)
// ===========================================================================

export type BudgetVarianceStatus =
  | "WITHIN_BUDGET"
  | "APPROACHING_LIMIT"
  | "EXCEEDED_BUDGET"

export interface BudgetItemVarianceRow {
  budgetItemId: string
  ledgerId: string
  ledgerCode: string | null
  ledgerName: string
  ledgerGroup: LedgerGroup
  allocatedAmount: string
  actualUtilizedAmount: string
  remainingBalance: string
  utilizationRate: string // e.g. "76.45%"
  varianceStatus: BudgetVarianceStatus
}

export interface BudgetRegisterReport {
  societyId: string
  societyName: string
  budgetId: string
  budgetName: string
  financialYearName: string
  financialYearStartDate: string
  financialYearEndDate: string

  totalAllocatedBudget: string
  totalActualUtilized: string
  totalRemainingBalance: string
  overallUtilizationRate: string // e.g. "82.10%"
  overBudgetItemCount: number

  items: BudgetItemVarianceRow[]
}

/**
 * Generates the Budget Register & Variance Analysis Report for a Housing Society.
 * Compares AGM-approved budget allocations against actual posted ledger expenses.
 */
export async function getBudgetRegister(params: {
  societyId: string
  budgetId?: string
  financialYearId?: string
}): Promise<BudgetRegisterReport> {
  const { societyId, budgetId, financialYearId } = params

  const society = await prisma.society.findUnique({
    where: { id: societyId },
    select: { name: true },
  })

  if (!society) {
    throw new Error(`Society with ID ${societyId} not found`)
  }

  // Find targeted budget
  const budget = budgetId
    ? await prisma.budget.findFirst({
        where: { id: budgetId, societyId },
        include: {
          financialYear: true,
          items: {
            include: {
              ledger: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  group: true,
                },
              },
            },
          },
        },
      })
    : await prisma.budget.findFirst({
        where: {
          societyId,
          ...(financialYearId ? { financialYearId } : {}),
        },
        orderBy: { createdAt: "desc" },
        include: {
          financialYear: true,
          items: {
            include: {
              ledger: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  group: true,
                },
              },
            },
          },
        },
      })

  if (!budget) {
    throw new Error(`No budget found for society ${societyId}`)
  }

  const fyStartDate = budget.financialYear.startDate
  const fyEndDate = budget.financialYear.endDate

  let grandAllocated = new Decimal(0)
  let grandUtilized = new Decimal(0)
  let overBudgetCount = 0

  const items: BudgetItemVarianceRow[] = []

  for (const item of budget.items) {
    const allocated = new Decimal(item.allocatedAmount ? item.allocatedAmount.toString() : 0)
    grandAllocated = grandAllocated.plus(allocated)

    // Calculate actual posted expenses for this ledger during the FY
    const entries = await prisma.ledgerEntry.findMany({
      where: {
        ledgerId: item.ledgerId,
        journalEntry: {
          societyId,
          status: VoucherStatus.POSTED,
          entryDate: {
            gte: fyStartDate,
            lte: fyEndDate,
          },
        },
      },
      select: { debit: true, credit: true },
    })

    let actualExpenses = new Decimal(0)
    for (const e of entries) {
      const d = new Decimal(e.debit ? e.debit.toString() : 0)
      const c = new Decimal(e.credit ? e.credit.toString() : 0)
      actualExpenses = actualExpenses.plus(d).minus(c)
    }

    grandUtilized = grandUtilized.plus(actualExpenses)

    const remaining = allocated.minus(actualExpenses)
    const utilizationRateVal = allocated.greaterThan(0)
      ? actualExpenses.dividedBy(allocated).times(100)
      : new Decimal(0)

    let varianceStatus: BudgetVarianceStatus = "WITHIN_BUDGET"
    if (actualExpenses.greaterThan(allocated)) {
      varianceStatus = "EXCEEDED_BUDGET"
      overBudgetCount++
    } else if (utilizationRateVal.greaterThanOrEqualTo(85)) {
      varianceStatus = "APPROACHING_LIMIT"
    }

    items.push({
      budgetItemId: item.id,
      ledgerId: item.ledgerId,
      ledgerCode: item.ledger.code,
      ledgerName: item.ledger.name,
      ledgerGroup: item.ledger.group,
      allocatedAmount: allocated.toFixed(2),
      actualUtilizedAmount: actualExpenses.toFixed(2),
      remainingBalance: remaining.toFixed(2),
      utilizationRate: `${utilizationRateVal.toFixed(2)}%`,
      varianceStatus,
    })
  }

  const grandRemaining = grandAllocated.minus(grandUtilized)
  const overallRate = grandAllocated.greaterThan(0)
    ? grandUtilized.dividedBy(grandAllocated).times(100).toFixed(2)
    : "0.00"

  return {
    societyId,
    societyName: society.name,
    budgetId: budget.id,
    budgetName: budget.name,
    financialYearName: budget.financialYear.name,
    financialYearStartDate: fyStartDate.toISOString(),
    financialYearEndDate: fyEndDate.toISOString(),
    totalAllocatedBudget: grandAllocated.toFixed(2),
    totalActualUtilized: grandUtilized.toFixed(2),
    totalRemainingBalance: grandRemaining.toFixed(2),
    overallUtilizationRate: `${overallRate}%`,
    overBudgetItemCount: overBudgetCount,
    items,
  }
}

// ===========================================================================
// INCOME & EXPENDITURE ACCOUNT (STATUTORY P&L STATEMENT)
// ===========================================================================

export interface IncomeExpenditureLine {
  ledgerId: string
  ledgerCode: string | null
  ledgerName: string
  parentLedgerId: string | null
  amount: string
}

export interface IncomeExpenditureReport {
  societyId: string
  societyName: string
  startDate?: string
  endDate?: string
  financialYearName?: string

  totalIncome: string
  totalExpenditure: string

  netResult: string
  resultType: "SURPLUS" | "DEFICIT" // SURPLUS = Excess of Income over Expenditure, DEFICIT = Excess of Expenditure over Income

  incomeItems: IncomeExpenditureLine[]
  expenditureItems: IncomeExpenditureLine[]
}

/**
 * Generates the statutory Income & Expenditure Account for a Housing Society.
 * Calculates operational revenues vs expenditures and net Surplus / Deficit.
 */
export async function getIncomeExpenditureAccount(params: {
  societyId: string
  financialYearId?: string
  startDate?: Date
  endDate?: Date
}): Promise<IncomeExpenditureReport> {
  const { societyId, financialYearId, startDate, endDate } = params

  const society = await prisma.society.findUnique({
    where: { id: societyId },
    select: { name: true },
  })

  if (!society) {
    throw new Error(`Society with ID ${societyId} not found`)
  }

  let financialYearName: string | undefined
  if (financialYearId) {
    const fy = await prisma.financialYear.findUnique({
      where: { id: financialYearId },
      select: { name: true },
    })
    financialYearName = fy?.name
  }

  const dateFilter: { gte?: Date; lte?: Date } = {}
  if (startDate) dateFilter.gte = startDate
  if (endDate) dateFilter.lte = endDate

  // Fetch all Income & Expense ledgers for the society
  const ledgers = await prisma.ledger.findMany({
    where: {
      societyId,
      group: { in: [LedgerGroup.INCOME, LedgerGroup.EXPENSE] },
      isActive: true,
    },
    orderBy: [{ code: "asc" }, { name: "asc" }],
  })

  // Fetch all posted transactions in the period for these ledgers
  const entries = await prisma.ledgerEntry.findMany({
    where: {
      ledger: {
        societyId,
        group: { in: [LedgerGroup.INCOME, LedgerGroup.EXPENSE] },
      },
      journalEntry: {
        societyId,
        status: VoucherStatus.POSTED,
        ...(financialYearId ? { financialYearId } : {}),
        ...(Object.keys(dateFilter).length > 0 ? { entryDate: dateFilter } : {}),
      },
    },
    select: {
      ledgerId: true,
      debit: true,
      credit: true,
    },
  })

  const activityMap = new Map<string, { debitTotal: Decimal; creditTotal: Decimal }>()
  for (const entry of entries) {
    const current = activityMap.get(entry.ledgerId) || {
      debitTotal: new Decimal(0),
      creditTotal: new Decimal(0),
    }
    current.debitTotal = current.debitTotal.plus(entry.debit ? entry.debit.toString() : 0)
    current.creditTotal = current.creditTotal.plus(entry.credit ? entry.credit.toString() : 0)
    activityMap.set(entry.ledgerId, current)
  }

  let totalIncome = new Decimal(0)
  let totalExpenditure = new Decimal(0)

  const incomeItems: IncomeExpenditureLine[] = []
  const expenditureItems: IncomeExpenditureLine[] = []

  for (const ledger of ledgers) {
    const activity = activityMap.get(ledger.id) || {
      debitTotal: new Decimal(0),
      creditTotal: new Decimal(0),
    }

    if (ledger.group === LedgerGroup.INCOME) {
      // Income = Credits - Debits
      const netIncome = activity.creditTotal.minus(activity.debitTotal)
      if (!netIncome.isZero()) {
        totalIncome = totalIncome.plus(netIncome)
        incomeItems.push({
          ledgerId: ledger.id,
          ledgerCode: ledger.code,
          ledgerName: ledger.name,
          parentLedgerId: ledger.parentLedgerId,
          amount: netIncome.toFixed(2),
        })
      }
    } else if (ledger.group === LedgerGroup.EXPENSE) {
      // Expense = Debits - Credits
      const netExpense = activity.debitTotal.minus(activity.creditTotal)
      if (!netExpense.isZero()) {
        totalExpenditure = totalExpenditure.plus(netExpense)
        expenditureItems.push({
          ledgerId: ledger.id,
          ledgerCode: ledger.code,
          ledgerName: ledger.name,
          parentLedgerId: ledger.parentLedgerId,
          amount: netExpense.toFixed(2),
        })
      }
    }
  }

  const netDiff = totalIncome.minus(totalExpenditure)
  const resultType: "SURPLUS" | "DEFICIT" = netDiff.greaterThanOrEqualTo(0) ? "SURPLUS" : "DEFICIT"

  return {
    societyId,
    societyName: society.name,
    startDate: startDate?.toISOString(),
    endDate: endDate?.toISOString(),
    financialYearName,
    totalIncome: totalIncome.toFixed(2),
    totalExpenditure: totalExpenditure.toFixed(2),
    netResult: netDiff.abs().toFixed(2),
    resultType,
    incomeItems,
    expenditureItems,
  }
}

// ===========================================================================
// BALANCE SHEET (STATEMENT OF FINANCIAL POSITION)
// ===========================================================================

export interface BalanceSheetLine {
  ledgerId: string
  ledgerCode: string | null
  ledgerName: string
  parentLedgerId: string | null
  amount: string
}

export interface BalanceSheetSection {
  title: string
  totalAmount: string
  items: BalanceSheetLine[]
}

export interface BalanceSheetReport {
  societyId: string
  societyName: string
  asOfDate: string
  financialYearName?: string

  // Assets (Right Side / Application of Funds)
  totalAssets: string
  fixedAssets: BalanceSheetSection
  investmentsAndDeposits: BalanceSheetSection
  currentAssets: BalanceSheetSection

  // Liabilities & Capital Funds (Left Side / Source of Funds)
  totalLiabilitiesAndFunds: string
  capitalAndReserves: BalanceSheetSection
  currentPeriodSurplus: string // Surplus (+ve) or Deficit (-ve) from I&E
  currentPeriodResultType: "SURPLUS" | "DEFICIT"
  currentLiabilities: BalanceSheetSection

  // Double-Entry Balance Verification
  difference: string
  isBalanced: boolean
}

/**
 * Generates the statutory Balance Sheet for a Housing Society.
 * Total Assets = Total Capital Funds + Current Period Surplus/Deficit + Total Liabilities.
 */
export async function getBalanceSheet(params: {
  societyId: string
  financialYearId?: string
  asOfDate?: Date
}): Promise<BalanceSheetReport> {
  const { societyId, financialYearId } = params
  const asOf = params.asOfDate || new Date()

  const society = await prisma.society.findUnique({
    where: { id: societyId },
    select: { name: true },
  })

  if (!society) {
    throw new Error(`Society with ID ${societyId} not found`)
  }

  let financialYearName: string | undefined
  let fyStartDate: Date | undefined
  if (financialYearId) {
    const fy = await prisma.financialYear.findUnique({
      where: { id: financialYearId },
      select: { name: true, startDate: true },
    })
    financialYearName = fy?.name
    fyStartDate = fy?.startDate
  }

  // 1. Calculate Current Period Surplus / Deficit from Income & Expenditure
  const ieReport = await getIncomeExpenditureAccount({
    societyId,
    financialYearId,
    startDate: fyStartDate,
    endDate: asOf,
  })

  const currentPeriodSurplusVal = new Decimal(ieReport.netResult)
  const currentPeriodSigned = ieReport.resultType === "SURPLUS"
    ? currentPeriodSurplusVal
    : currentPeriodSurplusVal.negated()

  // 2. Fetch Balance Sheet Ledgers (ASSET, LIABILITY, EQUITY)
  const ledgers = await prisma.ledger.findMany({
    where: {
      societyId,
      group: { in: [LedgerGroup.ASSET, LedgerGroup.LIABILITY, LedgerGroup.EQUITY] },
      isActive: true,
    },
    orderBy: [{ code: "asc" }, { name: "asc" }],
  })

  // Fetch all posted entries up to asOf
  const entries = await prisma.ledgerEntry.findMany({
    where: {
      ledger: {
        societyId,
        group: { in: [LedgerGroup.ASSET, LedgerGroup.LIABILITY, LedgerGroup.EQUITY] },
      },
      journalEntry: {
        societyId,
        status: VoucherStatus.POSTED,
        entryDate: { lte: asOf },
      },
    },
    select: {
      ledgerId: true,
      debit: true,
      credit: true,
    },
  })

  const activityMap = new Map<string, { debitTotal: Decimal; creditTotal: Decimal }>()
  for (const entry of entries) {
    const current = activityMap.get(entry.ledgerId) || {
      debitTotal: new Decimal(0),
      creditTotal: new Decimal(0),
    }
    current.debitTotal = current.debitTotal.plus(entry.debit ? entry.debit.toString() : 0)
    current.creditTotal = current.creditTotal.plus(entry.credit ? entry.credit.toString() : 0)
    activityMap.set(entry.ledgerId, current)
  }

  // Group items into Balance Sheet sections
  const fixedAssetsItems: BalanceSheetLine[] = []
  let fixedAssetsTotal = new Decimal(0)

  const investDepositsItems: BalanceSheetLine[] = []
  let investDepositsTotal = new Decimal(0)

  const currentAssetsItems: BalanceSheetLine[] = []
  let currentAssetsTotal = new Decimal(0)

  const capitalReservesItems: BalanceSheetLine[] = []
  let capitalReservesTotal = new Decimal(0)

  const currentLiabilitiesItems: BalanceSheetLine[] = []
  let currentLiabilitiesTotal = new Decimal(0)

  for (const ledger of ledgers) {
    const opening = new Decimal(ledger.openingBalance ? ledger.openingBalance.toString() : 0)
    const activity = activityMap.get(ledger.id) || {
      debitTotal: new Decimal(0),
      creditTotal: new Decimal(0),
    }

    if (ledger.group === LedgerGroup.ASSET) {
      // Net Asset = Opening Dr + Debits - Credits
      const netAsset = (ledger.balanceType === BalanceType.DEBIT ? opening : opening.negated())
        .plus(activity.debitTotal)
        .minus(activity.creditTotal)

      if (!netAsset.isZero()) {
        const line: BalanceSheetLine = {
          ledgerId: ledger.id,
          ledgerCode: ledger.code,
          ledgerName: ledger.name,
          parentLedgerId: ledger.parentLedgerId,
          amount: netAsset.toFixed(2),
        }

        const codeNum = parseInt(ledger.code || "0", 10)
        if (codeNum >= 1500 && codeNum < 1600) {
          fixedAssetsItems.push(line)
          fixedAssetsTotal = fixedAssetsTotal.plus(netAsset)
        } else if (codeNum >= 1300 && codeNum < 1500) {
          investDepositsItems.push(line)
          investDepositsTotal = investDepositsTotal.plus(netAsset)
        } else {
          currentAssetsItems.push(line)
          currentAssetsTotal = currentAssetsTotal.plus(netAsset)
        }
      }
    } else if (ledger.group === LedgerGroup.EQUITY) {
      // Net Equity / Capital Funds = Opening Cr + Credits - Debits
      const netEquity = (ledger.balanceType === BalanceType.CREDIT ? opening : opening.negated())
        .plus(activity.creditTotal)
        .minus(activity.debitTotal)

      if (!netEquity.isZero()) {
        capitalReservesItems.push({
          ledgerId: ledger.id,
          ledgerCode: ledger.code,
          ledgerName: ledger.name,
          parentLedgerId: ledger.parentLedgerId,
          amount: netEquity.toFixed(2),
        })
        capitalReservesTotal = capitalReservesTotal.plus(netEquity)
      }
    } else if (ledger.group === LedgerGroup.LIABILITY) {
      // Net Liability = Opening Cr + Credits - Debits
      const netLiab = (ledger.balanceType === BalanceType.CREDIT ? opening : opening.negated())
        .plus(activity.creditTotal)
        .minus(activity.debitTotal)

      if (!netLiab.isZero()) {
        currentLiabilitiesItems.push({
          ledgerId: ledger.id,
          ledgerCode: ledger.code,
          ledgerName: ledger.name,
          parentLedgerId: ledger.parentLedgerId,
          amount: netLiab.toFixed(2),
        })
        currentLiabilitiesTotal = currentLiabilitiesTotal.plus(netLiab)
      }
    }
  }

  const totalAssets = fixedAssetsTotal.plus(investDepositsTotal).plus(currentAssetsTotal)
  const totalLiabilitiesAndFunds = capitalReservesTotal
    .plus(currentPeriodSigned)
    .plus(currentLiabilitiesTotal)

  const diff = totalAssets.minus(totalLiabilitiesAndFunds)
  const isBalanced = diff.abs().lessThan(0.01)

  return {
    societyId,
    societyName: society.name,
    asOfDate: asOf.toISOString(),
    financialYearName,
    totalAssets: totalAssets.toFixed(2),
    fixedAssets: {
      title: "Fixed Assets & Equipment",
      totalAmount: fixedAssetsTotal.toFixed(2),
      items: fixedAssetsItems,
    },
    investmentsAndDeposits: {
      title: "Investments & Security Deposits Paid",
      totalAmount: investDepositsTotal.toFixed(2),
      items: investDepositsItems,
    },
    currentAssets: {
      title: "Current Assets (Cash, Bank & Receivables)",
      totalAmount: currentAssetsTotal.toFixed(2),
      items: currentAssetsItems,
    },
    totalLiabilitiesAndFunds: totalLiabilitiesAndFunds.toFixed(2),
    capitalAndReserves: {
      title: "Capital & Statutory Reserves",
      totalAmount: capitalReservesTotal.toFixed(2),
      items: capitalReservesItems,
    },
    currentPeriodSurplus: currentPeriodSurplusVal.toFixed(2),
    currentPeriodResultType: ieReport.resultType,
    currentLiabilities: {
      title: "Current Liabilities & Member Advances",
      totalAmount: currentLiabilitiesTotal.toFixed(2),
      items: currentLiabilitiesItems,
    },
    difference: diff.toFixed(2),
    isBalanced,
  }
}

// ===========================================================================
// REPAIR & MAINTENANCE FUND REGISTER (STATUTORY CAPITAL REPAIRS FUND)
// ===========================================================================

export interface RepairFundTransaction {
  id: string
  entryDate: string
  voucherNumber: string | null
  voucherType: VoucherType
  transactionType: "CONTRIBUTION" | "INTEREST_CREDIT" | "UTILIZATION_EXPENDITURE"
  particulars: string
  narration: string | null
  additionAmount: string // Fund Inflow (Credit)
  utilizationAmount: string // Fund Outflow (Debit)
  runningFundBalance: string
}

export interface EarmarkedInvestmentItem {
  id: string
  fdNumber: string
  bankName: string
  principalAmount: string
  interestRate: string
  maturityDate: string
  status: string
}

export interface RepairFundRegisterReport {
  societyId: string
  societyName: string
  startDate?: string
  endDate?: string
  financialYearName?: string

  openingFundBalance: string
  totalAdditions: string
  totalUtilizations: string
  closingFundBalance: string

  // Earmarked Investments & Statutory Coverage Analysis
  totalEarmarkedInvestments: string
  investmentCoverageRate: string // (Investments / Fund Balance) %
  isAdequatelyFunded: boolean

  transactions: RepairFundTransaction[]
  earmarkedInvestments: EarmarkedInvestmentItem[]
}

/**
 * Generates the statutory Repair & Maintenance Fund Register for a Housing Society.
 * Tracks member contributions, FD interest additions, major repair utilizations,
 * and earmarked fixed deposit investment coverage.
 */
export async function getRepairFundRegister(params: {
  societyId: string
  financialYearId?: string
  startDate?: Date
  endDate?: Date
}): Promise<RepairFundRegisterReport> {
  const { societyId, financialYearId, startDate, endDate } = params

  const society = await prisma.society.findUnique({
    where: { id: societyId },
    select: { name: true },
  })

  if (!society) {
    throw new Error(`Society with ID ${societyId} not found`)
  }

  // Find the Repair Fund Equity Ledger
  const repairFundLedger = await prisma.ledger.findFirst({
    where: {
      societyId,
      OR: [
        { code: "3300" },
        { name: { contains: "Repair", mode: "insensitive" } },
      ],
      group: LedgerGroup.EQUITY,
    },
  }) ||
  await prisma.ledger.findFirst({
    where: {
      societyId,
      group: LedgerGroup.EQUITY,
    },
  })

  let financialYearName: string | undefined
  if (financialYearId) {
    const fy = await prisma.financialYear.findUnique({
      where: { id: financialYearId },
      select: { name: true },
    })
    financialYearName = fy?.name
  }

  const initialOpening = new Decimal(
    repairFundLedger?.openingBalance ? repairFundLedger.openingBalance.toString() : 0
  )

  let priorAdditions = new Decimal(0)
  let priorUtilizations = new Decimal(0)

  // Prior transactions before startDate
  if (startDate && repairFundLedger) {
    const priorEntries = await prisma.ledgerEntry.findMany({
      where: {
        ledgerId: repairFundLedger.id,
        journalEntry: {
          societyId,
          status: VoucherStatus.POSTED,
          entryDate: { lt: startDate },
        },
      },
      select: { debit: true, credit: true },
    })

    for (const pe of priorEntries) {
      priorAdditions = priorAdditions.plus(pe.credit ? pe.credit.toString() : 0)
      priorUtilizations = priorUtilizations.plus(pe.debit ? pe.debit.toString() : 0)
    }
  }

  const openingFundBalance = initialOpening.plus(priorAdditions).minus(priorUtilizations)

  // Period entries
  const dateFilter: { gte?: Date; lte?: Date } = {}
  if (startDate) dateFilter.gte = startDate
  if (endDate) dateFilter.lte = endDate

  const periodEntries = repairFundLedger
    ? await prisma.ledgerEntry.findMany({
        where: {
          ledgerId: repairFundLedger.id,
          journalEntry: {
            societyId,
            status: VoucherStatus.POSTED,
            ...(financialYearId ? { financialYearId } : {}),
            ...(Object.keys(dateFilter).length > 0 ? { entryDate: dateFilter } : {}),
          },
        },
        include: {
          journalEntry: {
            include: {
              entries: {
                include: {
                  ledger: { select: { name: true } },
                },
              },
            },
          },
        },
        orderBy: [
          { journalEntry: { entryDate: "asc" } },
          { journalEntry: { createdAt: "asc" } },
        ],
      })
    : []

  let runningFund = openingFundBalance
  let totalAdditions = new Decimal(0)
  let totalUtilizations = new Decimal(0)

  const transactions: RepairFundTransaction[] = []

  for (const entry of periodEntries) {
    const addition = new Decimal(entry.credit ? entry.credit.toString() : 0)
    const utilization = new Decimal(entry.debit ? entry.debit.toString() : 0)

    totalAdditions = totalAdditions.plus(addition)
    totalUtilizations = totalUtilizations.plus(utilization)
    runningFund = runningFund.plus(addition).minus(utilization)

    const otherLedgers = entry.journalEntry.entries
      .filter((e) => e.ledgerId !== repairFundLedger?.id)
      .map((e) => e.ledger.name)

    const particulars = otherLedgers.length > 0 ? otherLedgers.join(", ") : "Self / Sundry"

    let transactionType: "CONTRIBUTION" | "INTEREST_CREDIT" | "UTILIZATION_EXPENDITURE" = "CONTRIBUTION"
    if (utilization.greaterThan(0)) {
      transactionType = "UTILIZATION_EXPENDITURE"
    } else if (particulars.toLowerCase().includes("interest")) {
      transactionType = "INTEREST_CREDIT"
    }

    transactions.push({
      id: entry.id,
      entryDate: entry.journalEntry.entryDate.toISOString(),
      voucherNumber: entry.journalEntry.voucherNumber,
      voucherType: entry.journalEntry.voucherType,
      transactionType,
      particulars,
      narration: entry.narration || entry.journalEntry.narration,
      additionAmount: addition.toFixed(2),
      utilizationAmount: utilization.toFixed(2),
      runningFundBalance: runningFund.toFixed(2),
    })
  }

  // Fetch earmarked Fixed Deposits for Repair Fund
  const fds = await prisma.fixedDeposit.findMany({
    where: {
      societyId,
      status: "ACTIVE",
    },
    orderBy: { maturityDate: "asc" },
  })

  let totalInvestments = new Decimal(0)
  const earmarkedInvestments: EarmarkedInvestmentItem[] = fds.map((fd) => {
    const p = new Decimal(fd.principalAmount ? fd.principalAmount.toString() : 0)
    totalInvestments = totalInvestments.plus(p)

    return {
      id: fd.id,
      fdNumber: fd.fdNumber,
      bankName: fd.bankName,
      principalAmount: p.toFixed(2),
      interestRate: `${fd.interestRate}%`,
      maturityDate: fd.maturityDate.toISOString(),
      status: fd.status,
    }
  })

  const coverageRate = runningFund.greaterThan(0)
    ? totalInvestments.dividedBy(runningFund).times(100).toFixed(2)
    : "100.00"

  const isAdequatelyFunded = parseFloat(coverageRate) >= 80

  return {
    societyId,
    societyName: society.name,
    startDate: startDate?.toISOString(),
    endDate: endDate?.toISOString(),
    financialYearName,
    openingFundBalance: openingFundBalance.toFixed(2),
    totalAdditions: totalAdditions.toFixed(2),
    totalUtilizations: totalUtilizations.toFixed(2),
    closingFundBalance: runningFund.toFixed(2),
    totalEarmarkedInvestments: totalInvestments.toFixed(2),
    investmentCoverageRate: `${coverageRate}%`,
    isAdequatelyFunded,
    transactions,
    earmarkedInvestments,
  }
}

// ===========================================================================
// CORPUS FUND REGISTER (CAPITAL CORPUS & BUILDER HANDOVER REGISTER)
// ===========================================================================

export interface FlatCorpusRow {
  flatId: string
  flatNumber: string
  blockName: string
  unitType: string | null
  areaSqft: string | null
  ownerName: string
  ownerPhone: string | null
  ownerEmail: string | null

  depositId: string | null
  corpusAmount: string
  receivedOn: string | null
  status: "HELD" | "PENDING_COLLECTION" | "REFUNDED" | "FORFEITED"
  reference: string | null
}

export interface CorpusFundRegisterReport {
  societyId: string
  societyName: string
  asOfDate: string
  blockFilter?: string

  totalFlatsCount: number
  paidFlatsCount: number
  pendingFlatsCount: number
  collectionRate: string // e.g. "95.50%"

  totalCollectedCorpus: string
  totalEarmarkedInvestments: string
  investmentDeploymentRate: string // (Investments / Collected Corpus) %
  isFullyInvested: boolean

  rows: FlatCorpusRow[]
  earmarkedInvestments: EarmarkedInvestmentItem[]
}

/**
 * Generates the Corpus Fund Register for a Housing Society.
 * Tracks per-flat builder handover corpus contributions, collection status,
 * and long-term Fixed Deposit deployment.
 */
export async function getCorpusFundRegister(params: {
  societyId: string
  blockId?: string
}): Promise<CorpusFundRegisterReport> {
  const { societyId, blockId } = params
  const asOf = new Date()

  const society = await prisma.society.findUnique({
    where: { id: societyId },
    select: { name: true },
  })

  if (!society) {
    throw new Error(`Society with ID ${societyId} not found`)
  }

  // Fetch all flats
  const flats = await prisma.flat.findMany({
    where: {
      block: { societyId },
      ...(blockId ? { blockId } : {}),
      isActive: true,
    },
    include: {
      block: { select: { name: true } },
      people: {
        where: { isPrimary: true },
        include: {
          person: {
            select: {
              name: true,
              phone: true,
              email: true,
            },
          },
        },
      },
      memberDeposits: {
        where: {
          depositType: DepositType.CORPUS,
        },
      },
    },
    orderBy: [{ block: { name: "asc" } }, { number: "asc" }],
  })

  let totalCollected = new Decimal(0)
  let paidCount = 0
  let pendingCount = 0

  const rows: FlatCorpusRow[] = []

  for (const flat of flats) {
    const primaryPerson = flat.people[0]?.person
    const ownerName = primaryPerson?.name || "Unregistered Owner"
    const ownerPhone = primaryPerson?.phone || null
    const ownerEmail = primaryPerson?.email || null

    const corpusDeposit = flat.memberDeposits[0]

    let corpusAmount = new Decimal(0)
    let status: "HELD" | "PENDING_COLLECTION" | "REFUNDED" | "FORFEITED" = "PENDING_COLLECTION"

    if (corpusDeposit) {
      corpusAmount = new Decimal(corpusDeposit.amount ? corpusDeposit.amount.toString() : 0)
      status = corpusDeposit.status as "HELD" | "PENDING_COLLECTION" | "REFUNDED" | "FORFEITED"

      if (corpusDeposit.status === "HELD") {

        totalCollected = totalCollected.plus(corpusAmount)
        paidCount++
      }
    } else {
      pendingCount++
    }

    rows.push({
      flatId: flat.id,
      flatNumber: flat.number,
      blockName: flat.block.name,
      unitType: flat.unitType,
      areaSqft: flat.area ? flat.area.toString() : null,
      ownerName,
      ownerPhone,
      ownerEmail,
      depositId: corpusDeposit?.id || null,
      corpusAmount: corpusAmount.toFixed(2),
      receivedOn: corpusDeposit?.receivedOn ? corpusDeposit.receivedOn.toISOString() : null,
      status,
      reference: corpusDeposit?.reference || null,
    })
  }

  // Fetch active Fixed Deposits
  const fds = await prisma.fixedDeposit.findMany({
    where: {
      societyId,
      status: "ACTIVE",
    },
    orderBy: { maturityDate: "asc" },
  })

  let totalInvestments = new Decimal(0)
  const earmarkedInvestments: EarmarkedInvestmentItem[] = fds.map((fd) => {
    const p = new Decimal(fd.principalAmount ? fd.principalAmount.toString() : 0)
    totalInvestments = totalInvestments.plus(p)

    return {
      id: fd.id,
      fdNumber: fd.fdNumber,
      bankName: fd.bankName,
      principalAmount: p.toFixed(2),
      interestRate: `${fd.interestRate}%`,
      maturityDate: fd.maturityDate.toISOString(),
      status: fd.status,
    }
  })

  const collectionRateVal = flats.length > 0
    ? new Decimal(paidCount).dividedBy(flats.length).times(100).toFixed(2)
    : "100.00"

  const deploymentRateVal = totalCollected.greaterThan(0)
    ? totalInvestments.dividedBy(totalCollected).times(100).toFixed(2)
    : "100.00"

  const isFullyInvested = parseFloat(deploymentRateVal) >= 90

  return {
    societyId,
    societyName: society.name,
    asOfDate: asOf.toISOString(),
    blockFilter: blockId,
    totalFlatsCount: flats.length,
    paidFlatsCount: paidCount,
    pendingFlatsCount: pendingCount,
    collectionRate: `${collectionRateVal}%`,
    totalCollectedCorpus: totalCollected.toFixed(2),
    totalEarmarkedInvestments: totalInvestments.toFixed(2),
    investmentDeploymentRate: `${deploymentRateVal}%`,
    isFullyInvested,
    rows,
    earmarkedInvestments,
  }
}

// ===========================================================================
// SINKING FUND REGISTER (MANDATORY STATUTORY RECONSTRUCTION FUND)
// ===========================================================================

export interface SinkingFundTransaction {
  id: string
  entryDate: string
  voucherNumber: string | null
  voucherType: VoucherType
  transactionType: "CONTRIBUTION" | "INTEREST_REINVESTMENT" | "STRUCTURAL_UTILIZATION"
  particulars: string
  narration: string | null
  additionAmount: string // Fund Inflow (Credit)
  utilizationAmount: string // Fund Outflow (Debit)
  runningFundBalance: string
}

export interface SinkingFundRegisterReport {
  societyId: string
  societyName: string
  startDate?: string
  endDate?: string
  financialYearName?: string

  openingFundBalance: string
  totalAdditions: string
  totalUtilizations: string
  closingFundBalance: string

  // Statutory Investment Compliance Analysis (100% Investment Mandate)
  totalEarmarkedInvestments: string
  statutoryCoverageRate: string // (Investments / Sinking Fund Liability) %
  isStatutorilyCompliant: boolean // true if Coverage >= 100%

  transactions: SinkingFundTransaction[]
  earmarkedInvestments: EarmarkedInvestmentItem[]
}

/**
 * Generates the statutory Sinking Fund Register for a Housing Society.
 * Tracks mandatory member contributions (0.25% p.a.), FD interest compounding,
 * and verifies 100% statutory Fixed Deposit investment compliance.
 */
export async function getSinkingFundRegister(params: {
  societyId: string
  financialYearId?: string
  startDate?: Date
  endDate?: Date
}): Promise<SinkingFundRegisterReport> {
  const { societyId, financialYearId, startDate, endDate } = params

  const society = await prisma.society.findUnique({
    where: { id: societyId },
    select: { name: true },
  })

  if (!society) {
    throw new Error(`Society with ID ${societyId} not found`)
  }

  // Find the Sinking Fund Equity Ledger
  const sinkingFundLedger = await prisma.ledger.findFirst({
    where: {
      societyId,
      OR: [
        { code: "3200" },
        { name: { contains: "Sinking", mode: "insensitive" } },
      ],
      group: LedgerGroup.EQUITY,
    },
  }) ||
  await prisma.ledger.findFirst({
    where: {
      societyId,
      group: LedgerGroup.EQUITY,
    },
  })

  let financialYearName: string | undefined
  if (financialYearId) {
    const fy = await prisma.financialYear.findUnique({
      where: { id: financialYearId },
      select: { name: true },
    })
    financialYearName = fy?.name
  }

  const initialOpening = new Decimal(
    sinkingFundLedger?.openingBalance ? sinkingFundLedger.openingBalance.toString() : 0
  )

  let priorAdditions = new Decimal(0)
  let priorUtilizations = new Decimal(0)

  // Prior transactions before startDate
  if (startDate && sinkingFundLedger) {
    const priorEntries = await prisma.ledgerEntry.findMany({
      where: {
        ledgerId: sinkingFundLedger.id,
        journalEntry: {
          societyId,
          status: VoucherStatus.POSTED,
          entryDate: { lt: startDate },
        },
      },
      select: { debit: true, credit: true },
    })

    for (const pe of priorEntries) {
      priorAdditions = priorAdditions.plus(pe.credit ? pe.credit.toString() : 0)
      priorUtilizations = priorUtilizations.plus(pe.debit ? pe.debit.toString() : 0)
    }
  }

  const openingFundBalance = initialOpening.plus(priorAdditions).minus(priorUtilizations)

  // Period entries
  const dateFilter: { gte?: Date; lte?: Date } = {}
  if (startDate) dateFilter.gte = startDate
  if (endDate) dateFilter.lte = endDate

  const periodEntries = sinkingFundLedger
    ? await prisma.ledgerEntry.findMany({
        where: {
          ledgerId: sinkingFundLedger.id,
          journalEntry: {
            societyId,
            status: VoucherStatus.POSTED,
            ...(financialYearId ? { financialYearId } : {}),
            ...(Object.keys(dateFilter).length > 0 ? { entryDate: dateFilter } : {}),
          },
        },
        include: {
          journalEntry: {
            include: {
              entries: {
                include: {
                  ledger: { select: { name: true } },
                },
              },
            },
          },
        },
        orderBy: [
          { journalEntry: { entryDate: "asc" } },
          { journalEntry: { createdAt: "asc" } },
        ],
      })
    : []

  let runningFund = openingFundBalance
  let totalAdditions = new Decimal(0)
  let totalUtilizations = new Decimal(0)

  const transactions: SinkingFundTransaction[] = []

  for (const entry of periodEntries) {
    const addition = new Decimal(entry.credit ? entry.credit.toString() : 0)
    const utilization = new Decimal(entry.debit ? entry.debit.toString() : 0)

    totalAdditions = totalAdditions.plus(addition)
    totalUtilizations = totalUtilizations.plus(utilization)
    runningFund = runningFund.plus(addition).minus(utilization)

    const otherLedgers = entry.journalEntry.entries
      .filter((e) => e.ledgerId !== sinkingFundLedger?.id)
      .map((e) => e.ledger.name)

    const particulars = otherLedgers.length > 0 ? otherLedgers.join(", ") : "Self / Sundry"

    let transactionType: "CONTRIBUTION" | "INTEREST_REINVESTMENT" | "STRUCTURAL_UTILIZATION" = "CONTRIBUTION"
    if (utilization.greaterThan(0)) {
      transactionType = "STRUCTURAL_UTILIZATION"
    } else if (particulars.toLowerCase().includes("interest")) {
      transactionType = "INTEREST_REINVESTMENT"
    }

    transactions.push({
      id: entry.id,
      entryDate: entry.journalEntry.entryDate.toISOString(),
      voucherNumber: entry.journalEntry.voucherNumber,
      voucherType: entry.journalEntry.voucherType,
      transactionType,
      particulars,
      narration: entry.narration || entry.journalEntry.narration,
      additionAmount: addition.toFixed(2),
      utilizationAmount: utilization.toFixed(2),
      runningFundBalance: runningFund.toFixed(2),
    })
  }

  // Fetch active Sinking Fund Fixed Deposits
  const fds = await prisma.fixedDeposit.findMany({
    where: {
      societyId,
      status: "ACTIVE",
    },
    orderBy: { maturityDate: "asc" },
  })

  let totalInvestments = new Decimal(0)
  const earmarkedInvestments: EarmarkedInvestmentItem[] = fds.map((fd) => {
    const p = new Decimal(fd.principalAmount ? fd.principalAmount.toString() : 0)
    totalInvestments = totalInvestments.plus(p)

    return {
      id: fd.id,
      fdNumber: fd.fdNumber,
      bankName: fd.bankName,
      principalAmount: p.toFixed(2),
      interestRate: `${fd.interestRate}%`,
      maturityDate: fd.maturityDate.toISOString(),
      status: fd.status,
    }
  })

  const coverageRate = runningFund.greaterThan(0)
    ? totalInvestments.dividedBy(runningFund).times(100).toFixed(2)
    : "100.00"

  const isStatutorilyCompliant = parseFloat(coverageRate) >= 100

  return {
    societyId,
    societyName: society.name,
    startDate: startDate?.toISOString(),
    endDate: endDate?.toISOString(),
    financialYearName,
    openingFundBalance: openingFundBalance.toFixed(2),
    totalAdditions: totalAdditions.toFixed(2),
    totalUtilizations: totalUtilizations.toFixed(2),
    closingFundBalance: runningFund.toFixed(2),
    totalEarmarkedInvestments: totalInvestments.toFixed(2),
    statutoryCoverageRate: `${coverageRate}%`,
    isStatutorilyCompliant,
    transactions,
    earmarkedInvestments,
  }
}

// ===========================================================================
// FIXED ASSET DEPRECIATION REGISTER (SCHEDULE OF FIXED ASSETS & AMC)
// ===========================================================================

export interface FixedAssetDepreciationRow {
  assetId: string
  assetCode: string | null
  name: string
  categoryName: string
  location: string | null
  purchaseDate: string | null
  status: string

  // Cost & Depreciation Figures
  purchaseCost: string // Gross Block (Historical Cost)
  depreciationRate: string // e.g. "10.00%"
  annualDepreciationAmount: string // Current Year Charge
  accumulatedDepreciation: string // Total Accumulated Depreciation
  netBookValue: string // Net Block (Written Down Value WDV)

  // AMC Maintenance Tracking
  amcVendorName: string | null
  amcEndDate: string | null
  amcAmount: string | null
  isAmcActive: boolean
}

export interface FixedAssetRegisterReport {
  societyId: string
  societyName: string
  asOfDate: string
  categoryFilter?: string

  totalAssetsCount: number
  activeAssetsCount: number
  underAmcCount: number

  grandGrossBlockCost: string
  grandAnnualDepreciation: string
  grandAccumulatedDepreciation: string
  grandNetBookValue: string

  assets: FixedAssetDepreciationRow[]
}

/**
 * Generates the Fixed Asset Depreciation Register & Schedule for a Housing Society.
 * Computes historical costs, annual depreciation charges, accumulated depreciation,
 * net book value (WDV), and AMC vendor coverage.
 */
export async function getFixedAssetDepreciationRegister(params: {
  societyId: string
  categoryId?: string
  asOfDate?: Date
}): Promise<FixedAssetRegisterReport> {
  const { societyId, categoryId } = params
  const asOf = params.asOfDate || new Date()

  const society = await prisma.society.findUnique({
    where: { id: societyId },
    select: { name: true },
  })

  if (!society) {
    throw new Error(`Society with ID ${societyId} not found`)
  }

  // Fetch all active fixed assets
  const assets = await prisma.fixedAsset.findMany({
    where: {
      societyId,
      ...(categoryId ? { categoryId } : {}),
      isActive: true,
    },
    include: {
      category: {
        select: {
          name: true,
          depreciationRate: true,
        },
      },
      amcVendor: {
        select: {
          name: true,
          companyName: true,
        },
      },
    },
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
  })

  let grandGrossBlock = new Decimal(0)
  let grandAnnualDep = new Decimal(0)
  let grandAccumDep = new Decimal(0)
  let grandNetValue = new Decimal(0)

  let activeCount = 0
  let amcCount = 0

  const rows: FixedAssetDepreciationRow[] = []

  for (const asset of assets) {
    if (asset.status === "ACTIVE") activeCount++

    const cost = new Decimal(asset.purchaseCost ? asset.purchaseCost.toString() : 0)
    grandGrossBlock = grandGrossBlock.plus(cost)

    const depRateVal = asset.category.depreciationRate
      ? new Decimal(asset.category.depreciationRate.toString())
      : new Decimal(10) // Default 10% rate if not specified

    // Calculate asset age in years
    let ageInYears = new Decimal(1)
    if (asset.purchaseDate) {
      const diffMs = asOf.getTime() - asset.purchaseDate.getTime()
      const years = Math.max(0.1, diffMs / (1000 * 60 * 60 * 24 * 365.25))
      ageInYears = new Decimal(years)
    }

    // Annual Depreciation Amount = Cost * (Rate / 100)
    const annualDep = cost.times(depRateVal).dividedBy(100)
    grandAnnualDep = grandAnnualDep.plus(annualDep)

    // Accumulated Depreciation capped at 95% of historical cost (5% residual salvage value)
    const maxAccumDep = cost.times(0.95)
    let accumDep = annualDep.times(ageInYears)
    if (accumDep.greaterThan(maxAccumDep)) {
      accumDep = maxAccumDep
    }
    grandAccumDep = grandAccumDep.plus(accumDep)

    // Net Book Value = Cost - Accumulated Depreciation
    const netBookValue = cost.minus(accumDep)
    grandNetValue = grandNetValue.plus(netBookValue)

    // AMC status check
    const isAmcActive = asset.amcEndDate ? asset.amcEndDate >= asOf : false
    if (isAmcActive) amcCount++

    const amcVendorName = asset.amcVendor
      ? (asset.amcVendor.companyName || asset.amcVendor.name)
      : null

    rows.push({
      assetId: asset.id,
      assetCode: asset.assetCode,
      name: asset.name,
      categoryName: asset.category.name,
      location: asset.location,
      purchaseDate: asset.purchaseDate ? asset.purchaseDate.toISOString() : null,
      status: asset.status,
      purchaseCost: cost.toFixed(2),
      depreciationRate: `${depRateVal.toFixed(2)}%`,
      annualDepreciationAmount: annualDep.toFixed(2),
      accumulatedDepreciation: accumDep.toFixed(2),
      netBookValue: netBookValue.toFixed(2),
      amcVendorName,
      amcEndDate: asset.amcEndDate ? asset.amcEndDate.toISOString() : null,
      amcAmount: asset.amcAmount ? new Decimal(asset.amcAmount.toString()).toFixed(2) : null,
      isAmcActive,
    })
  }

  return {
    societyId,
    societyName: society.name,
    asOfDate: asOf.toISOString(),
    categoryFilter: categoryId,
    totalAssetsCount: assets.length,
    activeAssetsCount: activeCount,
    underAmcCount: amcCount,
    grandGrossBlockCost: grandGrossBlock.toFixed(2),
    grandAnnualDepreciation: grandAnnualDep.toFixed(2),
    grandAccumulatedDepreciation: grandAccumDep.toFixed(2),
    grandNetBookValue: grandNetValue.toFixed(2),
    assets: rows,
  }
}







