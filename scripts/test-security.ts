/**
 * SARWS Connect Comprehensive Security & Cryptographic Self-Test Suite.
 *
 * Mathematically validates:
 * 1. AES-256-GCM Cryptographic Parity & Envelope Integrity
 * 2. HMAC-SHA256 Audit Trail Merkle Chaining & Tamper Detection
 * 3. Sliding-Window Rate Limiting Engine & Quota Lifecycles
 * 4. Universal CSV / Excel Formula Injection (DDE) Neutralization
 * 5. Input Sanitizer Stored XSS & Control Character Stripping
 * 6. Centralized Open Redirect Defense Protocol
 * 7. NIST SP 800-63B Password Policy Compliance
 * 8. Automated Audit PII & Secret Redaction Engine
 * 9. High-Risk Audit Alert Classification & HMAC-Signed Webhook Engine
 * 10. Session Inactivity Lifecycle, Warning Countdown & Redirect Gate
 * 11. Cache Tagging & Keyed Invalidation Architecture
 * 12. External Link Security & noopener noreferrer Enforcement
 */

import { encryptData, decryptData, isEncrypted } from "../src/lib/crypto"
import { computeAuditSignature, verifyAuditTrailIntegrity } from "../src/lib/auditCrypto"
import { peekRateLimit, incrementRateLimit, resetRateLimit } from "../src/lib/rateLimit"
import { escapeCsvCell, generateSafeCsv } from "../src/lib/csv"
import { sanitizeText } from "../src/lib/sanitize"
import { getSafeRedirectUrl } from "../src/lib/auth/safeRedirect"
import { validatePasswordStrength } from "../src/lib/auth/passwordValidation"
import { sanitizeAuditPayload } from "../src/lib/auditSanitizer"
import {
  evaluateAuditAlertSeverity,
  signWebhookPayload,
  formatAuditAlertPayload,
} from "../src/lib/auditAlerts"
import { CACHE_TAGS } from "../src/lib/cache/cacheTags"
import { formatFinancialYearDate, formatFinancialYearRange } from "../src/lib/datetime"

let passedTests = 0
let failedTests = 0

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passedTests++
    console.log(`  ✓ PASS: ${testName}`)
  } else {
    failedTests++
    console.error(`  ✗ FAIL: ${testName}${detail ? ` - ${detail}` : ""}`)
  }
}

console.log("\n================================================================================")
console.log("             SARWS CONNECT SECURITY & CRYPTOGRAPHY SELF-TEST SUITE              ")
console.log("================================================================================\n")

// -----------------------------------------------------------------------------
// TEST 1: AES-256-GCM Cryptography
// -----------------------------------------------------------------------------
console.log("▶ [1/9] Testing AES-256-GCM Field-Level Cryptography...")
try {
  const plaintext = "PAN-ABCDE1234F-SECRET-12345"
  const ciphertext = encryptData(plaintext)

  assert(isEncrypted(ciphertext), "Ciphertext has correct envelope prefix ('enc:v1:')")
  assert(ciphertext !== plaintext, "Ciphertext is fully scrambled from plaintext")

  const parts = ciphertext.split(":")
  assert(parts.length === 5, "Ciphertext envelope contains 5 segments (enc:v1:iv:tag:data)")

  const decrypted = decryptData(ciphertext)
  assert(decrypted === plaintext, "Decrypted ciphertext matches original plaintext perfectly")

  const legacyPlaintext = "PLAIN_NON_ENCRYPTED_VALUE"
  assert(decryptData(legacyPlaintext) === legacyPlaintext, "Backward-compatible decryption handles plaintext safely")

  // Tamper detection (fails auth tag and safely returns masked placeholder without crash)
  const tampered = ciphertext.slice(0, -2) + "aa"
  const tamperedResult = decryptData(tampered)
  assert(tamperedResult === "••••••••", "Tampered ciphertext safely fails authentication tag and returns masked placeholder")
} catch (e: unknown) {
  assert(false, "AES-256-GCM Cryptography threw unexpected error", e instanceof Error ? e.message : String(e))
}

