import Link from "next/link"
import { prisma } from "@/lib/prisma"
import {
  AdminPageHeader,
  AdminTable,
  AdminBadge,
  AdminStatCard,
  AdminButton,
  AdminEmptyState,
} from "@/components/admin"
import { formatDateInAppTimeZone } from "@/lib/datetime"

export default async function AdminExpensesPage() {
  const [expenses, expenseAggregate, totalVendorsCount, totalCategoriesCount] = await Promise.all([
    prisma.expense.findMany({
      orderBy: {
        expenseDate: "desc",
      },
      include: {
        society: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        account: {
          select: {
            id: true,
            name: true,
            accountType: true,
          },
        },
        vendor: {
          select: {
            id: true,
            name: true,
            companyName: true,
          },
        },
      },
    }),
    prisma.expense.aggregate({
      _sum: { amount: true, gstAmount: true, tdsAmount: true },
      _count: { _all: true },
    }),
    prisma.vendor.count({
      where: { isActive: true, deletedAt: null },
    }),
    prisma.expenseCategory.count({
      where: { isActive: true, deletedAt: null },
    }),
  ])

  const totalExpenditure = Number(expenseAggregate._sum.amount ?? 0)
  const totalGstPaid = Number(expenseAggregate._sum.gstAmount ?? 0)
  const totalTdsDeducted = Number(expenseAggregate._sum.tdsAmount ?? 0)
  const totalVouchers = expenseAggregate._count._all

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-6 py-8 md:px-8">
      {/* Header */}
      <AdminPageHeader
        eyebrow="Financial Outflows"
        title="Operational Expenditures"
        description="Audit ledger of all society maintenance outlays, contractor payouts, utility bills, and vendor payments."
        action={
          <AdminButton href="/admin/expenses/new" variant="primary" size="md">
            + Record Expense
          </AdminButton>
        }
      />

      {/* KPI Overview */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          title="Total Expenditure"
          value={`₹${totalExpenditure.toLocaleString("en-IN")}`}
          subtitle={`${totalVouchers} expense vouchers posted`}
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />

        <AdminStatCard
          title="GST Paid on Services"
          value={`₹${totalGstPaid.toLocaleString("en-IN")}`}
          subtitle="Input tax credit eligible"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
            </svg>
          }
        />

        <AdminStatCard
          title="TDS Deductions"
          value={`₹${totalTdsDeducted.toLocaleString("en-IN")}`}
          subtitle="Statutory tax withheld"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Registered Vendors"
          value={totalVendorsCount}
          subtitle={`Across ${totalCategoriesCount} expense categories`}
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />
      </div>

      {/* Expenses Table */}
      {expenses.length === 0 ? (
        <AdminEmptyState
          title="No expenses recorded yet"
          description="Record your first society operational expenditure or vendor bill payment."
          action={
            <AdminButton href="/admin/expenses/new" variant="primary">
              + Record First Expense
            </AdminButton>
          }
        />
      ) : (
        <AdminTable
          headers={[
            "Expense & Date",
            "Housing Society",
            "Category",
            "Vendor / Payee",
            "Paid From Account",
            "Amount (₹)",
            "Status",
          ]}
          rows={expenses.map((exp) => {
            const society = exp.society
            const payeeName = exp.vendor?.companyName || exp.vendor?.name || exp.vendorName || "Direct / Ad-hoc"

            return (
              <tr
                key={exp.id}
                className="border-t border-stone-100 transition-colors hover:bg-stone-50/70"
              >
                {/* Expense Title & Date */}
                <td className="px-4 py-3.5">
                  <span className="font-bold text-stone-950 text-sm block">
                    {exp.title}
                  </span>
                  <div className="flex items-center gap-2 text-[11px] text-stone-500">
                    <span>{formatDateInAppTimeZone(exp.expenseDate)}</span>
                    {exp.invoiceNumber ? (
                      <span className="font-mono text-stone-600">
                        • Inv: #{exp.invoiceNumber}
                      </span>
                    ) : null}
                  </div>
                </td>

                {/* Society */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/admin/societies/${society.id}`}
                      className="text-xs font-medium text-stone-900 hover:underline truncate max-w-[130px]"
                      title={society.name}
                    >
                      {society.name}
                    </Link>
                    {society.code ? (
                      <AdminBadge variant="neutral" size="sm">
                        {society.code}
                      </AdminBadge>
                    ) : null}
                  </div>
                </td>

                {/* Category */}
                <td className="px-4 py-3.5">
                  <AdminBadge variant="info" size="sm">
                    {exp.category.name}
                  </AdminBadge>
                </td>

                {/* Vendor / Payee */}
                <td className="px-4 py-3.5 text-xs text-stone-800">
                  <span className="font-semibold block">{payeeName}</span>
                  {exp.reference ? (
                    <span className="font-mono text-[10px] text-stone-500">
                      Ref: {exp.reference}
                    </span>
                  ) : null}
                </td>

                {/* Paid From Account */}
                <td className="px-4 py-3.5 text-xs text-stone-600">
                  {exp.account ? (
                    <span>{exp.account.name}</span>
                  ) : (
                    <span className="text-stone-400">—</span>
                  )}
                </td>

                {/* Amount */}
                <td className="px-4 py-3.5 text-xs font-bold text-rose-700">
                  ₹{Number(exp.amount).toLocaleString("en-IN")}
                </td>

                {/* Status */}
                <td className="px-4 py-3.5">
                  <AdminBadge
                    variant={
                      exp.status === "PAID"
                        ? "success"
                        : exp.status === "APPROVED"
                          ? "info"
                          : exp.status === "REJECTED"
                            ? "danger"
                            : "warning"
                    }
                    size="sm"
                    dot
                  >
                    {exp.status}
                  </AdminBadge>
                </td>
              </tr>
            )
          })}
        />
      )}
    </div>
  )
}
