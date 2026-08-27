"use client"

import { useSyncExternalStore, useMemo } from "react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import { AdminBadge } from "@/components/admin"

function formatCompactCurrency(val: number, symbol = "₹"): string {
  const abs = Math.abs(val)
  const sign = val < 0 ? "-" : ""
  if (abs >= 10000000) {
    const cr = (abs / 10000000).toFixed(1).replace(/\.0$/, "")
    return `${sign}${symbol}${cr}Cr`
  }
  if (abs >= 100000) {
    const l = (abs / 100000).toFixed(1).replace(/\.0$/, "")
    return `${sign}${symbol}${l}L`
  }
  if (abs >= 1000) {
    const k = (abs / 1000).toFixed(1).replace(/\.0$/, "")
    return `${sign}${symbol}${k}K`
  }
  return `${sign}${symbol}${abs.toLocaleString("en-IN")}`
}

export interface SuperAdminDashboardChartsProps {
  societyScaleData: {
    name: string
    code?: string | null
    flatsCount: number
    membersCount: number
    blocksCount: number
  }[]
  financialOverview: {
    totalBilled: number
    totalCollected: number
    totalOutstanding: number
  }
}

export function SuperAdminDashboardCharts({
  societyScaleData,
  financialOverview,
}: SuperAdminDashboardChartsProps) {
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  const financialData = useMemo(() => {
    return [
      {
        name: "Collected",
        value: financialOverview.totalCollected,
        fill: "#059669",
      },
      {
        name: "Outstanding Dues",
        value: financialOverview.totalOutstanding,
        fill: "#e11d48",
      },
    ].filter((d) => d.value > 0)
  }, [financialOverview])

  const realizationRate = useMemo(() => {
    if (financialOverview.totalBilled <= 0) return 0
    return Math.round(
      (financialOverview.totalCollected / financialOverview.totalBilled) * 100
    )
  }, [financialOverview])

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* 1. Platform Realization Donut */}
      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-stone-950">
              Platform Financial Realization
            </h3>
            <p className="text-xs text-stone-500">
              Aggregated collections vs. pending receivables across all societies
            </p>
          </div>
          <AdminBadge variant={realizationRate >= 75 ? "success" : "warning"} size="sm">
            {realizationRate}% Realized
          </AdminBadge>
        </div>

        <div className="h-52 w-full min-w-0">
          {isMounted ? (
            <ResponsiveContainer width="100%" height={200} minWidth={100} minHeight={100}>
              <PieChart>
                <Pie
                  data={financialData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {financialData.map((entry, index) => (
                    <Cell key={`superadmin-fin-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: unknown) => [
                    `₹${Number(val ?? 0).toLocaleString("en-IN")}`,
                    "",
                  ]}
                  contentStyle={{
                    backgroundColor: "#1c1917",
                    borderRadius: "12px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full animate-pulse rounded-2xl bg-stone-100/60" />
          )}
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2 border-t border-stone-100 pt-3">
          <div className="rounded-xl bg-emerald-50/60 p-2.5">
            <span className="text-[11px] font-semibold text-emerald-800">
              Total Realized
            </span>
            <p className="text-sm font-extrabold text-emerald-950">
              {formatCompactCurrency(financialOverview.totalCollected)}
            </p>
          </div>
          <div className="rounded-xl bg-rose-50/60 p-2.5">
            <span className="text-[11px] font-semibold text-rose-800">
              Total Outstanding
            </span>
            <p className="text-sm font-extrabold text-rose-950">
              {formatCompactCurrency(financialOverview.totalOutstanding)}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Top Societies by Flat Scale & Capacity */}
      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm lg:col-span-2">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-stone-950">
              Society Scale &amp; Housing Unit Capacity
            </h3>
            <p className="text-xs text-stone-500">
              Active flats, residential blocks, and onboarded members by society
            </p>
          </div>
          <AdminBadge variant="neutral" size="sm">
            {societyScaleData.length} Societies
          </AdminBadge>
        </div>

        <div className="h-56 w-full min-w-0">
          {isMounted ? (
            <ResponsiveContainer width="100%" height={220} minWidth={100} minHeight={100}>
              <BarChart
                data={societyScaleData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#78716c" }}
                  axisLine={{ stroke: "#e7e5e4" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#78716c" }}
                  axisLine={{ stroke: "#e7e5e4" }}
                />
                <Tooltip
                  formatter={(val: unknown, name: unknown) => [
                    `${val} ${name === "flatsCount" ? "flats" : name === "membersCount" ? "members" : "blocks"}`,
                    name === "flatsCount" ? "Flats" : name === "membersCount" ? "Members" : "Blocks",
                  ]}
                  contentStyle={{
                    backgroundColor: "#1c1917",
                    borderRadius: "12px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <Legend
                  formatter={(val) =>
                    val === "flatsCount"
                      ? "Flats"
                      : val === "membersCount"
                        ? "Members"
                        : "Blocks"
                  }
                  wrapperStyle={{ fontSize: "11px", paddingTop: "4px" }}
                />
                <Bar
                  dataKey="flatsCount"
                  fill="#1c1917"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="membersCount"
                  fill="#0284c7"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="blocksCount"
                  fill="#d97706"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full animate-pulse rounded-2xl bg-stone-100/60" />
          )}
        </div>
      </div>
    </div>
  )
}
