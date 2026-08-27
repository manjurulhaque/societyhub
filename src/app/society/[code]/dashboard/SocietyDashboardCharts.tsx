"use client"

import { useSyncExternalStore, useMemo } from "react"
import Link from "next/link"
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"
import { AdminBadge } from "@/components/admin"

export type OccupancyItem = {
  status: string
  label: string
  count: number
  color: string
}

export type FinancialSummary = {
  totalBilled: number
  totalCollected: number
  outstanding: number
  collectionRate: number
  currencySymbol?: string
}

interface SocietyDashboardChartsProps {
  societyCode: string
  occupancyData: OccupancyItem[]
  totalFlats: number
  financialSummary: FinancialSummary
}

function formatCompact(value: number, sym: string = "₹"): string {
  if (value === 0) return `${sym}0`
  const absVal = Math.abs(value)
  let formatted = ""

  if (absVal >= 10_000_000) {
    formatted = `${(absVal / 10_000_000).toFixed(1).replace(/\.0$/, "")}Cr`
  } else if (absVal >= 100_000) {
    formatted = `${(absVal / 100_000).toFixed(1).replace(/\.0$/, "")}L`
  } else if (absVal >= 1_000) {
    formatted = `${(absVal / 1_000).toFixed(0)}K`
  } else {
    formatted = `${absVal}`
  }

  return value < 0 ? `-${sym}${formatted}` : `${sym}${formatted}`
}

export function SocietyDashboardCharts({
  societyCode,
  occupancyData,
  totalFlats,
  financialSummary,
}: SocietyDashboardChartsProps) {
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  const sym = financialSummary.currencySymbol || "₹"

  const filteredOccupancy = useMemo(
    () => occupancyData.filter((item) => item.count > 0),
    [occupancyData]
  )

  const financialBarData = useMemo(
    () => [
      {
        name: "Demand & Recovery",
        Billed: financialSummary.totalBilled,
        Collected: financialSummary.totalCollected,
        Outstanding: financialSummary.outstanding,
      },
    ],
    [financialSummary]
  )

  const hasFinancialData =
    financialSummary.totalBilled > 0 ||
    financialSummary.totalCollected > 0 ||
    financialSummary.outstanding > 0

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* 1. Occupancy Breakdown Donut */}
      <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-stone-950">
              Unit Occupancy Status
            </h3>
            <p className="text-xs text-stone-500">
              Distribution of flats across occupancy categories
            </p>
          </div>
          <AdminBadge variant="neutral" size="sm">
            {totalFlats} Total Units
          </AdminBadge>
        </div>

        {filteredOccupancy.length === 0 ? (
          <div className="flex h-52 items-center justify-center text-xs text-stone-400">
            No flats registered in this society yet.
          </div>
        ) : (
          <div className="h-52 w-full min-w-0">
            {isMounted ? (
              <ResponsiveContainer width="100%" height={200} minWidth={100} minHeight={100}>
                <PieChart>
                  <Pie
                    data={filteredOccupancy}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="count"
                    nameKey="label"
                  >
                    {filteredOccupancy.map((entry, index) => (
                      <Cell key={`occ-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: unknown) => [
                      `${val} flats (${totalFlats > 0 ? Math.round((Number(val) / totalFlats) * 100) : 0}%)`,
                      "",
                    ]}
                    contentStyle={{
                      backgroundColor: "#1c1917",
                      borderRadius: "12px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "4px" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full animate-pulse rounded-2xl bg-stone-100/60" />
            )}
          </div>
        )}
      </div>

      {/* 2. Maintenance Realization Overview Mini-Bar */}
      <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-stone-950">
              Maintenance Collection Realization
            </h3>
            <p className="text-xs text-stone-500">
              Billing demand vs. realized recovery vs. outstanding arrears
            </p>
          </div>
          <Link
            href={`/society/${societyCode}/reports`}
            className="text-xs font-semibold text-stone-900 hover:text-stone-700"
          >
            Audit Report →
          </Link>
        </div>

        {!hasFinancialData ? (
          <div className="flex h-52 items-center justify-center text-xs text-stone-400">
            No maintenance invoices or payments recorded yet.
          </div>
        ) : (
          <div className="h-52 w-full min-w-0">
            {isMounted ? (
              <ResponsiveContainer width="100%" height={200} minWidth={100} minHeight={100}>
                <BarChart data={financialBarData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#78716c" }} axisLine={{ stroke: "#e7e5e4" }} />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#78716c" }}
                    axisLine={{ stroke: "#e7e5e4" }}
                    tickFormatter={(val) => formatCompact(Number(val), sym)}
                  />
                  <Tooltip
                    formatter={(val: unknown) => [
                      `${sym}${Number(val ?? 0).toLocaleString("en-IN")}`,
                      "",
                    ]}
                    contentStyle={{
                      backgroundColor: "#1c1917",
                      borderRadius: "12px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "4px" }} />
                  <Bar dataKey="Billed" fill="#1c1917" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Collected" fill="#059669" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Outstanding" fill="#e11d48" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full animate-pulse rounded-2xl bg-stone-100/60" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