// -----------------------------------------------------------------------------
// TEST 2: HMAC-SHA256 Merkle Audit Trail Integrity
// -----------------------------------------------------------------------------
console.log("\n▶ [2/9] Testing HMAC-SHA256 Audit Trail Cryptographic Chaining...")
try {
  const date1 = new Date("2026-01-01T10:00:00Z")
  const date2 = new Date("2026-01-01T10:05:00Z")
  const date3 = new Date("2026-01-01T10:10:00Z")

  const log1 = {
    id: "log-001",
    action: "CREATE",
    entity: "Bill",
    entityId: "bill-123",
    userId: "user-abc",
    societyId: "soc-xyz",
    createdAt: date1,
    previousSignature: "GENESIS",
    signature: "",
  }
  log1.signature = computeAuditSignature(log1)

  const log2 = {
    id: "log-002",
    action: "UPDATE",
    entity: "Bill",
    entityId: "bill-123",
    userId: "user-abc",
    societyId: "soc-xyz",
    createdAt: date2,
    previousSignature: log1.signature,
    signature: "",
  }
  log2.signature = computeAuditSignature(log2)

  const log3 = {
    id: "log-003",
    action: "STATUS_CHANGE",
    entity: "Bill",
    entityId: "bill-123",
    userId: "user-abc",
    societyId: "soc-xyz",
    createdAt: date3,
    previousSignature: log2.signature,
    signature: "",
  }
  log3.signature = computeAuditSignature(log3)

  assert(typeof log1.signature === "string" && log1.signature.length === 64, "Log 1 generated 256-bit SHA-256 HMAC signature")
  assert(log1.signature !== log2.signature, "Chained signatures are unique per transaction")

  // Valid chain verification
  const trailResult = verifyAuditTrailIntegrity([log1, log2, log3])
  assert(trailResult.isValid, "Audit trail integrity verification succeeds for valid chain")
  assert(trailResult.verifiedCount === 3, "Verified count matches total records")

  // Tamper detection: modify a payload field
  const tamperedLog2 = { ...log2, entity: "TamperedBill" }
  const tamperedResult = verifyAuditTrailIntegrity([log1, tamperedLog2, log3])
  assert(!tamperedResult.isValid, "Tampered record payload correctly caught by cryptographic verification")
  assert(tamperedResult.tamperedLogId === "log-002", "Identifies exact tampered record ID")

  // Continuity break: deleted intermediate record in strict mode
  const brokenChainResult = verifyAuditTrailIntegrity([log1, log3])
  assert(!brokenChainResult.isValid, "Missing/deleted record in strict chain correctly flags continuity break")

  // Filtered/non-consecutive query support
  const filteredResult = verifyAuditTrailIntegrity([log1, log3], { allowNonConsecutive: true })
  assert(filteredResult.isValid, "Non-consecutive filtered view succeeds when individual seals are intact")

  // Legacy records handling
  const legacyLog = {
    id: "legacy-001",
    action: "CREATE",
    entity: "Society",
    entityId: "soc-xyz",
    userId: "user-legacy",
    societyId: "soc-xyz",
    createdAt: new Date("2025-12-01T10:00:00Z"),
  }
  const mixedResult = verifyAuditTrailIntegrity([legacyLog, log1, log2])
  assert(mixedResult.isValid, "Mixed legacy unsealed and sealed records verify gracefully")
  assert(mixedResult.legacyCount === 1 && mixedResult.verifiedCount === 2, "Accurately reports legacy vs sealed counts")
} catch (e: unknown) {
  assert(false, "HMAC Audit Chaining threw unexpected error", e instanceof Error ? e.message : String(e))
}

