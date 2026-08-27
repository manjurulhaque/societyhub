import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { formatDateInAppTimeZone } from "@/lib/datetime"
import type { SocietyLetterheadInfo } from "./residentStatementPdfGenerator"

export type TowerDirectoryFlatItem = {
  number: string
  floor: number | null
  unitType: string | null
  area: number | null
  areaUnit: string
  status: string
  parkingSlot?: string | null
  intercomNumber?: string | null
  shareCertificateNumber?: string | null
  primaryResident?: {
    name: string
    role: string
    phone?: string | null
    email?: string | null
  } | null
  allOccupantsCount: number
  unpaidDues: number
  isDefaulter: boolean
}

export type TowerDirectoryData = {
  society: SocietyLetterheadInfo
  block: {
    id: string
    name: string
    totalUnits: number
    occupiedUnits: number
    vacantUnits: number
    occupancyRate: number
    totalBilled: number
    totalPaid: number
    totalOutstanding: number
    collectionRate: number
    defaultersCount: number
  }
  flats: TowerDirectoryFlatItem[]
}

/**
 * Generates an official, print-ready PDF Tower Directory Roster
 */
export function generateTowerDirectoryPDF(data: TowerDirectoryData) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4",
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  let currentY = 32

  // -------------------------------------------------------------
  // 1. SOCIETY LETTERHEAD HEADER
  // -------------------------------------------------------------
  doc.setFillColor(24, 24, 27) // Dark slate header
  doc.rect(30, currentY, pageWidth - 60, 4, "F")
  currentY += 16

  // Society Name
  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  doc.setTextColor(24, 24, 27)
  doc.text(data.society.name.toUpperCase(), 32, currentY)

  // Registration & Tax info (Right aligned)
  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(100, 100, 100)
  const regLines: string[] = []
  if (data.society.registrationNumber) {
    regLines.push(`Reg No: ${data.society.registrationNumber}`)
  }
  if (data.society.panNumber) {
    regLines.push(`PAN: ${data.society.panNumber}`)
  }
  if (data.society.gstin) {
    regLines.push(`GSTIN: ${data.society.gstin}`)
  }
  if (regLines.length > 0) {
    doc.text(regLines.join(" | "), pageWidth - 32, currentY, { align: "right" })
  }

  currentY += 12

  // Address line
  const addressParts = [
    data.society.address,
    data.society.city,
    data.society.state,
    data.society.pincode,
  ].filter(Boolean)
  if (addressParts.length > 0) {
    doc.text(addressParts.join(", "), 32, currentY)
  }

  // Contact line (Right aligned)
  const contactParts = [data.society.email, data.society.phone].filter(Boolean)
  if (contactParts.length > 0) {
    doc.text(contactParts.join(" | "), pageWidth - 32, currentY, { align: "right" })
  }

  currentY += 16
  doc.setDrawColor(220, 220, 225)
  doc.setLineWidth(0.75)
  doc.line(32, currentY, pageWidth - 32, currentY)
  currentY += 16

  // -------------------------------------------------------------
  // 2. DOCUMENT TITLE & TOWER BANNER
  // -------------------------------------------------------------
  doc.setFont("helvetica", "bold")
  doc.setFontSize(13)
  doc.setTextColor(24, 24, 27)
  doc.text(`OFFICIAL TOWER DIRECTORY & ROSTER — ${data.block.name.toUpperCase()}`, 32, currentY)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.5)
  doc.setTextColor(120, 120, 120)
  const genDateStr = formatDateInAppTimeZone(new Date().toISOString())
  doc.text(`Generated on: ${genDateStr}`, pageWidth - 32, currentY, { align: "right" })

  currentY += 14

  // -------------------------------------------------------------
  // 3. STATISTICAL SUMMARY CARDS (4 Boxes)
  // -------------------------------------------------------------
  const cardY = currentY
  const totalCardsWidth = pageWidth - 64
  const cardGap = 8
  const cardW = (totalCardsWidth - cardGap * 3) / 4
  const cardH = 38

  const cards = [
    {
      label: "TOTAL CONFIGURED UNITS",
      val: `${data.block.totalUnits} Units`,
      sub: `${data.block.occupiedUnits} Occupied (${data.block.occupancyRate}%)`,
      color: [248, 250, 252],
    },
    {
      label: "OCCUPANCY BREAKDOWN",
      val: `${data.block.occupiedUnits} Active / ${data.block.vacantUnits} Vacant`,
      sub: `${data.block.totalUnits - data.block.occupiedUnits - data.block.vacantUnits} Under Fit-out`,
      color: [240, 253, 244],
    },
    {
      label: "COLLECTION EFFICIENCY",
      val: `${data.block.collectionRate}% Collected`,
      sub: `₹${data.block.totalPaid.toLocaleString("en-IN")} Received`,
      color: [239, 246, 255],
    },
    {
      label: "OUTSTANDING DUES",
      val: `₹${data.block.totalOutstanding.toLocaleString("en-IN")}`,
      sub: data.block.defaultersCount > 0 ? `⚠️ ${data.block.defaultersCount} Overdue Units` : "✓ 100% Cleared",
      color: data.block.totalOutstanding > 0 ? [254, 242, 242] : [240, 253, 244],
    },
  ]

  cards.forEach((c, idx) => {
    const cx = 32 + idx * (cardW + cardGap)
    doc.setFillColor(c.color[0], c.color[1], c.color[2])
    doc.roundedRect(cx, cardY, cardW, cardH, 4, 4, "F")
    doc.setDrawColor(226, 232, 240)
    doc.roundedRect(cx, cardY, cardW, cardH, 4, 4, "S")

    doc.setFontSize(6.5)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(100, 116, 139)
    doc.text(c.label, cx + 8, cardY + 11)

    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(15, 23, 42)
    doc.text(c.val, cx + 8, cardY + 23)

    doc.setFontSize(7)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(100, 116, 139)
    doc.text(c.sub, cx + 8, cardY + 33)
  })

  currentY += cardH + 14

  // -------------------------------------------------------------
  // 4. UNIT ROSTER TABLE (autoTable)
  // -------------------------------------------------------------
  const tableRows = data.flats.map((flat) => {
    const resident = flat.primaryResident
      ? `${flat.primaryResident.name} (${flat.primaryResident.role})\n${flat.primaryResident.phone || "—"} | ${flat.primaryResident.email || ""}`
      : "— Unassigned —"

    const specs = [
      flat.unitType ? flat.unitType.replace(/_/g, " ") : "",
      flat.area ? `${flat.area} ${flat.areaUnit}` : "",
    ]
      .filter(Boolean)
      .join(" • ")

    const parkingIntercom = [
      flat.parkingSlot ? `P: ${flat.parkingSlot}` : null,
      flat.intercomNumber ? `Ext: ${flat.intercomNumber}` : null,
    ]
      .filter(Boolean)
      .join(" | ") || "—"

    let statusDisplay = flat.status
    if (flat.status === "OCCUPIED") {
      statusDisplay = flat.primaryResident?.role === "TENANT" ? "Tenant Occupied" : "Owner Occupied"
    } else if (flat.status === "VACANT") {
      statusDisplay = "Vacant"
    } else if (flat.status === "UNDER_RENOVATION") {
      statusDisplay = "Fit-out / Renovation"
    }

    const duesDisplay = flat.unpaidDues > 0
      ? `₹${flat.unpaidDues.toLocaleString("en-IN")}${flat.isDefaulter ? " (Overdue)" : ""}`
      : "✓ Clear"

    return [
      flat.number,
      flat.floor !== null ? `${flat.floor}F` : "—",
      specs || "—",
      statusDisplay,
      resident,
      parkingIntercom,
      flat.shareCertificateNumber ? `#${flat.shareCertificateNumber}` : "—",
      duesDisplay,
    ]
  })

  autoTable(doc, {
    startY: currentY,
    head: [[
      "Unit #",
      "Floor",
      "Configuration",
      "Occupancy Status",
      "Primary Resident & Contact",
      "Parking / Intercom",
      "Share Cert #",
      "Dues Status",
    ]],
    body: tableRows,
    theme: "grid",
    headStyles: {
      fillColor: [24, 24, 27],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "left",
      cellPadding: 4,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      cellPadding: 3.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 45 },
      1: { cellWidth: 35 },
      2: { cellWidth: 85 },
      3: { cellWidth: 75 },
      4: { cellWidth: 160 },
      5: { cellWidth: 90 },
      6: { cellWidth: 60 },
      7: { fontStyle: "bold", halign: "right" },
    },
    didDrawPage: (hookData) => {
      // Page Footer
      const footerY = pageHeight - 18
      doc.setFontSize(7.5)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(140, 140, 140)
      doc.text(
        `${data.society.name} • Official Tower Roster • Confidential Property Record`,
        32,
        footerY
      )
      doc.text(
        `Page ${hookData.pageNumber}`,
        pageWidth - 32,
        footerY,
        { align: "right" }
      )
    },
    margin: { left: 32, right: 32 },
  })

  const filename = `${data.society.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${data.block.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}_directory.pdf`
  doc.save(filename)
}

