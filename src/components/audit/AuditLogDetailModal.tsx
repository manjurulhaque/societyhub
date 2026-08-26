"use client"

import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { AdminBadge } from "@/components/admin"
import { formatDateInAppTimeZone } from "@/lib/datetime"
import type { AuditAction } from "@/generated/prisma/client"
import { Check, Copy, ShieldCheck, ShieldAlert } from "lucide-react"

export interface AuditLogDetailData {
  id: string
  societyId?: string | null
  userId?: string | null
  action: AuditAction
  entity: string
  entityId?: string | null
  oldData?: unknown
  newData?: unknown
  ipAddress?: string | null
  userAgent?: string | null
  description?: string | null
  signature?: string | null
  previousSignature?: string | null
  createdAt: string | Date
  isSealValid?: boolean
  user?: {
    id: string
    email: string
    appRole?: string | null
  } | null
  society?: {
    id: string
    name: string
    code?: string | null
  } | null
}

export function AuditLogDetailModal({
  log,
  isOpen,
  onClose,
}: {
  log: AuditLogDetailData | null
  isOpen: boolean
  onClose: () => void
}) {
  const [copiedField, setCopiedField] = useState<string | null>(null)

  if (!log) return null

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(fieldName)
    setTimeout(() => setCopiedField(null), 2000)
  }

  // Validate cryptographic seal (evaluated on server with AUDIT_SECRET_KEY)
  const isSealValid = Boolean(log.signature && log.isSealValid)
  const sealMessage = !log.signature
    ? "Legacy unsealed record"
    : isSealValid
    ? "Mathematical HMAC-SHA256 Seal Valid"
    : "CRITICAL: Signature Mismatch - Tamper Detected"

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
      default:
        return "neutral"
    }
  }

  const renderJsonDiff = () => {
    const hasOld = log.oldData !== null && log.oldData !== undefined && Object.keys(log.oldData as object).length > 0
    const hasNew = log.newData !== null && log.newData !== undefined && Object.keys(log.newData as object).length > 0

    if (!hasOld && !hasNew) {
      return (
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-center text-xs text-stone-500">
          No state snapshot payload recorded for this event.
        </div>
      )
    }

    const oldObj = (log.oldData || {}) as Record<string, unknown>
    const newObj = (log.newData || {}) as Record<string, unknown>
    const allKeys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]))

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600">
            State Mutation Snapshot (Diff)
          </h4>
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                handleCopy(
                  JSON.stringify({ oldData: log.oldData, newData: log.newData }, null, 2),
                  "payload"
                )
              }
              className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 text-[11px] font-medium text-stone-700 hover:bg-stone-100 transition"
            >
              {copiedField === "payload" ? (
                <>
                  <Check className="h-3 w-3 text-emerald-600" /> Copied JSON
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 text-stone-500" /> Copy JSON
                </>
              )}
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
          <div className="grid grid-cols-12 border-b border-stone-100 bg-stone-50 px-3 py-2 text-[11px] font-bold text-stone-600">
            <div className="col-span-4">Field</div>
            <div className="col-span-4">Previous Value (Old)</div>
            <div className="col-span-4">Updated Value (New)</div>
          </div>
          <div className="divide-y divide-stone-100 max-h-72 overflow-y-auto font-mono text-xs">
            {allKeys.map((key) => {
              const oldVal = oldObj[key]
              const newVal = newObj[key]
              const isChanged = JSON.stringify(oldVal) !== JSON.stringify(newVal)
              const isNew = oldVal === undefined && newVal !== undefined
              const isDeleted = oldVal !== undefined && newVal === undefined

              return (
                <div
                  key={key}
                  className={`grid grid-cols-12 px-3 py-2 text-[11px] transition-colors ${
                    isNew
                      ? "bg-emerald-50/50 text-emerald-950"
                      : isDeleted
                      ? "bg-rose-50/50 text-rose-950"
                      : isChanged
                      ? "bg-amber-50/40 text-stone-900"
                      : "text-stone-600"
                  }`}
                >
                  <div className="col-span-4 font-semibold font-sans text-stone-900 truncate">
                    {key}
                  </div>
                  <div className="col-span-4 break-all text-stone-500">
                    {oldVal !== undefined ? (
                      <span className={isChanged ? "text-rose-700 line-through mr-1" : ""}>
                        {typeof oldVal === "object" ? JSON.stringify(oldVal) : String(oldVal)}
                      </span>
                    ) : (
                      <span className="text-stone-300 italic">—</span>
                    )}
                  </div>
                  <div className="col-span-4 break-all font-semibold">
                    {newVal !== undefined ? (
                      <span className={isChanged ? "text-emerald-700" : "text-stone-800"}>
                        {typeof newVal === "object" ? JSON.stringify(newVal) : String(newVal)}
                      </span>
                    ) : (
                      <span className="text-rose-400 italic">[DELETED]</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-6">
        <DialogHeader className="space-y-1">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AdminBadge variant={getActionBadgeVariant(log.action)}>
                {log.action}
              </AdminBadge>
              <span className="font-mono text-xs font-bold text-stone-900">
                {log.entity}
              </span>
              {log.entityId && (
                <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[11px] font-mono text-stone-600">
                  {log.entityId}
                </span>
              )}
            </div>
            <span className="text-xs text-stone-500">
              {formatDateInAppTimeZone(log.createdAt)}
            </span>
          </div>
          <DialogTitle className="text-base font-bold text-stone-900">
            {log.description || `${log.action} on ${log.entity}`}
          </DialogTitle>
          <DialogDescription className="text-xs text-stone-500">
            Audit Event ID: <span className="font-mono">{log.id}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Cryptographic Seal Banner */}
        <div
          className={`rounded-xl border p-3.5 space-y-2 text-xs ${
            !log.signature
              ? "border-stone-200 bg-stone-50 text-stone-800"
              : isSealValid
              ? "border-emerald-200 bg-emerald-50/70 text-emerald-950"
              : "border-rose-300 bg-rose-50 text-rose-950"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold">
              {log.signature && isSealValid ? (
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />
              )}
              <span>{sealMessage}</span>
            </div>
            {log.signature && (
              <button
                onClick={() => handleCopy(log.signature!, "signature")}
                className="inline-flex items-center gap-1 rounded bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-stone-700 hover:bg-white shadow-xs border border-stone-200"
              >
                {copiedField === "signature" ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-600" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 text-stone-500" /> Copy Seal
                  </>
                )}
              </button>
            )}
          </div>

          {log.signature && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono pt-1">
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-500 block font-sans">
                  Record HMAC Seal
                </span>
                <span className="break-all">{log.signature}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-500 block font-sans">
                  Previous Chain Link
                </span>
                <span className="break-all text-stone-600">
                  {log.previousSignature || "GENESIS"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-3">
            <span className="text-[10px] uppercase font-bold text-stone-500 block">
              Actor / Operator
            </span>
            <span className="text-xs font-semibold text-stone-900 block truncate">
              {log.user?.email || "System"}
            </span>
            <span className="text-[10px] text-stone-500 block">
              {log.user?.appRole || "SYSTEM_SERVICE"}
            </span>
          </div>

          <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-3">
            <span className="text-[10px] uppercase font-bold text-stone-500 block">
              Network IP & User Agent
            </span>
            <span className="text-xs font-mono text-stone-900 block">
              {log.ipAddress || "—"}
            </span>
            <span className="text-[10px] text-stone-500 truncate block">
              {log.userAgent || "Internal Server Context"}
            </span>
          </div>

          <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-3">
            <span className="text-[10px] uppercase font-bold text-stone-500 block">
              Tenant Scope
            </span>
            <span className="text-xs font-semibold text-stone-900 block truncate">
              {log.society?.name || "Global / System Scope"}
            </span>
            {log.society?.code && (
              <span className="text-[10px] font-mono text-stone-500 block">
                Code: {log.society.code}
              </span>
            )}
          </div>
        </div>

        {/* Visual State Diff */}
        {renderJsonDiff()}
      </DialogContent>
    </Dialog>
  )
}
