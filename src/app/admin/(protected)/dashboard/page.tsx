import Link from "next/link"
import { redirect } from "next/navigation"

import { prisma } from "@/lib/prisma"
import { getAdmin } from "@/lib/auth/getAdmin"
import {
  formatDateInAppTimeZone,
  formatShortDateInAppTimeZone,
} from "@/lib/datetime"

export default async function DashboardPage() {
  const admin = await getAdmin()

  if (!admin || admin.role !== "SUPER_ADMIN") {
    redirect("/admin/login")
  }

  const [
    totalSocieties,
    totalUsers,
    totalMembers,
    totalBlocks,
    totalFlats,
    totalPeople,
    totalBills,
    totalPayments,
    billTotal,
    paymentTotal,
    recentSocieties,
    recentPeople,
    recentBills,
    recentPayments,
    largestSocieties,
    maintenanceBreakdown,
  ] = await Promise.all([
    prisma.society.count(),

    prisma.user.count(),

    prisma.societyMember.count(),

    prisma.block.count(),

    prisma.flat.count(),

    prisma.person.count(),

    prisma.bill.count(),

    prisma.payment.count(),

    prisma.bill.aggregate({
      _sum: {
        amount: true,
      },
    }),

    prisma.payment.aggregate({
      _sum: {
        amount: true,
      },
    }),

    prisma.society.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
      select: {
        id: true,
        name: true,
        code: true,
        address: true,
        maintenanceType: true,
        createdAt: true,
      },
    }),

    prisma.person.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        createdAt: true,
        society: {
          select: {
            name: true,
          },
        },
      },
    }),

    prisma.bill.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
      select: {
        id: true,
        year: true,
        month: true,
        amount: true,
        dueDate: true,
        createdAt: true,
        flat: {
          select: {
            number: true,
            block: {
              select: {
                name: true,
                society: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    }),

    prisma.payment.findMany({
      orderBy: {
        paidOn: "desc",
      },
      take: 5,
      select: {
        id: true,
        amount: true,
        paidOn: true,
        mode: true,
        reference: true,
        remarks: true,
        paidBy: {
          select: {
            name: true,
          },
        },
        bill: {
          select: {
            year: true,
            month: true,
            flat: {
              select: {
                number: true,
                block: {
                  select: {
                    name: true,
                    society: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),

    prisma.society.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
      select: {
        id: true,
        name: true,
        code: true,
        _count: {
          select: {
            members: true,
            blocks: true,
            people: true,
          },
        },
      },
    }),

    prisma.society.groupBy({
      by: ["maintenanceType"],
      _count: {
        _all: true,
      },
    }),
  ])

  const totalBilled = Number(billTotal._sum.amount ?? 0)
  const totalCollected = Number(paymentTotal._sum.amount ?? 0)

  const outstandingAmount = Math.max(
    0,
    totalBilled - totalCollected,
  )

  const collectionRate =
    totalBilled === 0
      ? 0
      : Math.min(
          100,
          Math.round((totalCollected / totalBilled) * 100),
        )

  const fixedSocieties =
    maintenanceBreakdown.find(
      (item) => item.maintenanceType === "FIXED",
    )?._count._all ?? 0

  const perSqftSocieties =
    maintenanceBreakdown.find(
      (item) => item.maintenanceType === "PER_SQFT",
    )?._count._all ?? 0

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-6 py-8 md:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <span className="inline-flex items-center rounded-full border border-stone-300 bg-stone-100 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-stone-700">
            Admin Overview
          </span>

          <div>
            <h1 className="text-3xl font-bold tracking-tight text-stone-950 md:text-4xl">
              Dashboard
            </h1>

            <p className="text-sm text-stone-600">
              Society management, residents, flats, billing and payments
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/societies/new"
            className="rounded-full bg-stone-950 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-stone-800"
          >
            + New Society
          </Link>

          <Link
            href="/admin/people/new"
            className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 transition hover:border-stone-400 hover:bg-stone-50"
          >
            Add Person
          </Link>

          <Link
            href="/admin/bills/new"
            className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 transition hover:border-stone-400 hover:bg-stone-50"
          >
            Create Bill
          </Link>

          <Link
            href="/admin/payments/new"
            className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 transition hover:border-stone-400 hover:bg-stone-50"
          >
            Record Payment
          </Link>
        </div>
      </div>

      <section className="overflow-hidden rounded-[28px] border border-stone-200 bg-white p-5 shadow-[0_18px_50px_rgba(28,25,23,0.08)]">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-8">
          <StatCard
            title="Societies"
            value={totalSocieties}
            href="/admin/societies"
          />

          <StatCard
            title="Users"
            value={totalUsers}
            href="/admin/users"
          />

          <StatCard
            title="Members"
            value={totalMembers}
            href="/admin/members"
          />

          <StatCard
            title="Blocks"
            value={totalBlocks}
            href="/admin/blocks"
          />

          <StatCard
            title="Flats"
            value={totalFlats}
            href="/admin/flats"
          />

          <StatCard
            title="People"
            value={totalPeople}
            href="/admin/people"
          />

          <StatCard
            title="Bills"
            value={totalBills}
            href="/admin/bills"
          />

          <StatCard
            title="Payments"
            value={totalPayments}
            href="/admin/payments"
          />
        </div>
      </section>

      <DashboardCard title="Financial Overview">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FinancialCard
            title="Total Billed"
            value={formatCurrency(totalBilled)}
            subtitle={`${formatNumber(totalBills)} bills`}
          />

          <FinancialCard
            title="Total Collected"
            value={formatCurrency(totalCollected)}
            subtitle={`${formatNumber(totalPayments)} payments`}
          />

          <FinancialCard
            title="Outstanding"
            value={formatCurrency(outstandingAmount)}
            subtitle={`${100 - collectionRate}% of billed amount`}
          />

          <FinancialCard
            title="Collection Rate"
            value={`${collectionRate}%`}
            subtitle="Payments / total billed"
          />
        </div>
      </DashboardCard>

      <DashboardCard title="Quick Actions">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <DashboardLink
            href="/admin/societies"
            label="Manage Societies"
          />

          <DashboardLink
            href="/admin/members"
            label="Manage Society Members"
          />

          <DashboardLink
            href="/admin/blocks"
            label="Manage Blocks"
          />

          <DashboardLink
            href="/admin/flats"
            label="Manage Flats"
          />

          <DashboardLink
            href="/admin/people"
            label="Manage People"
          />

          <DashboardLink
            href="/admin/bills"
            label="Manage Bills"
          />

          <DashboardLink
            href="/admin/payments"
            label="Manage Payments"
          />

          <DashboardLink
            href="/admin/users"
            label="Manage Users"
          />
        </div>
      </DashboardCard>

      <DashboardCard title="Maintenance Overview">
        <div className="grid gap-4 md:grid-cols-3">
          <Metric
            label="Total Societies"
            value={totalSocieties}
          />

          <Metric
            label="Fixed Maintenance"
            value={fixedSocieties}
          />

          <Metric
            label="Per Sqft Maintenance"
            value={perSqftSocieties}
          />
        </div>
      </DashboardCard>

      <DashboardCard title="Largest Societies">
        <ListOrEmpty
          empty="No societies available yet."
          items={largestSocieties.map((society, index) => ({
            key: society.id,
            left: `${index + 1}. ${society.name}`,
            right: `${formatNumber(society._count.members)} members`,
          }))}
        />
      </DashboardCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <DashboardCard title="Recent Societies">
          <div className="space-y-3 text-sm">
            {recentSocieties.length === 0 && (
              <EmptyRow message="No societies created yet." />
            )}

            {recentSocieties.map((society) => (
              <div
                key={society.id}
                className="rounded-2xl border border-stone-100 bg-stone-50/70 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-stone-900">
                      {society.name}
                    </div>

                    <div className="text-xs text-stone-500">
                      Code: {society.code}
                    </div>
                  </div>

                  <span className="rounded-full bg-stone-200 px-2 py-1 text-[10px] uppercase tracking-wider text-stone-600">
                    {society.maintenanceType === "PER_SQFT"
                      ? "Per Sqft"
                      : "Fixed"}
                  </span>
                </div>

                <div className="mt-2 text-xs text-stone-500">
                  {society.address || "No address"} ·{" "}
                  {formatDateInAppTimeZone(society.createdAt)}
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>

        <DashboardCard title="Recent People">
          <div className="space-y-3 text-sm">
            {recentPeople.length === 0 && (
              <EmptyRow message="No people added yet." />
            )}

            {recentPeople.map((person) => (
              <div
                key={person.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-stone-100 bg-stone-50/70 p-3"
              >
                <div>
                  <div className="font-medium text-stone-900">
                    {person.name}
                  </div>

                  <div className="text-xs text-stone-500">
                    {person.society.name}
                  </div>
                </div>

                <div className="text-right text-xs text-stone-500">
                  <div>
                    {person.phone ||
                      person.email ||
                      "No contact"}
                  </div>

                  <div>
                    {formatDateInAppTimeZone(
                      person.createdAt,
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <DashboardCard title="Recent Bills">
          <div className="space-y-3 text-sm">
            {recentBills.length === 0 && (
              <EmptyRow message="No bills created yet." />
            )}

            {recentBills.map((bill) => (
              <div
                key={bill.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-stone-100 bg-stone-50/70 p-3"
              >
                <div>
                  <div className="font-medium text-stone-900">
                    {bill.flat.block.society.name}
                  </div>

                  <div className="text-xs text-stone-500">
                    Block {bill.flat.block.name} · Flat{" "}
                    {bill.flat.number}
                  </div>

                  <div className="text-xs text-stone-500">
                    {monthName(bill.month)} {bill.year}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-semibold text-stone-900">
                    {formatCurrency(Number(bill.amount))}
                  </div>

                  <div className="text-xs text-stone-500">
                    {bill.dueDate
                      ? `Due ${formatShortDateInAppTimeZone(
                          bill.dueDate,
                        )}`
                      : "No due date"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>

        <DashboardCard title="Recent Payments">
          <div className="space-y-3 text-sm">
            {recentPayments.length === 0 && (
              <EmptyRow message="No payments recorded yet." />
            )}

            {recentPayments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-stone-100 bg-stone-50/70 p-3"
              >
                <div>
                  <div className="font-medium text-stone-900">
                    {payment.paidBy?.name ||
                      "Unknown payer"}
                  </div>

                  <div className="text-xs text-stone-500">
                    {payment.bill.flat.block.society.name} · Block{" "}
                    {payment.bill.flat.block.name} · Flat{" "}
                    {payment.bill.flat.number}
                  </div>

                  <div className="text-xs text-stone-500">
                    {payment.mode} ·{" "}
                    {formatDateInAppTimeZone(payment.paidOn)}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-semibold text-emerald-700">
                    {formatCurrency(Number(payment.amount))}
                  </div>

                  {payment.reference && (
                    <div className="text-xs text-stone-500">
                      {payment.reference}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>

      <DashboardCard title="System Summary">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          <Metric
            label="Societies"
            value={totalSocieties}
          />

          <Metric
            label="Users"
            value={totalUsers}
          />

          <Metric
            label="Members"
            value={totalMembers}
          />

          <Metric
            label="Blocks"
            value={totalBlocks}
          />

          <Metric
            label="Flats"
            value={totalFlats}
          />

          <Metric
            label="People"
            value={totalPeople}
          />

          <Metric
            label="Bills"
            value={totalBills}
          />

          <Metric
            label="Payments"
            value={totalPayments}
          />
        </div>
      </DashboardCard>
    </div>
  )
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value)
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value)
}

function monthName(month: number) {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  return months[month - 1] ?? `Month ${month}`
}

function StatCard({
  title,
  value,
  href,
}: {
  title: string
  value: number
  href?: string
}) {
  const content = (
    <div className="h-full rounded-2xl border border-white/70 bg-white/85 p-4 shadow-[0_8px_24px_rgba(28,25,23,0.06)] backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(28,25,23,0.1)]">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-stone-500">
        {title}
      </p>

      <p className="mt-2 text-2xl font-bold tracking-tight text-stone-950">
        {formatNumber(value)}
      </p>
    </div>
  )

  return href ? (
    <Link href={href}>{content}</Link>
  ) : (
    content
  )
}

function FinancialCard({
  title,
  value,
  subtitle,
}: {
  title: string
  value: string
  subtitle: string
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
      <p className="text-[11px] uppercase tracking-[0.18em] text-stone-500">
        {title}
      </p>

      <p className="mt-2 text-2xl font-bold tracking-tight text-stone-950">
        {value}
      </p>

      <p className="mt-2 text-xs text-stone-500">
        {subtitle}
      </p>
    </div>
  )
}

function DashboardCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-[24px] border border-stone-200 bg-white p-6 shadow-[0_14px_36px_rgba(28,25,23,0.06)]">
      <h2 className="mb-4 text-lg font-semibold tracking-tight text-stone-950">
        {title}
      </h2>

      {children}
    </section>
  )
}

function Metric({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3">
      <div className="text-xl font-bold tracking-tight text-stone-950">
        {typeof value === "number"
          ? formatNumber(value)
          : value}
      </div>

      <div className="text-[11px] uppercase tracking-[0.18em] text-stone-500">
        {label}
      </div>
    </div>
  )
}

function DashboardLink({
  href,
  label,
}: {
  href: string
  label: string
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-stone-200 px-4 py-3 text-sm text-stone-700 transition hover:border-stone-300 hover:bg-stone-50"
    >
      {label}
    </Link>
  )
}

function ListOrEmpty({
  items,
  empty,
}: {
  items: {
    key: string
    left: string
    right: string
  }[]
  empty: string
}) {
  if (items.length === 0) {
    return <EmptyRow message={empty} />
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.key}
          className="flex justify-between gap-4 rounded-2xl border border-stone-100 bg-stone-50/70 px-3 py-3 text-sm"
        >
          <span className="text-stone-800">
            {item.left}
          </span>

          <span className="whitespace-nowrap text-stone-500">
            {item.right}
          </span>
        </div>
      ))}
    </div>
  )
}

function EmptyRow({
  message,
}: {
  message: string
}) {
  return (
    <p className="rounded-2xl border border-dashed border-stone-300 p-3 text-sm text-stone-500">
      {message}
    </p>
  )
}