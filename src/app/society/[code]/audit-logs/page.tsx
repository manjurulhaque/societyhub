import { notFound } from "next/navigation"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { requireCommitteeAccess, COMMITTEE_ROLES } from "@/lib/auth/requireAuth"
import { prisma } from "@/lib/prisma"
import {
  AdminPageHeader,
  AdminStatCard,
  AdminEmptyState,
} from "@/components/admin"
import { verifyAuditTrailIntegrity, computeAuditSignature } from "@/lib/auditCrypto"
import { AuditLogTableClient } from "@/components/audit/AuditLogTableClient"
import type { AuditAction } from "@/generated/prisma/client"

export default async function SocietyAuditLogsPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>
  searchParams: Promise<{ action?: string; search?: string; page?: string }>
}) {
  const { code } = await params
  const context = await getSocietyAdmin(code)

  if (!context) {
    notFound()
  }

  const authContext = await requireCommitteeAccess(code, COMMITTEE_ROLES)
  const verifiedSocietyId = authContext.society.id

  const { action, search, page } = await searchParams
  const currentPage = page ? Math.max(1, parseInt(page, 10)) : 1
  const pageSize = 50

  const whereClause: {
    societyId: string
    action?: AuditAction
    OR?: Array<{
      description?: { contains: string; mode: "insensitive" }
      entity?: { contains: string; mode: "insensitive" }
      user?: { email: { contains: string; mode: "insensitive" } }
    }>
  } = {
    societyId: verifiedSocietyId,
  }

  if (action && action !== "ALL") {
    whereClause.action = action as AuditAction
  }

  if (search && search.trim() !== "") {
    const term = search.trim()
    whereClause.OR = [
      { description: { contains: term, mode: "insensitive" } },
      { entity: { contains: term, mode: "insensitive" } },
      { user: { email: { contains: term, mode: "insensitive" } } },
    ]
  }

  const [logs, totalCount, actionCounts, recentChainLogs] = await Promise.all([
    prisma.auditLog.findMany({
      where: whereClause,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            appRole: true,
          },
        },
      },
    }),
    prisma.auditLog.count({ where: whereClause }),
    prisma.auditLog.groupBy({
      by: ["action"],
      where: { societyId: verifiedSocietyId },
      _count: { _all: true },
    }),
    prisma.auditLog.findMany({
      where: { societyId: verifiedSocietyId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 100,
      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        userId: true,
        societyId: true,
        signature: true,
        previousSignature: true,
        createdAt: true,
      },
    }),
  ])

  const createCount =
    actionCounts.find((item) => item.action === "CREATE")?._count._all ?? 0
  const updateCount =
    actionCounts.find((item) => item.action === "UPDATE")?._count._all ?? 0
  const statusChangeCount =
    actionCounts.find((item) => item.action === "STATUS_CHANGE")?._count._all ?? 0

  const totalPages = Math.ceil(totalCount / pageSize)
  const chainIntegrity = verifyAuditTrailIntegrity(recentChainLogs)
  const displayedIntegrity = verifyAuditTrailIntegrity(logs, { allowNonConsecutive: true })
  const integrity = !displayedIntegrity.isValid ? displayedIntegrity : chainIntegrity

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-6 py-8 md:px-8">
      <AdminPageHeader
        eyebrow="Compliance & Governance"
        title="Society Audit Trail"
        description={`Immutable chronological register of financial transactions, cheque registrations, member nominations, and committee mutations for ${context.society.name}.`}
      />

      {/* Cryptographic Ledger Integrity Banner */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border p-4 sm:p-5 transition-all ${
          !integrity.isValid
            ? "border-rose-300 bg-rose-50 text-rose-950 shadow-sm"
            : totalCount === 0
            ? "border-stone-200 bg-stone-50/80 text-stone-800"
            : "border-emerald-200 bg-emerald-50/70 text-emerald-950"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-white shadow-sm ${
              !integrity.isValid
                ? "bg-rose-600 animate-pulse text-base"
                : totalCount === 0
                ? "bg-stone-500 text-sm"
                : "bg-emerald-600 text-base"
            }`}
          >
            {!integrity.isValid ? "⚠️" : totalCount === 0 ? "ℹ" : "✓"}
          </div>
          <div>
            <h3 className="text-sm font-bold">
              {!integrity.isValid
                ? "Cryptographic Integrity Compromised: Tamper Detected"
                : totalCount === 0
                ? "Audit Ledger: Genesis State"
                : "Cryptographic Audit Trail Integrity: Verified"}
            </h3>
            <p className="text-xs opacity-90 mt-0.5">
              {!integrity.isValid
                ? integrity.message
                : totalCount === 0
                ? "No audit events found. The cryptographic hash chain is at its initial genesis state."
                : integrity.legacyCount && integrity.legacyCount > 0
                ? `HMAC-SHA256 hash chaining active. ${integrity.verifiedCount} sealed records verified (${integrity.legacyCount} legacy records preserved).`
                : `HMAC-SHA256 hash chaining active. All ${integrity.verifiedCount} audit records mathematically verified against tampering.`}
            </p>
          </div>
        </div>
        <span
          className={`self-start sm:self-auto rounded-full border px-3 py-1 text-xs font-bold whitespace-nowrap ${
            !integrity.isValid
              ? "border-rose-300 bg-rose-100 text-rose-800"
              : totalCount === 0
              ? "border-stone-300 bg-stone-100 text-stone-700"
              : "border-emerald-300 bg-emerald-100 text-emerald-800"
          }`}
        >
          {!integrity.isValid
            ? "Chain Broken"
            : totalCount === 0
            ? "Genesis State"
            : "Unbroken Chain"}
        </span>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          title="Total Society Events"
          value={totalCount.toString()}
          subtitle="Audit log entries"
        />
        <AdminStatCard
          title="Record Creations"
          value={createCount.toString()}
          subtitle="Entries & vouchers"
        />
        <AdminStatCard
          title="Updates & Modifications"
          value={updateCount.toString()}
          subtitle="Settings & records"
        />
        <AdminStatCard
          title="Status Changes"
          value={statusChangeCount.toString()}
          subtitle="Cheques, FDs, liens"
        />
      </div>

      {/* Audit Log Table */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-stone-900">Activity Log</h2>
            <p className="text-xs text-stone-500">
              Showing page {currentPage} of {Math.max(1, totalPages)} ({totalCount} total records)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <form method="GET" className="flex items-center gap-2">
              <select
                name="action"
                defaultValue={action || "ALL"}
                className="rounded-xl border border-stone-300 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-700 outline-none focus:border-stone-950 focus:bg-white"
              >
                <option value="ALL">All Actions</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="STATUS_CHANGE">STATUS_CHANGE</option>
                <option value="DELETE">DELETE</option>
              </select>

              <input
                type="text"
                name="search"
                defaultValue={search || ""}
                placeholder="Search actor or description..."
                className="rounded-xl border border-stone-300 px-3 py-1.5 text-xs text-stone-900 outline-none focus:border-stone-950"
              />

              <button
                type="submit"
                className="rounded-xl bg-stone-950 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-stone-800 transition"
              >
                Filter
              </button>
            </form>
          </div>
        </div>

        {logs.length === 0 ? (
          <AdminEmptyState
            title="No audit events found"
            description="No recorded activity matches your filter criteria."
          />
        ) : (
          <AuditLogTableClient
            logs={logs.map((log) => {
              const isSealValid = log.signature
                ? computeAuditSignature({
                    id: log.id,
                    action: log.action,
                    entity: log.entity,
                    entityId: log.entityId,
                    userId: log.userId,
                    societyId: log.societyId,
                    createdAt: log.createdAt,
                    previousSignature: log.previousSignature || "GENESIS",
                  }) === log.signature
                : false

              return {
                ...log,
                createdAt: log.createdAt.toISOString(),
                isSealValid,
                society: {
                  id: context.society.id,
                  name: context.society.name,
                  code: context.society.code,
                },
              }
            })}
            totalCount={totalCount}
            societyInfo={{
              name: context.society.name,
              address: context.society.address,
              city: context.society.city,
              state: context.society.state,
              pincode: context.society.pincode,
              registrationNumber: context.society.registrationNumber,
              panNumber: context.society.panNumber,
            }}
            integrityStatus={integrity}
          />
        )}
      </div>
    </div>
  )
}
