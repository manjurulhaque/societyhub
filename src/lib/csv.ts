/**
 * CSV & Spreadsheet Export Security Utilities.
 * Mitigates CSV Injection (Formula Injection / DDE Code Execution)
 * when exported tabular data is opened in Microsoft Excel, LibreOffice Calc, or Google Sheets.
 */

const FORMULA_TRIGGERS = ["=", "+", "-", "@", "\t", "\r"]

/**
 * Escapes a single cell value for CSV output, neutralizing any formula injection triggers.
 */
export function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return '""'
  }

  const rawStr = String(value)
  let str = rawStr.trim()

  // Neutralize formula triggers by prefixing with a single quote
  if (FORMULA_TRIGGERS.some((trigger) => rawStr.startsWith(trigger) || str.startsWith(trigger))) {
    str = `'${rawStr}`
  }

  // Escape internal double-quotes by doubling them (RFC 4180)
  const escaped = str.replace(/"/g, '""')

  // Wrap in double quotes if string contains delimiter, quotes, or newlines
  return `"${escaped}"`
}

/**
 * Generates an RFC 4180 compliant and injection-safe CSV string.
 *
 * @param headers Column header titles
 * @param rows Matrix of row data
 * @returns Fully formatted and sanitized CSV string with UTF-8 BOM
 */
export function generateSafeCsv(
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): string {
  const headerLine = headers.map((h) => escapeCsvCell(h)).join(",")
  const rowLines = rows.map((row) => row.map((cell) => escapeCsvCell(cell)).join(","))

  // Include UTF-8 Byte Order Mark (BOM) so Excel renders UTF-8 correctly
  return `\uFEFF${[headerLine, ...rowLines].join("\r\n")}`
}

/**
 * Parses an RFC 4180 compliant or tab-delimited CSV/TSV text into an array of string rows.
 * Handles quoted fields, embedded commas/newlines, and escaped quotes ("").
 */
export function parseCsv(text: string): string[][] {
  if (!text || !text.trim()) return []

  // Remove Byte Order Mark if present
  let cleanText = text
  if (cleanText.charCodeAt(0) === 0xfeff) {
    cleanText = cleanText.slice(1)
  }

  // Detect delimiter: tab or comma or semicolon
  const firstLine = cleanText.split(/\r\n|\n|\r/)[0] || ""
  let delimiter = ","
  if (firstLine.includes("\t") && !firstLine.includes(",")) {
    delimiter = "\t"
  } else if (firstLine.includes(";") && !firstLine.includes(",")) {
    delimiter = ";"
  }

  const rows: string[][] = []
  let currentRow: string[] = []
  let currentCell = ""
  let insideQuotes = false

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i]
    const nextChar = cleanText[i + 1]

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"'
        i++ // skip escaped quote
      } else {
        insideQuotes = !insideQuotes
      }
    } else if (char === delimiter && !insideQuotes) {
      currentRow.push(currentCell.trim())
      currentCell = ""
    } else if ((char === "\r" || char === "\n") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++ // skip \n of \r\n
      }
      currentRow.push(currentCell.trim())
      currentCell = ""
      if (currentRow.some((c) => c.length > 0)) {
        rows.push(currentRow)
      }
      currentRow = []
    } else {
      currentCell += char
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim())
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow)
    }
  }

  return rows
}
