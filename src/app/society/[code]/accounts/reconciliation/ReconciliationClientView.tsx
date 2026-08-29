"use client"

import { useState, useTransition, useEffect } from "react"
import Link from "next/link"
import { AdminStatCard, AdminBadge, AdminTable, AdminCard } from "@/components/admin"
import { commitBankReconciliation, clearChequeInlineAction } from "./actions"
import { formatDateInAppTimeZone } from "@/lib/datetime"
import {
  generateBankReconciliationPDF,
  generateBankReconciliationCsv,
  type ReconPdfSocietyInfo,
} from "@/lib/pdf/bankReconPdfGenerator"
import {
  AutoReconciliationEngine,
  type FlatOption,
  type UnpaidBillOption,
} from "./AutoReconciliationEngine"
import { BrsBalanceBridge } from "./BrsBalanceBridge"

export type BankAccountOption = {
  id: string
  name: string
  bankName: string | null
  accountNumber: string | null
  currentBalance: number
}

export type UnclearedCheque = {
  id: string
  chequeNumber: string
  chequeDate: string
  partyName: string
  amount: number
  direction: "INWARD" | "OUTWARD"
  status: string
}

export type HistoricalReconItem = {
  id: string
  accountName: string
  statementDate: string
  statementBalance: number
  bookBalance: number
  uncreditedAmount: number
  unpresentedAmount: number
  discrepancy: number
  status: string
  notes: string | null
  createdAt: string
}

interface ReconciliationClientViewProps {
  societyCode: string
  societyInfo?: ReconPdfSocietyInfo
  currencySymbol: string
  bankAccounts: BankAccountOption[]
  unpresentedCheques: UnclearedCheque[]
  uncreditedCheques: UnclearedCheque[]
  historicalRecons: HistoricalReconItem[]
  flats?: FlatOption[]
  unpaidBills?: UnpaidBillOption[]
  canManage: boolean
}

type ReconMode = "AUTO_STATEMENT" | "STATUTORY_BRS"

