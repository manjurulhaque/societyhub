"use client"

import React from "react"

export interface BrsBalanceBridgeProps {
  currencySymbol: string
  bookBalance: number
  unpresentedTotal: number
  unpresentedCount: number
  uncreditedTotal: number
  uncreditedCount: number
  adjustedBalance: number
  statementBalanceNum: number
  hasStatementBalance: boolean
  difference: number
  isBalanced: boolean
}

export function BrsBalanceBridge({
  currencySymbol,
  bookBalance,
  unpresentedTotal,
  unpresentedCount,
  uncreditedTotal,
  uncreditedCount,
  adjustedBalance,
  statementBalanceNum,
  hasStatementBalance,
  difference,
  isBalanced,
}: BrsBalanceBridgeProps) {
  // Proportional widths for mini visual bar
  const maxVal = Math.max(Math.abs(bookBalance), Math.abs(adjustedBalance), Math.abs(statementBalanceNum), 1)

  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-stone-100 pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
            Visual Financial Flow
          </span>
          <h3 className="text-base font-bold text-stone-950">BRS Reconciliation Bridge</h3>
          <p className="text-xs text-stone-500">
            Step-by-step mathematical transition from Society General Ledger to Bank Passbook.
          </p>
        </div>

        {hasStatementBalance && (
          <div>
            {isBalanced ? (
              <span className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-800 shadow-xs">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Balanced & Reconciled (₹0.00 Variance)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-2xl bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-bold text-amber-900 shadow-xs">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Variance: {currencySymbol}{Math.abs(difference).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Waterfall Step Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 relative">
        {/* Step 1: Book Balance */}
        <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4 space-y-1.5 transition hover:border-stone-300">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
              Step 1 • Base Book
            </span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-stone-200 text-[10px] font-bold text-stone-700">
              A
            </span>
          </div>
          <div className="text-xs font-bold text-stone-700 truncate">Society Ledger Balance</div>
          <div className="font-mono text-base font-bold text-stone-950">
            {currencySymbol}{bookBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-stone-500">Current active ledger balance</p>
        </div>

        {/* Step 2: Unpresented Cheques (Addition) */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-1.5 transition hover:border-emerald-300">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              Step 2 • Add (+)
            </span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-800">
              B
            </span>
          </div>
          <div className="text-xs font-bold text-emerald-900 truncate">Unpresented Cheques</div>
          <div className="font-mono text-base font-bold text-emerald-700">
            +{currencySymbol}{unpresentedTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-emerald-700/80">
            {unpresentedCount} vendor cheques pending debit
          </p>
        </div>

        {/* Step 3: Uncredited Cheques (Deduction) */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 space-y-1.5 transition hover:border-amber-300">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
              Step 3 • Less (-)
            </span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-800">
              C
            </span>
          </div>
          <div className="text-xs font-bold text-amber-900 truncate">Uncredited Cheques</div>
          <div className="font-mono text-base font-bold text-amber-700">
            -{currencySymbol}{uncreditedTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-amber-700/80">
            {uncreditedCount} member cheques in clearing
          </p>
        </div>

        {/* Step 4: Adjusted Balance */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4 space-y-1.5 transition hover:border-blue-300">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
              Step 4 • Expected
            </span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-800">
              =
            </span>
          </div>
          <div className="text-xs font-bold text-blue-950 truncate">Adjusted Book Figure</div>
          <div className="font-mono text-base font-bold text-blue-900">
            {currencySymbol}{adjustedBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-blue-700/80">Formula: (A + B - C)</p>
        </div>

        {/* Step 5: Bank Statement Figure */}
        <div
          className={`rounded-2xl border p-4 space-y-1.5 transition ${
            !hasStatementBalance
              ? "border-dashed border-stone-300 bg-stone-50/50"
              : isBalanced
              ? "border-emerald-300 bg-emerald-50/60"
              : "border-amber-300 bg-amber-50/60"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
              Step 5 • Bank Closing
            </span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-stone-200 text-[10px] font-bold text-stone-800">
              D
            </span>
          </div>
          <div className="text-xs font-bold text-stone-900 truncate">Passbook Statement</div>
          <div className="font-mono text-base font-bold text-stone-950">
            {hasStatementBalance
              ? `${currencySymbol}${statementBalanceNum.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
              : "Pending Entry"}
          </div>
          <p className="text-[10px] text-stone-500">
            {hasStatementBalance
              ? isBalanced
                ? "✓ 100% Match with Adjusted Books"
                : `Diff: ${currencySymbol}${Math.abs(difference).toLocaleString("en-IN")}`
              : "Enter closing balance below"}
          </p>
        </div>
      </div>

      {/* Variance Diagnostic Advice Panel */}
      {hasStatementBalance && !isBalanced && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-950">
            <svg className="h-4 w-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Auditor Variance Diagnosis ({currencySymbol}{Math.abs(difference).toLocaleString("en-IN")} Difference):</span>
          </div>

          <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-amber-900/90 leading-relaxed">
            {difference > 0 ? (
              <>
                <li>
                  <strong>Adjusted book balance is HIGHER than Bank Passbook:</strong> The bank statement has debited ₹{difference.toLocaleString("en-IN")} that is not yet booked in SARWS Connect.
                </li>
                <li>
                  Check for unbooked <em>Bank Service Charges, SMS alert fees, debit card annual maintenance fees</em>, or outward vendor ECS debits in the bank statement.
                </li>
                <li>
                  Check if any deposited member cheque was dishonored / bounced by the bank without being marked in the Cheque Register.
                </li>
              </>
            ) : (
              <>
                <li>
                  <strong>Bank Passbook is HIGHER than Adjusted book balance:</strong> The bank has received ₹{Math.abs(difference).toLocaleString("en-IN")} in credits not yet recorded in SARWS Connect.
                </li>
                <li>
                  Check for unassigned <em>direct NEFT/UPI resident maintenance transfers</em> in the Bank Statement Auto-Reconciliation tab.
                </li>
                <li>
                  Check for <em>Quarterly Savings Bank / Sweep Account Interest Credits</em> added directly by the bank.
                </li>
              </>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