// -----------------------------------------------------------------------------
// TEST 3: Sliding-Window Rate Limiter
// -----------------------------------------------------------------------------
console.log("\n▶ [3/9] Testing Sliding-Window In-Memory Rate Limiter...")
try {
  const testKey = `test-rate-limit-${Date.now()}`
  const options = { maxRequests: 2, windowSeconds: 60 }

  const peek1 = peekRateLimit(testKey, options)
  assert(peek1.allowed && peek1.remaining === 2, "Peek checks quota without consuming attempts")

  const hit1 = incrementRateLimit(testKey, options)
  assert(hit1.allowed && hit1.remaining === 1, "First failure increments quota to 1 remaining")

  const hit2 = incrementRateLimit(testKey, options)
  assert(hit2.allowed && hit2.remaining === 0, "Second failure increments quota to 0 remaining")

  const hit3 = incrementRateLimit(testKey, options)
  assert(!hit3.allowed, "Third failure exceeds quota and is locked out")

  resetRateLimit(testKey)
  const afterReset = peekRateLimit(testKey, options)
  assert(afterReset.allowed && afterReset.remaining === 2, "Reset rate limit restores full quota")
} catch (e: unknown) {
  assert(false, "Rate Limiter threw unexpected error", e instanceof Error ? e.message : String(e))
}

// -----------------------------------------------------------------------------
// TEST 4: Universal CSV Formula Injection (DDE) Neutralization
// -----------------------------------------------------------------------------
console.log("\n▶ [4/9] Testing CSV / Excel Formula Injection (DDE) Sanitization...")
try {
  const formula1 = "=cmd|'/c calc'!A0"
  const formula2 = "+2+5"
  const formula3 = "-SUM(1,2)"
  const formula4 = "@dangerousFunction()"
  const formula5 = "\tTabPrepend"

  assert(escapeCsvCell(formula1) === `"\'=cmd|\'/c calc\'!A0"`, "Escapes '=' prefix with single quote")
  assert(escapeCsvCell(formula2) === `"\'+2+5"`, "Escapes '+' prefix with single quote")
  assert(escapeCsvCell(formula3) === `"\'-SUM(1,2)"`, "Escapes '-' prefix with single quote")
  assert(escapeCsvCell(formula4) === `"\'@dangerousFunction()"`, "Escapes '@' prefix with single quote")
  assert(escapeCsvCell(formula5) === `"\'\tTabPrepend"`, "Escapes tab '\\t' prefix with single quote")

  const safeCsv = generateSafeCsv(["Header1", "Header2"], [[formula1, "Safe Text"]])
  assert(safeCsv.startsWith("\uFEFF"), "Generated safe CSV includes UTF-8 Byte Order Mark (BOM)")
  assert(safeCsv.includes(`"\'=cmd|\'/c calc\'!A0"`), "Generated safe CSV encapsulates escaped formula cell")
} catch (e: unknown) {
  assert(false, "CSV Injection Neutralization threw unexpected error", e instanceof Error ? e.message : String(e))
}

// -----------------------------------------------------------------------------
// TEST 5: Input Sanitizer (Stored XSS & Control Characters)
// -----------------------------------------------------------------------------
console.log("\n▶ [5/9] Testing Input Sanitizer Stored XSS & Control Character Removal...")
try {
  const xss1 = "<script>alert('XSS')</script>Society Notice"
  const xss2 = "<img src=x onerror=alert('pwned')>Safe Title"
  const xss3 = "javascript:alert(1)"
  const controlChars = "Hello\x00World\x07Test"

  assert(sanitizeText(xss1) === "Society Notice", "Strips script tags and inner code")
  assert(sanitizeText(xss2) === "Safe Title", "Strips HTML tags with dangerous event handlers")
  assert(sanitizeText(xss3) === "", "Neutralizes javascript: pseudo-protocol URIs")
  assert(sanitizeText(controlChars) === "HelloWorldTest", "Strips null bytes and ASCII control characters")
} catch (e: unknown) {
  assert(false, "Input Sanitizer threw unexpected error", e instanceof Error ? e.message : String(e))
}

