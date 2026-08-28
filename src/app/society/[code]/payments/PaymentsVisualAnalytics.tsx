"use client"

import { useMemo, useSyncExternalStore } from "react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
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
import type { PaymentListItem } from "./PaymentsClientView"

const CHART_COLORS = [
  "#059669",
  "#2563eb",
  "#d97706",
  "#7c3aed",
  "#0891b2",
  "#ea580c",
  "#db2777",
  "#4b5563",
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
                <span className="text-stone-300 font-medium truncate">{item.name || "Collections"}</span>
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

interface PaymentsVisualAnalyticsProps {
  payments: PaymentListItem[]
}

export function PaymentsVisualAnalytics({ payments }: PaymentsVisualAnalyticsProps) {
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  // 1. Payment Channel Mode Distribution
  const modeData = useMemo(() => {
    if (payments.length === 0) return []

    const validPayments = payments.filter((p) => p.status === "SUCCESS")
    const total = validPayments.reduce((sum, p) => sum + p.amount, 0)
    const map = new Map<string, { count: number; amount: number }>()

    for (const p of validPayments) {
      const mode = p.mode || "OTHER"
      const prev = map.get(mode) || { count: 0, amount: 0 }
      map.set(mode, { count: prev.count + 1, amount: prev.amount + p.amount })
    }

    return Array.from(map.entries())
      .map(([mode, data]) => ({
        name: mode.replace(/_/g, " "),
        value: data.amount,
        count: data.count,
        percentage: total > 0 ? Math.round((data.amount / total) * 100) : 0,
      }))
      .sort((a, b) => b.value - a.value)
  }, [payments])

  // 2. Chronological Inward Inflow Trajectory Area Chart
  const inflowData = useMemo(() => {
    if (payments.length === 0) return []

    const validPayments = payments.filter((p) => p.status === "SUCCESS")
    const map = new Map<string, { label: string; date: string; Inflow: number; count: number }>()

    for (const p of validPayments) {
      const dateStr = p.paidOn ? p.paidOn.split("T")[0] : p.createdAt.split("T")[0]
      const d = new Date(dateStr)
      const day = d.getDate()
      const mName = d.toLocaleString("en-US", { month: "short" })
      const label = `${day} ${mName}`

      if (!map.has(dateStr)) {
        map.set(dateStr, {
          label,
          date: dateStr,
          Inflow: 0,
          count: 0,
        })
      }

      const item = map.get(dateStr)!
      item.Inflow += p.amount
      item.count += 1
    }

    return Array.from(map.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-20)
  }, [payments])

  if (payments.length === 0) return null

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Inflow Realization Trajectory Area Chart (2 cols) */}
      <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm lg:col-span-2">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-stone-950">
              Receipt Collections Inflow Velocity
            </h3>
            <p className="text-xs text-stone-500">
              Real-time daily collection volume realized through resident payment receipts
            </p>
          </div>
          <AdminBadge variant="neutral" size="sm">
            {inflowData.length} Periods
          </AdminBadge>
        </div>

        <div className="h-56 w-full min-w-0">
          {isMounted ? (
            <ResponsiveContainer width="100%" height={220} minWidth={100} minHeight={100}>
              <AreaChart data={inflowData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#78716c" }} axisLine={{ stroke: "#e7e5e4" }} />
                <YAxis
                  tick={{ fontSize: 11, fill: "#78716c" }}
                  axisLine={{ stroke: "#e7e5e4" }}
                  tickFormatter={(val) => formatCompact(Number(val))}
                />
                <Tooltip content={<GlassmorphismTooltip />} />
                <Area
                  type="monotone"
                  dataKey="Inflow"
                  name="Realized Inflow"
                  stroke="#059669"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorInflow)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full animate-pulse rounded-2xl bg-stone-100/60" />
          )}
        </div>
      </div>

      {/* Payment Channel Mode Donut (1 col) */}
      <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm flex flex-col justify-between">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-stone-950">
              Payment Channels
            </h3>
            <p className="text-xs text-stone-500">
              Collections by settlement instrument
            </p>
          </div>
          <AdminBadge variant="neutral" size="sm">
            {modeData.length} Channels
          </AdminBadge>
        </div>

        <div className="h-44 w-full min-w-0">
          {isMounted ? (
            <ResponsiveContainer width="100%" height={170} minWidth={100} minHeight={100}>
              <PieChart>
                <Pie
                  data={modeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={38}
                  outerRadius={62}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {modeData.map((_, index) => (
                    <Cell key={`pay-mode-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
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
          <span>Total Settled</span>
          <span className="font-bold text-emerald-800 font-mono">
            ₹{modeData.reduce((s, m) => s + m.value, 0).toLocaleString("en-IN")}
          </span>
        </div>
      </div>
    </div>
  )
}
