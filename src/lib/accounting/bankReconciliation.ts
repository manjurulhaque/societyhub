import { prisma } from "@/lib/prisma"
import { ChequeDirection, ChequeStatus, ReconStatus, Prisma } from "@/generated/prisma"

type Decimal = Prisma.Decimal
const Decimal = Prisma.Decimal

export interface UnclearedChequeItem {
  id: string
  chequeNumber: string
  chequeDate: string
  partyName: string
  bankName: string | null
  amount: string
  direction: ChequeDirection
  status: ChequeStatus
  depositDate: string | null
}

export interface BankReconciliationStatement {
  accountId: string
  accountName: string
  bankName: string | null
  accountNumber: string | null
  asOfDate: string

  // Ledger Balances
  ledgerBalance: string

  // Unpresented Cheques (Outward cheques issued to vendors but not yet cleared by bank)
  unpresentedCheques: UnclearedChequeItem[]
  unpresentedChequesTotal: string

  // Uncredited Cheques (Inward cheques received from members but not yet credited by bank)
  uncreditedCheques: UnclearedChequeItem[]
  uncreditedChequesTotal: string

  // Computed & Actual Balances
  adjustedLedgerBalance: string
  bankStatementBalance: string
  difference: string
  isReconciled: boolean
}

/**
 * Computes a standard Bank Reconciliation Statement (BRS) as of a given date.
 *
 * Formula:
 *   Balance as per Society Bank Ledger
 *   + Unpresented Cheques (Cheques issued to vendors, not yet debited by bank)
 *   - Uncredited Cheques (Cheques deposited by members, not yet credited by bank)
 *   = Adjusted Balance (Must match Bank Statement Balance)
 */
export async function getBankReconciliationStatement(params: {
  accountId: string
  statementBalance: string | number
  asOfDate?: Date
}): Promise<BankReconciliationStatement> {
  const { accountId, statementBalance } = params
  const asOf = params.asOfDate || new Date()

  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: {
      id: true,
      name: true,
      bankName: true,
      accountNumber: true,
      currentBalance: true,
    },
  })

  if (!account) {
    throw new Error(`Bank Account with ID ${accountId} not found`)
  }

  const statementBal = new Decimal(statementBalance.toString())
  const ledgerBal = new Decimal(account.currentBalance ? account.currentBalance.toString() : 0)

  // Fetch uncleared or cleared-after-cutoff inward and outward cheques
  const unclearedCheques = await prisma.chequeRegister.findMany({
    where: {
      accountId,
      chequeDate: { lte: asOf },
      OR: [
        { status: { in: [ChequeStatus.RECEIVED, ChequeStatus.ISSUED, ChequeStatus.IN_CLEARING] } },
        { clearedOn: { gt: asOf } },
      ],
    },
    orderBy: { chequeDate: "asc" },
  })

  const unpresentedCheques: UnclearedChequeItem[] = []
  let unpresentedTotal = new Decimal(0)

  const uncreditedCheques: UnclearedChequeItem[] = []
  let uncreditedTotal = new Decimal(0)

  for (const chq of unclearedCheques) {
    const item: UnclearedChequeItem = {
      id: chq.id,
      chequeNumber: chq.chequeNumber,
      chequeDate: chq.chequeDate.toISOString(),
      partyName: chq.partyName,
      bankName: chq.bankName,
      amount: new Decimal(chq.amount.toString()).toFixed(2),
      direction: chq.direction,
      status: chq.status,
      depositDate: chq.depositDate?.toISOString() || null,
    }

    const chqAmount = new Decimal(chq.amount.toString())

    if (chq.direction === ChequeDirection.OUTWARD) {
      unpresentedCheques.push(item)
      unpresentedTotal = unpresentedTotal.plus(chqAmount)
    } else {
      uncreditedCheques.push(item)
      uncreditedTotal = uncreditedTotal.plus(chqAmount)
    }
  }

  // Adjusted Ledger Balance = Ledger Balance + Unpresented (Outward) - Uncredited (Inward)
  const adjustedLedger = ledgerBal.plus(unpresentedTotal).minus(uncreditedTotal)
  const difference = adjustedLedger.minus(statementBal)
  const isReconciled = difference.abs().lessThan(0.01)

  return {
    accountId: account.id,
    accountName: account.name,
    bankName: account.bankName,
    accountNumber: account.accountNumber,
    asOfDate: asOf.toISOString(),
    ledgerBalance: ledgerBal.toFixed(2),
    unpresentedCheques,
    unpresentedChequesTotal: unpresentedTotal.toFixed(2),
    uncreditedCheques,
    uncreditedChequesTotal: uncreditedTotal.toFixed(2),
    adjustedLedgerBalance: adjustedLedger.toFixed(2),
    bankStatementBalance: statementBal.toFixed(2),
    difference: difference.toFixed(2),
    isReconciled,
  }
}

/**
 * Creates and persists a Bank Reconciliation snapshot record.
 */
export async function saveBankReconciliation(params: {
  accountId: string
  statementDate: Date
  statementBalance: string | number
  notes?: string
}): Promise<{ id: string; status: ReconStatus; difference: string; isReconciled: boolean }> {
  const statement = await getBankReconciliationStatement({
    accountId: params.accountId,
    statementBalance: params.statementBalance,
    asOfDate: params.statementDate,
  })

  const recon = await prisma.bankReconciliation.create({
    data: {
      accountId: params.accountId,
      statementDate: params.statementDate,
      statementBalance: new Decimal(statement.bankStatementBalance),
      ledgerBalance: new Decimal(statement.ledgerBalance),
      difference: new Decimal(statement.difference),
      status: statement.isReconciled ? ReconStatus.RECONCILED : ReconStatus.DRAFT,
      notes: params.notes || null,
      reconciledAt: statement.isReconciled ? new Date() : null,
    },
  })

  return {
    id: recon.id,
    status: recon.status,
    difference: statement.difference,
    isReconciled: statement.isReconciled,
  }
}

/**
 * Marks a cheque in the Cheque Register as cleared on a specific bank date.
 */
export async function markChequeCleared(chequeRegisterId: string, clearedDate: Date) {
  return prisma.chequeRegister.update({
    where: { id: chequeRegisterId },
    data: {
      status: ChequeStatus.CLEARED,
      clearedOn: clearedDate,
    },
  })
}
