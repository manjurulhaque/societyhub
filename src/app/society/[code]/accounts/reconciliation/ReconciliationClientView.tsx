"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { AdminStatCard, AdminBadge, AdminTable, AdminCard } from "@/components/admin"
import { commitBankReconciliation } from "./actions"
import { formatDateInAppTimeZone } from "@/lib/datetime"

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
  currencySymbol: string
  bankAccounts: BankAccountOption[]
  unpresentedCheques: UnclearedCheque[]
  uncreditedCheques: UnclearedCheque[]
  historicalRecons: HistoricalReconItem[]
  canManage: boolean
}

export function ReconciliationClientView({
  societyCode,
  currencySymbol,
  bankAccounts,
  unpresentedCheques,
  uncreditedCheques,
  historicalRecons,
  canManage,
}: ReconciliationClientViewProps) {
  const [selectedAccountId, setSelectedAccountId] = useState(bankAccounts[0]?.id || "")
  const [statementDate, setStatementDate] = useState(new Date().toISOString().split("T")[0])
  const [statementBalance, setStatementBalance] = useState("")
  const [notes, setNotes] = useState("")

  const [isPending, startTransition] = useTransition()
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const selectedAccount = bankAccounts.find((a) => a.id === selectedAccountId) || bankAccounts[0]
  const bookBalance = selectedAccount ? selectedAccount.currentBalance : 0

  const unpresentedTotal = unpresentedCheques.reduce((sum, c) => sum + c.amount, 0)
  const uncreditedTotal = uncreditedCheques.reduce((sum, c) => sum + c.amount, 0)

  // Standard BRS formula: Adjusted = Book Balance + Unpresented - Uncredited
  const adjustedBalance = bookBalance + unpresentedTotal - uncreditedTotal

  const stmtBalNum = parseFloat(statementBalance) || 0
  const difference = stmtBalNum ? Math.round((adjustedBalance - stmtBalNum) * 100) / 100 : 0
  const isBalanced = statementBalance.trim() !== "" && Math.abs(difference) < 0.01

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
      {/* Top Breadcrumb & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={`/society/${societyCode}/accounts`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900 transition"
        >
          <span>←</span>
          <span>Back to Bank & Cash Accounts</span>
        </Link>

        {bankAccounts.length > 0 && (
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-stone-600">Reconciling Account:</label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-900 focus:border-stone-900 focus:outline-none"
            >
              {bankAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.bankName || "Bank"}) • Bal: {currencySymbol}{a.currentBalance.toLocaleString("en-IN")}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

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

      {/* Interactive Reconciliation Engine Card */}
      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs space-y-5">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Statutory BRS Calculation</span>
          <h3 className="text-base font-bold text-stone-950">Bank Reconciliation Statement</h3>
          <p className="text-xs text-stone-500">
            Compare Society books with Passbook / Bank Statement closing figures and audit timing differences.
          </p>
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
              <label className="text-[11px] font-semibold text-stone-700">Statement As-Of Date *</label>
              <input
                type="date"
                required
                value={statementDate}
                onChange={(e) => setStatementDate(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-stone-700">Bank Statement Closing Balance (₹) *</label>
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
              <label className="text-[11px] font-semibold text-stone-700">Reconciliation Match Result</label>
              <div className="h-9 flex items-center">
                {statementBalance.trim() === "" ? (
                  <span className="text-xs text-stone-400 italic">Enter statement balance to calculate</span>
                ) : isBalanced ? (
                  <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5 w-full">
                    <span>✓ RECONCILED (₹0.00 Variance)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5 w-full">
                    <span>⚠️ Difference: {currencySymbol}{Math.abs(difference).toLocaleString("en-IN")}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="sm:col-span-3 space-y-1">
              <label className="text-[11px] font-semibold text-stone-700">Auditor Notes / Discrepancy Remarks</label>
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
            title={`Unpresented Outward Cheques (${unpresentedCheques.length})`}
            description="Cheques issued to vendors/contractors not yet debited by bank"
          >
            {unpresentedCheques.length === 0 ? (
              <p className="text-xs text-stone-400 italic py-2">No unpresented outward cheques.</p>
            ) : (
              <div className="space-y-2 text-xs pt-1">
                {unpresentedCheques.map((c) => (
                  <div key={c.id} className="flex items-center justify-between border-b border-stone-100 pb-2">
                    <div>
                      <span className="font-mono font-bold text-stone-900">Cheque #{c.chequeNumber}</span>
                      <span className="text-[11px] text-stone-500 block">{c.partyName}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-emerald-700">+{currencySymbol}{c.amount.toLocaleString("en-IN")}</span>
                      <span className="text-[10px] text-stone-400 block">{formatDateInAppTimeZone(c.chequeDate)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AdminCard>

          {/* Uncredited Inward Cheques */}
          <AdminCard
            title={`Uncredited Inward Cheques (${uncreditedCheques.length})`}
            description="Resident maintenance cheques deposited, pending bank clearing"
          >
            {uncreditedCheques.length === 0 ? (
              <p className="text-xs text-stone-400 italic py-2">No uncredited inward cheques.</p>
            ) : (
              <div className="space-y-2 text-xs pt-1">
                {uncreditedCheques.map((c) => (
                  <div key={c.id} className="flex items-center justify-between border-b border-stone-100 pb-2">
                    <div>
                      <span className="font-mono font-bold text-stone-900">Cheque #{c.chequeNumber}</span>
                      <span className="text-[11px] text-stone-500 block">{c.partyName}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-amber-700">-{currencySymbol}{c.amount.toLocaleString("en-IN")}</span>
                      <span className="text-[10px] text-stone-400 block">{formatDateInAppTimeZone(c.chequeDate)}</span>
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
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Historical Audit Records</span>
          <h3 className="text-base font-bold text-stone-950">Past Bank Reconciliation Statements</h3>
          <p className="text-xs text-stone-500">Monthly signed BRS statements committed by committee and auditors.</p>
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
              <tr key={r.id} className="border-t border-stone-100 text-xs hover:bg-stone-50/60 transition">
                <td className="px-4 py-3.5 font-bold text-stone-950">
                  {formatDateInAppTimeZone(r.statementDate)}
                </td>

                <td className="px-4 py-3.5 text-stone-800 font-medium">
                  {r.accountName}
                </td>

                <td className="px-4 py-3.5 font-mono font-bold text-stone-900">
                  {currencySymbol}{r.statementBalance.toLocaleString("en-IN")}
                </td>

                <td className="px-4 py-3.5 font-mono font-semibold text-stone-700">
                  {currencySymbol}{r.bookBalance.toLocaleString("en-IN")}
                </td>

                <td className="px-4 py-3.5 font-mono">
                  {Math.abs(r.discrepancy) < 0.01 ? (
                    <span className="text-emerald-700 font-semibold">₹0.00</span>
                  ) : (
                    <span className="text-amber-700 font-bold">
                      {currencySymbol}{r.discrepancy.toLocaleString("en-IN")}
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
  )
}
