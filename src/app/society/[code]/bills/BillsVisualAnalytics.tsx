"use client"

import { useMemo, useSyncExternalStore } from "react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { AdminBadge } from "@/components/admin"
import type { BillListItem } from "./BillsClientView"

const CHART_COLORS = [
  "#059669",
  "#2563eb",
  "#d97706",
  "#7c3aed",
  "#db2777",
  "#0891b2",
  "#ea580c",
  "#4b5563",
]

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]

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

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    name?: string
    value?: number | string
    color?: string
    fill?: string
    payload?: Record<string, unknown>
  }>
  label?: string
  currencySymbol?: string
  showPercentage?: boolean
}

function GlassmorphismTooltip({
  active,
  payload,
  label,
  currencySymbol = "₹",
  showPercentage,
}: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="min-w-[170px] max-w-[280px] rounded-2xl border border-stone-800/90 bg-stone-950/95 p-3 text-white shadow-2xl backdrop-blur-md">
      {label && (
        <div className="mb-2 border-b border-stone-800 pb-1.5 flex items-center justify-between">
          <span className="text-xs font-bold text-stone-200">{label}</span>
        </div>
      )}
      <div className="space-y-1.5">
        {payload.map((item, idx) => {
          const itemColor = item.color || item.fill || "#38bdf8"
          const valNum = typeof item.value === "number" ? item.value : Number(item.value ?? 0)
          const p = (item.payload || {}) as Record<string, unknown>
          const percentage = typeof p.percentage === "number" ? p.percentage : undefined
          const count = typeof p.count === "number" ? p.count : undefined

          return (
            <div key={idx} className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: itemColor }} />
                <span className="text-stone-300 font-medium truncate">{item.name || "Amount"}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="font-bold text-stone-50 font-mono">
                  {currencySymbol}{valNum.toLocaleString("en-IN")}
                </span>
                {showPercentage && percentage !== undefined && (
                  <span className="rounded bg-stone-800 px-1 py-0.5 text-[10px] font-semibold text-emerald-400">
                    {percentage}%
                  </span>
                )}
                {count !== undefined && !showPercentage && (
                  <span className="text-[10px] text-stone-400">({count})</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface BillsVisualAnalyticsProps {
  bills: BillListItem[]
}

export function BillsVisualAnalytics({ bills }: BillsVisualAnalyticsProps) {
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  // 1. Monthly Run Aggregation
  const monthlyData = useMemo(() => {
    if (bills.length === 0) return []

    const map = new Map<
      string,
      { label: string; year: number; month: number; Billed: number; Collected: number; Pending: number }
    >()

    for (const b of bills) {
      const key = `${b.year}-${String(b.month).padStart(2, "0")}`
      if (!map.has(key)) {
        const mName = MONTH_NAMES[b.month - 1] || `M${b.month}`
        map.set(key, {
          label: `${mName} '${String(b.year).slice(-2)}`,
          year: b.year,
          month: b.month,
          Billed: 0,
          Collected: 0,
          Pending: 0,
        })
      }

      const item = map.get(key)!
      item.Billed += b.amount
      if (b.status === "PAID") {
        item.Collected += b.amount
      } else {
        item.Pending += b.amount
      }
    }

    return Array.from(map.values())
      .sort((a, b) => (a.year === b.year ? a.month - b.month : a.year - b.year))
      .slice(-12)
  }, [bills])

  // 2. Bill Type Breakdown Aggregation
  const typeData = useMemo(() => {
    if (bills.length === 0) return []

    const total = bills.reduce((sum, b) => sum + b.amount, 0)
    const map = new Map<string, { count: number; amount: number }>()

    for (const b of bills) {
      const t = b.billType || "GENERAL"
      const prev = map.get(t) || { count: 0, amount: 0 }
      map.set(t, { count: prev.count + 1, amount: prev.amount + b.amount })
    }

    return Array.from(map.entries())
      .map(([type, data]) => ({
        name: type.replace(/_/g, " "),
        value: data.amount,
        count: data.count,
        percentage: total > 0 ? Math.round((data.amount / total) * 100) : 0,
      }))
      .sort((a, b) => b.value - a.value)
  }, [bills])

  if (bills.length === 0) return null

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Monthly Invoicing Realization Bar Chart (2 cols) */}
      <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm lg:col-span-2">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-stone-950">
              Monthly Billing Demand vs. Realization
            </h3>
            <p className="text-xs text-stone-500">
              Demand invoices generated vs. collections settled across billing cycles
            </p>
          </div>
          <AdminBadge variant="neutral" size="sm">
            {monthlyData.length} Cycles
          </AdminBadge>
        </div>

        <div className="h-56 w-full min-w-0">
          {isMounted ? (
            <ResponsiveContainer width="100%" height={220} minWidth={100} minHeight={100}>
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#78716c" }} axisLine={{ stroke: "#e7e5e4" }} />
                <YAxis
                  tick={{ fontSize: 11, fill: "#78716c" }}
                  axisLine={{ stroke: "#e7e5e4" }}
                  tickFormatter={(val) => formatCompact(Number(val))}
                />
                <Tooltip content={<GlassmorphismTooltip />} />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "4px" }} />
                <Bar dataKey="Billed" fill="#1c1917" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Collected" fill="#059669" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Pending" fill="#e11d48" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full animate-pulse rounded-2xl bg-stone-100/60" />
          )}
        </div>
      </div>

      {/* Bill Type Category Breakdown Donut (1 col) */}
      <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm flex flex-col justify-between">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-stone-950">
              Assessment Head Distribution
            </h3>
            <p className="text-xs text-stone-500">
              Breakdown by demand assessment type
            </p>
          </div>
          <AdminBadge variant="neutral" size="sm">
            {typeData.length} Heads
          </AdminBadge>
        </div>

        <div className="h-44 w-full min-w-0">
          {isMounted ? (
            <ResponsiveContainer width="100%" height={170} minWidth={100} minHeight={100}>
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={38}
                  outerRadius={62}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {typeData.map((_, index) => (
                    <Cell key={`bill-type-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<GlassmorphismTooltip showPercentage />} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full animate-pulse rounded-2xl bg-stone-100/60" />
          )}
        </div>

        <div className="border-t border-stone-100 pt-3 flex items-center justify-between text-xs text-stone-500">
          <span>Total Invoiced</span>
          <span className="font-bold text-stone-900 font-mono">
            ₹{bills.reduce((s, b) => s + b.amount, 0).toLocaleString("en-IN")}
          </span>
        </div>
      </div>
    </div>
  )
}
