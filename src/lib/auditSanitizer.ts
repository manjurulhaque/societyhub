import { maskPan, maskAadhaar, maskBankAccount } from "@/lib/masking"

const SENSITIVE_KEY_REGEX = /(password|newPassword|currentPassword|confirmPassword|token|accessToken|refreshToken|secret|apiKey|api_key|pin|otp|authorization|credential|cookie|private_key|privateKey|cvv)/i
const PAN_KEY_REGEX = /(panNumber|pan|taxId|vendorPan|memberPan)/i
const AADHAAR_KEY_REGEX = /(aadhaarNumber|aadhaar|nationalId|memberAadhaar)/i
const ACCOUNT_KEY_REGEX = /(accountNumber|bankAccount|loanAccountNumber|account_number|mortgageAccount)/i

/**
 * Recursively scrubs Personally Identifiable Information (PII), secrets,
 * and high-sensitivity financial identifiers from audit log payloads before database persistence.
 *
 * Ensures compliance with Digital Personal Data Protection (DPDP) Act 2023 & GDPR.
 */
export function sanitizeAuditPayload(data: unknown, depth = 0): unknown {
  if (data === null || data === undefined) {
    return data
  }

  // Prevent circular references / excessive recursion
  if (depth > 8) {
    return "[MAX_DEPTH_EXCEEDED]"
  }

  if (typeof data === "string") {
    // Redact raw encrypted ciphertext strings in generic properties
    if (data.startsWith("enc:v1:")) {
      return "[ENCRYPTED]"
    }
    // Redact Bearer tokens / JWT strings
    if (data.startsWith("Bearer ") || /^eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}$/.test(data)) {
      return "[REDACTED_TOKEN]"
    }
    return data
  }

  if (typeof data === "number" || typeof data === "boolean") {
    return data
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeAuditPayload(item, depth + 1))
  }

  if (typeof data === "object") {
    const sanitizedObj: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (SENSITIVE_KEY_REGEX.test(key)) {
        sanitizedObj[key] = "[REDACTED]"
      } else if (PAN_KEY_REGEX.test(key) && typeof value === "string") {
        sanitizedObj[key] = maskPan(value)
      } else if (AADHAAR_KEY_REGEX.test(key) && typeof value === "string") {
        sanitizedObj[key] = maskAadhaar(value)
      } else if (ACCOUNT_KEY_REGEX.test(key) && typeof value === "string") {
        sanitizedObj[key] = maskBankAccount(value)
      } else {
        sanitizedObj[key] = sanitizeAuditPayload(value, depth + 1)
      }
    }
    return sanitizedObj
  }

  return String(data)
}
