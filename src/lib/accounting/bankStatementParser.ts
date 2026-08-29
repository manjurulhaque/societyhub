import { parseCsv } from "@/lib/csv"

export type BankFormatType = "HDFC" | "ICICI" | "SBI" | "AXIS" | "KOTAK" | "GENERIC"

export interface ExtractedEntities {
  flatCandidate: string | null
  chequeNumberCandidate: string | null
  utrReferenceCandidate: string | null
  isBankChargesKeyword: boolean
  isInterestKeyword: boolean
}

export interface BankStatementRow {
  rowId: string
  date: string // ISO date string YYYY-MM-DD
  rawDate: string
  narration: string
  referenceNumber: string | null
  chequeNumber: string | null
  debit: number // 0 if credit
  credit: number // 0 if debit
  balance: number | null
  type: "CREDIT" | "DEBIT"
  entities: ExtractedEntities
  raw: Record<string, string>
}

export interface ParsedBankStatement {
  format: BankFormatType
  accountNumberDetected: string | null
  startDate: string | null
  endDate: string | null
  openingBalance: number | null
  closingBalance: number | null
  totalCredits: number
  totalDebits: number
  creditCount: number
  debitCount: number
  rows: BankStatementRow[]
}

/**
 * Normalizes and cleans numeric currency strings into float numbers.
 * Handles commas, currency symbols, and bracketed negative numbers.
 */
export function cleanAmount(val: string | number | null | undefined): number {
  if (val === null || val === undefined) return 0
  if (typeof val === "number") return isNaN(val) ? 0 : Math.abs(val)

  let str = val.toString().trim()
  if (!str || str === "-" || str === "--" || str === "N/A") return 0

  // Handle negative or credit/debit suffixes
  str = str.replace(/[₹$€£\s,]/g, "")
  if (str.startsWith("(") && str.endsWith(")")) {
    str = "-" + str.slice(1, -1)
  }

  // Remove DR/CR suffixes if present
  str = str.replace(/([0-9.]+)\s*(cr|dr)/i, "$1")

  const num = parseFloat(str)
  return isNaN(num) ? 0 : Math.abs(num)
}

/**
 * Parses date string in common Indian bank formats into ISO YYYY-MM-DD.
 */
export function parseBankDate(dateStr: string): string | null {
  if (!dateStr || !dateStr.trim()) return null
  const cleaned = dateStr.trim().replace(/['"]/g, "")

  // 1. ISO format: YYYY-MM-DD
  const isoMatch = cleaned.match(/^(\d{4})[-/. ](\d{1,2})[-/. ](\d{1,2})$/)
  if (isoMatch) {
    const [, y, m, d] = isoMatch
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
  }

  // 2. DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = cleaned.match(/^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{4})$/)
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
  }

  // 3. DD-MMM-YYYY (e.g. 05-Oct-2025, 12-JAN-2026)
  const monthMap: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  }
  const dMmmYMatch = cleaned.match(/^(\d{1,2})[-/. ]([A-Za-z]{3,4})[-/. ](\d{2,4})$/)
  if (dMmmYMatch) {
    const [, d, mon, rawY] = dMmmYMatch
    const m = monthMap[mon.toLowerCase().slice(0, 3)]
    if (m) {
      const y = rawY.length === 2 ? `20${rawY}` : rawY
      return `${y}-${m}-${d.padStart(2, "0")}`
    }
  }

  // Fallback to JS Date parse
  const parsed = new Date(cleaned)
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0]
  }

  return null
}

/**
 * Extracts entities from transaction narration: Flat identifier, Cheque No, UTR, Bank charges, Interest.
 */
