import { notFound } from "next/navigation"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { requireCommitteeAccess, COMMITTEE_ROLES } from "@/lib/auth/requireAuth"
import { prisma } from "@/lib/prisma"
import {
  AdminPageHeader,
  AdminTable,
  AdminBadge,
  AdminStatCard,
  AdminEmptyState,
} from "@/components/admin"
import { formatDateInAppTimeZone } from "@/lib/datetime"
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

  const [logs, totalCount, createCount, updateCount, statusChangeCount] = await Promise.all([
    prisma.auditLog.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
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
    prisma.auditLog.count({ where: { societyId: verifiedSocietyId, action: "CREATE" } }),
    prisma.auditLog.count({ where: { societyId: verifiedSocietyId, action: "UPDATE" } }),
    prisma.auditLog.count({ where: { societyId: verifiedSocietyId, action: "STATUS_CHANGE" } }),
  ])

  const totalPages = Math.ceil(totalCount / pageSize)

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

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-6 py-8 md:px-8">
      <AdminPageHeader
        eyebrow="Compliance & Governance"
        title="Society Audit Trail"
        description={`Immutable chronological register of financial transactions, cheque registrations, member nominations, and committee mutations for ${context.society.name}.`}
      />

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
          <div className="overflow-x-auto">
            <AdminTable
              headers={[
                "Timestamp",
                "Action",
                "Entity",
                "Operator / Member",
                "Description",
                "IP Address",
              ]}
              rows={logs.map((log) => (
                <tr
                  key={log.id}
                  className="border-t border-stone-100 transition-colors hover:bg-stone-50/70"
                >
                  <td className="px-4 py-3.5 text-xs font-medium text-stone-600 whitespace-nowrap">
                    {formatDateInAppTimeZone(log.createdAt)}
                  </td>

                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <AdminBadge variant={getActionBadgeVariant(log.action)}>
                      {log.action}
                    </AdminBadge>
                  </td>

                  <td className="px-4 py-3.5 whitespace-nowrap font-mono text-xs font-bold text-stone-900">
                    {log.entity}
                    {log.entityId ? (
                      <span className="block text-[10px] font-normal text-stone-400 truncate max-w-[120px]">
                        {log.entityId}
                      </span>
                    ) : null}
                  </td>

                  <td className="px-4 py-3.5 text-xs text-stone-800">
                    <span className="font-semibold block">
                      {log.user?.email || "System"}
                    </span>
                    {log.user?.appRole ? (
                      <span className="text-[10px] text-stone-500">
                        {log.user.appRole}
                      </span>
                    ) : null}
                  </td>

                  <td className="px-4 py-3.5 text-xs text-stone-700 max-w-sm">
                    <p className="line-clamp-2">{log.description || "—"}</p>
                  </td>

                  <td className="px-4 py-3.5 font-mono text-[11px] text-stone-500 whitespace-nowrap">
                    {log.ipAddress || "—"}
                  </td>
                </tr>
              ))}
            />
          </div>
        )}
      </div>
    </div>
  )
}
