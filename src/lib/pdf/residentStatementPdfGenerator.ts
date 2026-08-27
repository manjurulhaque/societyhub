import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { formatDateInAppTimeZone } from "@/lib/datetime"
import { maskPan, maskAadhaar } from "@/lib/masking"

export type SocietyLetterheadInfo = {
  name: string
  code?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  pincode?: string | null
  registrationNumber?: string | null
  panNumber?: string | null
  gstin?: string | null
  currencySymbol?: string
  email?: string | null
  phone?: string | null
}

export type ResidentStatementData = {
  society: SocietyLetterheadInfo
  resident: {
    name: string
    phone?: string | null
    email?: string | null
    panNumber?: string | null
    aadhaarNumber?: string | null
    permanentAddress?: string | null
    occupation?: string | null
    emergencyContactName?: string | null
    emergencyContactPhone?: string | null
    kycVerified: boolean
  }
  flats: {
    number: string
    blockName: string
    role: string
    area?: number | null
    areaUnit?: string
    status: string
    shareCertificateNumber?: string | null
  }[]
  financialLedger: {
    date: string
    flat: string
    description: string
    refNumber: string
    debit: number
    credit: number
    balance: number
    status: string
  }[]
  summary: {
    totalDemanded: number
    totalPaid: number
    currentOutstanding: number
    activeDeposits: number
  }
  statutory: {
    shareCertificates: {
      certificateNumber: string
      flat: string
      sharesCount: number
      distinctiveRange?: string | null
      faceValue: number
    }[]
    nominations: {
      nomineeName: string
      relationship: string
      percentageShare: number
      flat: string
    }[]
  }
}

