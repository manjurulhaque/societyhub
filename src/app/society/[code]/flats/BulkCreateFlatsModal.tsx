"use client"

import { toast } from "sonner"

import { useState, useTransition, useMemo } from "react"
import { bulkCreateFlats, type BulkFlatItemInput, type BulkCreateFlatsResult } from "./actions"
import type { UnitType, OccupancyStatus } from "@/generated/prisma/client"
import type { BlockOption } from "./AddFlatModal"
import { generateSafeCsv, parseCsv } from "@/lib/csv"

interface BulkCreateFlatsModalProps {
  isOpen: boolean
  onClose: () => void
  societyCode: string
  blocks: BlockOption[]
}

const UNIT_TYPES: { value: UnitType; label: string }[] = [
  { value: "BHK1", label: "1 BHK" },
  { value: "BHK2", label: "2 BHK" },
  { value: "BHK3", label: "3 BHK" },
  { value: "BHK4", label: "4 BHK" },
  { value: "BHK5", label: "5 BHK" },
  { value: "STUDIO", label: "Studio Apartment" },
  { value: "RK1", label: "1 RK" },
  { value: "PENTHOUSE", label: "Penthouse" },
  { value: "DUPLEX", label: "Duplex" },
  { value: "VILLA", label: "Villa / Row House" },
  { value: "ROW_HOUSE", label: "Row House" },
  { value: "SHOP", label: "Commercial Shop" },
  { value: "OFFICE", label: "Office Unit" },
  { value: "COMMERCIAL", label: "Commercial Space" },
  { value: "PLOT", label: "Open Plot" },
]

function normalizeUnitType(raw: string): UnitType {
  const clean = raw.trim().toUpperCase().replace(/[\s_-]/g, "")
  if (clean === "1BHK" || clean === "BHK1") return "BHK1"
  if (clean === "2BHK" || clean === "BHK2") return "BHK2"
  if (clean === "3BHK" || clean === "BHK3") return "BHK3"
  if (clean === "4BHK" || clean === "BHK4") return "BHK4"
  if (clean === "5BHK" || clean === "BHK5") return "BHK5"
  if (clean === "STUDIO" || clean === "STUDIOAPARTMENT") return "STUDIO"
  if (clean === "1RK" || clean === "RK1") return "RK1"
  if (clean === "PENTHOUSE") return "PENTHOUSE"
  if (clean === "DUPLEX") return "DUPLEX"
  if (clean === "VILLA") return "VILLA"
  if (clean === "ROWHOUSE") return "ROW_HOUSE"
  if (clean === "SHOP") return "SHOP"
  if (clean === "OFFICE") return "OFFICE"
  if (clean === "COMMERCIAL") return "COMMERCIAL"
  if (clean === "PLOT") return "PLOT"
  return "BHK2"
}

function normalizeStatus(raw: string): OccupancyStatus {
  const clean = raw.trim().toUpperCase().replace(/[\s_-]/g, "")
  if (clean.includes("OCCUPI")) return "OCCUPIED"
  if (clean.includes("RENOVAT")) return "UNDER_RENOVATION"
  return "VACANT"
}

