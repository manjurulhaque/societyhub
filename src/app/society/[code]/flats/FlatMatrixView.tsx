"use client"

import { useState, useMemo } from "react"
import { AdminBadge } from "@/components/admin"
import type { FlatListItem } from "./FlatsClientView"
import type { BlockOption } from "./AddFlatModal"

export type ColorMode = "occupancy" | "tenancy" | "dues" | "config"

interface FlatMatrixViewProps {
  societyCode: string
  flats: FlatListItem[]
  blocks: BlockOption[]
  searchQuery: string
  onSelectFlat: (flat: FlatListItem) => void
}

export function FlatMatrixView({
  societyCode,
  flats,
  blocks,
  searchQuery,
  onSelectFlat,
}: FlatMatrixViewProps) {
  const [selectedBlockId, setSelectedBlockId] = useState<string>(blocks[0]?.id || "ALL")
  const [colorMode, setColorMode] = useState<ColorMode>("occupancy")

  // Filter flats by search query
  const filteredFlats = useMemo(() => {
    if (!searchQuery.trim()) return flats
    const q = searchQuery.toLowerCase()
    return flats.filter((f) => {
      const matchNum = f.number.toLowerCase().includes(q)
      const matchBlock = f.blockName.toLowerCase().includes(q)
      const matchOccupant = f.occupants.some((o) => o.toLowerCase().includes(q))
      const matchParking = f.parkingSlot?.toLowerCase().includes(q)
      const matchIntercom = f.intercomNumber?.toLowerCase().includes(q)
      return matchNum || matchBlock || matchOccupant || matchParking || matchIntercom
    })
  }, [flats, searchQuery])

  // Group flats by Block, then by Floor
  const blockGroups = useMemo(() => {
    const activeBlocks =
      selectedBlockId === "ALL"
        ? blocks
        : blocks.filter((b) => b.id === selectedBlockId)

    return activeBlocks.map((block) => {
      const blockFlats = filteredFlats.filter((f) => f.blockId === block.id)

      // Group by floor
      const floorMap = new Map<number, FlatListItem[]>()
      const unassignedFloorFlats: FlatListItem[] = []

      blockFlats.forEach((f) => {
        if (f.floor !== null && f.floor !== undefined) {
          if (!floorMap.has(f.floor)) floorMap.set(f.floor, [])
          floorMap.get(f.floor)!.push(f)
        } else {
          unassignedFloorFlats.push(f)
        }
      })

      // Sort floors descending (top floor at top)
      const sortedFloors = Array.from(floorMap.keys()).sort((a, b) => b - a)

      // Sort flats on each floor by flat number
      sortedFloors.forEach((fl) => {
        floorMap.get(fl)!.sort((a, b) =>
          a.number.localeCompare(b.number, undefined, { numeric: true, sensitivity: "base" })
        )
      })

      unassignedFloorFlats.sort((a, b) =>
        a.number.localeCompare(b.number, undefined, { numeric: true, sensitivity: "base" })
      )

      const totalUnits = blockFlats.length
      const occupiedUnits = blockFlats.filter((f) => f.status === "OCCUPIED").length
      const vacantUnits = blockFlats.filter((f) => f.status === "VACANT").length
      const renovationUnits = blockFlats.filter((f) => f.status === "UNDER_RENOVATION").length
      const ownerOccupied = blockFlats.filter((f) =>
        f.occupantDetails?.some((o) => o.role === "OWNER" || o.role === "JOINT_OWNER")
      ).length
      const tenantOccupied = blockFlats.filter((f) =>
        f.occupantDetails?.some((o) => o.role === "TENANT")
      ).length
      const overdueUnits = blockFlats.filter((f) => Boolean(f.isDefaulter) || (f.unpaidDues ?? 0) > 0).length
      const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0

      return {
        block,
        sortedFloors,
        floorMap,
        unassignedFloorFlats,
        stats: {
          totalUnits,
          occupiedUnits,
          vacantUnits,
          renovationUnits,
          ownerOccupied,
          tenantOccupied,
          overdueUnits,
          occupancyRate,
        },
      }
    })
  }, [blocks, filteredFlats, selectedBlockId])

  // Helper function to return tile styling based on active Color Mode
  const getTileStyles = (flat: FlatListItem) => {
    const isOwner = flat.occupantDetails?.some((o) => o.role === "OWNER" || o.role === "JOINT_OWNER")
    const isTenant = flat.occupantDetails?.some((o) => o.role === "TENANT")

    if (colorMode === "occupancy") {
      if (flat.status === "OCCUPIED") {
        return {
          cardBg: "bg-emerald-50/70 hover:bg-emerald-100/80 border-emerald-200 text-emerald-950",
          badgeBg: "bg-emerald-100 text-emerald-800",
          pillBg: "bg-emerald-600 text-white",
          dotColor: "bg-emerald-500",
        }
      }
      if (flat.status === "UNDER_RENOVATION") {
        return {
          cardBg: "bg-amber-50/70 hover:bg-amber-100/80 border-amber-200 text-amber-950",
          badgeBg: "bg-amber-100 text-amber-800",
          pillBg: "bg-amber-600 text-white",
          dotColor: "bg-amber-500",
        }
      }
      return {
        cardBg: "bg-stone-50/90 hover:bg-stone-100 border-stone-200 text-stone-700",
        badgeBg: "bg-stone-200 text-stone-700",
        pillBg: "bg-stone-500 text-white",
        dotColor: "bg-stone-400",
      }
    }

    if (colorMode === "tenancy") {
      if (isOwner) {
        return {
          cardBg: "bg-purple-50/70 hover:bg-purple-100/80 border-purple-200 text-purple-950",
          badgeBg: "bg-purple-100 text-purple-800",
          pillBg: "bg-purple-700 text-white",
          dotColor: "bg-purple-600",
        }
      }
      if (isTenant) {
        return {
          cardBg: "bg-blue-50/70 hover:bg-blue-100/80 border-blue-200 text-blue-950",
          badgeBg: "bg-blue-100 text-blue-800",
          pillBg: "bg-blue-600 text-white",
          dotColor: "bg-blue-500",
        }
      }
      return {
        cardBg: "bg-stone-50/90 hover:bg-stone-100 border-stone-200 text-stone-700",
        badgeBg: "bg-stone-200 text-stone-700",
        pillBg: "bg-stone-500 text-white",
        dotColor: "bg-stone-400",
      }
    }

    if (colorMode === "dues") {
      const dues = flat.unpaidDues ?? 0
      if (flat.isDefaulter || dues > 2000) {
        return {
          cardBg: "bg-red-50 hover:bg-red-100/90 border-red-300 text-red-950 shadow-xs",
          badgeBg: "bg-red-100 text-red-800",
          pillBg: "bg-red-600 text-white",
          dotColor: "bg-red-500",
        }
      }
      if (dues > 0) {
        return {
          cardBg: "bg-amber-50/80 hover:bg-amber-100 border-amber-200 text-amber-950",
          badgeBg: "bg-amber-100 text-amber-800",
          pillBg: "bg-amber-600 text-white",
          dotColor: "bg-amber-500",
        }
      }
      return {
        cardBg: "bg-emerald-50/70 hover:bg-emerald-100/80 border-emerald-200 text-emerald-950",
        badgeBg: "bg-emerald-100 text-emerald-800",
        pillBg: "bg-emerald-700 text-white",
        dotColor: "bg-emerald-500",
      }
    }

    // Config Mode
    if (flat.unitType === "BHK3" || flat.unitType === "BHK4" || flat.unitType === "BHK5") {
      return {
        cardBg: "bg-indigo-50/70 hover:bg-indigo-100/80 border-indigo-200 text-indigo-950",
        badgeBg: "bg-indigo-100 text-indigo-800",
        pillBg: "bg-indigo-700 text-white",
        dotColor: "bg-indigo-500",
      }
    }
    if (flat.unitType === "BHK2") {
      return {
        cardBg: "bg-teal-50/70 hover:bg-teal-100/80 border-teal-200 text-teal-950",
        badgeBg: "bg-teal-100 text-teal-800",
        pillBg: "bg-teal-700 text-white",
        dotColor: "bg-teal-500",
      }
    }
    if (flat.unitType === "PENTHOUSE" || flat.unitType === "DUPLEX" || flat.unitType === "VILLA") {
      return {
        cardBg: "bg-amber-50/70 hover:bg-amber-100/80 border-amber-300 text-amber-950",
        badgeBg: "bg-amber-100 text-amber-800",
        pillBg: "bg-amber-700 text-white",
        dotColor: "bg-amber-500",
      }
    }

    return {
      cardBg: "bg-sky-50/70 hover:bg-sky-100/80 border-sky-200 text-sky-950",
      badgeBg: "bg-sky-100 text-sky-800",
      pillBg: "bg-sky-600 text-white",
      dotColor: "bg-sky-400",
    }
  }

  const formatFloorTitle = (floor: number) => {
    if (floor === 0) return "Ground Floor (0)"
    if (floor === -1) return "Basement Level (-1)"
    if (floor === -2) return "Lower Basement (-2)"
    if (floor === 1) return "1st Floor"
    if (floor === 2) return "2nd Floor"
    if (floor === 3) return "3rd Floor"
    return `${floor}th Floor`
  }

  return (
    <div className="space-y-6">
      {/* Tower Selection & Color Mode Bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-stone-200 bg-white p-4 shadow-xs">
        {/* Block Selector Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setSelectedBlockId("ALL")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
              selectedBlockId === "ALL"
                ? "bg-stone-900 text-white shadow-xs"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            All Wings ({flats.length})
          </button>

          {blocks.map((b) => {
            const count = flats.filter((f) => f.blockId === b.id).length
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelectedBlockId(b.id)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                  selectedBlockId === b.id
                    ? "bg-stone-900 text-white shadow-xs"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                {b.name} ({count})
              </button>
            )
          })}
        </div>

        {/* Color Legend Mode Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
            Color Mode:
          </span>
          <div className="flex rounded-xl border border-stone-200 bg-stone-50/80 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setColorMode("occupancy")}
              className={`rounded-lg px-2.5 py-1 transition ${
                colorMode === "occupancy"
                  ? "bg-white text-stone-950 font-bold shadow-xs"
                  : "text-stone-500 hover:text-stone-900"
              }`}
            >
              🟢 Occupancy
            </button>
            <button
              type="button"
              onClick={() => setColorMode("tenancy")}
              className={`rounded-lg px-2.5 py-1 transition ${
                colorMode === "tenancy"
                  ? "bg-white text-stone-950 font-bold shadow-xs"
                  : "text-stone-500 hover:text-stone-900"
              }`}
            >
              👥 Owner / Tenant
            </button>
            <button
              type="button"
              onClick={() => setColorMode("dues")}
              className={`rounded-lg px-2.5 py-1 transition ${
                colorMode === "dues"
                  ? "bg-white text-stone-950 font-bold shadow-xs"
                  : "text-stone-500 hover:text-stone-900"
              }`}
            >
              💳 Dues & Defaulters
            </button>
            <button
              type="button"
              onClick={() => setColorMode("config")}
              className={`rounded-lg px-2.5 py-1 transition ${
                colorMode === "config"
                  ? "bg-white text-stone-950 font-bold shadow-xs"
                  : "text-stone-500 hover:text-stone-900"
              }`}
            >
              📐 Layout Type
            </button>
          </div>
        </div>
      </div>

      {/* Matrix Legend Chips */}
      <div className="flex items-center gap-3 flex-wrap text-xs px-1">
        <span className="font-bold text-stone-400 uppercase tracking-wider text-[10px]">
          Legend:
        </span>
        {colorMode === "occupancy" && (
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 font-semibold text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Occupied
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 border border-stone-200 px-2.5 py-0.5 font-semibold text-stone-700">
              <span className="h-2 w-2 rounded-full bg-stone-400" />
              Vacant
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 font-semibold text-amber-800">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Under Renovation
            </span>
          </>
        )}

        {colorMode === "tenancy" && (
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 border border-purple-200 px-2.5 py-0.5 font-semibold text-purple-800">
              <span className="h-2 w-2 rounded-full bg-purple-600" />
              Owner Residing
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 font-semibold text-blue-800">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Tenant / Rented
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 border border-stone-200 px-2.5 py-0.5 font-semibold text-stone-600">
              <span className="h-2 w-2 rounded-full bg-stone-400" />
              Vacant
            </span>
          </>
        )}

        {colorMode === "dues" && (
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 font-semibold text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Dues Cleared (₹0)
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 font-semibold text-amber-800">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Pending Payment
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200 px-2.5 py-0.5 font-semibold text-red-800">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Overdue Defaulter
            </span>
          </>
        )}

        {colorMode === "config" && (
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 font-semibold text-indigo-800">
              <span className="h-2 w-2 rounded-full bg-indigo-600" />
              3+ BHK / Large Units
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 border border-teal-200 px-2.5 py-0.5 font-semibold text-teal-800">
              <span className="h-2 w-2 rounded-full bg-teal-600" />
              2 BHK
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 border border-sky-200 px-2.5 py-0.5 font-semibold text-sky-800">
              <span className="h-2 w-2 rounded-full bg-sky-500" />
              1 BHK / Studio
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 font-semibold text-amber-800">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Penthouse / Villa
            </span>
          </>
        )}
      </div>

      {/* Towers Render */}
      <div className="space-y-8">
        {blockGroups.map(({ block, sortedFloors, floorMap, unassignedFloorFlats, stats }) => {
          if (stats.totalUnits === 0) {
            return (
              <div
                key={block.id}
                className="rounded-3xl border border-dashed border-stone-200 bg-white p-8 text-center"
              >
                <h3 className="text-sm font-bold text-stone-900">{block.name}</h3>
                <p className="mt-1 text-xs text-stone-400">
                  No flats configured in this block matching the search filters.
                </p>
              </div>
            )
          }

          return (
            <div
              key={block.id}
              className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs space-y-5 overflow-hidden"
            >
              {/* Tower Header & Progress Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-stone-900 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-white">
                      {block.name}
                    </span>
                    <span className="text-xs font-semibold text-stone-500">
                      {stats.totalUnits} Total Units • {sortedFloors.length} Floors
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <span className="text-stone-400">Occupancy:</span>
                    <span className="font-bold text-stone-900">{stats.occupancyRate}%</span>
                    <div className="h-2 w-24 rounded-full bg-stone-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-600 transition-all"
                        style={{ width: `${stats.occupancyRate}%` }}
                      />
                    </div>
                  </div>

                  <div className="hidden md:flex items-center gap-2 text-stone-600 text-[11px]">
                    <span>👤 {stats.ownerOccupied} Owners</span>
                    <span>•</span>
                    <span>🔑 {stats.tenantOccupied} Tenants</span>
                    <span>•</span>
                    <span>📭 {stats.vacantUnits} Vacant</span>
                    {stats.overdueUnits > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-red-700 font-bold">
                          ⚠️ {stats.overdueUnits} Overdue
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Tower Architectural Elevation Layout (Floor by Floor) */}
              <div className="space-y-3">
                {sortedFloors.map((floor) => {
                  const floorFlats = floorMap.get(floor) || []
                  return (
                    <div
                      key={floor}
                      className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 rounded-2xl bg-stone-50/50 p-2.5 border border-stone-100"
                    >
                      {/* Floor Indicator Badge */}
                      <div className="flex sm:w-32 shrink-0 items-center justify-between sm:justify-start gap-2 px-2 text-xs font-bold text-stone-700">
                        <span className="rounded-lg bg-stone-200/80 px-2 py-1 text-[11px] font-mono">
                          {floor}F
                        </span>
                        <span className="truncate">{formatFloorTitle(floor)}</span>
                        <span className="text-[10px] text-stone-400 font-normal">
                          ({floorFlats.length})
                        </span>
                      </div>

                      {/* Floor Unit Cards Matrix Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 flex-1">
                        {floorFlats.map((flat) => {
                          const styles = getTileStyles(flat)
                          const primary = flat.occupantDetails?.find((o) => o.isPrimary) || flat.occupantDetails?.[0]

                          return (
                            <button
                              key={flat.id}
                              type="button"
                              onClick={() => onSelectFlat(flat)}
                              className={`group relative flex flex-col justify-between rounded-xl border p-2.5 text-left transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 cursor-pointer ${styles.cardBg}`}
                            >
                              <div>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-bold tracking-tight">
                                    {flat.number}
                                  </span>
                                  {flat.unitType && (
                                    <span className={`rounded px-1.5 py-0.2 text-[9px] font-bold ${styles.badgeBg}`}>
                                      {flat.unitType.replace(/_/g, " ")}
                                    </span>
                                  )}
                                </div>

                                <div className="mt-1 truncate text-[11px] font-medium text-stone-800">
                                  {primary ? (
                                    <span>{primary.name}</span>
                                  ) : (
                                    <span className="text-stone-400 italic">Vacant Unit</span>
                                  )}
                                </div>
                              </div>

                              <div className="mt-2 flex items-center justify-between border-t border-stone-200/40 pt-1.5 text-[10px]">
                                <span className="text-stone-500 font-mono">
                                  {flat.area ? `${flat.area} sqft` : "—"}
                                </span>

                                {(flat.unpaidDues ?? 0) > 0 ? (
                                  <span className="font-mono font-bold text-red-700">
                                    ₹{(flat.unpaidDues ?? 0).toLocaleString("en-IN")}
                                  </span>
                                ) : flat.parkingSlot ? (
                                  <span className="font-mono text-stone-500" title={`Parking: ${flat.parkingSlot}`}>
                                    🅿️ {flat.parkingSlot}
                                  </span>
                                ) : (
                                  <span className={`h-1.5 w-1.5 rounded-full ${styles.dotColor}`} />
                                )}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}

                {/* Unassigned Floors (if any) */}
                {unassignedFloorFlats.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 rounded-2xl bg-stone-50/50 p-2.5 border border-stone-100">
                    <div className="flex sm:w-32 shrink-0 items-center gap-2 px-2 text-xs font-bold text-stone-500">
                      <span>Other / Unassigned</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 flex-1">
                      {unassignedFloorFlats.map((flat) => {
                        const styles = getTileStyles(flat)
                        return (
                          <button
                            key={flat.id}
                            type="button"
                            onClick={() => onSelectFlat(flat)}
                            className={`rounded-xl border p-2.5 text-left transition hover:shadow-xs ${styles.cardBg}`}
                          >
                            <span className="text-sm font-bold">{flat.number}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
