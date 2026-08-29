import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { formatDateInAppTimeZone } from "@/lib/datetime"
import { generateSafeCsv } from "@/lib/csv"

export type ReconPdfSocietyInfo = {
  name: string
  address?: string | null
  city?: string | null
  state?: string | null
  pincode?: string | null
  registrationNumber?: string | null
  panNumber?: string | null
  currencySymbol?: string
}

export type ReconChequeItem = {
  chequeNumber: string
  chequeDate: string
  partyName: string
  amount: number
}

export type GenerateReconPdfOptions = {
  society: ReconPdfSocietyInfo
  accountName: string
  bankName: string | null
  accountNumber: string | null
  statementDate: string
  bookBalance: number
  unpresentedCheques: ReconChequeItem[]
  uncreditedCheques: ReconChequeItem[]
  statementBalance: number
  adjustedBalance: number
  discrepancy: number
  notes?: string | null
  currencySymbol?: string
  filename?: string
}

/**
 * Generates an official, statutory Bank Reconciliation Statement (BRS) PDF.
 */
export function generateBankReconciliationPDF(options: GenerateReconPdfOptions) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const currency = options.currencySymbol || "₹"
  const unpresentedTotal = options.unpresentedCheques.reduce((sum, c) => sum + c.amount, 0)
  const uncreditedTotal = options.uncreditedCheques.reduce((sum, c) => sum + c.amount, 0)
  const isReconciled = Math.abs(options.discrepancy) < 0.01

  // 1. Society Header / Letterhead
  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.setTextColor(28, 25, 23) // stone-900
  doc.text(options.society.name.toUpperCase(), pageWidth / 2, 14, { align: "center" })

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.5)
  doc.setTextColor(87, 83, 78) // stone-600
  const subAddress = [
    options.society.address,
    options.society.city,
    options.society.state,
    options.society.pincode,
  ]
    .filter(Boolean)
    .join(", ")

  let currentY = 19
  if (subAddress) {
    doc.text(subAddress, pageWidth / 2, currentY, { align: "center" })
    currentY += 4
  }

  const regInfo = [
    options.society.registrationNumber ? `Regn. No: ${options.society.registrationNumber}` : null,
    options.society.panNumber ? `PAN: ${options.society.panNumber}` : null,
  ]
    .filter(Boolean)
    .join(" | ")

  if (regInfo) {
    doc.text(regInfo, pageWidth / 2, currentY, { align: "center" })
    currentY += 4
  }

  // Header separator line
  doc.setDrawColor(214, 211, 209) // stone-300
  doc.setLineWidth(0.4)
  doc.line(14, currentY, pageWidth - 14, currentY)
  currentY += 6

  // 2. Document Title
  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.setTextColor(15, 23, 42) // slate-900
  doc.text("STATUTORY BANK RECONCILIATION STATEMENT (BRS)", pageWidth / 2, currentY, { align: "center" })
  currentY += 5

  // 3. Metadata Details Box
  doc.setFillColor(250, 250, 249) // stone-50
  doc.setDrawColor(229, 231, 235) // stone-200
  doc.roundedRect(14, currentY, pageWidth - 28, 20, 2, 2, "FD")

  doc.setFontSize(8)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(55, 65, 81)
  doc.text("Bank Account:", 18, currentY + 6)
  doc.text("Bank & Branch:", 18, currentY + 11)
  doc.text("Account Number:", 18, currentY + 16)

  doc.setFont("helvetica", "normal")
  doc.setTextColor(17, 24, 39)
  doc.text(options.accountName, 44, currentY + 6)
  doc.text(options.bankName || "Operational Bank", 44, currentY + 11)
  doc.text(options.accountNumber || "—", 44, currentY + 16)

  doc.setFont("helvetica", "bold")
  doc.setTextColor(55, 65, 81)
  doc.text("Statement Date:", pageWidth / 2 + 10, currentY + 6)
  doc.text("Reconciliation Status:", pageWidth / 2 + 10, currentY + 11)
  doc.text("Report Generated:", pageWidth / 2 + 10, currentY + 16)

  doc.setFont("helvetica", "normal")
  doc.text(formatDateInAppTimeZone(options.statementDate), pageWidth / 2 + 45, currentY + 6)
  if (isReconciled) {
    doc.setTextColor(5, 150, 105) // emerald-600
    doc.setFont("helvetica", "bold")
    doc.text("RECONCILED (₹0.00 Variance)", pageWidth / 2 + 45, currentY + 11)
  } else {
    doc.setTextColor(180, 83, 9) // amber-700
    doc.setFont("helvetica", "bold")
    doc.text(`VARIANCE (${currency}${Math.abs(options.discrepancy).toLocaleString("en-IN")})`, pageWidth / 2 + 45, currentY + 11)
  }

  doc.setFont("helvetica", "normal")
  doc.setTextColor(17, 24, 39)
  doc.text(formatDateInAppTimeZone(new Date().toISOString()), pageWidth / 2 + 45, currentY + 16)

  currentY += 24

  // 4. Section 1: Summary BRS Calculation Table
  const summaryRows = [
    [
      "Balance as per Society Bank Ledger (A)",
      `${currency}${options.bookBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
    ],
    [
      "Add: Unpresented Cheques (Issued to vendors, not yet debited by bank) (B)",
      `+ ${currency}${unpresentedTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
    ],
    [
      "Less: Uncredited Cheques (Deposited from members, not yet credited by bank) (C)",
      `- ${currency}${uncreditedTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
    ],
    [
      "Adjusted Balance as per Books (A + B - C)",
      `${currency}${options.adjustedBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
    ],
    [
      "Balance as per Bank Statement / Passbook (D)",
      `${currency}${options.statementBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
    ],
    [
      "Discrepancy / Variance (Adjusted Balance - Statement Balance)",
      `${isReconciled ? "₹ 0.00" : `${currency}${options.discrepancy.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}`,
    ],
  ]

  autoTable(doc, {
    head: [["Particulars / Calculation Step", "Amount (INR)"]],
    body: summaryRows,
    startY: currentY,
    margin: { left: 14, right: 14 },
    theme: "grid",
    headStyles: {
      fillColor: [28, 25, 23], // stone-900
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
      cellPadding: 2.5,
    },
    columnStyles: {
      0: { cellWidth: "auto", fontStyle: "normal" },
      1: { cellWidth: 55, halign: "right", fontStyle: "bold" },
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      font: "helvetica",
      textColor: [30, 41, 59],
      lineColor: [209, 213, 219],
      lineWidth: 0.1,
    },
    didParseCell: (data) => {
      // Highlight Adjusted Balance and Discrepancy
      if (data.row.index === 3 || data.row.index === 4) {
        data.cell.styles.fillColor = [243, 244, 246]
        data.cell.styles.fontStyle = "bold"
      }
      if (data.row.index === 5) {
        data.cell.styles.fillColor = isReconciled ? [236, 253, 245] : [254, 243, 199]
        data.cell.styles.textColor = isReconciled ? [6, 95, 70] : [146, 64, 14]
        data.cell.styles.fontStyle = "bold"
      }
    },
  })

  // @ts-expect-error autoTable adds lastAutoTable to doc
  currentY = doc.lastAutoTable.finalY + 8

  // 5. Section 2: Unpresented Cheques (Outward) Schedule
  if (options.unpresentedCheques.length > 0) {
    if (currentY > 230) {
      doc.addPage()
      currentY = 16
    }

    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(15, 23, 42)
    doc.text(`Schedule A: Unpresented Outward Cheques (${options.unpresentedCheques.length} items)`, 14, currentY)
    currentY += 3

    const unpresentedTableRows = options.unpresentedCheques.map((c, idx) => [
      (idx + 1).toString(),
      c.chequeNumber,
      formatDateInAppTimeZone(c.chequeDate),
      c.partyName,
      `${currency}${c.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
    ])

    autoTable(doc, {
      head: [["S.No", "Cheque No", "Issue Date", "Payee / Vendor Name", "Amount"]],
      body: unpresentedTableRows,
      startY: currentY,
      margin: { left: 14, right: 14 },
      theme: "striped",
      headStyles: {
        fillColor: [16, 185, 129], // emerald-600
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: "bold",
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 12, halign: "center" },
        1: { cellWidth: 25, halign: "center", fontStyle: "bold" },
        2: { cellWidth: 25 },
        3: { cellWidth: "auto" },
        4: { cellWidth: 35, halign: "right", fontStyle: "bold" },
      },
      styles: { fontSize: 7.5, cellPadding: 1.8 },
    })

    // @ts-expect-error autoTable adds lastAutoTable to doc
    currentY = doc.lastAutoTable.finalY + 8
  }

  // 6. Section 3: Uncredited Cheques (Inward) Schedule
  if (options.uncreditedCheques.length > 0) {
    if (currentY > 230) {
      doc.addPage()
      currentY = 16
    }

    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(15, 23, 42)
    doc.text(`Schedule B: Uncredited Inward Cheques (${options.uncreditedCheques.length} items)`, 14, currentY)
    currentY += 3

    const uncreditedTableRows = options.uncreditedCheques.map((c, idx) => [
      (idx + 1).toString(),
      c.chequeNumber,
      formatDateInAppTimeZone(c.chequeDate),
      c.partyName,
      `${currency}${c.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
    ])

    autoTable(doc, {
      head: [["S.No", "Cheque No", "Deposit Date", "Member / Resident Name", "Amount"]],
      body: uncreditedTableRows,
      startY: currentY,
      margin: { left: 14, right: 14 },
      theme: "striped",
      headStyles: {
        fillColor: [245, 158, 11], // amber-500
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: "bold",
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 12, halign: "center" },
        1: { cellWidth: 25, halign: "center", fontStyle: "bold" },
        2: { cellWidth: 25 },
        3: { cellWidth: "auto" },
        4: { cellWidth: 35, halign: "right", fontStyle: "bold" },
      },
      styles: { fontSize: 7.5, cellPadding: 1.8 },
    })

    // @ts-expect-error autoTable adds lastAutoTable to doc
    currentY = doc.lastAutoTable.finalY + 8
  }

  // 7. Auditor Notes
  if (options.notes && options.notes.trim()) {
    if (currentY > 240) {
      doc.addPage()
      currentY = 16
    }
    doc.setFont("helvetica", "bold")
    doc.setFontSize(8.5)
    doc.setTextColor(55, 65, 81)
    doc.text("Auditor Notes & Explanations:", 14, currentY)
    currentY += 4

    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(75, 85, 99)
    const splitNotes = doc.splitTextToSize(options.notes, pageWidth - 28)
    doc.text(splitNotes, 14, currentY)
    currentY += splitNotes.length * 4 + 6
  }

  // 8. Sign-off Blocks
  if (currentY > 250) {
    doc.addPage()
    currentY = 30
  } else {
    currentY = Math.max(currentY + 10, 255)
  }

  const colWidth = (pageWidth - 28) / 3
  doc.setDrawColor(156, 163, 175)
  doc.setLineWidth(0.3)

  // Line 1
  doc.line(14, currentY, 14 + colWidth - 10, currentY)
  doc.line(14 + colWidth + 5, currentY, 14 + colWidth * 2 - 5, currentY)
  doc.line(14 + colWidth * 2 + 10, currentY, pageWidth - 14, currentY)

  doc.setFontSize(7.5)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(55, 65, 81)
  doc.text("Prepared By", 14 + (colWidth - 10) / 2, currentY + 4, { align: "center" })
  doc.text("Verified By (Treasurer / Secretary)", 14 + colWidth + (colWidth - 10) / 2, currentY + 4, { align: "center" })
  doc.text("Audited By (Statutory Auditor)", 14 + colWidth * 2 + (colWidth - 10) / 2 + 5, currentY + 4, { align: "center" })

  doc.setFont("helvetica", "normal")
  doc.setTextColor(156, 163, 175)
  doc.text("Society Accountant", 14 + (colWidth - 10) / 2, currentY + 8, { align: "center" })
  doc.text("Managing Committee", 14 + colWidth + (colWidth - 10) / 2, currentY + 8, { align: "center" })
  doc.text("Chartered Accountant", 14 + colWidth * 2 + (colWidth - 10) / 2 + 5, currentY + 8, { align: "center" })

  // 9. Page Numbers in Footer
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7.5)
    doc.setTextColor(156, 163, 175)
    doc.text(
      `Page ${i} of ${totalPages} | ${options.society.name} Statutory Bank Reconciliation Statement (BRS)`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 6,
      { align: "center" }
    )
  }

  const filename = options.filename || `BRS_${options.accountName.replace(/[^a-zA-Z0-9]/g, "_")}_${options.statementDate}.pdf`
  doc.save(filename)
}

