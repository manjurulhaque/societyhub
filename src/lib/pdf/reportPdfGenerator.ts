import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { formatDateInAppTimeZone } from "@/lib/datetime"

export type PDFSocietyInfo = {
  name: string
  address?: string | null
  city?: string | null
  state?: string | null
  pincode?: string | null
  registrationNumber?: string | null
  panNumber?: string | null
  currencySymbol?: string
}

export type GeneratePDFOptions = {
  society: PDFSocietyInfo
  reportTitle: string
  subtitle?: string
  headers: string[]
  rows: (string | number)[][]
  filename: string
  orientation?: "portrait" | "landscape"
  footerNotes?: string
}

export function generateReportPDF(options: GeneratePDFOptions) {
  const orientation = options.orientation || "portrait"
  const doc = new jsPDF({
    orientation,
    unit: "mm",
    format: "a4",
  })

  const pageWidth = doc.internal.pageSize.getWidth()

  // 1. Society Letterhead
  doc.setFont("helvetica", "bold")
  doc.setFontSize(15)
  doc.setTextColor(28, 25, 23) // stone-900
  doc.text(options.society.name.toUpperCase(), pageWidth / 2, 13, { align: "center" })

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

  let currentY = 17
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

  // 2. Report Title & Generation Meta
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.setTextColor(15, 23, 42) // slate-900
  doc.text(options.reportTitle, 14, currentY)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(120, 113, 108) // stone-500
  const dateStr = `Generated: ${formatDateInAppTimeZone(new Date().toISOString())}`
  doc.text(dateStr, pageWidth - 14, currentY, { align: "right" })

  if (options.subtitle) {
    currentY += 4
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139)
    doc.text(options.subtitle, 14, currentY)
  }

  const startY = currentY + 4

  // 3. Render Table
  autoTable(doc, {
    head: [options.headers],
    body: options.rows,
    startY,
    margin: { left: 14, right: 14, top: 14, bottom: 18 },
    theme: "striped",
    headStyles: {
      fillColor: [28, 25, 23], // stone-900
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      cellPadding: 2.2,
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 1.8,
      font: "helvetica",
      textColor: [30, 41, 59],
      lineColor: [231, 229, 228],
      lineWidth: 0.1,
    },
    alternateRowStyles: {
      fillColor: [250, 250, 249],
    },
    didDrawPage: (data) => {
      const totalPages = doc.getNumberOfPages()
      doc.setFont("helvetica", "normal")
      doc.setFontSize(7.5)
      doc.setTextColor(168, 162, 158)
      doc.text(
        `Page ${data.pageNumber} of ${totalPages} | ${options.society.name} Official Audit Report`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 7,
        { align: "center" }
      )
    },
  })

  // 4. Save file
  doc.save(options.filename)
}
