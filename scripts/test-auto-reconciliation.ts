import {
  parseBankStatementCsv,
  cleanAmount,
  parseBankDate,
  extractNarrationEntities,
  generateSampleBankStatementCsv,
} from "../src/lib/accounting/bankStatementParser"
import { generateBankReconciliationCsv } from "../src/lib/pdf/bankReconPdfGenerator"
import { matchRecurringUtilityRule } from "../src/lib/accounting/recurringRuleEngine"

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`)
    process.exit(1)
  }
  console.log(`  ✓ ${msg}`)
}

console.log("\n=======================================================")
console.log(" 🧪 SARWS Connect Bank Statement Auto-Reconciliation Tests ")
console.log("=======================================================\n")

// Test 1: Amount Sanitizer
console.log("▶ 1. Testing cleanAmount Utility:")
assert(cleanAmount("4,500.00") === 4500, "Clean comma-separated amount: 4,500.00 -> 4500")
assert(cleanAmount("₹ 12,345.50") === 12345.5, "Clean INR prefixed amount: ₹ 12,345.50 -> 12345.5")
assert(cleanAmount("(1,200.00)") === 1200, "Clean parenthesized amount: (1,200.00) -> 1200")
assert(cleanAmount("5000.00 CR") === 5000, "Clean suffix CR: 5000.00 CR -> 5000")
assert(cleanAmount("250.75 DR") === 250.75, "Clean suffix DR: 250.75 DR -> 250.75")
assert(cleanAmount("-") === 0, "Clean empty dash '-' -> 0")
assert(cleanAmount(null) === 0, "Clean null -> 0")

// Test 2: Date Parser
console.log("\n▶ 2. Testing parseBankDate Utility:")
assert(parseBankDate("2026-05-10") === "2026-05-10", "ISO YYYY-MM-DD format")
assert(parseBankDate("05/10/2026") === "2026-10-05", "DD/MM/YYYY format")
assert(parseBankDate("15-08-2025") === "2025-08-15", "DD-MM-YYYY format")
assert(parseBankDate("12-Jan-2026") === "2026-01-12", "DD-MMM-YYYY format (Jan)")
assert(parseBankDate("25-OCT-2025") === "2025-10-25", "DD-MMM-YYYY format (OCT)")

// Test 3: Entity Extraction from Narrations
console.log("\n▶ 3. Testing extractNarrationEntities:")
const ent1 = extractNarrationEntities("UPI/5123984920/FLAT A-402/MAINTENANCE/HDFC")
assert(ent1.flatCandidate === "A-402", "Extracts flat candidate A-402")
assert(ent1.utrReferenceCandidate === "5123984920", "Extracts UPI UTR reference")

const ent2 = extractNarrationEntities("CHQ CLG 045231 SHARMA ENTERPRISES")
assert(ent2.chequeNumberCandidate === "045231", "Extracts 6-digit cheque number 045231")

const ent3 = extractNarrationEntities("QUARTERLY SMS ALERT CHARGES")
assert(ent3.isBankChargesKeyword === true, "Flags bank charges keyword for SMS alert charges")

const ent4 = extractNarrationEntities("SAVINGS INTEREST CREDITED FOR Q4")
assert(ent4.isInterestKeyword === true, "Flags interest keyword for savings interest")

const ent5 = extractNarrationEntities("NEFT-N9872348-FLAT 104-KUMAR")
assert(ent5.flatCandidate === "104", "Extracts flat candidate 104")
assert(ent5.utrReferenceCandidate === "N9872348", "Extracts NEFT reference")

// Test 4: HDFC Bank CSV Parsing
console.log("\n▶ 4. Testing HDFC Bank Statement CSV Parsing:")
const hdfcCsv = `
Date,Narration,Chq/Ref Number,Value Dt,Withdrawal Amt.,Deposit Amt.,Closing Balance
01/05/2026,UPI/5123984920/FLAT A-101/MAINT,UPI/5123984920,01/05/2026,,4500.00,504500.00
02/05/2026,CHQ CLG 045231 SHARMA ENTERPRISES,045231,02/05/2026,15000.00,,489500.00
05/05/2026,CONSOLIDATED CHARGES FOR LEDGER MAINT,CHG123,05/05/2026,150.00,,489350.00
`
const hdfcParsed = parseBankStatementCsv(hdfcCsv)
assert(hdfcParsed.format === "HDFC", "Detects HDFC format")
assert(hdfcParsed.rows.length === 3, "Parsed 3 transaction rows")
assert(hdfcParsed.totalCredits === 4500, "Total credits = 4500")
assert(hdfcParsed.totalDebits === 15150, "Total debits = 15150")
assert(hdfcParsed.rows[0].entities.flatCandidate === "A-101", "Row 0 flat = A-101")
assert(hdfcParsed.rows[1].chequeNumber === "045231", "Row 1 cheque = 045231")

// Test 5: ICICI Bank CSV Parsing
console.log("\n▶ 5. Testing ICICI Bank Statement CSV Parsing:")
const iciciCsv = `
Transaction Date,Value Date,Cheque Number,Transaction Remarks,Withdrawal Amount (INR ),Deposit Amount (INR ),Balance (INR )
01/05/2026,01/05/2026,-,NEFT-ICICIN12345-FLAT B-204,0.00,5200.00,505200.00
03/05/2026,03/05/2026,089210,CHQ ISSUED LIFT AMC,18000.00,0.00,487200.00
`
const iciciParsed = parseBankStatementCsv(iciciCsv)
assert(iciciParsed.format === "ICICI", "Detects ICICI format")
assert(iciciParsed.rows.length === 2, "Parsed 2 ICICI rows")
assert(iciciParsed.rows[0].credit === 5200, "ICICI credit = 5200")
assert(iciciParsed.rows[1].debit === 18000, "ICICI debit = 18000")

// Test 6: SBI Bank CSV Parsing
console.log("\n▶ 6. Testing SBI Bank Statement CSV Parsing:")
const sbiCsv = `
Txn Date,Value Date,Description,Ref No./Cheque No.,Debit,Credit,Balance
01-05-2026,01-05-2026,INTEREST CREDITED Q4,INT001,,1250.00,201250.00
02-05-2026,02-05-2026,UPI/5987342019/A-402/ADVANCE,UPI/5987342019,,10000.00,211250.00
`
const sbiParsed = parseBankStatementCsv(sbiCsv)
assert(sbiParsed.format === "SBI", "Detects SBI format")
assert(sbiParsed.rows.length === 2, "Parsed 2 SBI rows")
assert(sbiParsed.rows[0].entities.isInterestKeyword === true, "Row 0 flagged as interest")
assert(sbiParsed.rows[1].entities.flatCandidate === "A-402", "Row 1 flat = A-402")

// Test 8: Bank Reconciliation CSV Generator
console.log("\n▶ 8. Testing Bank Reconciliation CSV Generator:")
const bsrCsv = generateBankReconciliationCsv({
  society: { name: "Palm Meadows CHS" },
  accountName: "HDFC Main Operational A/C",
  bankName: "HDFC Bank",
  accountNumber: "50200012345678",
  statementDate: "2026-05-31",
  bookBalance: 450000,
  unpresentedCheques: [
    { chequeNumber: "045231", chequeDate: "2026-05-20", partyName: "Otis Elevator AMC", amount: 18000 },
  ],
  uncreditedCheques: [
    { chequeNumber: "892014", chequeDate: "2026-05-28", partyName: "Sharma Flat A-101", amount: 4500 },
  ],
  statementBalance: 463500,
  adjustedBalance: 463500,
  discrepancy: 0,
  notes: "Audited and verified with HDFC Passbook",
})
assert(bsrCsv.includes("Palm Meadows CHS") || bsrCsv.includes("Balance as per Society Bank Ledger"), "BRS CSV contains summary headers")
assert(bsrCsv.includes("045231"), "BRS CSV contains unpresented cheque schedule")
assert(bsrCsv.includes("892014"), "BRS CSV contains uncredited cheque schedule")

// Test 9: Recurring Utility & Overhead Rule Engine
console.log("\n▶ 9. Testing Recurring Utility & Overhead Rule Engine:")
const mockCats = [
  { id: "cat-elec", name: "Common Area Electricity Consumption" },
  { id: "cat-water", name: "Supplementary Water Tanker Purchases" },
  { id: "cat-lift", name: "Lift AMC & Breakdown Repairs" },
  { id: "cat-sec", name: "Security Guard Services" },
]

const elecMatch = matchRecurringUtilityRule("ACH D- BESCOM BILL PAYMENT 0892341", mockCats)
assert(elecMatch !== null && elecMatch.matchedRule.id === "RULE_ELECTRICITY", "Matches BESCOM to Electricity Rule")
assert(elecMatch?.categoryId === "cat-elec", "Maps to Electricity category ID")

const liftMatch = matchRecurringUtilityRule("NEFT-OTIS ELEVATOR INDIA LTD-AMC Q1", mockCats)
assert(liftMatch !== null && liftMatch.matchedRule.id === "RULE_LIFT_AMC", "Matches OTIS to Lift AMC Rule")
assert(liftMatch?.categoryId === "cat-lift", "Maps to Lift AMC category ID")

const waterMatch = matchRecurringUtilityRule("CHQ 401290 WATER TANKER SUPPLY MAY", mockCats)
assert(waterMatch !== null && waterMatch.matchedRule.id === "RULE_WATER", "Matches Water Tanker Rule")

const secMatch = matchRecurringUtilityRule("NEFT/SIS INDIA SECURITY SERVICES/APR", mockCats)
assert(secMatch !== null && secMatch.matchedRule.id === "RULE_SECURITY", "Matches Security Agency Rule")

console.log("\n=======================================================")
console.log(" 🎉 All Bank Statement Auto-Reconciliation Tests Passed! ")
console.log("=======================================================\n")