export function generateResidentStatementPDF(data: ResidentStatementData) {
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

  // 2. Statement Document Title & Generation Date
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.setTextColor(15, 23, 42) // slate-900
  doc.text("MEMBER ACCOUNT & RESIDENCY STATEMENT", 14, currentY)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(7.5)
  doc.setTextColor(120, 113, 108) // stone-500
  const dateGenerated = `Statement Date: ${formatDateInAppTimeZone(new Date().toISOString())}`
  doc.text(dateGenerated, pageWidth - 14, currentY, { align: "right" })
  currentY += 5

  // 3. Member Profile & KYC Information Card
  doc.setDrawColor(229, 231, 235) // stone-200
  doc.setFillColor(250, 250, 249) // stone-50
  doc.roundedRect(14, currentY, pageWidth - 28, 22, 2, 2, "FD")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(28, 25, 23)
  doc.text(data.resident.name, 18, currentY + 5)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(7.5)
  doc.setTextColor(87, 83, 78)

  const contactLine = [
    data.resident.phone ? `Phone: ${data.resident.phone}` : null,
    data.resident.email ? `Email: ${data.resident.email}` : null,
    data.resident.occupation ? `Occupation: ${data.resident.occupation}` : null,
  ]
    .filter(Boolean)
    .join(" | ")

  doc.text(contactLine || "No contact registered", 18, currentY + 9.5)

  const kycLine = [
    `KYC Status: ${data.resident.kycVerified ? "VERIFIED" : "PENDING"}`,
    data.resident.panNumber ? `PAN: ${maskPan(data.resident.panNumber)}` : null,
    data.resident.aadhaarNumber ? `Aadhaar: ${maskAadhaar(data.resident.aadhaarNumber)}` : null,
  ]
    .filter(Boolean)
    .join(" | ")

  doc.text(kycLine, 18, currentY + 14)

  if (data.resident.permanentAddress) {
    const addr = `Address: ${data.resident.permanentAddress}`
    doc.text(addr.length > 90 ? `${addr.slice(0, 87)}...` : addr, 18, currentY + 18.5)
  }

  currentY += 25

  // 4. Properties Portfolio Table
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(28, 25, 23)
  doc.text("1. Registered Properties & Occupancies", 14, currentY)
  currentY += 2

  const flatRows = data.flats.map((f) => [
    `${f.blockName} - Flat ${f.number}`,
    f.role.replace(/_/g, " "),
    f.area ? `${f.area} ${f.areaUnit || "sqft"}` : "—",
    f.status.replace(/_/g, " "),
    f.shareCertificateNumber ? `Cert #${f.shareCertificateNumber}` : "Not Issued",
  ])

  autoTable(doc, {
    head: [["Property / Unit", "Capacity / Role", "Carpet Area", "Occupancy Status", "Share Certificate"]],
    body: flatRows,
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
      fontSize: 7.5,
      cellPadding: 1.5,
      font: "helvetica",
      textColor: [30, 41, 59],
      lineColor: [231, 229, 228],
    },
  })

  // @ts-expect-error jsPDF autotable internal state
  currentY = doc.lastAutoTable.finalY + 6

  // 5. Financial Summary Overview Card
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(28, 25, 23)
  doc.text("2. Financial Account Summary", 14, currentY)
  currentY += 3

  const colWidth = (pageWidth - 28) / 4

  // Card 1: Total Demanded
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

  // Card 2: Total Paid
  doc.setFillColor(236, 253, 245) // emerald-50
  doc.roundedRect(14 + colWidth, currentY, colWidth - 2, 13, 1.5, 1.5, "F")
  doc.setFont("helvetica", "normal")
  doc.setFontSize(6.5)
  doc.setTextColor(5, 150, 105)
  doc.text("TOTAL COLLECTIONS PAID", 16 + colWidth, currentY + 4)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8.5)
  doc.setTextColor(4, 120, 87)
  doc.text(`${currency} ${data.summary.totalPaid.toLocaleString("en-IN")}`, 16 + colWidth, currentY + 9.5)

  // Card 3: Outstanding Dues
  doc.setFillColor(data.summary.currentOutstanding > 0 ? 254 : 240, data.summary.currentOutstanding > 0 ? 242 : 253, data.summary.currentOutstanding > 0 ? 242 : 244) // red-50 or emerald-50
  doc.roundedRect(14 + colWidth * 2, currentY, colWidth - 2, 13, 1.5, 1.5, "F")
  doc.setFont("helvetica", "normal")
  doc.setFontSize(6.5)
  doc.setTextColor(data.summary.currentOutstanding > 0 ? 185 : 4, data.summary.currentOutstanding > 0 ? 28 : 120, data.summary.currentOutstanding > 0 ? 28 : 87)
  doc.text("NET OUTSTANDING DUES", 16 + colWidth * 2, currentY + 4)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8.5)
  doc.setTextColor(data.summary.currentOutstanding > 0 ? 185 : 4, data.summary.currentOutstanding > 0 ? 28 : 120, data.summary.currentOutstanding > 0 ? 28 : 87)
  doc.text(`${currency} ${data.summary.currentOutstanding.toLocaleString("en-IN")}`, 16 + colWidth * 2, currentY + 9.5)

  // Card 4: Member Deposits
  doc.setFillColor(239, 246, 255) // blue-50
  doc.roundedRect(14 + colWidth * 3, currentY, colWidth - 2, 13, 1.5, 1.5, "F")
  doc.setFont("helvetica", "normal")
  doc.setFontSize(6.5)
  doc.setTextColor(37, 99, 235)
  doc.text("ACTIVE DEPOSITS HELD", 16 + colWidth * 3, currentY + 4)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8.5)
  doc.setTextColor(29, 78, 216)
  doc.text(`${currency} ${data.summary.activeDeposits.toLocaleString("en-IN")}`, 16 + colWidth * 3, currentY + 9.5)

  currentY += 17

  // 6. Detailed Consolidated Ledger
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(28, 25, 23)
  doc.text("3. Financial Ledger & Transaction Statement", 14, currentY)
  currentY += 2

  const ledgerRows = data.financialLedger.map((row) => [
    formatDateInAppTimeZone(row.date),
    row.flat,
    row.description,
    row.refNumber || "—",
    row.debit > 0 ? `${currency} ${row.debit.toLocaleString("en-IN")}` : "—",
    row.credit > 0 ? `${currency} ${row.credit.toLocaleString("en-IN")}` : "—",
    `${currency} ${row.balance.toLocaleString("en-IN")}`,
    row.status,
  ])

  autoTable(doc, {
    head: [["Date", "Property", "Description", "Bill / Ref #", "Debit (Demand)", "Credit (Paid)", "Balance", "Status"]],
    body: ledgerRows.length > 0 ? ledgerRows : [["—", "—", "No transactions found", "—", "—", "—", "—", "—"]],
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
        `Page ${pageData.pageNumber} of ${totalPages} • ${data.society.name} • Member Statement for ${data.resident.name}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: "center" }
      )
    },
  })

  // @ts-expect-error jsPDF autotable internal state
  currentY = doc.lastAutoTable.finalY + 8

  // Check if we need a new page for Signatory block
  if (currentY > pageHeight - 35) {
    doc.addPage()
    currentY = 20
  }

  // 7. Statutory Signature & Verification Seal Block
  doc.setFont("helvetica", "normal")
  doc.setFontSize(7.5)
  doc.setTextColor(100, 116, 139)
  doc.text("This is an official computer-generated account statement issued under Society Bye-Laws.", 14, currentY)
  currentY += 12

  doc.setDrawColor(214, 211, 209)
  doc.line(14, currentY, 70, currentY)
  doc.line(pageWidth - 70, currentY, pageWidth - 14, currentY)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(7.5)
  doc.setTextColor(28, 25, 23)
  doc.text("Prepared / Verified By", 14, currentY + 4)
  doc.text("Hon. Secretary / Treasurer", pageWidth - 70, currentY + 4)

  const sanitizedFilename = `Statement_${data.resident.name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`
  doc.save(sanitizedFilename)
}
