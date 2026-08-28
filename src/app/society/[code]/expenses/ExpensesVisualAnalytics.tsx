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

const CHART_COLORS = [
  "#d97706",
  "#059669",
  "#2563eb",
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

export type ExpenseAnalyticsItem = {
  id: string
  expenseDate: string | Date
  amount: number
  status: string
  categoryName: string
}

interface ExpensesVisualAnalyticsProps {
  expenses: ExpenseAnalyticsItem[]
}

export function ExpensesVisualAnalytics({ expenses }: ExpensesVisualAnalyticsProps) {
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  // 1. Monthly Spending Velocity
  const monthlyData = useMemo(() => {
    if (expenses.length === 0) return []

    const map = new Map<
      string,
      { label: string; year: number; month: number; Disbursed: number; Pending: number }
    >()

    for (const e of expenses) {
      const d = new Date(e.expenseDate)
      const year = d.getFullYear()
      const month = d.getMonth() + 1
      const key = `${year}-${String(month).padStart(2, "0")}`

      if (!map.has(key)) {
        const mName = MONTH_NAMES[month - 1] || `M${month}`
        map.set(key, {
          label: `${mName} '${String(year).slice(-2)}`,
          year,
          month,
          Disbursed: 0,
          Pending: 0,
        })
      }

      const item = map.get(key)!
      if (e.status === "PAID" || e.status === "APPROVED") {
        item.Disbursed += e.amount
      } else if (e.status === "PENDING") {
        item.Pending += e.amount
      }
    }

    return Array.from(map.values())
      .sort((a, b) => (a.year === b.year ? a.month - b.month : a.year - b.year))
      .slice(-12)
  }, [expenses])

  // 2. Category Distribution Donut
  const categoryData = useMemo(() => {
    if (expenses.length === 0) return []

    const total = expenses
      .filter((e) => e.status === "PAID" || e.status === "APPROVED")
      .reduce((sum, e) => sum + e.amount, 0)

    const map = new Map<string, { count: number; amount: number }>()

    for (const e of expenses) {
      if (e.status !== "PAID" && e.status !== "APPROVED") continue
      const cat = e.categoryName || "General Operational"
      const prev = map.get(cat) || { count: 0, amount: 0 }
      map.set(cat, { count: prev.count + 1, amount: prev.amount + e.amount })
    }

    return Array.from(map.entries())
      .map(([name, data]) => ({
        name,
        value: data.amount,
        count: data.count,
        percentage: total > 0 ? Math.round((data.amount / total) * 100) : 0,
      }))
      .sort((a, b) => b.value - a.value)
  }, [expenses])

  if (expenses.length === 0) return null

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Monthly Expenditure Velocity BarChart (2 cols) */}
      <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm lg:col-span-2">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-stone-950">
              Monthly Operational Spend Velocity
            </h3>
            <p className="text-xs text-stone-500">
              Approved vendor payouts & operational overheads across accounting months
            </p>
          </div>
          <AdminBadge variant="neutral" size="sm">
            {monthlyData.length} Months
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
                <Bar dataKey="Disbursed" name="Disbursed / Paid" fill="#d97706" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Pending" name="Pending Review" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full animate-pulse rounded-2xl bg-stone-100/60" />
          )}
        </div>
      </div>

      {/* Category Cost Distribution Donut (1 col) */}
      <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm flex flex-col justify-between">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-stone-950">
              Cost Head Distribution
            </h3>
            <p className="text-xs text-stone-500">
              Breakdown by operational category
            </p>
          </div>
          <AdminBadge variant="neutral" size="sm">
            {categoryData.length} Heads
          </AdminBadge>
        </div>

        <div className="h-44 w-full min-w-0">
          {isMounted ? (
            <ResponsiveContainer width="100%" height={170} minWidth={100} minHeight={100}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={38}
                  outerRadius={62}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {categoryData.map((_, index) => (
                    <Cell key={`exp-cat-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
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
          <span>Realized Spend</span>
          <span className="font-bold text-amber-800 font-mono">
            ₹{categoryData.reduce((s, c) => s + c.value, 0).toLocaleString("en-IN")}
          </span>
        </div>
      </div>
    </div>
  )
}
