"use client"

import React, { useState } from "react"
import { AdminBadge } from "@/components/admin"
import { formatDateInAppTimeZone, formatTimeInAppTimeZone } from "@/lib/datetime"
import { generateSafeCsv } from "@/lib/csv"
import { generateAuditReportPDF } from "@/lib/pdf/auditPdfGenerator"
import { AuditLogDetailModal, type AuditLogDetailData } from "./AuditLogDetailModal"
import type { AuditAction } from "@/generated/prisma/client"
import { FileSpreadsheet, FileText, ChevronRight } from "lucide-react"

export interface AuditLogTableClientProps {
  logs: AuditLogDetailData[]
  totalCount: number
  societyInfo?: {
    name: string
    address?: string | null
    city?: string | null
    state?: string | null
    pincode?: string | null
    registrationNumber?: string | null
    panNumber?: string | null
  } | null
  integrityStatus: {
    isValid: boolean
    message: string
    verifiedCount: number
    tamperedCount?: number
    legacyCount?: number
  }
}

export function AuditLogTableClient({
  logs,
  totalCount,
  societyInfo,
  integrityStatus,
}: AuditLogTableClientProps) {
  const [selectedLog, setSelectedLog] = useState<AuditLogDetailData | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  const getActionBadgeVariant = (act: AuditAction) => {
    switch (act) {
      case "CREATE":
        return "success"
      case "UPDATE":
        return "info"
      case "DELETE":
        return "danger"
      case "STATUS_CHANGE":
        return "warning"
      case "LOGIN":
      case "LOGOUT":
        return "neutral"
      default:
        return "neutral"
    }
  }

  const handleExportCSV = () => {
    setIsExporting(true)
    try {
      const headers = [
        "Timestamp (ISO)",
        "Action",
        "Entity",
        "Entity ID",
        "Operator Email",
        "Operator Role",
        "Description",
        "IP Address",
        "Signature (HMAC-SHA256)",
        "Previous Signature",
      ]

      const rows = logs.map((log) => [
        typeof log.createdAt === "string" ? log.createdAt : log.createdAt.toISOString(),
        log.action,
        log.entity,
        log.entityId || "",
        log.user?.email || "System",
        log.user?.appRole || "",
        log.description || "",
        log.ipAddress || "",
        log.signature || "",
        log.previousSignature || "GENESIS",
      ])

      const csvContent = generateSafeCsv(headers, rows)
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.setAttribute(
        "download",
        `audit_ledger_${societyInfo?.name ? societyInfo.name.toLowerCase().replace(/\s+/g, "_") : "system"}_${new Date().toISOString().slice(0, 10)}.csv`
      )
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportPDF = () => {
    setIsExporting(true)
    try {
      generateAuditReportPDF({
        society: societyInfo,
        scopeName: societyInfo?.name,
        totalRecords: totalCount,
        integrityStatus,
        rows: logs.map((log) => ({
          createdAt: log.createdAt,
          action: log.action,
          entity: log.entity,
          entityId: log.entityId,
          operator: log.user?.email || "System",
          description: log.description,
          ipAddress: log.ipAddress,
          signature: log.signature,
        })),
        filename: `certified_audit_report_${societyInfo?.name ? societyInfo.name.toLowerCase().replace(/\s+/g, "_") : "system"}_${new Date().toISOString().slice(0, 10)}.pdf`,
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-stone-50/70 p-3 rounded-2xl border border-stone-200">
        <div className="text-xs text-stone-600 font-medium">
          Showing <span className="font-bold text-stone-900">{logs.length}</span> of{" "}
          <span className="font-bold text-stone-900">{totalCount}</span> events
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={isExporting || logs.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 shadow-2xs hover:bg-stone-50 hover:text-stone-900 disabled:opacity-50 transition"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportPDF}
            disabled={isExporting || logs.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 shadow-2xs hover:bg-stone-50 hover:text-stone-900 disabled:opacity-50 transition"
          >
            <FileText className="h-3.5 w-3.5 text-rose-600" />
            <span>Certified PDF</span>
          </button>
        </div>
      </div>

      {/* Interactive Table */}
      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-2xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50 text-[11px] font-bold uppercase tracking-wider text-stone-500">
              <th className="px-4 py-3 whitespace-nowrap">Timestamp</th>
              <th className="px-4 py-3 whitespace-nowrap">Action</th>
              <th className="px-4 py-3 whitespace-nowrap">Entity</th>
              <th className="px-4 py-3 whitespace-nowrap">Operator / Member</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3 whitespace-nowrap">IP Address</th>
              <th className="px-4 py-3 text-right">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 bg-white">
            {logs.map((log) => {
              const hasDiff =
                (log.oldData !== null && log.oldData !== undefined) ||
                (log.newData !== null && log.newData !== undefined)

              return (
                <tr
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="group cursor-pointer transition-colors hover:bg-stone-50/90"
                >
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span className="block text-xs font-semibold text-stone-900">
                      {formatDateInAppTimeZone(log.createdAt)}
                    </span>
                    <span className="block font-mono text-[11px] text-stone-500">
                      {formatTimeInAppTimeZone(log.createdAt)}
                    </span>
                  </td>

                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <AdminBadge variant={getActionBadgeVariant(log.action)}>
                        {log.action}
                      </AdminBadge>
                    </div>
                  </td>

                  <td className="px-4 py-3.5 whitespace-nowrap font-mono text-xs font-bold text-stone-900">
                    {log.entity}
                    {log.entityId && (
                      <span className="block text-[10px] font-normal text-stone-400 truncate max-w-[120px]">
                        {log.entityId}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3.5 text-xs text-stone-800">
                    <span className="font-semibold block">
                      {log.user?.email || "System"}
                    </span>
                    {log.user?.appRole && (
                      <span className="text-[10px] text-stone-500">
                        {log.user.appRole}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3.5 text-xs text-stone-700 max-w-sm">
                    <p className="line-clamp-2">{log.description || "—"}</p>
                  </td>

                  <td className="px-4 py-3.5 font-mono text-[11px] text-stone-600 whitespace-nowrap">
                    {log.ipAddress ? (
                      <span className="inline-flex items-center gap-1.5 font-semibold text-stone-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                        {log.ipAddress}
                      </span>
                    ) : (
                      <span className="text-stone-400">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 px-2 py-1 text-[11px] font-semibold text-stone-700 group-hover:border-stone-400 group-hover:bg-white group-hover:text-stone-900 transition shadow-2xs">
                      {hasDiff ? "View Diff" : "Details"}
                      <ChevronRight className="h-3 w-3 text-stone-400 group-hover:text-stone-700" />
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <AuditLogDetailModal
        log={selectedLog}
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
      />
    </div>
  )
}
