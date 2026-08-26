import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth/getCurrentUser"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { getCurrentFinancialYear, getPendingExpenseSummary } from "@/lib/society"
import { AdminBadge, MobileSidebar } from "@/components/admin"
import { SocietySidebarLink } from "@/components/society"

export default async function SocietyPortalLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const user = await getCurrentUser()

  if (!user) {
    redirect(`/login?next=/society/${encodeURIComponent(code)}/dashboard`)
  }

  const context = await getSocietyAdmin(code)

  if (!context) {
    if (user.appRole === "SUPER_ADMIN") {
      redirect("/admin/societies")
    }
    notFound()
  }

  const { society, designation, isSuperAdmin } = context
  const societyCode = society.code || society.id

  const [pendingExpenseSummary, currentFY] = await Promise.all([
    getPendingExpenseSummary(society.id),
    getCurrentFinancialYear(society.id),
  ])
  const pendingApprovalCount = pendingExpenseSummary.count

  const sidebarContent = (
    <>
      {/* Society Header */}
      <div className="space-y-2 border-b border-stone-100 pb-5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-stone-500">
            Society Portal
          </span>
          {society.code ? (
            <AdminBadge variant="neutral" size="sm">
              {society.code}
            </AdminBadge>
          ) : null}
        </div>

        <h1 className="text-lg font-bold tracking-tight text-stone-950 truncate" title={society.name}>
          {society.name}
        </h1>

        <Link
          href={`/society/${societyCode}/profile`}
          className="group flex flex-wrap items-center gap-1.5 pt-1 hover:opacity-80 transition"
          title="View My Profile & Security Credentials"
        >
          <AdminBadge variant={isSuperAdmin ? "purple" : "info"} size="sm" dot>
            {designation}
          </AdminBadge>
          <p className="text-xs text-stone-500 group-hover:text-stone-900 group-hover:underline truncate transition" title={user.email}>
            {user.email}
          </p>
        </Link>

        {currentFY && (
          <div className="pt-1">
            <Link
              href={`/society/${societyCode}/settings/financial-years`}
              className="group flex items-center justify-between rounded-xl border border-stone-200/80 bg-stone-50/80 px-2.5 py-1 text-[11px] font-medium text-stone-700 hover:border-stone-400 hover:bg-stone-100 transition"
              title="Active Financial Year (Click to manage)"
            >
              <div className="flex items-center gap-1.5 truncate">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate">{currentFY.name}</span>
              </div>
              {currentFY.isLocked ? (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100/80 rounded px-1 shrink-0">
                  FROZEN
                </span>
              ) : (
                <span className="text-[10px] text-stone-400 group-hover:text-stone-700 shrink-0">
                  FY ↗
                </span>
              )}
            </Link>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex flex-col space-y-1 text-sm font-medium">
        <SocietySidebarLink href={`/society/${societyCode}/dashboard`}>
          <svg className="h-4 w-4 shrink-0 text-stone-400 group-hover:text-stone-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Dashboard
        </SocietySidebarLink>

        <SocietySidebarLink href={`/society/${societyCode}/approvals`}>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 shrink-0 text-stone-400 group-hover:text-stone-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Approvals</span>
            </div>
            {pendingApprovalCount > 0 ? (
              <span className="inline-flex items-center justify-center rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
                {pendingApprovalCount}
              </span>
            ) : null}
          </div>
        </SocietySidebarLink>

        <SocietySidebarLink href={`/society/${societyCode}/flats`}>
          <svg className="h-4 w-4 shrink-0 text-stone-400 group-hover:text-stone-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          Blocks & Flats
        </SocietySidebarLink>

        <SocietySidebarLink href={`/society/${societyCode}/members`}>
          <svg className="h-4 w-4 shrink-0 text-stone-400 group-hover:text-stone-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          Members & Residents
        </SocietySidebarLink>

        <SocietySidebarLink href={`/society/${societyCode}/roles`}>
          <svg className="h-4 w-4 shrink-0 text-stone-400 group-hover:text-stone-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Roles & Permissions
        </SocietySidebarLink>

        <SocietySidebarLink href={`/society/${societyCode}/bills`}>
          <svg className="h-4 w-4 shrink-0 text-stone-400 group-hover:text-stone-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
          </svg>
          Bills & Invoices
        </SocietySidebarLink>

        <SocietySidebarLink href={`/society/${societyCode}/rates`}>
          <svg className="h-4 w-4 shrink-0 text-stone-400 group-hover:text-stone-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          Maintenance Tariffs
        </SocietySidebarLink>

        <SocietySidebarLink href={`/society/${societyCode}/assessments`}>
          <svg className="h-4 w-4 shrink-0 text-stone-400 group-hover:text-stone-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Special Assessments
        </SocietySidebarLink>

        <SocietySidebarLink href={`/society/${societyCode}/payments`}>
          <svg className="h-4 w-4 shrink-0 text-stone-400 group-hover:text-stone-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Payments & Receipts
        </SocietySidebarLink>

        <SocietySidebarLink href={`/society/${societyCode}/expenses`}>
          <svg className="h-4 w-4 shrink-0 text-stone-400 group-hover:text-stone-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Expenses & Payables
        </SocietySidebarLink>

        <SocietySidebarLink href={`/society/${societyCode}/vendors`}>
          <svg className="h-4 w-4 shrink-0 text-stone-400 group-hover:text-stone-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          Vendors Directory
        </SocietySidebarLink>

        <SocietySidebarLink href={`/society/${societyCode}/vendors/bills`}>
          <svg className="h-4 w-4 shrink-0 text-stone-400 group-hover:text-stone-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Vendor Invoices & TDS
        </SocietySidebarLink>

        <SocietySidebarLink href={`/society/${societyCode}/assets`}>
          <svg className="h-4 w-4 shrink-0 text-stone-400 group-hover:text-stone-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Fixed Assets & AMC
        </SocietySidebarLink>

        <SocietySidebarLink href={`/society/${societyCode}/accounts`}>
          <svg className="h-4 w-4 shrink-0 text-stone-400 group-hover:text-stone-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
          </svg>
          Bank & Cash Accounts
        </SocietySidebarLink>

        <SocietySidebarLink href={`/society/${societyCode}/investments`}>
          <svg className="h-4 w-4 shrink-0 text-stone-400 group-hover:text-stone-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Investments & FDs
        </SocietySidebarLink>

        <SocietySidebarLink href={`/society/${societyCode}/cheques`}>
          <svg className="h-4 w-4 shrink-0 text-stone-400 group-hover:text-stone-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Cheque Register
        </SocietySidebarLink>

        <SocietySidebarLink href={`/society/${societyCode}/petty-cash`}>
          <svg className="h-4 w-4 shrink-0 text-stone-400 group-hover:text-stone-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Petty Cash Book
        </SocietySidebarLink>

        <SocietySidebarLink href={`/society/${societyCode}/ledgers`}>
          <svg className="h-4 w-4 shrink-0 text-stone-400 group-hover:text-stone-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          Chart of Accounts
        </SocietySidebarLink>

        <SocietySidebarLink href={`/society/${societyCode}/ledgers/vouchers`}>
          <svg className="h-4 w-4 shrink-0 text-stone-400 group-hover:text-stone-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Journal Vouchers
        </SocietySidebarLink>

        <SocietySidebarLink href={`/society/${societyCode}/budgets`}>
          <svg className="h-4 w-4 shrink-0 text-stone-400 group-hover:text-stone-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          Budgets & Planning
        </SocietySidebarLink>

        <SocietySidebarLink href={`/society/${societyCode}/registers`}>
          <svg className="h-4 w-4 shrink-0 text-stone-400 group-hover:text-stone-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Statutory Registers
        </SocietySidebarLink>

        <SocietySidebarLink href={`/society/${societyCode}/meetings`}>
          <svg className="h-4 w-4 shrink-0 text-stone-400 group-hover:text-stone-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Meetings & Minutes
        </SocietySidebarLink>

        <SocietySidebarLink href={`/society/${societyCode}/amenities`}>
          <svg className="h-4 w-4 shrink-0 text-stone-400 group-hover:text-stone-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          Amenities & Facilities
        </SocietySidebarLink>

        <SocietySidebarLink href={`/society/${societyCode}/bookings`}>
          <svg className="h-4 w-4 shrink-0 text-stone-400 group-hover:text-stone-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Facility Bookings
        </SocietySidebarLink>

        <SocietySidebarLink href={`/society/${societyCode}/reports`}>
          <svg className="h-4 w-4 shrink-0 text-stone-400 group-hover:text-stone-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Reports & Financials
        </SocietySidebarLink>

        <SocietySidebarLink href={`/society/${societyCode}/audit-logs`}>
          <svg className="h-4 w-4 shrink-0 text-stone-400 group-hover:text-stone-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Audit Logs
        </SocietySidebarLink>

        <SocietySidebarLink href={`/society/${societyCode}/settings`}>
          <svg className="h-4 w-4 shrink-0 text-stone-400 group-hover:text-stone-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Society Settings
        </SocietySidebarLink>

        <SocietySidebarLink href={`/society/${societyCode}/profile`}>
          <svg className="h-4 w-4 shrink-0 text-stone-400 group-hover:text-stone-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          My Profile & Security
        </SocietySidebarLink>

      </nav>
    </>
  )

  const sidebarFooter = (
    <div className="space-y-3 border-t border-stone-100 pt-4">
      {isSuperAdmin ? (
        <Link
          href="/admin/dashboard"
          className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100 hover:text-stone-900 transition"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Super Admin
        </Link>
      ) : null}

      <form action="/logout" method="POST">
        <button
          type="submit"
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 transition"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>
      </form>
    </div>
  )

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-stone-50">
      {/* Mobile Sidebar Drawer */}
      <MobileSidebar title={society.name} subtitle={designation}>
        <div className="space-y-6">
          {sidebarContent}
          {sidebarFooter}
        </div>
      </MobileSidebar>

      {/* Desktop Sidebar — hidden on mobile */}
      <aside className="hidden lg:flex w-64 shrink-0 border-r border-stone-200 bg-white p-6 flex-col justify-between">
        <div className="space-y-6">
          {sidebarContent}
        </div>
        {sidebarFooter}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 w-full overflow-y-auto">{children}</main>
    </div>
  )
}

