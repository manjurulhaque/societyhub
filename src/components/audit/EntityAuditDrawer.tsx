"use client"

import React, { useState, useEffect, useCallback } from "react"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet"
import { getEntityAuditHistory } from "@/app/actions/auditTimelineActions"
import {
  AuditLogDetailModal,
  type AuditLogDetailData,
} from "@/components/audit/AuditLogDetailModal"
import { formatDateInAppTimeZone } from "@/lib/datetime"
import {
  History,
  ShieldCheck,
  ShieldAlert,
  Clock,
  ChevronRight,
  RefreshCw,
  PlusCircle,
  Edit3,
  Trash2,
  Sliders,
  CheckCircle2,
} from "lucide-react"
import type { AuditAction } from "@/generated/prisma/client"

export interface EntityAuditDrawerProps {
  entity: string
  entityId: string
  entityTitle: string
  societyId?: string | null
  relatedEntityIds?: string[]
  buttonVariant?: "default" | "outline" | "compact" | "badge"
  buttonClassName?: string
}

export function EntityAuditDrawer({
  entity,
  entityId,
  entityTitle,
  societyId,
  relatedEntityIds = [],
  buttonVariant = "default",
  buttonClassName = "",
}: EntityAuditDrawerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [logs, setLogs] = useState<AuditLogDetailData[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedLog, setSelectedLog] = useState<AuditLogDetailData | null>(null)
  const [hasLoaded, setHasLoaded] = useState(false)

  const loadHistory = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await getEntityAuditHistory({
        entity,
        entityId,
        societyId,
        relatedEntityIds,
      })
      if (res.success) {
        setLogs(res.logs)
      } else {
        setError(res.error || "Could not retrieve audit history.")
      }
    } catch {
      setError("An unexpected error occurred while fetching audit trail.")
    } finally {
      setIsLoading(false)
      setHasLoaded(true)
    }
  }, [entity, entityId, societyId, relatedEntityIds])

  useEffect(() => {
    if (isOpen && !hasLoaded) {
      loadHistory()
    }
  }, [isOpen, hasLoaded, loadHistory])

  const getActionIcon = (action: AuditAction) => {
    switch (action) {
      case "CREATE":
        return <PlusCircle className="h-4 w-4 text-emerald-600" />
      case "UPDATE":
        return <Edit3 className="h-4 w-4 text-sky-600" />
      case "DELETE":
        return <Trash2 className="h-4 w-4 text-rose-600" />
      case "STATUS_CHANGE":
        return <Sliders className="h-4 w-4 text-amber-600" />
      case "PAYMENT_COLLECTED":
      case "BILL_GENERATED":
        return <CheckCircle2 className="h-4 w-4 text-purple-600" />
      default:
        return <Clock className="h-4 w-4 text-stone-500" />
    }
  }

  const getActionBadgeClass = (action: AuditAction) => {
    switch (action) {
      case "CREATE":
        return "bg-emerald-50 text-emerald-700 border-emerald-200"
      case "UPDATE":
        return "bg-sky-50 text-sky-700 border-sky-200"
      case "DELETE":
        return "bg-rose-50 text-rose-700 border-rose-200"
      case "STATUS_CHANGE":
        return "bg-amber-50 text-amber-700 border-amber-200"
      case "PAYMENT_COLLECTED":
      case "BILL_GENERATED":
        return "bg-purple-50 text-purple-700 border-purple-200"
      default:
        return "bg-stone-50 text-stone-700 border-stone-200"
    }
  }

  // Count verified seals
  const totalLogs = logs.length
  const sealedLogs = logs.filter((l) => l.isSealValid).length

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          {buttonVariant === "compact" ? (
            <button
              type="button"
              className={`inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition shadow-2xs ${buttonClassName}`}
              title="View Audit History"
            >
              <History className="h-3.5 w-3.5 text-stone-500" />
              <span>History</span>
            </button>
          ) : buttonVariant === "outline" ? (
            <button
              type="button"
              className={`inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition shadow-2xs ${buttonClassName}`}
            >
              <History className="h-4 w-4 text-stone-500" />
              <span>Audit History</span>
              {hasLoaded && totalLogs > 0 && (
                <span className="rounded-full bg-stone-100 px-1.5 py-0.5 text-[10px] font-bold text-stone-600">
                  {totalLogs}
                </span>
              )}
            </button>
          ) : buttonVariant === "badge" ? (
            <button
              type="button"
              className={`inline-flex items-center gap-1 rounded-full border border-stone-200 bg-stone-100/80 px-2.5 py-1 text-[11px] font-semibold text-stone-700 hover:bg-stone-200/80 transition ${buttonClassName}`}
            >
              <History className="h-3 w-3 text-stone-500" />
              <span>Timeline</span>
            </button>
          ) : (
            <button
              type="button"
              className={`inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition shadow-sm ${buttonClassName}`}
            >
              <History className="h-4 w-4 text-stone-300" />
              <span>Audit History</span>
            </button>
          )}
        </SheetTrigger>

        <SheetContent side="right" className="w-full sm:max-w-md md:max-w-lg p-0 flex flex-col bg-white">
          {/* Header */}
          <div className="border-b border-stone-200 bg-stone-50/80 px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-500">
                <History className="h-4 w-4 text-stone-600" />
                <span>Forensic Audit Ledger</span>
              </div>
              <button
                type="button"
                onClick={loadHistory}
                disabled={isLoading}
                className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2 py-1 text-[11px] font-semibold text-stone-600 hover:bg-stone-50 transition"
                title="Refresh Ledger"
              >
                <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin text-stone-900" : ""}`} />
                <span>Sync</span>
              </button>
            </div>

            <SheetTitle className="text-lg font-bold text-stone-900 mt-2">
              {entityTitle}
            </SheetTitle>
            <SheetDescription className="text-xs text-stone-500 mt-0.5">
              Chronological cryptographic mutation timeline for this {entity.toLowerCase()} record.
            </SheetDescription>

            {/* Cryptographic Seal Banner */}
            {hasLoaded && totalLogs > 0 && (
              <div className="mt-3.5 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2 text-xs text-emerald-950">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold">
                    {sealedLogs}/{totalLogs} Sealed Events Verified
                  </span>
                </div>
                <span className="font-mono text-[10px] text-emerald-700 font-bold uppercase">
                  HMAC-SHA256
                </span>
              </div>
            )}
          </div>

          {/* Timeline Container */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {isLoading && !hasLoaded ? (
              <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-4 animate-pulse">
                    <div className="h-8 w-8 rounded-full bg-stone-200 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 rounded bg-stone-200" />
                      <div className="h-3 w-1/2 rounded bg-stone-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-xs text-rose-900">
                <div className="flex items-center gap-2 font-semibold">
                  <ShieldAlert className="h-4 w-4 text-rose-600" />
                  <span>Audit Trail Unavailable</span>
                </div>
                <p className="mt-1 text-rose-700">{error}</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-400">
                  <History className="h-6 w-6" />
                </div>
                <h4 className="mt-3 text-sm font-semibold text-stone-800">
                  No Audit History Yet
                </h4>
                <p className="mt-1 text-xs text-stone-500 max-w-xs mx-auto">
                  Mutations and lifecycle changes to this record will appear chronologically in this ledger.
                </p>
              </div>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200">
                {logs.map((log) => {
                  const hasDiff =
                    (log.oldData !== null && log.oldData !== undefined) ||
                    (log.newData !== null && log.newData !== undefined)

                  return (
                    <div key={log.id} className="relative group">
                      {/* Timeline Node Icon */}
                      <div className="absolute -left-6 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-white border border-stone-300 shadow-2xs group-hover:border-stone-500 transition">
                        {getActionIcon(log.action)}
                      </div>

                      {/* Event Card */}
                      <div
                        onClick={() => setSelectedLog(log)}
                        className="rounded-2xl border border-stone-200 bg-white p-3.5 transition-all hover:border-stone-400 hover:shadow-xs cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getActionBadgeClass(
                                log.action
                              )}`}
                            >
                              {log.action}
                            </span>
                            <span className="font-mono text-xs font-bold text-stone-900">
                              {log.entity}
                            </span>
                          </div>

                          <span className="text-[11px] font-medium text-stone-500 whitespace-nowrap">
                            {formatDateInAppTimeZone(log.createdAt)}
                          </span>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-stone-800 font-medium mt-2 leading-relaxed">
                          {log.description || "System mutation recorded."}
                        </p>

                        {/* Metadata Footer */}
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100 text-[11px] text-stone-500">
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-medium text-stone-700 truncate max-w-[140px]">
                              {log.user?.email || "System"}
                            </span>
                            {log.ipAddress && (
                              <span className="inline-flex items-center gap-1 font-mono text-[10px] text-stone-600 bg-stone-50 px-1.5 py-0.5 rounded border border-stone-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                {log.ipAddress}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 text-[11px] font-semibold text-stone-700 group-hover:text-stone-950">
                            <span>{hasDiff ? "View Diff" : "Details"}</span>
                            <ChevronRight className="h-3 w-3 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Visual State Diff Modal */}
      <AuditLogDetailModal
        log={selectedLog}
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
      />
    </>
  )
}
