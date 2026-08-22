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
