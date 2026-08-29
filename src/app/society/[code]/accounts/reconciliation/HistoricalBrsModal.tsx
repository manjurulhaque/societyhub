"use client"

import React from "react"
import { AdminBadge } from "@/components/admin"
import { formatDateInAppTimeZone } from "@/lib/datetime"
import {
  generateBankReconciliationPDF,
  generateBankReconciliationCsv,
  type ReconPdfSocietyInfo,
} from "@/lib/pdf/bankReconPdfGenerator"

export type HistoricalReconItem = {
  id: string
  accountId?: string
  accountName: string
  bankName?: string | null
  accountNumber?: string | null
  statementDate: string
  statementBalance: number
  bookBalance: number
  uncreditedAmount: number
  unpresentedAmount: number
  discrepancy: number
  status: string
  notes: string | null
  reconciledAt?: string | null
  createdAt: string
}

interface HistoricalBrsModalProps {
  recon: HistoricalReconItem | null
  societyInfo?: ReconPdfSocietyInfo
  currencySymbol: string
  onClose: () => void
}

export function HistoricalBrsModal({
  recon,
  societyInfo,
  currencySymbol,
  onClose,
}: HistoricalBrsModalProps) {
  if (!recon) return null

  const isReconciled = recon.status === "RECONCILED" || Math.abs(recon.discrepancy) < 0.01

  const handleDownloadPdf = () => {
    generateBankReconciliationPDF({
      society: societyInfo || { name: "Housing Society" },
      accountName: recon.accountName,
      bankName: recon.bankName || null,
      accountNumber: recon.accountNumber || null,
      statementDate: recon.statementDate,
      bookBalance: recon.bookBalance,
      unpresentedCheques: [],
      uncreditedCheques: [],
      statementBalance: recon.statementBalance,
      adjustedBalance: recon.bookBalance,
      discrepancy: recon.discrepancy,
      notes: recon.notes,
      currencySymbol,
      filename: `Historical_BRS_${recon.accountName.replace(/[^a-zA-Z0-9]/g, "_")}_${recon.statementDate.split("T")[0]}.pdf`,
    })
  }

  const handleExportCsv = () => {
    const csv = generateBankReconciliationCsv({
      society: societyInfo || { name: "Housing Society" },
      accountName: recon.accountName,
      bankName: recon.bankName || null,
      accountNumber: recon.accountNumber || null,
      statementDate: recon.statementDate,
      bookBalance: recon.bookBalance,
      unpresentedCheques: [],
      uncreditedCheques: [],
      statementBalance: recon.statementBalance,
      adjustedBalance: recon.bookBalance,
      discrepancy: recon.discrepancy,
      notes: recon.notes,
      currencySymbol,
    })

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `Historical_BRS_${recon.accountName.replace(/[^a-zA-Z0-9]/g, "_")}_${recon.statementDate.split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl border border-stone-200 space-y-5 animate-in fade-in-0 zoom-in-95">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-stone-100 pb-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Historical Audit Snapshot
              </span>
              <AdminBadge variant={isReconciled ? "success" : "warning"} size="sm" dot>
                {recon.status}
              </AdminBadge>
            </div>
            <h3 className="text-base font-bold text-stone-950">
              BRS Snapshot: {recon.accountName}
            </h3>
            <p className="text-xs text-stone-500">
              As of Statement Date:{" "}
              <strong className="text-stone-800">
                {formatDateInAppTimeZone(recon.statementDate)}
              </strong>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-stone-100 text-stone-400 hover:bg-stone-200 hover:text-stone-700 transition"
          >
            ✕
          </button>
        </div>

        {/* Financial KPI Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
              Passbook Closing
            </span>
            <div className="font-mono text-sm font-bold text-stone-950">
              {currencySymbol}
              {recon.statementBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-stone-400 block">Bank Statement</span>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
              Ledger Book Balance
            </span>
            <div className="font-mono text-sm font-bold text-stone-950">
              {currencySymbol}
              {recon.bookBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-stone-400 block">Society Accounts</span>
          </div>

          <div
            className={`rounded-2xl border p-3.5 space-y-1 ${
              isReconciled
                ? "border-emerald-200 bg-emerald-50/50"
                : "border-amber-200 bg-amber-50/50"
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
              Discrepancy / Variance
            </span>
            <div
              className={`font-mono text-sm font-bold ${
                isReconciled ? "text-emerald-700" : "text-amber-800"
              }`}
            >
              {isReconciled
                ? "₹0.00 ✓"
                : `${currencySymbol}${Math.abs(recon.discrepancy).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
            </div>
            <span className="text-[10px] text-stone-500 block">
              {isReconciled ? "Fully Balanced" : "Timing Difference"}
            </span>
          </div>
        </div>

        {/* Audit Metadata Box */}
        <div className="rounded-2xl bg-stone-50 p-4 border border-stone-200/80 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-stone-500">Record ID:</span>
            <span className="font-mono text-[11px] text-stone-700">{recon.id}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-stone-500">Committed On:</span>
            <span className="font-semibold text-stone-900">
              {formatDateInAppTimeZone(recon.createdAt)}
            </span>
          </div>
          {recon.reconciledAt && (
            <div className="flex items-center justify-between">
              <span className="text-stone-500">Reconciled At:</span>
              <span className="font-semibold text-emerald-700">
                {formatDateInAppTimeZone(recon.reconciledAt)}
              </span>
            </div>
          )}
        </div>

        {/* Auditor & Committee Notes */}
        <div className="space-y-1.5">
          <span className="text-xs font-bold text-stone-800 block">
            Auditor Notes & Explanations:
          </span>
          <div className="rounded-2xl border border-stone-200 bg-stone-50/40 p-3 text-xs text-stone-700 leading-relaxed min-h-[60px]">
            {recon.notes ? (
              <p className="italic">"{recon.notes}"</p>
            ) : (
              <p className="text-stone-400 italic">No notes recorded for this reconciliation statement.</p>
            )}
          </div>
        </div>

        {/* Action Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-stone-100">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-950 transition shadow-xs"
            >
              <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 rounded-xl bg-stone-950 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-stone-800 transition"
            >
              <svg className="h-4 w-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Download BRS PDF</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