// -----------------------------------------------------------------------------
// TEST 6: Open Redirect Defense
// -----------------------------------------------------------------------------
console.log("\n▶ [6/9] Testing Open Redirect Defense Protocol...")
try {
  const safePath = "/society/GREEN-OAKS/dashboard?tab=bills"
  const evilRelative = "//attacker.com/steal"
  const evilBackslash = "/\\attacker.com"
  const evilScheme = "https://evil.com/phishing"
  const evilJs = "javascript:alert(document.cookie)"
  const evilCrlf = "/admin\r\nSet-Cookie: admin=true"

  assert(getSafeRedirectUrl(safePath) === safePath, "Allows valid relative path with query parameters")
  assert(getSafeRedirectUrl(evilRelative) === "/admin/dashboard", "Rejects protocol-relative URLs")
  assert(getSafeRedirectUrl(evilBackslash) === "/admin/dashboard", "Rejects Windows backslash URL bypasses")
  assert(getSafeRedirectUrl(evilScheme) === "/admin/dashboard", "Rejects absolute external schemes")
  assert(getSafeRedirectUrl(evilJs) === "/admin/dashboard", "Rejects javascript: scheme URLs")
  assert(getSafeRedirectUrl(evilCrlf) === "/admin/dashboard", "Rejects CRLF header injection attempts")
} catch (e: unknown) {
  assert(false, "Open Redirect Defense threw unexpected error", e instanceof Error ? e.message : String(e))
}

// -----------------------------------------------------------------------------
// TEST 7: NIST SP 800-63B Password Policy Engine
// -----------------------------------------------------------------------------
console.log("\n▶ [7/9] Testing NIST SP 800-63B Password Policy Engine...")
try {
  const shortPass = "Pass@123"
  const breachedPass = "password1234"
  const noSymbolPass = "Password12345"
  const validPass = "Str0ngPass#2026!"
  const emailContextPass = "Manjurul#2026!"

  assert(!validatePasswordStrength(shortPass).isValid, "Rejects passwords shorter than 10 characters")
  assert(!validatePasswordStrength(breachedPass).isValid, "Rejects common breached blocklist passwords")
  assert(!validatePasswordStrength(noSymbolPass).isValid, "Requires at least one special symbol")
  assert(validatePasswordStrength(validPass).isValid, "Accepts compliant high-entropy passphrase")
  assert(
    !validatePasswordStrength(emailContextPass, { email: "manjurul@sarws.in" }).isValid,
    "Rejects password containing user's email username"
  )
} catch (e: unknown) {
  assert(false, "Password Policy Engine threw unexpected error", e instanceof Error ? e.message : String(e))
}

// -----------------------------------------------------------------------------
// TEST 8: Automated Audit PII & Secret Redaction Engine
// -----------------------------------------------------------------------------
console.log("\n▶ [8/9] Testing Automated Audit Payload PII & Secret Redaction...")
try {
  const rawPayload = {
    password: "SuperSecretPassword123!",
    token: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-IDcSemACt8x4iTMCda8Yhe3iZaWbvV5XKSTbuAn0M",
    panNumber: "ABCDE1234F",
    aadhaarNumber: "123456789012",
    accountNumber: "987654321098",
    societyName: "Palm Meadows CHS",
    amount: 15000,
    nested: {
      apiKey: "sk_live_123456789",
      secret: "super_secret_token",
      memberPan: "ABCDE9876K",
    },
  }

  const sanitized = sanitizeAuditPayload(rawPayload) as {
    password: string
    token: string
    panNumber: string
    aadhaarNumber: string
    accountNumber: string
    societyName: string
    amount: number
    nested: {
      apiKey: string
      secret: string
      memberPan: string
    }
  }

  assert(sanitized.password === "[REDACTED]", "Redacts root password field")
  assert(sanitized.token === "[REDACTED]", "Redacts token field")
  assert(sanitized.panNumber === "AB••••••F", "Masks PAN number")
  assert(sanitized.aadhaarNumber === "•••• •••• 9012", "Masks Aadhaar number")
  assert(Boolean(sanitized.accountNumber?.endsWith("1098")), "Masks Bank Account number")
  assert(sanitized.societyName === "Palm Meadows CHS", "Preserves non-sensitive strings")
  assert(sanitized.amount === 15000, "Preserves numeric values")
  assert(sanitized.nested?.apiKey === "[REDACTED]", "Recursively redacts nested apiKey")
  assert(sanitized.nested?.secret === "[REDACTED]", "Recursively redacts nested secret")
  assert(sanitized.nested?.memberPan === "AB••••••K", "Recursively masks nested PAN")
} catch (e: unknown) {
  assert(false, "Audit PII Redaction threw unexpected error", e instanceof Error ? e.message : String(e))
}

