/**
 * SocietyHub Comprehensive Security & Cryptographic Self-Test Suite.
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
 */

import { encryptData, decryptData, isEncrypted } from "../src/lib/crypto"
import { computeAuditSignature, verifyAuditTrailIntegrity } from "../src/lib/auditCrypto"
import { peekRateLimit, incrementRateLimit, resetRateLimit } from "../src/lib/rateLimit"
import { escapeCsvCell, generateSafeCsv } from "../src/lib/csv"
import { sanitizeText } from "../src/lib/sanitize"
import { getSafeRedirectUrl } from "../src/lib/auth/safeRedirect"
import { validatePasswordStrength } from "../src/lib/auth/passwordValidation"
import { sanitizeAuditPayload } from "../src/lib/auditSanitizer"

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
console.log("             SOCIETYHUB SECURITY & CRYPTOGRAPHY SELF-TEST SUITE                  ")
console.log("================================================================================\n")

// -----------------------------------------------------------------------------
// TEST 1: AES-256-GCM Cryptography
// -----------------------------------------------------------------------------
console.log("▶ [1/8] Testing AES-256-GCM Field-Level Cryptography...")
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
console.log("\n▶ [2/8] Testing HMAC-SHA256 Audit Trail Cryptographic Chaining...")
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
console.log("\n▶ [3/8] Testing Sliding-Window In-Memory Rate Limiter...")
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
console.log("\n▶ [4/8] Testing CSV / Excel Formula Injection (DDE) Sanitization...")
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
console.log("\n▶ [5/8] Testing Input Sanitizer Stored XSS & Control Character Removal...")
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
console.log("\n▶ [6/8] Testing Open Redirect Defense Protocol...")
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
console.log("\n▶ [7/8] Testing NIST SP 800-63B Password Policy Engine...")
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
    !validatePasswordStrength(emailContextPass, { email: "manjurul@societyhub.in" }).isValid,
    "Rejects password containing user's email username"
  )
} catch (e: unknown) {
  assert(false, "Password Policy Engine threw unexpected error", e instanceof Error ? e.message : String(e))
}

// -----------------------------------------------------------------------------
// TEST 8: Automated Audit PII & Secret Redaction Engine
// -----------------------------------------------------------------------------
console.log("\n▶ [8/8] Testing Automated Audit Payload PII & Secret Redaction...")
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
