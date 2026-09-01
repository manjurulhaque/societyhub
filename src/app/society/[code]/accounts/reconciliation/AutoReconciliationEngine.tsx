"use client"

import { toast } from "sonner"

import { useState, useTransition, useMemo } from "react"
import { AdminBadge, AdminButton, AdminStatCard } from "@/components/admin"
import {
  analyzeStatementAction,
  executeAutoReconciliationBatch,
  getSampleBankStatementCsv,
} from "./autoReconcileActions"
import type {
  AutoReconciliationAnalysisResult,
  ReconciledTransactionMatch,
  ReconActionType,
} from "@/lib/accounting/bankAutoMatchEngine"

export type FlatOption = {
  id: string
  label: string
  flatNumber: string
  blockName: string | null
}

export type UnpaidBillOption = {
  id: string
  flatId: string
  flatLabel: string
  title: string
  amount: number
  month: number
  year: number
}

export type BankAccountOption = {
  id: string
  name: string
  bankName: string | null
  accountNumber: string | null
  currentBalance: number
}

interface AutoReconciliationEngineProps {
  societyCode: string
  currencySymbol: string
  bankAccounts: BankAccountOption[]
  selectedAccountId: string
  onAccountChange: (accountId: string) => void
  flats?: FlatOption[]
  unpaidBills?: UnpaidBillOption[]
  canManage: boolean
  onReconciliationComplete?: () => void
}

type FilterTab = "ALL" | "HIGH" | "MEDIUM" | "DUPLICATES" | "UNMATCHED" | "CREDITS" | "DEBITS"