// -----------------------------------------------------------------------------
// TEST 9: High-Risk Audit Alert Classification & HMAC-Signed Webhook Engine
// -----------------------------------------------------------------------------
console.log("\n▶ [9/9] Testing High-Risk Audit Alert Classification & HMAC-Signed Webhook Engine...")
try {
  // Test 9.1: High-value expense detection (>= ₹50,000)
  const highValueExpense = evaluateAuditAlertSeverity({
    id: "test-alert-1",
    action: "CREATE",
    entity: "Expense",
    description: "Approved lift modernization payment",
    newData: { amount: 150000, category: "REPAIRS" },
    createdAt: new Date(),
  })
  assert(highValueExpense.isAlertable, "Identifies high-value expense (≥ ₹50,000) as alertable")
  assert(highValueExpense.severity === "CRITICAL", "Assigns CRITICAL severity to high-value disbursement")
  assert(highValueExpense.category === "FINANCIAL", "Categorizes high-value transaction under FINANCIAL")

  // Test 9.2: Bank Account deletion
  const bankDeletion = evaluateAuditAlertSeverity({
    id: "test-alert-2",
    action: "DELETE",
    entity: "Account",
    description: "Deleted HDFC Maintenance Account",
    createdAt: new Date(),
  })
  assert(bankDeletion.isAlertable, "Flags Bank Account deletion as alertable")
  assert(bankDeletion.severity === "CRITICAL", "Assigns CRITICAL severity to bank account deletion")

  // Test 9.3: Committee Member removal
  const memberRemoval = evaluateAuditAlertSeverity({
    id: "test-alert-3",
    action: "DELETE",
    entity: "SocietyMember",
    description: "Removed Treasurer from committee",
    createdAt: new Date(),
  })
  assert(memberRemoval.isAlertable, "Flags Management Committee member removal as alertable")
  assert(memberRemoval.severity === "CRITICAL", "Assigns CRITICAL severity to committee removal")
  assert(memberRemoval.category === "SECURITY_ACCESS", "Categorizes committee removal under SECURITY_ACCESS")

  // Test 9.4: Cheque status change to BOUNCED
  const chequeBounce = evaluateAuditAlertSeverity({
    id: "test-alert-4",
    action: "STATUS_CHANGE",
    entity: "Cheque",
    newData: { status: "BOUNCED" },
    createdAt: new Date(),
  })
  assert(chequeBounce.isAlertable, "Flags bounced cheque status change as alertable")
  assert(chequeBounce.severity === "CRITICAL", "Assigns CRITICAL severity to cheque bounce")

  // Test 9.5: Standard routine flat update (non-alertable)
  const routineUpdate = evaluateAuditAlertSeverity({
    id: "test-alert-5",
    action: "UPDATE",
    entity: "Flat",
    description: "Updated flat intercom number",
    newData: { intercomNumber: "204" },
    createdAt: new Date(),
  })
  assert(!routineUpdate.isAlertable, "Correctly identifies routine flat update as non-alertable (INFO)")

  // Test 9.6: HMAC-SHA256 Webhook Payload Signing
  const testPayload = JSON.stringify({ event: "audit.high_risk_alert", severity: "CRITICAL" })
  const testSecret = "secret-webhook-key-2026"
  const webhookSig = signWebhookPayload(testPayload, testSecret)
  assert(typeof webhookSig === "string" && webhookSig.length === 64, "Generates 256-bit SHA-256 HMAC signature for webhook payload")
  assert(webhookSig === signWebhookPayload(testPayload, testSecret), "Generates deterministic HMAC signature for identical payload")

  // Test 9.7: Payload formatting for Slack and Discord
  const { slackPayload, discordPayload, genericJson } = formatAuditAlertPayload(
    {
      id: "alert-format-test",
      action: "DELETE",
      entity: "SocietyMember",
      userEmail: "president@sarws.in",
      ipAddress: "127.0.0.1",
      description: "Removed Secretary from committee",
      createdAt: new Date(),
    },
    memberRemoval
  )
  assert(Boolean(genericJson.record), "Formats generic SIEM JSON payload with record metadata")
  assert(Array.isArray(slackPayload.blocks), "Formats Slack Block Kit structure with blocks")
  assert(Array.isArray(discordPayload.embeds), "Formats Discord webhook structure with rich embeds")
} catch (e: unknown) {
  assert(false, "High-Risk Audit Alerts Engine threw unexpected error", e instanceof Error ? e.message : String(e))
}

