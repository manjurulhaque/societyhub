import { decryptData } from "@/lib/crypto"

/**
 * Data masking utilities for protecting PII (Personally Identifiable Information)
 * and financial account identifiers across tabular views, logs, and reports.
 */

/**
 * Masks a bank account number, preserving only the last 4 digits.
 * Example: "123456789012" -> "••••••••9012"
 */
export function maskBankAccount(accountNumber: string | null | undefined): string {
  if (!accountNumber || accountNumber === "—") return "—"
  if (accountNumber.includes("••")) return accountNumber

  const decrypted = decryptData(accountNumber)
  const clean = decrypted.trim()
  if (clean.length <= 4) return "••••"
  const lastFour = clean.slice(-4)
  const maskedPrefix = "•".repeat(Math.max(clean.length - 4, 4))
  return `${maskedPrefix}${lastFour}`
}

/**
 * Masks an Indian Permanent Account Number (PAN), showing first 2 and last 1 character.
 * Example: "ABCDE1234F" -> "AB••••••F"
 */
export function maskPan(pan: string | null | undefined): string {
  if (!pan || pan === "—") return "—"
  if (pan.includes("••")) return pan

  const decrypted = decryptData(pan)
  const clean = decrypted.trim().toUpperCase()
  if (clean.length < 5) return "•••••"
  const prefix = clean.slice(0, 2)
  const suffix = clean.slice(-1)
  return `${prefix}••••••${suffix}`
}

/**
 * Masks a phone number, preserving the last 4 digits.
 * Example: "+919876543210" -> "••••••3210"
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone || phone === "—") return "—"
  if (phone.includes("••")) return phone

  const decrypted = decryptData(phone)
  const clean = decrypted.trim()
  if (clean.length <= 4) return "••••"
  const lastFour = clean.slice(-4)
  return `••••••${lastFour}`
}

/**
 * Masks an email address for privacy.
 * Example: "manjurul@sarws.in" -> "m••••••@sarws.in"
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email || email === "—") return "—"
  if (email.includes("••")) return email

  const decrypted = decryptData(email)
  const clean = decrypted.trim().toLowerCase()
  const atIndex = clean.indexOf("@")
  if (atIndex <= 1) return clean
  const localPart = clean.slice(0, atIndex)
  const domain = clean.slice(atIndex)
  const maskedLocal = `${localPart[0]}${"•".repeat(Math.min(localPart.length - 1, 5))}`
  return `${maskedLocal}${domain}`
}

/**
 * Masks a 12-digit Aadhaar number, showing only the last 4 digits.
 * Example: "123456789012" -> "•••• •••• 9012"
 */
export function maskAadhaar(aadhaar: string | null | undefined): string {
  if (!aadhaar || aadhaar === "—") return "—"
  if (aadhaar.includes("••")) return aadhaar

  const decrypted = decryptData(aadhaar)
  const clean = decrypted.replace(/\s+/g, "")
  if (clean.length <= 4) return "•••• •••• ••••"
  const lastFour = clean.slice(-4)
  return `•••• •••• ${lastFour}`
}

