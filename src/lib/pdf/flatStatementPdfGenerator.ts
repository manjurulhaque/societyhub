import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { formatDateInAppTimeZone } from "@/lib/datetime"
import type { SocietyLetterheadInfo } from "./residentStatementPdfGenerator"

export type FlatStatementData = {
  society: SocietyLetterheadInfo
  flat: {
    number: string
    blockName: string
    floor: number | null
    unitType: string | null
    area: number | null
    areaUnit: string
    status: string
    parkingSlot?: string | null
    intercomNumber?: string | null
  }
  currentOwner?: {
    name: string
    phone?: string | null
    email?: string | null
    fromDate?: string | null
    registrationDoc?: string | null
  } | null
  activeOccupants: {
    name: string
    role: string
    phone?: string | null
    email?: string | null
    fromDate: string
  }[]
  statutory?: {
    shareCertificate?: {
      certificateNumber: string
      sharesCount: number
      distinctiveRange?: string | null
      faceValue: number
      issueDate: string
      status: string
    } | null
    activeLiens?: {
      bankName: string
      loanAccountNumber?: string | null
      sanctionAmount?: number | null
      nocReference?: string | null
    }[]
  }
  summary: {
    totalDemanded: number
    totalPaid: number
    currentOutstanding: number
    activeDeposits: number
    unpaidBillsCount: number
  }
  ledger: {
    date: string
    type: "BILL" | "PAYMENT" | "DEPOSIT"
    description: string
    refNumber: string
    debit: number
    credit: number
    balance: number
    status: string
  }[]
  deposits: {
    depositType: string
    amount: number
    status: string
    receivedOn: string
    refundedOn?: string | null
  }[]
}