export function ReconciliationClientView({
  societyCode,
  societyInfo,
  currencySymbol,
  bankAccounts,
  unpresentedCheques,
  uncreditedCheques,
  historicalRecons,
  flats = [],
  unpaidBills = [],
  canManage,
}: ReconciliationClientViewProps) {
  const [activeMode, setActiveMode] = useState<ReconMode>("AUTO_STATEMENT")
  const [selectedAccountId, setSelectedAccountId] = useState(bankAccounts[0]?.id || "")
  const [statementDate, setStatementDate] = useState(new Date().toISOString().split("T")[0])
  const [statementBalance, setStatementBalance] = useState("")
  const [notes, setNotes] = useState("")

  // Local state for dynamic cheque clearing without full page reload
  const [unpresentedList, setUnpresentedList] = useState<UnclearedCheque[]>(unpresentedCheques)
  const [uncreditedList, setUncreditedList] = useState<UnclearedCheque[]>(uncreditedCheques)
  const [accountBalanceOverride, setAccountBalanceOverride] = useState<number | null>(null)

  // Cheque clearance modal state
  const [clearingTarget, setClearingTarget] = useState<UnclearedCheque | null>(null)
  const [clearedDateInput, setClearedDateInput] = useState(new Date().toISOString().split("T")[0])
  const [isClearingSubmitting, setIsClearingSubmitting] = useState(false)

  // Sync state when props change
  useEffect(() => {
    setUnpresentedList(unpresentedCheques)
    setUncreditedList(uncreditedCheques)
    setAccountBalanceOverride(null)
  }, [unpresentedCheques, uncreditedCheques, selectedAccountId])

  const [isPending, startTransition] = useTransition()
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const selectedAccount = bankAccounts.find((a) => a.id === selectedAccountId) || bankAccounts[0]
  const bookBalance =
    accountBalanceOverride !== null
      ? accountBalanceOverride
      : selectedAccount
      ? selectedAccount.currentBalance
      : 0

  const unpresentedTotal = unpresentedList.reduce((sum, c) => sum + c.amount, 0)
  const uncreditedTotal = uncreditedList.reduce((sum, c) => sum + c.amount, 0)

  // Standard BRS formula: Adjusted = Book Balance + Unpresented - Uncredited
  const adjustedBalance = bookBalance + unpresentedTotal - uncreditedTotal

  const stmtBalNum = parseFloat(statementBalance) || 0
  const difference = stmtBalNum ? Math.round((adjustedBalance - stmtBalNum) * 100) / 100 : 0
  const isBalanced = statementBalance.trim() !== "" && Math.abs(difference) < 0.01

  // Handle inline cheque clearance
  const handleConfirmClearCheque = async () => {
    if (!clearingTarget) return

    setIsClearingSubmitting(true)
    setSaveError(null)

    try {
      const res = await clearChequeInlineAction(societyCode, clearingTarget.id, clearedDateInput)
      if (res.error) {
        setSaveError(res.error)
      } else {
        setSaveMessage(res.message || `Cheque #${clearingTarget.chequeNumber} cleared successfully.`)

        // Update local state dynamically
        if (clearingTarget.direction === "OUTWARD") {
          setUnpresentedList((prev) => prev.filter((c) => c.id !== clearingTarget.id))
          setAccountBalanceOverride((prev) => (prev !== null ? prev : bookBalance) - clearingTarget.amount)
        } else {
          setUncreditedList((prev) => prev.filter((c) => c.id !== clearingTarget.id))
          setAccountBalanceOverride((prev) => (prev !== null ? prev : bookBalance) + clearingTarget.amount)
        }

        setClearingTarget(null)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to clear cheque."
      setSaveError(msg)
    } finally {
      setIsClearingSubmitting(false)
    }
  }

  const handleDownloadPdf = () => {
    if (!selectedAccount) return
    generateBankReconciliationPDF({
      society: societyInfo || { name: "Housing Society" },
      accountName: selectedAccount.name,
      bankName: selectedAccount.bankName,
      accountNumber: selectedAccount.accountNumber,
      statementDate,
      bookBalance,
      unpresentedCheques: unpresentedCheques.map((c) => ({
        chequeNumber: c.chequeNumber,
        chequeDate: c.chequeDate,
        partyName: c.partyName,
        amount: c.amount,
      })),
      uncreditedCheques: uncreditedCheques.map((c) => ({
        chequeNumber: c.chequeNumber,
        chequeDate: c.chequeDate,
        partyName: c.partyName,
        amount: c.amount,
      })),
      statementBalance: stmtBalNum,
      adjustedBalance,
      discrepancy: difference,
      notes: notes || null,
      currencySymbol,
    })
  }

  const handleExportCsv = () => {
    if (!selectedAccount) return
    const csv = generateBankReconciliationCsv({
      society: societyInfo || { name: "Housing Society" },
      accountName: selectedAccount.name,
      bankName: selectedAccount.bankName,
      accountNumber: selectedAccount.accountNumber,
      statementDate,
      bookBalance,
      unpresentedCheques: unpresentedCheques.map((c) => ({
        chequeNumber: c.chequeNumber,
        chequeDate: c.chequeDate,
        partyName: c.partyName,
        amount: c.amount,
      })),
      uncreditedCheques: uncreditedCheques.map((c) => ({
        chequeNumber: c.chequeNumber,
        chequeDate: c.chequeDate,
        partyName: c.partyName,
        amount: c.amount,
      })),
      statementBalance: stmtBalNum,
      adjustedBalance,
      discrepancy: difference,
      notes: notes || null,
      currencySymbol,
    })

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `BRS_${selectedAccount.name.replace(/[^a-zA-Z0-9]/g, "_")}_${statementDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCommit = (e: React.FormEvent) => {
    e.preventDefault()
    setSaveMessage(null)
    setSaveError(null)

    if (!selectedAccount) return

    startTransition(async () => {
      try {
        const res = await commitBankReconciliation(societyCode, {
          accountId: selectedAccount.id,
          statementDate,
          statementBalance: stmtBalNum,
          bookBalance,
          uncreditedTotal,
          unpresentedTotal,
          discrepancy: difference,
          notes: notes || null,
        })

        if (res.error) {
          setSaveError(res.error)
        } else {
          setSaveMessage(res.message || "Reconciliation committed.")
          setNotes("")
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to commit BRS."
        setSaveError(msg)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link
          href={`/society/${societyCode}/accounts`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900 transition"
        >
          <span>←</span>
          <span>Back to Bank & Cash Accounts</span>
        </Link>

        {/* Mode Switch Tabs */}
        <div className="flex items-center p-1 rounded-2xl bg-stone-200/70 border border-stone-300/60 shadow-xs">
          <button
            type="button"
            onClick={() => setActiveMode("AUTO_STATEMENT")}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
              activeMode === "AUTO_STATEMENT"
                ? "bg-white text-stone-950 shadow-xs"
                : "text-stone-600 hover:text-stone-950"
            }`}
          >
            <span>⚡</span>
            <span>Bank Statement Auto-Match</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode("STATUTORY_BRS")}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
              activeMode === "STATUTORY_BRS"
                ? "bg-white text-stone-950 shadow-xs"
                : "text-stone-600 hover:text-stone-950"
            }`}
          >
            <span>📋</span>
            <span>Statutory BRS Calculation</span>
          </button>
        </div>
      </div>

      {/* Mode 1: Auto Statement Reconciliation Engine */}
      {activeMode === "AUTO_STATEMENT" ? (
        <AutoReconciliationEngine
          societyCode={societyCode}
          currencySymbol={currencySymbol}
          bankAccounts={bankAccounts}
          selectedAccountId={selectedAccountId}
          onAccountChange={setSelectedAccountId}
          flats={flats}
          unpaidBills={unpaidBills}
          canManage={canManage}
        />
      ) : (
        /* Mode 2: Statutory BRS Calculation Workspace */
        <div className="space-y-6">
          {/* Reconciling Account Selector */}
          {bankAccounts.length > 0 && (
            <div className="flex items-center justify-between bg-white p-4 rounded-3xl border border-stone-200 shadow-xs">
              <div className="flex items-center gap-3">
                <label className="text-xs font-bold text-stone-800">Reconciling Account:</label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="rounded-2xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-bold text-stone-900 focus:border-stone-900 focus:outline-none"
                >
                  {bankAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.bankName || "Bank"}) • Bal: {currencySymbol}
                      {a.currentBalance.toLocaleString("en-IN")}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">
                  Current Ledger Balance
                </span>
                <span className="font-mono text-sm font-bold text-stone-950">
                  {currencySymbol}
                  {bookBalance.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AdminStatCard
              title="Society Ledger Balance"
              value={`${currencySymbol}${bookBalance.toLocaleString("en-IN")}`}
              subtitle="System bank balance as of today"
              icon={
                <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                </svg>
              }
            />

            <AdminStatCard
              title="(+) Unpresented Cheques"
              value={`${currencySymbol}${unpresentedTotal.toLocaleString("en-IN")}`}
              subtitle={`${unpresentedCheques.length} outward vendor cheques pending debit`}
              icon={
                <svg className="h-5 w-5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
              }
            />

            <AdminStatCard
              title="(-) Uncredited Cheques"
              value={`${currencySymbol}${uncreditedTotal.toLocaleString("en-IN")}`}
              subtitle={`${uncreditedCheques.length} inward cheques pending clearing`}
              icon={
                <svg className="h-5 w-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                </svg>
              }
            />

            <AdminStatCard
              title="Adjusted Bank Balance"
              value={`${currencySymbol}${adjustedBalance.toLocaleString("en-IN")}`}
              subtitle="Expected bank statement closing figure"
              icon={
                <svg className="h-5 w-5 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
          </div>

          {/* Visual Financial Waterfall Bridge */}
          <BrsBalanceBridge
            currencySymbol={currencySymbol}
            bookBalance={bookBalance}
            unpresentedTotal={unpresentedTotal}
            unpresentedCount={unpresentedList.length}
            uncreditedTotal={uncreditedTotal}
            uncreditedCount={uncreditedList.length}
            adjustedBalance={adjustedBalance}
            statementBalanceNum={stmtBalNum}
            hasStatementBalance={statementBalance.trim() !== ""}
            difference={difference}
            isBalanced={isBalanced}
          />

          {/* Interactive Reconciliation Engine Card */}
          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-100 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Statutory BRS Calculation
                </span>
                <h3 className="text-base font-bold text-stone-950">Bank Reconciliation Statement</h3>
                <p className="text-xs text-stone-500">
                  Compare Society books with Passbook / Bank Statement closing figures and audit timing differences.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-950 transition shadow-xs"
                  title="Export Bank Reconciliation Statement as CSV"
                >
                  <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Export CSV</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-stone-950 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-stone-800 transition"
                  title="Download Official Signed Audit BRS PDF"
                >
                  <svg className="h-4 w-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Download BRS PDF</span>
                </button>
              </div>
            </div>

            {saveMessage && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                {saveMessage}
              </div>
            )}

            {saveError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {saveError}
              </div>
            )}

            <form onSubmit={handleCommit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 border-b border-stone-100 pb-5">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-stone-700">
                    Statement As-Of Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={statementDate}
                    onChange={(e) => setStatementDate(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-stone-700">
                    Bank Statement Closing Balance (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={statementBalance}
                    onChange={(e) => setStatementBalance(e.target.value)}
                    placeholder="Enter exact balance from bank statement"
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-stone-700">
                    Reconciliation Match Result
                  </label>
                  <div className="h-9 flex items-center">
                    {statementBalance.trim() === "" ? (
                      <span className="text-xs text-stone-400 italic">
                        Enter statement balance to calculate
                      </span>
                    ) : isBalanced ? (
                      <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5 w-full">
                        <span>✓ RECONCILED (₹0.00 Variance)</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5 w-full">
                        <span>
                          ⚠️ Difference: {currencySymbol}
                          {Math.abs(difference).toLocaleString("en-IN")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="sm:col-span-3 space-y-1">
                  <label className="text-[11px] font-semibold text-stone-700">
                    Auditor Notes / Discrepancy Remarks
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Bank charges of ₹150 debited by bank on 31-Jan not yet booked in society ledger."
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
                  />
                </div>
              </div>

              {canManage && (
                <div className="flex items-center justify-end gap-3">
                  <button
                    type="submit"
                    disabled={isPending || statementBalance.trim() === ""}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition disabled:opacity-50"
                  >
                    {isPending ? "Committing..." : "Commit BRS Statement"}
                  </button>
                </div>
              )}
            </form>

            {/* Uncleared Cheques breakdown */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 pt-2">
              {/* Unpresented Outward Cheques */}
              <AdminCard
                title={`Unpresented Outward Cheques (${unpresentedList.length})`}
                description="Cheques issued to vendors/contractors not yet debited by bank"
              >
                {unpresentedList.length === 0 ? (
                  <p className="text-xs text-stone-400 italic py-2">
                    No unpresented outward cheques.
                  </p>
                ) : (
                  <div className="space-y-2.5 text-xs pt-1">
                    {unpresentedList.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between border-b border-stone-100 pb-2.5 gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-stone-900">
                              Cheque #{c.chequeNumber}
                            </span>
                            <span className="text-[10px] text-stone-400 font-mono">
                              ({formatDateInAppTimeZone(c.chequeDate)})
                            </span>
                          </div>
                          <span className="text-[11px] text-stone-500 block truncate" title={c.partyName}>
                            {c.partyName}
                          </span>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <div className="text-right">
                            <span className="font-mono font-bold text-emerald-700">
                              +{currencySymbol}
                              {c.amount.toLocaleString("en-IN")}
                            </span>
                          </div>

                          {canManage && (
                            <button
                              type="button"
                              onClick={() => {
                                setClearingTarget(c)
                                setClearedDateInput(statementDate || new Date().toISOString().split("T")[0])
                              }}
                              className="inline-flex items-center gap-1 rounded-xl border border-stone-200 bg-stone-50/80 px-2.5 py-1 text-[10px] font-bold text-stone-700 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-800 transition"
                              title="Mark this cheque cleared"
                            >
                              <span>✓</span>
                              <span>Clear</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </AdminCard>

              {/* Uncredited Inward Cheques */}
              <AdminCard
                title={`Uncredited Inward Cheques (${uncreditedList.length})`}
                description="Resident maintenance cheques deposited, pending bank clearing"
              >
                {uncreditedList.length === 0 ? (
                  <p className="text-xs text-stone-400 italic py-2">
                    No uncredited inward cheques.
                  </p>
                ) : (
                  <div className="space-y-2.5 text-xs pt-1">
                    {uncreditedList.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between border-b border-stone-100 pb-2.5 gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-stone-900">
                              Cheque #{c.chequeNumber}
                            </span>
                            <span className="text-[10px] text-stone-400 font-mono">
                              ({formatDateInAppTimeZone(c.chequeDate)})
                            </span>
                          </div>
                          <span className="text-[11px] text-stone-500 block truncate" title={c.partyName}>
                            {c.partyName}
                          </span>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <div className="text-right">
                            <span className="font-mono font-bold text-amber-700">
                              -{currencySymbol}
                              {c.amount.toLocaleString("en-IN")}
                            </span>
                          </div>

                          {canManage && (
                            <button
                              type="button"
                              onClick={() => {
                                setClearingTarget(c)
                                setClearedDateInput(statementDate || new Date().toISOString().split("T")[0])
                              }}
                              className="inline-flex items-center gap-1 rounded-xl border border-stone-200 bg-stone-50/80 px-2.5 py-1 text-[10px] font-bold text-stone-700 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-800 transition"
                              title="Mark this cheque cleared"
                            >
                              <span>✓</span>
                              <span>Clear</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </AdminCard>
            </div>
          </div>

          {/* Historical Reconciliation Statements Log */}
          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Historical Audit Records
              </span>
              <h3 className="text-base font-bold text-stone-950">
                Past Bank Reconciliation Statements
              </h3>
              <p className="text-xs text-stone-500">
                Monthly signed BRS statements committed by committee and auditors.
              </p>
            </div>

            {historicalRecons.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 p-8 text-center">
                <p className="text-xs text-stone-500">No reconciliation statements committed yet.</p>
              </div>
            ) : (
              <AdminTable
                headers={[
                  "Statement As-Of Date",
                  "Account Name",
                  "Passbook Closing Balance",
                  "Society Ledger Balance",
                  "Discrepancy / Variance",
                  "Status",
                  "Auditor Notes",
                ]}
                rows={historicalRecons.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-stone-100 text-xs hover:bg-stone-50/60 transition"
                  >
                    <td className="px-4 py-3.5 font-bold text-stone-950">
                      {formatDateInAppTimeZone(r.statementDate)}
                    </td>

                    <td className="px-4 py-3.5 text-stone-800 font-medium">
                      {r.accountName}
                    </td>

                    <td className="px-4 py-3.5 font-mono font-bold text-stone-900">
                      {currencySymbol}
                      {r.statementBalance.toLocaleString("en-IN")}
                    </td>

                    <td className="px-4 py-3.5 font-mono font-semibold text-stone-700">
                      {currencySymbol}
                      {r.bookBalance.toLocaleString("en-IN")}
                    </td>

                    <td className="px-4 py-3.5 font-mono">
                      {Math.abs(r.discrepancy) < 0.01 ? (
                        <span className="text-emerald-700 font-semibold">₹0.00</span>
                      ) : (
                        <span className="text-amber-700 font-bold">
                          {currencySymbol}
                          {r.discrepancy.toLocaleString("en-IN")}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <AdminBadge
                        variant={r.status === "RECONCILED" ? "success" : "warning"}
                        size="sm"
                        dot
                      >
                        {r.status}
                      </AdminBadge>
                    </td>

                    <td className="px-4 py-3.5 text-stone-600 max-w-xs truncate">
                      {r.notes || "—"}
                    </td>
                  </tr>
                ))}
              />
            )}
          </div>
        </div>
      )}
      {/* Inline Cheque Clearance Modal Dialog */}
      {clearingTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                  ✓
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-950">
                    Mark Cheque as Cleared
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    {clearingTarget.direction === "OUTWARD" ? "Outward Vendor Cheque" : "Inward Resident Cheque"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setClearingTarget(null)}
                className="text-stone-400 hover:text-stone-700 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="rounded-2xl bg-stone-50 p-3.5 space-y-2 border border-stone-200/80 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Cheque Number:</span>
                <span className="font-mono font-bold text-stone-900">
                  #{clearingTarget.chequeNumber}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Party / Name:</span>
                <span className="font-semibold text-stone-900 truncate max-w-[200px]">
                  {clearingTarget.partyName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Issue / Deposit Date:</span>
                <span className="font-mono text-stone-700">
                  {formatDateInAppTimeZone(clearingTarget.chequeDate)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-stone-200/60 pt-2">
                <span className="font-bold text-stone-700">Cheque Amount:</span>
                <span className={`font-mono font-bold text-sm ${clearingTarget.direction === "OUTWARD" ? "text-emerald-700" : "text-amber-700"}`}>
                  {clearingTarget.direction === "OUTWARD" ? "+" : "-"}{currencySymbol}{clearingTarget.amount.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-800">
                Bank Statement Clearing Date *
              </label>
              <input
                type="date"
                required
                value={clearedDateInput}
                onChange={(e) => setClearedDateInput(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
              />
              <p className="text-[11px] text-stone-400">
                The date when this cheque was cleared/debited in the bank passbook.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setClearingTarget(null)}
                className="rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isClearingSubmitting}
                onClick={handleConfirmClearCheque}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition disabled:opacity-50"
              >
                {isClearingSubmitting ? "Clearing..." : "Confirm Clearance"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