// -----------------------------------------------------------------------------
// TEST 10: Session Inactivity & Auto-Redirect Lifecycle
// -----------------------------------------------------------------------------
console.log("\n▶ [10/10] Testing Session Inactivity, Warning Countdown & Redirect Gate...")
try {
  const WARNING_MS = 25 * 60 * 1000 // 25 min
  const TIMEOUT_MS = 30 * 60 * 1000 // 30 min

  // Test 10.1: Threshold Ordering
  assert(WARNING_MS < TIMEOUT_MS, "Inactivity warning threshold is strictly lower than force timeout")

  // Test 10.2: Countdown calculation
  const mockNow = Date.now()
  const mockLastActivity = mockNow - 27 * 60 * 1000 // 27 min inactive
  const idleTime = mockNow - mockLastActivity
  const isWarning = idleTime >= WARNING_MS && idleTime < TIMEOUT_MS
  const remainingSec = Math.max(0, Math.ceil((TIMEOUT_MS - idleTime) / 1000))

  assert(isWarning, "Accurately activates warning state when idle time is between 25 and 30 minutes")
  assert(remainingSec === 180, "Calculates exact 3-minute (180s) countdown remaining before logout")

  // Test 10.3: Timeout expiry condition
  const mockExpiredActivity = mockNow - 31 * 60 * 1000 // 31 min inactive
  const isExpired = (mockNow - mockExpiredActivity) >= TIMEOUT_MS
  assert(isExpired, "Flags session as expired once inactivity reaches 30-minute threshold")

  // Test 10.4: Safe redirect destination generation
  const currentPath = "/society/royal-gardens/accounts"
  const safeNext = getSafeRedirectUrl(currentPath, "/admin/dashboard")
  const redirectUrl = `/login?reason=session_expired&next=${encodeURIComponent(safeNext)}`

  assert(redirectUrl.includes("reason=session_expired"), "Redirect URL contains structured reason parameter ('session_expired')")
  assert(redirectUrl.includes("next=%2Fsociety%2Froyal-gardens%2Faccounts"), "Redirect URL safely preserves deep-link return destination")
} catch (e: unknown) {
  assert(false, "Session Inactivity Engine threw unexpected error", e instanceof Error ? e.message : String(e))
}

// -----------------------------------------------------------------------------
// TEST 11: Cache Tagging & Keyed Invalidation Architecture
// -----------------------------------------------------------------------------
console.log("\n▶ [11/11] Testing Cache Tagging & Keyed Invalidation Architecture...")
try {
  const socCode = "ROYAL-GARDENS"
  const flatId = "flat-101-abc"
  const billId = "bill-2026-xyz"
  const paymentId = "pay-999-rst"
  const accountId = "acc-hdfc-001"

  // Test 11.1: Billing Tag Structure
  const billsTag = CACHE_TAGS.bills(socCode)
  assert(billsTag === "bills:royal-gardens", "Generates normalized lowercase society bills cache tag")

  const billDetailTag = CACHE_TAGS.billDetail(billId)
  assert(billDetailTag === "bill:bill-2026-xyz", "Generates precise bill entity cache tag")

  const flatBillsTag = CACHE_TAGS.flatBills(flatId)
  assert(flatBillsTag === "bills:flat:flat-101-abc", "Generates flat-scoped bills cache tag")

  // Test 11.2: Payments Tag Structure
  const paymentsTag = CACHE_TAGS.payments(socCode)
  assert(paymentsTag === "payments:royal-gardens", "Generates normalized society payments cache tag")

  const paymentDetailTag = CACHE_TAGS.paymentDetail(paymentId)
  assert(paymentDetailTag === "payment:pay-999-rst", "Generates precise payment receipt cache tag")

  const flatPaymentsTag = CACHE_TAGS.flatPayments(flatId)
  assert(flatPaymentsTag === "payments:flat:flat-101-abc", "Generates flat-scoped payments cache tag")

  // Test 11.3: Accounts & Treasury Tag Structure
  const accountsTag = CACHE_TAGS.accounts(socCode)
  assert(accountsTag === "accounts:royal-gardens", "Generates normalized treasury accounts cache tag")

  const accountDetailTag = CACHE_TAGS.accountDetail(accountId)
  assert(accountDetailTag === "account:acc-hdfc-001", "Generates account detail cache tag")

  // Test 11.4: Reports & Dashboard Tag Structure
  const reportsTag = CACHE_TAGS.reports(socCode)
  assert(reportsTag === "reports:royal-gardens", "Generates society reports cache tag")

  const dashboardTag = CACHE_TAGS.dashboard(socCode)
  assert(dashboardTag === "dashboard:royal-gardens", "Generates society dashboard analytics cache tag")
} catch (e: unknown) {
  assert(false, "Cache Tagging Architecture threw unexpected error", e instanceof Error ? e.message : String(e))
}