/**
 * Generates and triggers download of a CSV spreadsheet of the tower directory
 */
export function exportTowerDirectoryCSV(data: TowerDirectoryData) {
  const headers = [
    "Tower / Wing",
    "Flat Number",
    "Floor",
    "Unit Type",
    "Carpet Area",
    "Area Unit",
    "Occupancy Status",
    "Primary Occupant Name",
    "Occupant Role",
    "Phone",
    "Email",
    "Parking Slot",
    "Intercom Extension",
    "Share Certificate No",
    "Unpaid Dues (INR)",
    "Defaulter Status",
  ]

  const rows = data.flats.map((flat) => [
    `"${data.block.name.replace(/"/g, '""')}"`,
    `"${flat.number.replace(/"/g, '""')}"`,
    flat.floor !== null ? flat.floor : "",
    `"${(flat.unitType || "").replace(/"/g, '""')}"`,
    flat.area !== null ? flat.area : "",
    `"${flat.areaUnit || ""}"`,
    `"${flat.status}"`,
    `"${(flat.primaryResident?.name || "").replace(/"/g, '""')}"`,
    `"${flat.primaryResident?.role || ""}"`,
    `"${flat.primaryResident?.phone || ""}"`,
    `"${flat.primaryResident?.email || ""}"`,
    `"${(flat.parkingSlot || "").replace(/"/g, '""')}"`,
    `"${(flat.intercomNumber || "").replace(/"/g, '""')}"`,
    `"${flat.shareCertificateNumber || ""}"`,
    flat.unpaidDues,
    flat.isDefaulter ? "OVERDUE" : "CLEAR",
  ])

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n")
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  const filename = `${data.society.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${data.block.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}_roster.csv`
  link.setAttribute("download", filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