export function generateFlatStatementPDF(data: FlatStatementData) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const currency = data.society.currencySymbol || "Rs."

  // 1. Society Header / Letterhead
  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.setTextColor(28, 25, 23) // stone-900
  doc.text(data.society.name.toUpperCase(), pageWidth / 2, 13, { align: "center" })

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(87, 83, 78) // stone-600

  const addressLine = [
    data.society.address,
    data.society.city,
    data.society.state,
    data.society.pincode,
  ]
    .filter(Boolean)
    .join(", ")

  let currentY = 17
  if (addressLine) {
    doc.text(addressLine, pageWidth / 2, currentY, { align: "center" })
    currentY += 3.5
  }

  const regDetails = [
    data.society.registrationNumber ? `Regn. No: ${data.society.registrationNumber}` : null,
    data.society.panNumber ? `PAN: ${data.society.panNumber}` : null,
    data.society.gstin ? `GSTIN: ${data.society.gstin}` : null,
  ]
    .filter(Boolean)
    .join(" | ")

  if (regDetails) {
    doc.text(regDetails, pageWidth / 2, currentY, { align: "center" })
    currentY += 3.5
  }

  // Header separator line
  doc.setDrawColor(214, 211, 209) // stone-300
  doc.setLineWidth(0.4)
  doc.line(14, currentY, pageWidth - 14, currentY)
  currentY += 5

  // 2. Document Title & Generation Date
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.setTextColor(15, 23, 42) // slate-900
  doc.text("PROPERTY & UNIT ACCOUNT STATEMENT", 14, currentY)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(7.5)
  doc.setTextColor(120, 113, 108) // stone-500
  const dateGenerated = `Generated: ${formatDateInAppTimeZone(new Date().toISOString())}`
  doc.text(dateGenerated, pageWidth - 14, currentY, { align: "right" })
  currentY += 5

  // 3. Property Specifications & Registered Ownership Card
  doc.setDrawColor(229, 231, 235) // stone-200
  doc.setFillColor(250, 250, 249) // stone-50
  doc.roundedRect(14, currentY, pageWidth - 28, 24, 2, 2, "FD")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(9.5)
  doc.setTextColor(28, 25, 23)
  doc.text(`${data.flat.blockName} — Flat ${data.flat.number}`, 18, currentY + 5)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(7.5)
  doc.setTextColor(87, 83, 78)

  const specsLine = [
    data.flat.floor !== null ? `Floor: ${data.flat.floor}` : null,
    data.flat.unitType ? `Config: ${data.flat.unitType.replace(/_/g, " ")}` : null,
    data.flat.area ? `Carpet Area: ${data.flat.area} ${data.flat.areaUnit}` : null,
    `Status: ${data.flat.status.replace(/_/g, " ")}`,
  ]
    .filter(Boolean)
    .join(" | ")

  doc.text(specsLine, 18, currentY + 9.5)

  const amenitiesLine = [
    data.flat.parkingSlot ? `Allocated Parking: ${data.flat.parkingSlot}` : "Parking: None",
    data.flat.intercomNumber ? `Intercom: Ext. ${data.flat.intercomNumber}` : null,
    data.statutory?.shareCertificate
      ? `Share Cert: #${data.statutory.shareCertificate.certificateNumber} (${data.statutory.shareCertificate.sharesCount} Shares)`
      : "Share Cert: Not Issued",
  ]
    .filter(Boolean)
    .join(" | ")

  doc.text(amenitiesLine, 18, currentY + 14)

  const ownerInfo = data.currentOwner
    ? `Registered Owner: ${data.currentOwner.name}${data.currentOwner.phone ? ` (${data.currentOwner.phone})` : ""}${data.currentOwner.registrationDoc ? ` • Doc #${data.currentOwner.registrationDoc}` : ""}`
    : "Registered Owner: None on record"

  doc.setFont("helvetica", "bold")
  doc.text(ownerInfo.length > 95 ? `${ownerInfo.slice(0, 92)}...` : ownerInfo, 18, currentY + 19)

  currentY += 27

  // 4. Financial Summary Cards (4 Columns)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(28, 25, 23)
  doc.text("1. Account Balance & Dues Summary", 14, currentY)
  currentY += 3

  const colWidth = (pageWidth - 28) / 4

  // Card 1: Total Demand
  doc.setFillColor(245, 245, 244)
  doc.roundedRect(14, currentY, colWidth - 2, 13, 1.5, 1.5, "F")
  doc.setFont("helvetica", "normal")
  doc.setFontSize(6.5)
  doc.setTextColor(120, 113, 108)
  doc.text("TOTAL BILLED DEMAND", 16, currentY + 4)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8.5)
  doc.setTextColor(28, 25, 23)
  doc.text(`${currency} ${data.summary.totalDemanded.toLocaleString("en-IN")}`, 16, currentY + 9.5)

  // Card 2: Total Collections Paid
  doc.setFillColor(236, 253, 245) // emerald-50
  doc.roundedRect(14 + colWidth, currentY, colWidth - 2, 13, 1.5, 1.5, "F")
  doc.setFont("helvetica", "normal")
  doc.setFontSize(6.5)
  doc.setTextColor(5, 150, 105)
  doc.text("TOTAL PAID COLLECTIONS", 16 + colWidth, currentY + 4)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8.5)
  doc.setTextColor(4, 120, 87)
  doc.text(`${currency} ${data.summary.totalPaid.toLocaleString("en-IN")}`, 16 + colWidth, currentY + 9.5)

  // Card 3: Outstanding Dues
  const isOverdue = data.summary.currentOutstanding > 0
  doc.setFillColor(isOverdue ? 254 : 240, isOverdue ? 242 : 253, isOverdue ? 242 : 244)
  doc.roundedRect(14 + colWidth * 2, currentY, colWidth - 2, 13, 1.5, 1.5, "F")
  doc.setFont("helvetica", "normal")
  doc.setFontSize(6.5)
  doc.setTextColor(isOverdue ? 185 : 4, isOverdue ? 28 : 120, isOverdue ? 28 : 87)
  doc.text("NET OUTSTANDING DUES", 16 + colWidth * 2, currentY + 4)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8.5)
  doc.setTextColor(isOverdue ? 185 : 4, isOverdue ? 28 : 120, isOverdue ? 28 : 87)
  doc.text(`${currency} ${data.summary.currentOutstanding.toLocaleString("en-IN")}`, 16 + colWidth * 2, currentY + 9.5)

  // Card 4: Active Deposits
  doc.setFillColor(239, 246, 255) // blue-50
  doc.roundedRect(14 + colWidth * 3, currentY, colWidth - 2, 13, 1.5, 1.5, "F")
  doc.setFont("helvetica", "normal")
  doc.setFontSize(6.5)
  doc.setTextColor(37, 99, 235)
  doc.text("SECURITY DEPOSITS HELD", 16 + colWidth * 3, currentY + 4)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8.5)
  doc.setTextColor(29, 78, 216)
  doc.text(`${currency} ${data.summary.activeDeposits.toLocaleString("en-IN")}`, 16 + colWidth * 3, currentY + 9.5)

  currentY += 17

  // 5. Active Residents & Tenancies Table
  if (data.activeOccupants.length > 0) {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(28, 25, 23)
    doc.text("2. Active Residents & Occupants", 14, currentY)
    currentY += 2

    const occupantRows = data.activeOccupants.map((occ) => [
      occ.name,
      occ.role.replace(/_/g, " "),
      occ.phone || "—",
      occ.email || "—",
      formatDateInAppTimeZone(occ.fromDate),
    ])

    autoTable(doc, {
      head: [["Resident Name", "Occupancy Role", "Phone Number", "Email Address", "Residing Since"]],
      body: occupantRows,
      startY: currentY,
      margin: { left: 14, right: 14 },
      theme: "grid",
      headStyles: {
        fillColor: [28, 25, 23],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7.5,
        cellPadding: 1.8,
      },
      styles: {
        fontSize: 7,
        cellPadding: 1.5,
        font: "helvetica",
        textColor: [30, 41, 59],
        lineColor: [231, 229, 228],
      },
    })

    // @ts-expect-error jsPDF autotable internal state
    currentY = doc.lastAutoTable.finalY + 6
  }

  // 6. Comprehensive Financial Ledger Table
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(28, 25, 23)
  doc.text("3. Unit Billing & Financial Ledger", 14, currentY)
  currentY += 2

  const ledgerRows = data.ledger.map((row) => [
    formatDateInAppTimeZone(row.date),
    row.type === "BILL" ? "INVOICE" : row.type === "PAYMENT" ? "RECEIPT" : "DEPOSIT",
    row.description,
    row.refNumber || "—",
    row.debit > 0 ? `${currency} ${row.debit.toLocaleString("en-IN")}` : "—",
    row.credit > 0 ? `${currency} ${row.credit.toLocaleString("en-IN")}` : "—",
    `${currency} ${row.balance.toLocaleString("en-IN")}`,
    row.status,
  ])

  autoTable(doc, {
    head: [["Date", "Type", "Particulars / Description", "Ref / Receipt #", "Debit (Demand)", "Credit (Paid)", "Running Balance", "Status"]],
    body: ledgerRows.length > 0 ? ledgerRows : [["—", "—", "No transactions recorded for this unit", "—", "—", "—", "—", "—"]],
    startY: currentY,
    margin: { left: 14, right: 14, bottom: 25 },
    theme: "striped",
    headStyles: {
      fillColor: [28, 25, 23],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.5,
      cellPadding: 1.8,
    },
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      font: "helvetica",
      textColor: [30, 41, 59],
      lineColor: [231, 229, 228],
    },
    columnStyles: {
      4: { halign: "right" },
      5: { halign: "right" },
      6: { halign: "right" },
    },
    didDrawPage: (pageData) => {
      const totalPages = doc.getNumberOfPages()
      doc.setFont("helvetica", "normal")
      doc.setFontSize(7)
      doc.setTextColor(168, 162, 158)
      doc.text(
        `Page ${pageData.pageNumber} of ${totalPages} • ${data.society.name} • Statement for ${data.flat.blockName} Flat ${data.flat.number}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: "center" }
      )
    },
  })

  // @ts-expect-error jsPDF autotable internal state
  currentY = doc.lastAutoTable.finalY + 6

  // 7. Member Deposits & Caution Money (if any)
  if (data.deposits.length > 0) {
    if (currentY > pageHeight - 50) {
      doc.addPage()
      currentY = 20
    }

    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(28, 25, 23)
    doc.text("4. Security Deposits & Caution Funds Register", 14, currentY)
    currentY += 2

    const depositRows = data.deposits.map((dep) => [
      dep.depositType.replace(/_/g, " "),
      `${currency} ${dep.amount.toLocaleString("en-IN")}`,
      formatDateInAppTimeZone(dep.receivedOn),
      dep.refundedOn ? formatDateInAppTimeZone(dep.refundedOn) : "—",
      dep.status,
    ])

    autoTable(doc, {
      head: [["Deposit Type", "Amount", "Received Date", "Refunded Date", "Status"]],
      body: depositRows,
      startY: currentY,
      margin: { left: 14, right: 14, bottom: 25 },
      theme: "grid",
      headStyles: {
        fillColor: [28, 25, 23],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7.5,
        cellPadding: 1.8,
      },
      styles: {
        fontSize: 7,
        cellPadding: 1.5,
        font: "helvetica",
        textColor: [30, 41, 59],
        lineColor: [231, 229, 228],
      },
    })

    // @ts-expect-error jsPDF autotable internal state
    currentY = doc.lastAutoTable.finalY + 8
  }

  // Check if we need a new page for Signatory block
  if (currentY > pageHeight - 35) {
    doc.addPage()
    currentY = 20
  }

  // 8. Official Verification Seal & Signatures
  doc.setFont("helvetica", "normal")
  doc.setFontSize(7.5)
  doc.setTextColor(100, 116, 139)
  doc.text("This is an official computer-generated property account statement issued by the Society Office.", 14, currentY)
  currentY += 12

  doc.setDrawColor(214, 211, 209)
  doc.line(14, currentY, 70, currentY)
  doc.line(pageWidth - 70, currentY, pageWidth - 14, currentY)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(7.5)
  doc.setTextColor(28, 25, 23)
  doc.text("Prepared / Verified By", 14, currentY + 4)
  doc.text("Hon. Secretary / Treasurer", pageWidth - 70, currentY + 4)

  const sanitizedFilename = `Statement_${data.flat.blockName.replace(/\s+/g, "_")}_Flat_${data.flat.number}_${new Date().toISOString().split("T")[0]}.pdf`
  doc.save(sanitizedFilename)
}
