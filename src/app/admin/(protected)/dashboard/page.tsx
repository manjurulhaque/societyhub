import Link from "next/link"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getAdmin } from "@/lib/auth/getAdmin"
import {
  AdminPageHeader,
  AdminStatCard,
  AdminCard,
  AdminBadge,
  AdminTable,
  AdminButton,
} from "@/components/admin"
import { formatDateInAppTimeZone } from "@/lib/datetime"
import { SuperAdminDashboardCharts } from "./SuperAdminDashboardCharts"

export default async function DashboardPage() {
  const admin = await getAdmin()

  if (!admin || admin.role !== "SUPER_ADMIN") {
    redirect("/login")
  }

  const [
    totalSocieties,
    totalUsers,
    totalMembers,
    totalBlocks,
    totalFlats,
    totalPeople,
    billAggregate,
    paymentAggregate,
    recentSocieties,
    recentPeople,
    recentBills,
    recentPayments,
  ] = await Promise.all([
    prisma.society.count({ where: { isActive: true, deletedAt: null } }),
    prisma.user.count(),
    prisma.societyMember.count(),
    prisma.block.count({ where: { isActive: true, deletedAt: null } }),
    prisma.flat.count({ where: { isActive: true, deletedAt: null } }),
    prisma.person.count({ where: { isActive: true, deletedAt: null } }),
    prisma.bill.aggregate({
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.society.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        _count: {
          select: { blocks: true, people: true, members: true, flats: true },
        },
      },
    }),
    prisma.person.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        society: {
          select: { id: true, name: true, code: true },
        },
        flats: {
          where: { toDate: null },
          include: {
            flat: {
              select: { number: true, block: { select: { name: true } } },
            },
          },
        },
      },
    }),
    prisma.bill.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        society: {
          select: { name: true, code: true },
        },
        flat: {
          select: {
            number: true,
            block: { select: { name: true } },
          },
        },
      },
    }),
    prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        society: {
          select: { name: true, code: true },
        },
        paidBy: { select: { name: true } },
        bill: {
          select: {
            month: true,
            year: true,
            flat: { select: { number: true, block: { select: { name: true } } } },
          },
        },
      },
    }),
  ])

  const totalBilled = Number(billAggregate._sum.amount ?? 0)
  const totalCollected = Number(paymentAggregate._sum.amount ?? 0)
  const outstandingAmount = Math.max(0, totalBilled - totalCollected)
  const collectionRate =
    totalBilled === 0 ? 0 : Math.min(100, Math.round((totalCollected / totalBilled) * 100))

  const societyScaleData = recentSocieties.map((s) => ({
    name: s.name,
    code: s.code,
    flatsCount: s._count.flats,
    membersCount: s._count.members,
    blocksCount: s._count.blocks,
  }))

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 sm:py-8 md:px-8">
      {/* Header */}
      <AdminPageHeader
        eyebrow={`Welcome, ${admin.name || admin.email} (Super Admin)`}
        title="Super Admin Dashboard"
        description="Global command center for managing housing societies, properties, residents, billing, and accounting operations."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <AdminButton href="/admin/societies/new" variant="primary" size="sm">
              + New Society
            </AdminButton>
            <AdminButton href="/admin/members/new" variant="outline" size="sm">
              + Assign Member
            </AdminButton>
            <AdminButton href="/admin/bills/new" variant="outline" size="sm">
              + Generate Bill
            </AdminButton>
            <AdminButton href="/admin/payments/new" variant="outline" size="sm">
              + Record Payment
            </AdminButton>
          </div>
        }
      />

      {/* Row 1: Core Platform Inventory KPIs */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          title="Total Societies"
          value={totalSocieties}
          subtitle={`${totalUsers} registered user accounts`}
          href="/admin/societies"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />

        <AdminStatCard
          title="Total Blocks / Wings"
          value={totalBlocks}
          subtitle={`Across ${totalSocieties} societies`}
          href="/admin/blocks"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Flats & Units"
          value={totalFlats}
          subtitle="Residential & commercial spaces"
          href="/admin/flats"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          }
        />

        <AdminStatCard
          title="People & Residents"
          value={totalPeople}
          subtitle={`${totalMembers} committee members`}
          href="/admin/people"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />
      </div>

      {/* Row 2: Financial & Revenue KPIs */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          title="Total Billed"
          value={`₹${totalBilled.toLocaleString("en-IN")}`}
          subtitle={`${billAggregate._count._all} total demands issued`}
          href="/admin/bills"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Total Collections"
          value={`₹${totalCollected.toLocaleString("en-IN")}`}
          subtitle={`${paymentAggregate._count._all} payment receipts`}
          href="/admin/payments"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Outstanding Dues"
          value={`₹${outstandingAmount.toLocaleString("en-IN")}`}
          subtitle="Pending collection across societies"
          href="/admin/reports"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Collection Rate"
          value={`${collectionRate}%`}
          trend={{
            value: `${collectionRate}%`,
            direction: collectionRate >= 80 ? "up" : "down",
            label: collectionRate >= 80 ? "Healthy recovery" : "Needs attention",
          }}
          href="/admin/reports"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
      </div>

      {/* Row 3: Platform Visual Analytics */}
      <SuperAdminDashboardCharts
        societyScaleData={societyScaleData}
        financialOverview={{
          totalBilled,
          totalCollected,
          totalOutstanding: outstandingAmount,
        }}
      />

      {/* Grid: Recent Societies & Recent Residents */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Recent Societies */}
        <AdminCard
          title="Recent Societies"
          description="Latest organizations onboarded onto the platform"
          action={
            <Link
              href="/admin/societies"
              className="text-xs font-semibold text-stone-900 hover:text-stone-700"
            >
              All Societies →
            </Link>
          }
        >
          {recentSocieties.length === 0 ? (
            <p className="py-6 text-center text-xs text-stone-500">
              No societies created yet.
            </p>
          ) : (
            <AdminTable
              headers={["Society", "Code", "Units / People", "Actions"]}
              rows={recentSocieties.map((s) => (
                <tr key={s.id} className="border-t border-stone-100 hover:bg-stone-50/60">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/societies/${s.id}`}
                      className="font-bold text-xs text-stone-950 hover:underline block"
                    >
                      {s.name}
                    </Link>
                    <span className="text-[10px] text-stone-500">
                      {s.societyType.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {s.code ? (
                      <AdminBadge variant="neutral" size="sm">
                        {s.code}
                      </AdminBadge>
                    ) : (
                      <span className="text-xs text-stone-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-600">
                    {s._count.blocks} blocks · {s._count.people} residents
                  </td>
                  <td className="px-4 py-3">
                    <AdminButton
                      href={`/society/${s.code || s.id}/dashboard`}
                      variant="outline"
                      size="xs"
                    >
                      Portal ↗
                    </AdminButton>
                  </td>
                </tr>
              ))}
            />
          )}
        </AdminCard>

        {/* Recent People */}
        <AdminCard
          title="Recently Registered People"
          description="Latest residents, owners, and tenants added"
          action={
            <Link
              href="/admin/people"
              className="text-xs font-semibold text-stone-900 hover:text-stone-700"
            >
              All People →
            </Link>
          }
        >
          {recentPeople.length === 0 ? (
            <p className="py-6 text-center text-xs text-stone-500">
              No residents added yet.
            </p>
          ) : (
            <AdminTable
              headers={["Name", "Society", "Unit(s)", "Added On"]}
              rows={recentPeople.map((p) => {
                const flatText = p.flats
                  .map((f) => `${f.flat.block.name}-${f.flat.number}`)
                  .join(", ")

                return (
                  <tr key={p.id} className="border-t border-stone-100 hover:bg-stone-50/60">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/people/${p.id}`}
                        className="font-bold text-xs text-stone-950 hover:underline block"
                      >
                        {p.name}
                      </Link>
                      <span className="text-[10px] text-stone-500">{p.phone || p.email || "No contact"}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-700">
                      {p.society.name}
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-600">
                      {flatText || <span className="text-stone-400">None</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-500">
                      {formatDateInAppTimeZone(p.createdAt)}
                    </td>
                  </tr>
                )
              })}
            />
          )}
        </AdminCard>
      </div>

      {/* Grid: Recent Bills & Recent Payments */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Recent Bills */}
        <AdminCard
          title="Recent Bills Generated"
          description="Latest maintenance demands and utility assessments"
          action={
            <Link
              href="/admin/bills"
              className="text-xs font-semibold text-stone-900 hover:text-stone-700"
            >
              All Bills →
            </Link>
          }
        >
          {recentBills.length === 0 ? (
            <p className="py-6 text-center text-xs text-stone-500">
              No bills generated yet.
            </p>
          ) : (
            <AdminTable
              headers={["Bill # / Period", "Flat & Society", "Amount", "Status"]}
              rows={recentBills.map((b) => (
                <tr key={b.id} className="border-t border-stone-100 hover:bg-stone-50/60">
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-xs text-stone-900 block">
                      {b.billNumber || `#${b.month}/${b.year}`}
                    </span>
                    <span className="text-[10px] text-stone-500">
                      {b.month}/{b.year}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-800">
                    <p className="font-semibold">{b.flat.block.name} - {b.flat.number}</p>
                    <p className="text-[10px] text-stone-500">{b.society.name}</p>
                  </td>
                  <td className="px-4 py-3 text-xs font-bold text-stone-950">
                    ₹{Number(b.amount).toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3">
                    <AdminBadge
                      variant={
                        b.status === "PAID"
                          ? "success"
                          : b.status === "OVERDUE"
                            ? "danger"
                            : "warning"
                      }
                      size="sm"
                      dot
                    >
                      {b.status}
                    </AdminBadge>
                  </td>
                </tr>
              ))}
            />
          )}
        </AdminCard>

        {/* Recent Payments */}
        <AdminCard
          title="Recent Collections"
          description="Latest receipts recorded across housing societies"
          action={
            <Link
              href="/admin/payments"
              className="text-xs font-semibold text-stone-900 hover:text-stone-700"
            >
              All Payments →
            </Link>
          }
        >
          {recentPayments.length === 0 ? (
            <p className="py-6 text-center text-xs text-stone-500">
              No payments recorded yet.
            </p>
          ) : (
            <AdminTable
              headers={["Receipt #", "Payer & Flat", "Amount", "Date"]}
              rows={recentPayments.map((p) => (
                <tr key={p.id} className="border-t border-stone-100 hover:bg-stone-50/60">
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-xs text-stone-900 block">
                      {p.receiptNumber || `#${p.id.slice(0, 8)}`}
                    </span>
                    <AdminBadge variant="neutral" size="sm">
                      {p.mode}
                    </AdminBadge>
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-800">
                    <p className="font-semibold">{p.paidBy?.name || "Resident"}</p>
                    <p className="text-[10px] text-stone-500">
                      {p.society.name} {p.bill?.flat ? `(${p.bill.flat.block.name}-${p.bill.flat.number})` : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs font-bold text-emerald-700">
                    ₹{Number(p.amount).toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-500">
                    {formatDateInAppTimeZone(p.createdAt)}
                  </td>
                </tr>
              ))}
            />
          )}
        </AdminCard>
      </div>
    </div>
  )
}