export function AutoReconciliationEngine({
  societyCode,
  currencySymbol,
  bankAccounts,
  selectedAccountId,
  onAccountChange,
  flats = [],
  unpaidBills = [],
  canManage,
  onReconciliationComplete,
}: AutoReconciliationEngineProps) {
  const [csvContent, setCsvContent] = useState("")
  const [fileName, setFileName] = useState<string | null>(null)
  const [analysisResult, setAnalysisResult] = useState<AutoReconciliationAnalysisResult | null>(null)
  const [matches, setMatches] = useState<ReconciledTransactionMatch[]>([])
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set())
  const [filterTab, setFilterTab] = useState<FilterTab>("ALL")
  const [searchQuery, setSearchQuery] = useState("")

  const [isAnalyzing, startAnalyzing] = useTransition()
  const [isExecuting, startExecuting] = useTransition()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setErrorMessage(null)
    const reader = new FileReader()
    reader.onload = (evt) => {
      const text = evt.target?.result as string
      setCsvContent(text || "")
    }
    reader.onerror = () => {
      setErrorMessage("Failed to read the uploaded CSV file.")
    }
    reader.readAsText(file)
  }

  // Handle Drag & Drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file) return

    setFileName(file.name)
    setErrorMessage(null)
    const reader = new FileReader()
    reader.onload = (evt) => {
      const text = evt.target?.result as string
      setCsvContent(text || "")
    }
    reader.onerror = () => {
      setErrorMessage("Failed to read the dropped CSV file.")
    }
    reader.readAsText(file)
  }

  // Download Sample CSV
  const handleDownloadSample = async () => {
    try {
      const sampleCsv = await getSampleBankStatementCsv()
      const blob = new Blob([sampleCsv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `SocietyHub_Sample_Bank_Statement.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setErrorMessage("Failed to generate sample CSV.")
    }
  }

  // Trigger Analysis Server Action
  const handleAnalyze = () => {
    if (!csvContent.trim()) {
      setErrorMessage("Please select or drop a bank statement CSV file first.")
      return
    }

    setErrorMessage(null)
    setSuccessMessage(null)

    startAnalyzing(async () => {
      try {
        const res = await analyzeStatementAction(societyCode, selectedAccountId, csvContent)
        if (res.error || !res.result) {
          setErrorMessage(res.error || "Failed to analyze bank statement.")
        } else {
          setAnalysisResult(res.result)
          setMatches(res.result.matches)

          // Pre-select high confidence matches that are not duplicates
          const initialSelected = new Set<string>()
          res.result.matches.forEach((m) => {
            if (m.isAutoSelected && !m.isDuplicate) {
              initialSelected.add(m.rowId)
            }
          })
          setSelectedRowIds(initialSelected)
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error analyzing statement."
        setErrorMessage(msg)
      }
    })
  }

  // Clear Analysis
  const handleReset = () => {
    setAnalysisResult(null)
    setMatches([])
    setSelectedRowIds(new Set())
    setCsvContent("")
    setFileName(null)
    setErrorMessage(null)
    setSuccessMessage(null)
  }

  // Row selection toggle
  const toggleRow = (rowId: string) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev)
      if (next.has(rowId)) {
        next.delete(rowId)
      } else {
        next.add(rowId)
      }
      return next
    })
  }

  // Select all in current filter view (skip duplicates by default)
  const handleSelectAllInView = () => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev)
      filteredMatches.forEach((m) => {
        if (!m.isDuplicate && m.actionType !== "IGNORE") {
          next.add(m.rowId)
        }
      })
      return next
    })
  }

  // Deselect all
  const handleDeselectAll = () => {
    setSelectedRowIds(new Set())
  }

  // Select only high confidence matches
  const handleSelectHighOnly = () => {
    const next = new Set<string>()
    matches.forEach((m) => {
      if (m.confidence === "HIGH" && !m.isDuplicate) next.add(m.rowId)
    })
    setSelectedRowIds(next)
  }

  // Update a match item action or target inline
  const updateMatchAction = (rowId: string, actionType: ReconActionType) => {
    setMatches((prev) =>
      prev.map((item) => {
        if (item.rowId !== rowId) return item
        return {
          ...item,
          actionType,
        }
      })
    )
  }

  // Update target bill
  const updateMatchBill = (rowId: string, billId: string) => {
    const targetBill = unpaidBills.find((b) => b.id === billId)
    setMatches((prev) =>
      prev.map((item) => {
        if (item.rowId !== rowId) return item
        return {
          ...item,
          actionType: "RECORD_BILL_PAYMENT",
          matchedDetails: {
            ...item.matchedDetails,
            billId,
            billLabel: targetBill ? `${targetBill.month}/${targetBill.year} Bill` : undefined,
            billAmount: targetBill?.amount,
            flatId: targetBill?.flatId,
            flatLabel: targetBill?.flatLabel,
          },
        }
      })
    )
  }

  // Update target flat (for advance)
  const updateMatchFlat = (rowId: string, flatId: string) => {
    const targetFlat = flats.find((f) => f.id === flatId)
    setMatches((prev) =>
      prev.map((item) => {
        if (item.rowId !== rowId) return item
        return {
          ...item,
          actionType: "RECORD_ADVANCE_PAYMENT",
          matchedDetails: {
            ...item.matchedDetails,
            flatId,
            flatLabel: targetFlat ? targetFlat.label : undefined,
          },
        }
      })
    )
  }

  // Filtered list based on active tab and search
  const filteredMatches = useMemo(() => {
    return matches.filter((item) => {
      // Tab filter
      if (filterTab === "HIGH" && (item.confidence !== "HIGH" || item.isDuplicate)) return false
      if (filterTab === "MEDIUM" && (item.confidence !== "MEDIUM" || item.isDuplicate)) return false
      if (filterTab === "DUPLICATES" && !item.isDuplicate) return false
      if (filterTab === "UNMATCHED" && (item.confidence !== "NONE" || item.isDuplicate)) return false
      if (filterTab === "CREDITS" && item.type !== "CREDIT") return false
      if (filterTab === "DEBITS" && item.type !== "DEBIT") return false

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchText = [
          item.narration,
          item.referenceNumber || "",
          item.chequeNumber || "",
          item.matchedDetails.flatLabel || "",
          item.matchedDetails.partyName || "",
          item.matchedDetails.vendorName || "",
          item.reason,
          item.duplicateReason || "",
        ]
          .join(" ")
          .toLowerCase()
        if (!matchText.includes(q)) return false
      }

      return true
    })
  }, [matches, filterTab, searchQuery])

  // Computed summary for selected items
  const selectedSummary = useMemo(() => {
    let creditTotal = 0
    let debitTotal = 0
    let count = 0

    matches.forEach((m) => {
      if (selectedRowIds.has(m.rowId) && m.actionType !== "IGNORE" && m.actionType !== "MANUAL_REVIEW") {
        count++
        if (m.type === "CREDIT") creditTotal += m.credit
        else debitTotal += m.debit
      }
    })

    return {
      count,
      creditTotal: Math.round(creditTotal * 100) / 100,
      debitTotal: Math.round(debitTotal * 100) / 100,
      netTotal: Math.round((creditTotal + debitTotal) * 100) / 100,
    }
  }, [matches, selectedRowIds])

  // Execute Batch Reconciliation
  const handleExecuteBatch = () => {
    const itemsToExecute = matches.filter(
      (m) => selectedRowIds.has(m.rowId) && m.actionType !== "IGNORE" && m.actionType !== "MANUAL_REVIEW"
    )

    if (itemsToExecute.length === 0) {
      setErrorMessage("No valid transactions selected for reconciliation.")
      return
    }

    setErrorMessage(null)
    setSuccessMessage(null)

    startExecuting(async () => {
      const res = await executeAutoReconciliationBatch(societyCode, selectedAccountId, itemsToExecute)
      if (res.error) {
        setErrorMessage(res.error)
      } else {
        setSuccessMessage(
          res.message || `Successfully auto-reconciled ${res.reconciledCount} transactions!`
        )
        // Remove reconciled items from the active list
        const executedIds = new Set(itemsToExecute.map((i) => i.rowId))
        setMatches((prev) => prev.filter((m) => !executedIds.has(m.rowId)))
        setSelectedRowIds(new Set())
        if (onReconciliationComplete) {
          onReconciliationComplete()
        }
      }
    })
  }

  const selectedAccount = bankAccounts.find((a) => a.id === selectedAccountId) || bankAccounts[0]

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {successMessage && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>✓</span>
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-500 hover:text-emerald-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Stage 1: Upload & Account Selection when no analysis is active */}
      {!analysisResult ? (
        <div className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-100 pb-5">
            <div>
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                Automated Ledger Matching
              </span>
              <h2 className="text-lg font-bold text-stone-950 mt-1">
                Upload & Auto-Reconcile Bank Statement
              </h2>
              <p className="text-xs text-stone-500">
                Upload your bank statement (CSV from HDFC, ICICI, SBI, Axis, Kotak, or Generic) to automatically match maintenance dues, inward cheques, and vendor expenses.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <AdminButton
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadSample}
                leftIcon={
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                }
              >
                Download Sample CSV
              </AdminButton>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Account Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-800">
                Target Bank Account *
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => onAccountChange(e.target.value)}
                className="w-full rounded-2xl border border-stone-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-stone-900 focus:border-stone-900 focus:outline-none"
              >
                {bankAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.bankName || "Bank"}) • Bal: {currencySymbol}
                    {acc.currentBalance.toLocaleString("en-IN")}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-stone-400">
                The bank account whose passbook/statement is being reconciled.
              </p>
            </div>

            {/* Drag and Drop Zone */}
            <div className="md:col-span-2">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className={`relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed p-6 text-center transition ${
                  csvContent
                    ? "border-emerald-400 bg-emerald-50/30"
                    : "border-stone-200 bg-stone-50/50 hover:border-stone-400 hover:bg-stone-50"
                }`}
              >
                <input
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  onChange={handleFileUpload}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-xs border border-stone-200 mb-3 text-stone-700">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>

                {fileName ? (
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-emerald-800">
                      📄 {fileName}
                    </p>
                    <p className="text-[11px] text-emerald-600">
                      Statement loaded. Ready for automatic matching!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-stone-800">
                      Click to choose CSV file or drag and drop here
                    </p>
                    <p className="text-[11px] text-stone-400">
                      Supports HDFC, ICICI, SBI, Axis, Kotak, PNB, and standard CSV formats
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Trigger */}
          <div className="flex justify-end gap-3 pt-2">
            <AdminButton
              type="button"
              variant="primary"
              size="md"
              disabled={!csvContent.trim() || isAnalyzing}
              isLoading={isAnalyzing}
              onClick={handleAnalyze}
              leftIcon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
            >
              {isAnalyzing ? "Analyzing Statement..." : "Scan & Auto-Match Statement"}
            </AdminButton>
          </div>
        </div>
      ) : (
        /* Stage 2: Analyzed Review Grid & Execution Workspace */
        <div className="space-y-6">
          {/* Header & Reset bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-3xl border border-stone-200 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                ⚡
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-950">
                  Statement Analysis for {selectedAccount?.name}
                </h3>
                <p className="text-[11px] text-stone-500">
                  Format Detected: <span className="font-bold text-stone-700">{analysisResult.statement.format}</span> • Total Rows: <span className="font-bold text-stone-700">{analysisResult.summary.totalRows}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <AdminButton
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
              >
                Upload Different Statement
              </AdminButton>
            </div>
          </div>

          {/* KPI Dashboard */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AdminStatCard
              title="Total Statement Rows"
              value={`${analysisResult.summary.totalRows}`}
              subtitle={`${analysisResult.statement.creditCount} Deposits • ${analysisResult.statement.debitCount} Withdrawals`}
              icon={
                <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
            />

            <AdminStatCard
              title="High Confidence Matches"
              value={`${analysisResult.summary.highConfidenceCount}`}
              subtitle={`${Math.round((analysisResult.summary.highConfidenceCount / Math.max(analysisResult.summary.totalRows, 1)) * 100)}% 1-Click Auto Reconciled`}
              icon={
                <svg className="h-5 w-5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />

            <AdminStatCard
              title="Matched Credit Flow"
              value={`${currencySymbol}${analysisResult.summary.matchedCreditAmount.toLocaleString("en-IN")}`}
              subtitle="Maintenance dues & deposits"
              icon={
                <svg className="h-5 w-5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
              }
            />

            <AdminStatCard
              title="Matched Debit Flow"
              value={`${currencySymbol}${analysisResult.summary.matchedDebitAmount.toLocaleString("en-IN")}`}
              subtitle="Cheques, charges & AMC"
              icon={
                <svg className="h-5 w-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                </svg>
              }
            />
          </div>

          {/* Filter & Action Toolbar */}
          <div className="rounded-3xl border border-stone-200 bg-white p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              {/* Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 bg-stone-50 p-1 rounded-2xl border border-stone-200/80">
                <button
                  type="button"
                  onClick={() => setFilterTab("ALL")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    filterTab === "ALL"
                      ? "bg-white text-stone-950 shadow-xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  All ({matches.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab("HIGH")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    filterTab === "HIGH"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-emerald-700 hover:bg-emerald-100/50"
                  }`}
                >
                  🟢 Exact Matches ({analysisResult.summary.highConfidenceCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab("MEDIUM")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    filterTab === "MEDIUM"
                      ? "bg-amber-500 text-white shadow-xs"
                      : "text-amber-700 hover:bg-amber-100/50"
                  }`}
                >
                  🟡 Probable ({analysisResult.summary.mediumConfidenceCount})
                </button>
                {analysisResult.summary.duplicateCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilterTab("DUPLICATES")}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      filterTab === "DUPLICATES"
                        ? "bg-purple-700 text-white shadow-xs"
                        : "text-purple-700 hover:bg-purple-100/50"
                    }`}
                  >
                    🛡️ Already Accounted ({analysisResult.summary.duplicateCount})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setFilterTab("UNMATCHED")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    filterTab === "UNMATCHED"
                      ? "bg-stone-700 text-white shadow-xs"
                      : "text-stone-500 hover:text-stone-900"
                  }`}
                >
                  ⚪ Unmatched ({analysisResult.summary.unmatchedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab("CREDITS")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    filterTab === "CREDITS"
                      ? "bg-white text-stone-950 shadow-xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  📥 Deposits
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab("DEBITS")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    filterTab === "DEBITS"
                      ? "bg-white text-stone-950 shadow-xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  📤 Withdrawals
                </button>
              </div>

              {/* Search Bar */}
              <div className="w-full md:w-64">
                <input
                  type="text"
                  placeholder="Search flat, UTR, cheque, text..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-2xl border border-stone-200 bg-white px-3.5 py-1.5 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
                />
              </div>
            </div>

            {/* Quick Bulk Selection Buttons & Execution Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-stone-100">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectHighOnly}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-900 hover:underline"
                >
                  Select High Confidence
                </button>
                <span className="text-stone-300">•</span>
                <button
                  type="button"
                  onClick={handleSelectAllInView}
                  className="text-xs font-semibold text-stone-600 hover:text-stone-900 hover:underline"
                >
                  Select In View ({filteredMatches.length})
                </button>
                <span className="text-stone-300">•</span>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="text-xs font-semibold text-stone-400 hover:text-stone-700 hover:underline"
                >
                  Deselect All
                </button>
              </div>

              <div className="flex items-center gap-3">
                {selectedSummary.count > 0 && (
                  <span className="text-xs font-bold text-stone-700">
                    Selected: {selectedSummary.count} Items ({currencySymbol}
                    {selectedSummary.netTotal.toLocaleString("en-IN")})
                  </span>
                )}

                {canManage && (
                  <AdminButton
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={selectedSummary.count === 0 || isExecuting}
                    isLoading={isExecuting}
                    onClick={handleExecuteBatch}
                    leftIcon={
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    }
                  >
                    {isExecuting
                      ? "Reconciling..."
                      : `Reconcile Selected (${selectedSummary.count})`}
                  </AdminButton>
                )}
              </div>
            </div>
          </div>

          {/* Interactive Match Table */}
          <div className="rounded-3xl border border-stone-200 bg-white overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50/75 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                    <th className="p-3.5 pl-5 w-10">
                      <input
                        type="checkbox"
                        checked={
                          filteredMatches.length > 0 &&
                          filteredMatches.every((m) => selectedRowIds.has(m.rowId))
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            handleSelectAllInView()
                          } else {
                            handleDeselectAll()
                          }
                        }}
                        className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Transaction Narration & Tags</th>
                    <th className="p-3.5 text-right">Amount</th>
                    <th className="p-3.5">Match Status</th>
                    <th className="p-3.5">Suggested Action & Target</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredMatches.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-xs text-stone-400">
                        No transactions found matching current filter or search.
                      </td>
                    </tr>
                  ) : (
                    filteredMatches.map((item) => {
                      const isSelected = selectedRowIds.has(item.rowId)
                      const isCredit = item.type === "CREDIT"
                      const amount = isCredit ? item.credit : item.debit

                      return (
                        <tr
                          key={item.rowId}
                          className={`transition hover:bg-stone-50/80 ${
                            isSelected ? "bg-emerald-50/30" : item.isDuplicate ? "bg-stone-50/60 opacity-80" : ""
                          }`}
                        >
                          <td className="p-3.5 pl-5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleRow(item.rowId)}
                              className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                            />
                          </td>

                          <td className="p-3.5 font-mono text-[11px] text-stone-600 whitespace-nowrap">
                            {item.date}
                          </td>

                          <td className="p-3.5 max-w-sm space-y-1">
                            <div className="font-semibold text-stone-900 leading-tight">
                              {item.narration}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                              {item.isDuplicate && (
                                <span className="inline-flex items-center rounded-md bg-purple-100 text-purple-800 px-1.5 py-0.5 text-[10px] font-bold">
                                  🛡️ Duplicate / Past Upload
                                </span>
                              )}
                              {item.chequeNumber && (
                                <span className="inline-flex items-center rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-mono font-bold text-stone-700">
                                  Chq #{item.chequeNumber}
                                </span>
                              )}
                              {item.referenceNumber && (
                                <span className="inline-flex items-center rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-mono text-stone-600">
                                  Ref: {item.referenceNumber}
                                </span>
                              )}
                              {item.matchedDetails.flatLabel && (
                                <span className="inline-flex items-center rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-800">
                                  🏢 Flat {item.matchedDetails.flatLabel}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="p-3.5 text-right whitespace-nowrap">
                            <div
                              className={`font-mono font-bold ${
                                isCredit ? "text-emerald-700" : "text-stone-900"
                              }`}
                            >
                              {isCredit ? "+" : "-"}
                              {currencySymbol}
                              {amount.toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                              })}
                            </div>
                            <span className="text-[10px] text-stone-400 font-medium uppercase">
                              {isCredit ? "Deposit" : "Withdrawal"}
                            </span>
                          </td>

                          <td className="p-3.5 whitespace-nowrap">
                            {item.isDuplicate ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 border border-purple-200/80 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                                🛡️ Already Accounted
                              </span>
                            ) : item.confidence === "HIGH" ? (
                              <AdminBadge variant="success" size="sm" dot>
                                Exact Match ({item.matchScore}%)
                              </AdminBadge>
                            ) : item.confidence === "MEDIUM" ? (
                              <AdminBadge variant="warning" size="sm" dot>
                                Probable Match
                              </AdminBadge>
                            ) : (
                              <AdminBadge variant="neutral" size="sm">
                                Unmatched
                              </AdminBadge>
                            )}
                            <p className="text-[11px] text-stone-500 mt-1 max-w-[220px] truncate" title={item.duplicateReason || item.reason}>
                              {item.duplicateReason || item.reason}
                            </p>
                          </td>

                          <td className="p-3.5">
                            <div className="space-y-1.5 min-w-[220px]">
                              {/* Action Selector */}
                              <select
                                value={item.actionType}
                                onChange={(e) =>
                                  updateMatchAction(item.rowId, e.target.value as ReconActionType)
                                }
                                className="w-full rounded-xl border border-stone-200 bg-white px-2.5 py-1 text-xs font-semibold text-stone-900 focus:border-stone-900 focus:outline-none"
                              >
                                {item.isDuplicate ? (
                                  <>
                                    <option value="ALREADY_RECONCILED">🛡️ Already Accounted (Skip)</option>
                                    <option value="IGNORE">Ignore</option>
                                    {isCredit ? (
                                      <option value="RECORD_BILL_PAYMENT">Force: Apply to Bill</option>
                                    ) : (
                                      <option value="RECORD_VENDOR_EXPENSE">Force: Record Expense</option>
                                    )}
                                  </>
                                ) : isCredit ? (
                                  <>
                                    <option value="RECORD_BILL_PAYMENT">Apply to Maintenance Bill</option>
                                    <option value="RECORD_ADVANCE_PAYMENT">Apply as Flat Advance Credit</option>
                                    <option value="CLEAR_INWARD_CHEQUE">Clear Inward Cheque</option>
                                    <option value="RECORD_BANK_INTEREST">Record Bank Interest Credit</option>
                                    <option value="IGNORE">Ignore / Already Accounted</option>
                                    <option value="MANUAL_REVIEW">Needs Manual Review</option>
                                  </>
                                ) : (
                                  <>
                                    <option value="CLEAR_OUTWARD_CHEQUE">Clear Outward Cheque</option>
                                    <option value="RECORD_BANK_CHARGE_EXPENSE">Record Bank Service Charge</option>
                                    <option value="RECORD_VENDOR_EXPENSE">Record Vendor Expense</option>
                                    <option value="IGNORE">Ignore / Already Accounted</option>
                                    <option value="MANUAL_REVIEW">Needs Manual Review</option>
                                  </>
                                )}
                              </select>

                              {/* Target Selector Helper if action requires entity */}
                              {item.actionType === "RECORD_BILL_PAYMENT" && unpaidBills.length > 0 && (
                                <select
                                  value={item.matchedDetails.billId || ""}
                                  onChange={(e) => updateMatchBill(item.rowId, e.target.value)}
                                  className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-2 py-1 text-[11px] text-stone-700 focus:border-stone-900 focus:outline-none"
                                >
                                  <option value="">Select target bill...</option>
                                  {unpaidBills.map((b) => (
                                    <option key={b.id} value={b.id}>
                                      Flat {b.flatLabel} • {b.month}/{b.year} ({currencySymbol}{b.amount})
                                    </option>
                                  ))}
                                </select>
                              )}

                              {item.actionType === "RECORD_ADVANCE_PAYMENT" && flats.length > 0 && (
                                <select
                                  value={item.matchedDetails.flatId || ""}
                                  onChange={(e) => updateMatchFlat(item.rowId, e.target.value)}
                                  className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-2 py-1 text-[11px] text-stone-700 focus:border-stone-900 focus:outline-none"
                                >
                                  <option value="">Select target flat...</option>
                                  {flats.map((f) => (
                                    <option key={f.id} value={f.id}>
                                      Flat {f.label}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