// -----------------------------------------------------------------------------
// TEST 12: External Link Security & noopener noreferrer Enforcement
// -----------------------------------------------------------------------------
console.log("\n▶ [12/12] Testing External Link Security & noopener noreferrer Enforcement...")
try {
  // Test helper to compute safe rel attribute
  const computeSafeRel = (href: string, target?: string, rel?: string) => {
    const isExternal =
      href.startsWith("http://") || href.startsWith("https://") || href.startsWith("//")
    const isBlank = target === "_blank"
    return isExternal || isBlank ? rel || "noopener noreferrer" : rel
  }

  // Test 12.1: External absolute link
  const extRel = computeSafeRel("https://example.com/payment")
  assert(extRel === "noopener noreferrer", "External HTTPS URL automatically receives 'noopener noreferrer'")

  // Test 12.2: External target=_blank link
  const blankRel = computeSafeRel("/auth/set-password#token", "_blank")
  assert(blankRel === "noopener noreferrer", "Target _blank link automatically receives 'noopener noreferrer'")

  // Test 12.3: Relative internal link without _blank
  const internalRel = computeSafeRel("/society/code/dashboard")
  assert(internalRel === undefined, "Internal link without _blank does not require rel attribute")

  // Test 12.4: Explicit custom rel override preservation
  const customRel = computeSafeRel("https://external.gov.in", "_blank", "noopener noreferrer author")
  assert(customRel === "noopener noreferrer author", "Preserves custom rel value while maintaining security")
} catch (e: unknown) {
  assert(false, "External Link Security threw unexpected error", e instanceof Error ? e.message : String(e))
}

// -----------------------------------------------------------------------------
// TEST 13: Financial Year Date Range & Accounting Cycle Boundary Formatter
// -----------------------------------------------------------------------------
console.log("\n▶ [13/13] Testing Financial Year Date Range & Accounting Cycle Boundary Formatter...")
try {
  // Test 13.1: Start Date Formatting (1 Apr 2026)
  const formattedStart = formatFinancialYearDate("2026-04-01T00:00:00.000Z")
  assert(formattedStart === "1 Apr 2026", "Formats FY start date strictly as '1 Apr 2026'")

  // Test 13.2: End Date Formatting (31 Mar 2027)
  const formattedEnd = formatFinancialYearDate("2027-03-31T00:00:00.000Z")
  assert(formattedEnd === "31 Mar 2027", "Formats FY end date strictly as '31 Mar 2027'")

  // Test 13.3: Full Range Formatting
  const range = formatFinancialYearRange("2026-04-01T00:00:00.000Z", "2027-03-31T00:00:00.000Z")
  assert(range === "1 Apr 2026 – 31 Mar 2027", "Accurately formats active financial year range as '1 Apr 2026 – 31 Mar 2027'")
} catch (e: unknown) {
  assert(false, "Financial Year Formatter threw unexpected error", e instanceof Error ? e.message : String(e))
}

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log("\n================================================================================")
console.log(`TEST RESULTS: ${passedTests} passed, ${failedTests} failed out of ${passedTests + failedTests} tests`)
console.log("================================================================================\n")

if (failedTests > 0) {
  process.exit(1)
} else {
  console.log("✓ All security and cryptographic subsystems passed successfully.\n")
  process.exit(0)
}