export function extractNarrationEntities(narration: string, rawRef?: string | null): ExtractedEntities {
  const text = (narration + " " + (rawRef || "")).toUpperCase()

  // 1. Flat candidate regex patterns:
  // Patterns like: A-402, B-104, FLAT 302, FLAT-302, WING A 204, TOWER 1 501, UNIT 404, A 402, B402
  let flatCandidate: string | null = null
  const flatPatterns = [
    /\b(?:FLAT|UNIT|APT|NO)?\s*[:#\-]?\s*([A-Z]{1,2})\s*[\s\/\-]?\s*(\d{2,4})\b/i,
    /\b(?:FLAT|UNIT|APT)\s*[:#\-]?\s*(\d{2,4})\b/i,
    /\b([A-Z])[\s\-]?(\d{3,4})\b/i,
  ]

  for (const regex of flatPatterns) {
    const m = text.match(regex)
    if (m) {
      if (m[2]) {
        // e.g. A-402 or Wing A Flat 402
        flatCandidate = `${m[1].trim()}-${m[2].trim()}`
      } else {
        flatCandidate = m[1].trim()
      }
      break
    }
  }

  // 2. 6-digit cheque number candidate
  let chequeNumberCandidate: string | null = null
  const chqMatch = text.match(/\b(?:CHQ|CHEQUE|CLG|CLEARING|INST)?\s*[:#\-]?\s*(\d{6})\b/i)
  if (chqMatch && chqMatch[1]) {
    chequeNumberCandidate = chqMatch[1]
  }

  // 3. UTR / Transfer Reference candidate
  let utrReferenceCandidate: string | null = null
  const utrMatch = text.match(
    /\b(?:UPI|NEFT|RTGS|IMPS)[\s\/:#\-]+([A-Z0-9]{8,22})\b/i
  ) || text.match(/\b([A-Z]{4}\d{8,16})\b/) // standard bank UTR structure
  if (utrMatch && utrMatch[1]) {
    utrReferenceCandidate = utrMatch[1]
  }

  // 4. Bank Charges keywords
  const bankChargesKeywords = [
    "SMS CHARGE", "SMS CHG", "SMS ALERT", "CONSOLIDATED CHARGES", "LEDGER MAINT",
    "ANNUAL FEE", "DEBIT CARD CHG", "MIN BAL", "CHQ RET", "BOUNCE CHG", "BOUNCE CHARGE",
    "SERVICE CHG", "SERVICE CHARGE", "BANK CHARGES", "BANK CHARGE", "GST ON CHG",
    "ACCOUNT MAINT", "MONTHLY CHG", "FOLIO CHG",
  ]
  const isBankChargesKeyword =
    bankChargesKeywords.some((k) => text.includes(k)) ||
    (text.includes("SMS") && (text.includes("CHARGE") || text.includes("CHG") || text.includes("FEE")))

  // 5. Interest keywords
  const interestKeywords = [
    "INTEREST CREDITED", "INT.PD", "INT CREDIT", "SB INT", "SAVINGS INTEREST",
    "AUTO SWEEP INT", "INTEREST PAID", "CREDIT INT", "INTEREST RECD",
  ]
  const isInterestKeyword = interestKeywords.some((k) => text.includes(k))

  return {
    flatCandidate,
    chequeNumberCandidate,
    utrReferenceCandidate,
    isBankChargesKeyword,
    isInterestKeyword,
  }
}

/**
 * Maps CSV column headers to standard fields based on common Indian bank formats.
 */
function identifyHeaderIndexes(headerRow: string[]): {
  format: BankFormatType
  dateIdx: number
  narrationIdx: number
  refIdx: number
  chqIdx: number
  withdrawalIdx: number
  depositIdx: number
  balanceIdx: number
  drCrIdx: number
  amountIdx: number
} {
  const norm = headerRow.map((h) => h.toLowerCase().trim().replace(/[^a-z0-9]/g, ""))

  let dateIdx = -1
  let narrationIdx = -1
  let refIdx = -1
  let chqIdx = -1
  let withdrawalIdx = -1
  let depositIdx = -1
  let balanceIdx = -1
  let drCrIdx = -1
  let amountIdx = -1

  norm.forEach((h, idx) => {
    // Date
    if (dateIdx === -1 && (h.includes("txndate") || h.includes("transactiondate") || h === "date" || h.includes("valuedate") || h.includes("postdate") || h === "trandate")) {
      dateIdx = idx
    }
    // Narration
    if (narrationIdx === -1 && (h.includes("narration") || h.includes("description") || h.includes("particulars") || h.includes("remarks") || h.includes("details"))) {
      narrationIdx = idx
    }
    // Reference
    if (refIdx === -1 && (h.includes("refno") || h.includes("reference") || h.includes("txnid") || h.includes("utr") || h.includes("chqrefno"))) {
      refIdx = idx
    }
    // Cheque No
    if (chqIdx === -1 && (h.includes("chequeno") || h.includes("chqno") || h.includes("cheque") || h.includes("instrumentno"))) {
      chqIdx = idx
    }
    // Withdrawal / Debit
    if (withdrawalIdx === -1 && (h.includes("withdrawal") || h.includes("debit") || h === "dr" || h.includes("dramount") || h.includes("withdrawalamt"))) {
      withdrawalIdx = idx
    }
    // Deposit / Credit
    if (depositIdx === -1 && (h.includes("deposit") || h.includes("credit") || h === "cr" || h.includes("cramount") || h.includes("depositamt"))) {
      depositIdx = idx
    }
    // Balance
    if (balanceIdx === -1 && (h.includes("balance") || h.includes("closingbalance") || h.includes("availbal") || h === "bal")) {
      balanceIdx = idx
    }
    // Dr/Cr column (Kotak style)
    if (drCrIdx === -1 && (h === "drcr" || h === "crdr" || h === "type")) {
      drCrIdx = idx
    }
    // Single Amount column
    if (amountIdx === -1 && (h === "amount" || h === "txnamount" || h === "transactionamount")) {
      amountIdx = idx
    }
  })

  // Detect bank format style
  let format: BankFormatType = "GENERIC"
  const rawHeaders = headerRow.join(" ").toUpperCase()
  if (rawHeaders.includes("CHQ/REF") || rawHeaders.includes("WITHDRAWAL AMT.")) {
    format = "HDFC"
  } else if (rawHeaders.includes("TRANSACTION REMARKS") || rawHeaders.includes("DEPOSIT AMOUNT (INR )")) {
    format = "ICICI"
  } else if (rawHeaders.includes("TXN DATE") && rawHeaders.includes("REF NO./CHEQUE NO.")) {
    format = "SBI"
  } else if (rawHeaders.includes("TRAN DATE") && rawHeaders.includes("CHQNO")) {
    format = "AXIS"
  } else if (rawHeaders.includes("DR / CR") || (drCrIdx !== -1 && amountIdx !== -1)) {
    format = "KOTAK"
  }

  return {
    format,
    dateIdx,
    narrationIdx,
    refIdx,
    chqIdx,
    withdrawalIdx,
    depositIdx,
    balanceIdx,
    drCrIdx,
    amountIdx,
  }
}

/**
 * Main bank statement CSV parser.
 * Scans rows, finds header line, parses transactions, extracts entities, and computes totals.
 */
export function parseBankStatementCsv(csvContent: string): ParsedBankStatement {
  const rawGrid = parseCsv(csvContent)
  if (!rawGrid || rawGrid.length === 0) {
    throw new Error("The uploaded CSV file is empty.")
  }

  // Find the header row (the row containing keywords like Date, Narration, Amount, Debit, Credit)
  let headerRowIndex = -1
  let headerMap = null

  for (let i = 0; i < Math.min(rawGrid.length, 25); i++) {
    const row = rawGrid[i]
    const joined = row.join(" ").toLowerCase()
    if (
      (joined.includes("date") || joined.includes("txn")) &&
      (joined.includes("narration") || joined.includes("particular") || joined.includes("description") || joined.includes("remarks") || joined.includes("details")) &&
      (joined.includes("debit") || joined.includes("credit") || joined.includes("withdrawal") || joined.includes("deposit") || joined.includes("amount") || joined.includes("dr"))
    ) {
      headerRowIndex = i
      headerMap = identifyHeaderIndexes(row)
      break
    }
  }

  if (headerRowIndex === -1 || !headerMap) {
    throw new Error(
      "Could not automatically detect bank statement headers. Please ensure the CSV contains Date, Narration/Description, and Debit/Credit columns."
    )
  }

  const {
    format,
    dateIdx,
    narrationIdx,
    refIdx,
    chqIdx,
    withdrawalIdx,
    depositIdx,
    balanceIdx,
    drCrIdx,
    amountIdx,
  } = headerMap

  if (dateIdx === -1 || narrationIdx === -1) {
    throw new Error("Required columns (Date and Narration/Description) could not be identified in the CSV.")
  }

  const rows: BankStatementRow[] = []
  let totalCredits = 0
  let totalDebits = 0
  let creditCount = 0
  let debitCount = 0
  let openingBalance: number | null = null
  let closingBalance: number | null = null

  const headerTitles = rawGrid[headerRowIndex]

  for (let i = headerRowIndex + 1; i < rawGrid.length; i++) {
    const row = rawGrid[i]
    if (!row || row.length === 0 || row.every((c) => !c || c.trim() === "")) continue

    const rawDate = row[dateIdx] || ""
    const isoDate = parseBankDate(rawDate)
    if (!isoDate) continue // Skip non-transaction rows (e.g. summary or footer notes)

    const narration = (row[narrationIdx] || "").trim()
    if (!narration) continue

    const rawRef = refIdx !== -1 ? row[refIdx] : null
    const rawChq = chqIdx !== -1 ? row[chqIdx] : null

    let debit = 0
    let credit = 0

    if (withdrawalIdx !== -1 && depositIdx !== -1) {
      debit = cleanAmount(row[withdrawalIdx])
      credit = cleanAmount(row[depositIdx])
    } else if (amountIdx !== -1 && drCrIdx !== -1) {
      const amt = cleanAmount(row[amountIdx])
      const indicator = (row[drCrIdx] || "").trim().toUpperCase()
      if (indicator.includes("CR") || indicator === "CREDIT" || indicator === "C") {
        credit = amt
      } else {
        debit = amt
      }
    } else if (amountIdx !== -1) {
      const rawAmtStr = row[amountIdx] || ""
      const amt = cleanAmount(rawAmtStr)
      if (rawAmtStr.includes("-") || rawAmtStr.toUpperCase().includes("DR")) {
        debit = amt
      } else {
        credit = amt
      }
    }

    if (debit === 0 && credit === 0) continue

    const balanceNum = balanceIdx !== -1 ? cleanAmount(row[balanceIdx]) : null
    if (openingBalance === null && balanceNum !== null) {
      // Approximate opening balance from first row
      openingBalance = credit > 0 ? balanceNum - credit : balanceNum + debit
    }
    if (balanceNum !== null) {
      closingBalance = balanceNum
    }

    const type = credit > 0 ? "CREDIT" : "DEBIT"
    if (type === "CREDIT") {
      totalCredits += credit
      creditCount++
    } else {
      totalDebits += debit
      debitCount++
    }

    // Build raw mapping object for audit inspection
    const rawObj: Record<string, string> = {}
    row.forEach((cell, cellIdx) => {
      const key = headerTitles[cellIdx] || `Col_${cellIdx}`
      rawObj[key] = cell
    })

    const entities = extractNarrationEntities(narration, rawRef)

    // Check if rawChq is a valid 6-digit cheque number
    if (rawChq && /^\d{6}$/.test(rawChq.trim())) {
      entities.chequeNumberCandidate = rawChq.trim()
    }

    rows.push({
      rowId: `stmt_row_${i}_${Date.now().toString(36)}`,
      date: isoDate,
      rawDate,
      narration,
      referenceNumber: rawRef?.trim() || entities.utrReferenceCandidate,
      chequeNumber: entities.chequeNumberCandidate,
      debit: Math.round(debit * 100) / 100,
      credit: Math.round(credit * 100) / 100,
      balance: balanceNum !== null ? Math.round(balanceNum * 100) / 100 : null,
      type,
      entities,
      raw: rawObj,
    })
  }

  const startDate = rows.length > 0 ? rows[0].date : null
  const endDate = rows.length > 0 ? rows[rows.length - 1].date : null

  return {
    format,
    accountNumberDetected: null,
    startDate,
    endDate,
    openingBalance: openingBalance ? Math.round(openingBalance * 100) / 100 : null,
    closingBalance: closingBalance ? Math.round(closingBalance * 100) / 100 : null,
    totalCredits: Math.round(totalCredits * 100) / 100,
    totalDebits: Math.round(totalDebits * 100) / 100,
    creditCount,
    debitCount,
    rows,
  }
}

/**
 * Generates an example bank statement CSV for user download and testing.
 */
export function generateSampleBankStatementCsv(): string {
  const headers = [
    "Txn Date",
    "Value Date",
    "Description",
    "Ref No./Cheque No.",
    "Debit",
    "Credit",
    "Balance",
  ]
  const rows = [
    ["01/05/2026", "01/05/2026", "UPI/5123984920/FLAT A-101/MAINT/HDFC", "UPI/5123984920", "", "4500.00", "504500.00"],
    ["02/05/2026", "02/05/2026", "NEFT-N9872348-FLAT B-204-KUMAR", "N9872348", "", "5200.00", "509700.00"],
    ["03/05/2026", "03/05/2026", "CHQ CLG 045231 SHARMA ENTERPRISES", "045231", "15000.00", "", "494700.00"],
    ["04/05/2026", "04/05/2026", "CHQ DEP 892014 FLAT 302 VERMA", "892014", "", "4500.00", "499200.00"],
    ["05/05/2026", "05/05/2026", "QUARTERLY SMS ALERT CHARGES", "CHG052026", "59.00", "", "499141.00"],
    ["10/05/2026", "10/05/2026", "UPI/5987342019/A-402/ADVANCE", "UPI/5987342019", "", "10000.00", "509141.00"],
    ["15/05/2026", "15/05/2026", "INTEREST CREDITED Q4", "INT052026", "", "1245.00", "510386.00"],
    ["18/05/2026", "18/05/2026", "RTGS-UTIBR892348-OTIS ELEVATOR AMC", "UTIBR892348", "18500.00", "", "491886.00"],
  ]

  const headerLine = headers.join(",")
  const rowLines = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
  return `\uFEFF${[headerLine, ...rowLines].join("\r\n")}`
}