/**
 * Generates an RFC 4180-compliant CSV of the Bank Reconciliation Statement.
 */
export function generateBankReconciliationCsv(options: GenerateReconPdfOptions): string {
  const currency = options.currencySymbol || "₹"
  const unpresentedTotal = options.unpresentedCheques.reduce((sum, c) => sum + c.amount, 0)
  const uncreditedTotal = options.uncreditedCheques.reduce((sum, c) => sum + c.amount, 0)

  const headers = ["Section", "Particulars / Reference", "Date", "Party Name", "Amount (INR)"]
  const rows: (string | number)[][] = [
    ["Summary", "Balance as per Society Bank Ledger (A)", options.statementDate, options.accountName, options.bookBalance],
    ["Summary", "(+) Unpresented Cheques Total (B)", options.statementDate, `${options.unpresentedCheques.length} Cheques`, unpresentedTotal],
    ["Summary", "(-) Uncredited Cheques Total (C)", options.statementDate, `${options.uncreditedCheques.length} Cheques`, -uncreditedTotal],
    ["Summary", "Adjusted Balance as per Books (A + B - C)", options.statementDate, "", options.adjustedBalance],
    ["Summary", "Balance as per Bank Statement / Passbook (D)", options.statementDate, "", options.statementBalance],
    ["Summary", "Discrepancy / Variance (Adjusted - Statement)", options.statementDate, "", options.discrepancy],
    ["", "", "", "", ""],
  ]

  // Add Unpresented details
  if (options.unpresentedCheques.length > 0) {
    rows.push(["Unpresented Cheques (Outward)", "Cheque Number", "Issue Date", "Vendor / Payee", "Amount"])
    options.unpresentedCheques.forEach((c) => {
      rows.push(["Unpresented", c.chequeNumber, c.chequeDate, c.partyName, c.amount])
    })
    rows.push(["", "", "", "", ""])
  }

  // Add Uncredited details
  if (options.uncreditedCheques.length > 0) {
    rows.push(["Uncredited Cheques (Inward)", "Cheque Number", "Deposit Date", "Member / Resident", "Amount"])
    options.uncreditedCheques.forEach((c) => {
      rows.push(["Uncredited", c.chequeNumber, c.chequeDate, c.partyName, c.amount])
    })
    rows.push(["", "", "", "", ""])
  }

  if (options.notes) {
    rows.push(["Notes", options.notes, "", "", ""])
  }

  return generateSafeCsv(headers, rows)
}
