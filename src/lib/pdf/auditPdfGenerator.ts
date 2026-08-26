import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { formatDateTimeInAppTimeZone } from "@/lib/datetime"
import type { PDFSocietyInfo } from "./reportPdfGenerator"

export interface GenerateAuditPDFOptions {
  society?: PDFSocietyInfo | null
  scopeName?: string
  totalRecords: number
  integrityStatus: {
    isValid: boolean
    verifiedCount: number
    legacyCount?: number
    message: string
  }
  rows: Array<{
    createdAt: string | Date
    action: string
    entity: string
    entityId?: string | null
    operator: string
    description?: string | null
    ipAddress?: string | null
    signature?: string | null
  }>
  filename?: string
}

export function generateAuditReportPDF(options: GenerateAuditPDFOptions) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const societyName = options.society?.name || options.scopeName || "SocietyHub Audit Trail Ledger"

  let currentY = 14

  // 1. Society Header / Letterhead
  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.setTextColor(28, 25, 23) // stone-900
  doc.text(societyName, 14, currentY)

  currentY += 5
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(120, 113, 108) // stone-500

  const metaParts: string[] = []
  if (options.society?.registrationNumber) metaParts.push(`Reg No: ${options.society.registrationNumber}`)
  if (options.society?.panNumber) metaParts.push(`PAN: ${options.society.panNumber}`)
  if (options.society?.city) metaParts.push(`${options.society.city}, ${options.society.state || ""}`)

  if (metaParts.length > 0) {
    doc.text(metaParts.join(" | "), 14, currentY)
    currentY += 4
  }

  doc.text(`Generated on: ${formatDateTimeInAppTimeZone(new Date())} (Official Forensic Compliance Export)`, 14, currentY)
  currentY += 4

  // Cryptographic Integrity Badge Box
  const isHealthy = options.integrityStatus.isValid
  doc.setFillColor(isHealthy ? 240 : 254, isHealthy ? 253 : 242, isHealthy ? 244 : 242) // emerald-50 or rose-50
  doc.setDrawColor(isHealthy ? 167 : 253, isHealthy ? 243 : 164, isHealthy ? 208 : 175) // emerald-300 or rose-300
  doc.setLineWidth(0.4)
  doc.roundedRect(14, currentY, pageWidth - 28, 12, 2, 2, "FD")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(8.5)
  doc.setTextColor(isHealthy ? 6 : 159, isHealthy ? 95 : 18, isHealthy ? 70 : 57) // emerald-900 or rose-900
  doc.text(
    isHealthy
      ? "✓ CRYPTOGRAPHIC AUDIT TRAIL INTEGRITY: MATHEMATICALLY VERIFIED (UNBROKEN HMAC-SHA256 CHAIN)"
      : "⚠️ CRYPTOGRAPHIC INTEGRITY COMPROMISED: TAMPER DETECTED",
    18,
    currentY + 5
  )

  doc.setFont("helvetica", "normal")
  doc.setFontSize(7.5)
  doc.setTextColor(isHealthy ? 4 : 153, isHealthy ? 120 : 27, isHealthy ? 87 : 27)
  doc.text(
    `Total Records: ${options.totalRecords} | Verified Sealed: ${options.integrityStatus.verifiedCount} | ${options.integrityStatus.message}`,
    18,
    currentY + 9.5
  )

  currentY += 16

  // 3. Table of Events
  const headers = ["Timestamp", "Action", "Entity", "Operator / Member", "Description", "IP Address", "HMAC Seal"]
  const tableData = options.rows.map((r) => [
    formatDateTimeInAppTimeZone(r.createdAt),
    r.action,
    r.entityId ? `${r.entity} (${r.entityId.slice(0, 8)})` : r.entity,
    r.operator,
    r.description || "—",
    r.ipAddress || "—",
    r.signature ? `${r.signature.slice(0, 10)}...` : "LEGACY",
  ])

  autoTable(doc, {
    head: [headers],
    body: tableData,
    startY: currentY,
    margin: { left: 14, right: 14, top: 14, bottom: 16 },
    theme: "striped",
    headStyles: {
      fillColor: [28, 25, 23], // stone-900
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      cellPadding: 2,
    },
    styles: {
      fontSize: 7,
      cellPadding: 1.6,
      font: "helvetica",
      textColor: [30, 41, 59],
      lineColor: [231, 229, 228],
      lineWidth: 0.1,
    },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 22 },
      2: { cellWidth: 30 },
      3: { cellWidth: 38 },
      4: { cellWidth: "auto" },
      5: { cellWidth: 24 },
      6: { cellWidth: 22, font: "courier" },
    },
    alternateRowStyles: {
      fillColor: [250, 250, 249],
    },
    didDrawPage: (data) => {
      const totalPages = doc.getNumberOfPages()
      doc.setFont("helvetica", "normal")
      doc.setFontSize(7)
      doc.setTextColor(168, 162, 158)
      doc.text(
        `Page ${data.pageNumber} of ${totalPages} | Certified Audit Report | ${societyName}`,
        pageWidth / 2,
        pageHeight - 6,
        { align: "center" }
      )
    },
  })

  // 4. Download
  doc.save(options.filename || `audit_report_${new Date().toISOString().slice(0, 10)}.pdf`)
}