export function BulkCreateFlatsModal({
  isOpen,
  onClose,
  societyCode,
  blocks,
}: BulkCreateFlatsModalProps) {
  const [mode, setMode] = useState<"pattern" | "csv">("pattern")

  // --- Pattern Generator Form State ---
  const [patternBlockId, setPatternBlockId] = useState(blocks[0]?.id || "")
  const [startFloor, setStartFloor] = useState("1")
  const [endFloor, setEndFloor] = useState("10")
  const [flatsPerFloor, setFlatsPerFloor] = useState("4")
  const [namingFormat, setNamingFormat] = useState<"floorIndex" | "blockFloorIndex" | "customPrefix">("floorIndex")
  const [customPrefix, setCustomPrefix] = useState("")
  const [patternDefaultType, setPatternDefaultType] = useState<UnitType>("BHK2")
  const [patternDefaultArea, setPatternDefaultArea] = useState("950")
  const [patternDefaultStatus, setPatternDefaultStatus] = useState<OccupancyStatus>("VACANT")

  // Series-specific configurations
  const [seriesConfigs, setSeriesConfigs] = useState<{ [index: number]: { unitType: UnitType; area: string } }>({
    1: { unitType: "BHK3", area: "1250" },
    2: { unitType: "BHK3", area: "1250" },
    3: { unitType: "BHK2", area: "950" },
    4: { unitType: "BHK2", area: "950" },
  })

  // --- CSV Import State ---
  const [csvText, setCsvText] = useState("")
  const [csvFileName, setCsvFileName] = useState("")

  // --- Generated / Parsed Preview Items ---
  const [previewItems, setPreviewItems] = useState<
    (BulkFlatItemInput & { id: string; blockName: string })[]
  >([])

  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<BulkCreateFlatsResult | null>(null)
  const [isPending, startTransition] = useTransition()

  if (!isOpen) return null

  const handleGeneratePatternPreview = () => {
    setError(null)
    setResult(null)

    const fromF = parseInt(startFloor, 10)
    const toF = parseInt(endFloor, 10)
    const perFloor = parseInt(flatsPerFloor, 10)

    if (isNaN(fromF) || isNaN(toF) || fromF > toF) {
      setError("Please specify a valid floor range (Start Floor <= End Floor).")
      return
    }

    if (isNaN(perFloor) || perFloor < 1 || perFloor > 20) {
      setError("Flats per floor must be between 1 and 20.")
      return
    }

    const selectedBlock = blocks.find((b) => b.id === patternBlockId) || blocks[0]
    if (!selectedBlock) {
      setError("Please select a block / wing.")
      return
    }

    const generated: (BulkFlatItemInput & { id: string; blockName: string })[] = []

    for (let floor = fromF; floor <= toF; floor++) {
      for (let index = 1; index <= perFloor; index++) {
        const indexPad = index < 10 ? `0${index}` : `${index}`
        let flatNum = ""

        if (namingFormat === "floorIndex") {
          // e.g. 101, 102 ... 1001, 1002 (or 001 for ground)
          flatNum = `${floor}${indexPad}`
        } else if (namingFormat === "blockFloorIndex") {
          // e.g. A-101
          flatNum = `${selectedBlock.name}-${floor}${indexPad}`
        } else if (namingFormat === "customPrefix") {
          flatNum = `${customPrefix.trim()}${floor}${indexPad}`
        }

        const seriesCfg = seriesConfigs[index]
        const unitType = seriesCfg?.unitType || patternDefaultType
        const areaStr = seriesCfg?.area || patternDefaultArea
        const areaNum = parseFloat(areaStr)

        generated.push({
          id: `${selectedBlock.id}-${flatNum}-${floor}-${index}`,
          blockId: selectedBlock.id,
          blockName: selectedBlock.name,
          number: flatNum,
          floor,
          unitType,
          area: !isNaN(areaNum) ? areaNum : null,
          areaUnit: "sqft",
          status: patternDefaultStatus,
          intercomNumber: flatNum,
          parkingSlot: null,
        })
      }
    }

    setPreviewItems(generated)
  }

  const handleParseCsv = (rawContent: string) => {
    setError(null)
    setResult(null)

    const rows = parseCsv(rawContent)
    if (rows.length === 0) {
      setError("No valid CSV rows detected.")
      return
    }

    // Find header row or assume standard format
    let headerRowIndex = -1
    let colIndex = {
      block: -1,
      number: -1,
      floor: -1,
      unitType: -1,
      area: -1,
      areaUnit: -1,
      status: -1,
      parkingSlot: -1,
      intercomNumber: -1,
    }

    for (let i = 0; i < Math.min(3, rows.length); i++) {
      const row = rows[i].map((c) => c.toLowerCase().trim())
      if (row.some((c) => c.includes("flat") || c.includes("unit") || c.includes("number") || c.includes("block"))) {
        headerRowIndex = i
        row.forEach((col, idx) => {
          if (col.includes("block") || col.includes("wing") || col.includes("tower")) colIndex.block = idx
          else if (col.includes("flat") || col.includes("number") || col.includes("unit_no") || col.includes("unit no")) colIndex.number = idx
          else if (col.includes("floor")) colIndex.floor = idx
          else if (col.includes("type") || col.includes("bhk") || col.includes("config")) colIndex.unitType = idx
          else if (col.includes("area") && !col.includes("unit")) colIndex.area = idx
          else if (col.includes("area_unit") || col.includes("unit_name")) colIndex.areaUnit = idx
          else if (col.includes("status") || col.includes("occupan")) colIndex.status = idx
          else if (col.includes("park") || col.includes("slot")) colIndex.parkingSlot = idx
          else if (col.includes("intercom") || col.includes("ext")) colIndex.intercomNumber = idx
        })
        break
      }
    }

    const dataRows = headerRowIndex >= 0 ? rows.slice(headerRowIndex + 1) : rows
    if (dataRows.length === 0) {
      setError("CSV file contains headers but no flat data rows.")
      return
    }

    const parsed: (BulkFlatItemInput & { id: string; blockName: string })[] = []

    dataRows.forEach((row, rowIdx) => {
      if (row.length === 0 || row.every((c) => !c.trim())) return

      // Default column mapping if no headers detected
      const rawBlock = (colIndex.block >= 0 ? row[colIndex.block] : row[0]) || ""
      const rawNumber = (colIndex.number >= 0 ? row[colIndex.number] : row[1]) || ""
      const rawFloor = (colIndex.floor >= 0 ? row[colIndex.floor] : row[2]) || ""
      const rawType = (colIndex.unitType >= 0 ? row[colIndex.unitType] : row[3]) || ""
      const rawArea = (colIndex.area >= 0 ? row[colIndex.area] : row[4]) || ""
      const rawAreaUnit = (colIndex.areaUnit >= 0 ? row[colIndex.areaUnit] : "sqft") || "sqft"
      const rawStatus = (colIndex.status >= 0 ? row[colIndex.status] : row[5]) || "VACANT"
      const rawParking = colIndex.parkingSlot >= 0 ? row[colIndex.parkingSlot] : row[6] || null
      const rawIntercom = colIndex.intercomNumber >= 0 ? row[colIndex.intercomNumber] : row[7] || null

      if (!rawNumber.trim()) return

      // Resolve block
      const cleanBlockName = rawBlock.trim()
      let matchedBlock = blocks.find(
        (b) =>
          b.name.toLowerCase() === cleanBlockName.toLowerCase() ||
          b.name.toLowerCase().includes(cleanBlockName.toLowerCase()) ||
          cleanBlockName.toLowerCase().includes(b.name.toLowerCase())
      )

      if (!matchedBlock && blocks.length === 1) {
        matchedBlock = blocks[0]
      } else if (!matchedBlock) {
        matchedBlock = blocks[0]
      }

      const floorNum = parseInt(rawFloor.trim(), 10)
      const areaNum = parseFloat(rawArea.trim())

      parsed.push({
        id: `csv-${rowIdx}-${rawNumber}`,
        blockId: matchedBlock?.id || blocks[0]?.id || "",
        blockName: matchedBlock?.name || cleanBlockName || blocks[0]?.name || "Block",
        number: rawNumber.trim(),
        floor: !isNaN(floorNum) ? floorNum : null,
        unitType: rawType.trim() ? normalizeUnitType(rawType) : "BHK2",
        area: !isNaN(areaNum) ? areaNum : null,
        areaUnit: rawAreaUnit.trim() || "sqft",
        status: normalizeStatus(rawStatus),
        parkingSlot: rawParking ? rawParking.trim() : null,
        intercomNumber: rawIntercom ? rawIntercom.trim() : null,
      })
    })

    if (parsed.length === 0) {
      setError("Could not parse any valid flat rows from the provided CSV data.")
      return
    }

    setPreviewItems(parsed)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setCsvFileName(file.name)
    const reader = new FileReader()
    reader.onload = (evt) => {
      const content = evt.target?.result as string
      if (content) {
        setCsvText(content)
        handleParseCsv(content)
      }
    }
    reader.readAsText(file)
  }

  const handleDownloadSampleCsv = () => {
    const sampleBlock = blocks[0]?.name || "Wing A"
    const headers = [
      "Block",
      "Flat Number",
      "Floor",
      "Unit Type",
      "Carpet Area (sqft)",
      "Occupancy Status",
      "Parking Slot",
      "Intercom Extension",
    ]

    const rows = [
      [sampleBlock, "101", "1", "3 BHK", "1350", "VACANT", "P-101", "101"],
      [sampleBlock, "102", "1", "3 BHK", "1350", "VACANT", "P-102", "102"],
      [sampleBlock, "103", "1", "2 BHK", "980", "VACANT", "P-103", "103"],
      [sampleBlock, "104", "1", "2 BHK", "980", "VACANT", "P-104", "104"],
      [sampleBlock, "201", "2", "3 BHK", "1350", "OCCUPIED", "P-201", "201"],
      [sampleBlock, "202", "2", "3 BHK", "1350", "VACANT", "P-202", "202"],
      [sampleBlock, "203", "2", "2 BHK", "980", "VACANT", "P-203", "203"],
      [sampleBlock, "204", "2", "2 BHK", "980", "VACANT", "P-204", "204"],
    ]

    const csvContent = generateSafeCsv(headers, rows)
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `sample_flats_import_template.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleRemovePreviewItem = (id: string) => {
    setPreviewItems((prev) => prev.filter((item) => item.id !== id))
  }

  const handleExecuteBulkCreate = () => {
    if (previewItems.length === 0) {
      setError("No flats in the preview queue to create.")
      return
    }

    setError(null)
    setResult(null)

    startTransition(async () => {
      try {
        const payload: BulkFlatItemInput[] = previewItems.map((item) => ({
          blockId: item.blockId,
          number: item.number,
          floor: item.floor,
          unitType: item.unitType,
          area: item.area,
          areaUnit: item.areaUnit,
          status: item.status,
          parkingSlot: item.parkingSlot,
          intercomNumber: item.intercomNumber,
        }))

        const res = await bulkCreateFlats(societyCode, payload)
        setResult(res)

        if (res.error) {
          setError(res.error)
        } else if (res.success && (!res.skippedCount || res.skippedCount === 0)) {
          setTimeout(() => {
            onClose()
          }, 1500)
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to execute bulk creation."
        setError(msg)
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-stone-950/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl transition-all">
        {/* Modal Header */}
        <div className="flex shrink-0 items-start justify-between border-b border-stone-100 px-6 py-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-stone-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                ⚡ Rapid Setup
              </span>
            </div>
            <h3 className="mt-1 text-xl font-bold tracking-tight text-stone-950">
              Bulk Add & Import Flats
            </h3>
            <p className="mt-0.5 text-xs text-stone-500">
              Generate full building wings floor-by-floor using patterns or upload a CSV / Excel file.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-stone-100 px-6 gap-6 text-xs font-semibold bg-stone-50/50">
          <button
            type="button"
            onClick={() => setMode("pattern")}
            className={`py-3 transition-colors border-b-2 whitespace-nowrap ${
              mode === "pattern"
                ? "border-stone-900 text-stone-950 font-bold"
                : "border-transparent text-stone-400 hover:text-stone-700"
            }`}
          >
            🏢 Pattern / Floor Range Generator
          </button>
          <button
            type="button"
            onClick={() => setMode("csv")}
            className={`py-3 transition-colors border-b-2 whitespace-nowrap ${
              mode === "csv"
                ? "border-stone-900 text-stone-950 font-bold"
                : "border-transparent text-stone-400 hover:text-stone-700"
            }`}
          >
            📄 CSV / Excel Spreadsheet Import
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {error ? (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
              <svg className="h-4 w-4 shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 000 16zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{error}</span>
            </div>
          ) : null}

          {result?.success ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs">
              <div className="flex items-center gap-2 font-bold text-emerald-800">
                <svg className="h-5 w-5 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                </svg>
                <span>{result.message}</span>
              </div>

              {result.skippedFlats && result.skippedFlats.length > 0 ? (
                <div className="mt-2.5 space-y-1">
                  <span className="font-semibold text-stone-700">Skipped items:</span>
                  <ul className="list-disc pl-5 text-stone-600 space-y-0.5">
                    {result.skippedFlats.map((s, idx) => (
                      <li key={idx}>
                        <strong>{s.blockName}-{s.number}</strong>: {s.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Mode 1: Pattern Generator */}
          {mode === "pattern" && (
            <div className="space-y-5 rounded-2xl border border-stone-200 bg-stone-50/40 p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                    Target Block / Wing *
                  </label>
                  <select
                    value={patternBlockId}
                    onChange={(e) => setPatternBlockId(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
                  >
                    {blocks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                    Floor Range (From – To) *
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={startFloor}
                      onChange={(e) => setStartFloor(e.target.value)}
                      placeholder="1"
                      className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
                    />
                    <span className="text-stone-400 font-bold">to</span>
                    <input
                      type="number"
                      value={endFloor}
                      onChange={(e) => setEndFloor(e.target.value)}
                      placeholder="10"
                      className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                    Units per Floor *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={flatsPerFloor}
                    onChange={(e) => {
                      setFlatsPerFloor(e.target.value)
                      const count = parseInt(e.target.value, 10)
                      if (!isNaN(count) && count > 0) {
                        const newConfigs: { [index: number]: { unitType: UnitType; area: string } } = {}
                        for (let i = 1; i <= count; i++) {
                          newConfigs[i] = seriesConfigs[i] || {
                            unitType: patternDefaultType,
                            area: patternDefaultArea,
                          }
                        }
                        setSeriesConfigs(newConfigs)
                      }
                    }}
                    className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* Numbering Format & Series Setup */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 border-t border-stone-200/60 pt-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                    Numbering Pattern
                  </label>
                  <select
                    value={namingFormat}
                    onChange={(e) => setNamingFormat(e.target.value as any)}
                    className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
                  >
                    <option value="floorIndex">Standard: 101, 102 ... 1001, 1002</option>
                    <option value="blockFloorIndex">Wing Prefix: Wing A-101, Wing A-102</option>
                    <option value="customPrefix">Custom Prefix: e.g. T1-101</option>
                  </select>
                </div>

                {namingFormat === "customPrefix" && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                      Custom Prefix
                    </label>
                    <input
                      type="text"
                      value={customPrefix}
                      onChange={(e) => setCustomPrefix(e.target.value)}
                      placeholder="e.g. T1-"
                      className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                    Default Carpet Area (sqft)
                  </label>
                  <input
                    type="number"
                    value={patternDefaultArea}
                    onChange={(e) => setPatternDefaultArea(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                    Occupancy State
                  </label>
                  <select
                    value={patternDefaultStatus}
                    onChange={(e) => setPatternDefaultStatus(e.target.value as OccupancyStatus)}
                    className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
                  >
                    <option value="VACANT">Vacant</option>
                    <option value="OCCUPIED">Occupied</option>
                    <option value="UNDER_RENOVATION">Under Renovation</option>
                  </select>
                </div>
              </div>

              {/* Per-Series Overrides */}
              {parseInt(flatsPerFloor, 10) > 0 && (
                <div className="border-t border-stone-200/60 pt-4">
                  <span className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
                    Floor Series Layout Configuration
                  </span>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {Array.from({ length: Math.min(10, parseInt(flatsPerFloor, 10) || 1) }, (_, i) => i + 1).map(
                      (index) => (
                        <div key={index} className="rounded-xl border border-stone-200 bg-white p-3 space-y-2">
                          <span className="text-[11px] font-bold text-stone-900 block">
                            Flat Series #{index < 10 ? `0${index}` : index}
                          </span>
                          <select
                            value={seriesConfigs[index]?.unitType || patternDefaultType}
                            onChange={(e) =>
                              setSeriesConfigs((prev) => ({
                                ...prev,
                                [index]: {
                                  unitType: e.target.value as UnitType,
                                  area: prev[index]?.area || patternDefaultArea,
                                },
                              }))
                            }
                            className="w-full rounded-lg border border-stone-200 bg-stone-50 px-2 py-1 text-[11px] text-stone-800"
                          >
                            {UNIT_TYPES.map((t) => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            placeholder="Carpet Area"
                            value={seriesConfigs[index]?.area || patternDefaultArea}
                            onChange={(e) =>
                              setSeriesConfigs((prev) => ({
                                ...prev,
                                [index]: {
                                  unitType: prev[index]?.unitType || patternDefaultType,
                                  area: e.target.value,
                                },
                              }))
                            }
                            className="w-full rounded-lg border border-stone-200 bg-stone-50 px-2 py-1 text-[11px] text-stone-800"
                          />
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleGeneratePatternPreview}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition"
                >
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z" clipRule="evenodd" />
                  </svg>
                  <span>Generate Preview List ({((parseInt(endFloor, 10) - parseInt(startFloor, 10) + 1) * (parseInt(flatsPerFloor, 10) || 0)) || 0} Flats)</span>
                </button>
              </div>
            </div>
          )}

          {/* Mode 2: CSV / Spreadsheet Import */}
          {mode === "csv" && (
            <div className="space-y-4 rounded-2xl border border-stone-200 bg-stone-50/40 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-stone-200 pb-3">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-900">
                    Upload Spreadsheet or Paste Table Data
                  </h4>
                  <p className="text-xs text-stone-500">
                    Columns supported: Block, Flat Number, Floor, Unit Type, Area, Status, Parking Slot, Intercom.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadSampleCsv}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 shadow-xs hover:bg-stone-50 transition"
                >
                  <svg className="h-4 w-4 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Download Sample Template (.csv)</span>
                </button>
              </div>

              {/* Upload Dropzone */}
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-stone-200 bg-white p-6 text-center hover:border-stone-400 transition">
                <svg className="h-8 w-8 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <label className="mt-2 block text-xs font-semibold text-stone-900 cursor-pointer">
                  <span className="text-blue-600 underline">Browse CSV File</span> or drag and drop here
                  <input
                    type="file"
                    accept=".csv,text/csv,text/plain,.tsv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                {csvFileName && (
                  <span className="mt-1 text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    Selected: {csvFileName}
                  </span>
                )}
              </div>

              {/* Direct Paste Text Area */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Or Paste Raw CSV / Tabular Text Directly:
                </label>
                <textarea
                  rows={4}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder="Block, Flat Number, Floor, Unit Type, Area, Status&#10;Wing A, 101, 1, 3 BHK, 1350, VACANT&#10;Wing A, 102, 1, 3 BHK, 1350, VACANT"
                  className="w-full font-mono text-[11px] rounded-xl border border-stone-200 bg-white p-3 text-stone-900 focus:border-stone-900 focus:outline-none"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => handleParseCsv(csvText)}
                  disabled={!csvText.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition disabled:opacity-50"
                >
                  <span>Parse & Preview CSV Data</span>
                </button>
              </div>
            </div>
          )}

          {/* Live Preview & Staging Table */}
          {previewItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-stone-950">
                    Staged Units Preview
                  </h4>
                  <span className="rounded-full bg-stone-900 px-2.5 py-0.5 text-[11px] font-bold text-white">
                    {previewItems.length} Units Ready
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setPreviewItems([])}
                  className="text-xs font-semibold text-red-600 hover:text-red-700"
                >
                  Clear All
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto rounded-2xl border border-stone-200">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-stone-100/90 backdrop-blur-sm text-[11px] font-bold uppercase tracking-wider text-stone-600">
                    <tr>
                      <th className="px-3.5 py-2.5">#</th>
                      <th className="px-3.5 py-2.5">Block</th>
                      <th className="px-3.5 py-2.5">Flat Number</th>
                      <th className="px-3.5 py-2.5">Floor</th>
                      <th className="px-3.5 py-2.5">Configuration</th>
                      <th className="px-3.5 py-2.5">Carpet Area</th>
                      <th className="px-3.5 py-2.5">Occupancy</th>
                      <th className="px-3.5 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 bg-white">
                    {previewItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-stone-50/70 transition">
                        <td className="px-3.5 py-2 text-stone-400 font-mono text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="px-3.5 py-2 font-medium text-stone-800">
                          {item.blockName}
                        </td>
                        <td className="px-3.5 py-2 font-bold text-stone-950">
                          {item.number}
                        </td>
                        <td className="px-3.5 py-2 text-stone-600">
                          {item.floor !== null ? `Floor ${item.floor}` : "—"}
                        </td>
                        <td className="px-3.5 py-2">
                          <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold text-stone-700">
                            {item.unitType?.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-3.5 py-2 text-stone-700">
                          {item.area ? `${item.area} ${item.areaUnit}` : "—"}
                        </td>
                        <td className="px-3.5 py-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              item.status === "OCCUPIED"
                                ? "bg-emerald-50 text-emerald-700"
                                : item.status === "UNDER_RENOVATION"
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-stone-100 text-stone-600"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="px-3.5 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemovePreviewItem(item.id)}
                            className="text-stone-400 hover:text-red-600 transition"
                            title="Remove unit from batch"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-stone-100 px-6 py-4 bg-stone-50/50">
          <div className="text-xs text-stone-500">
            {previewItems.length > 0 ? (
              <span>
                Ready to commit <strong>{previewItems.length} flat(s)</strong> to database
              </span>
            ) : (
              <span>Configure pattern or upload CSV to begin</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleExecuteBulkCreate}
              disabled={isPending || previewItems.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <svg className="h-3.5 w-3.5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Generating {previewItems.length} Units...</span>
                </>
              ) : (
                <span>Commit & Create {previewItems.length} Unit(s)</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
