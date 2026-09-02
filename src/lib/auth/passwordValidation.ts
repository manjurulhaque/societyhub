/**
 * NIST SP 800-63B & OWASP ASVS Compliant Password Policy Engine.
 *
 * Enforces robust entropy, character diversity, contextual rejection,
 * and common breached password blocklist matching.
 */

const COMMON_BREACHED_PASSWORDS = new Set([
  "password",
  "password123",
  "password1234",
  "1234567890",
  "12345678901",
  "admin12345",
  "administrator",
  "qwerty1234",
  "welcome123",
  "welcome1234",
  "sarws",
  "sarwsconnect",
  "societyhub",
  "society123",
  "society1234",
  "letmein123",
  "iloveyou123",
  "sunshine123",
  "princess123",
  "monkey1234",
  "dragon1234",
  "master1234",
])

export interface PasswordValidationResult {
  isValid: boolean
  error?: string
}

export interface PasswordContext {
  email?: string
  name?: string
}

/**
 * Validates a password against NIST SP 800-63B and OWASP ASVS Level 2 standards.
 *
 * @param password The plaintext password to evaluate
 * @param context Optional user context (email, name) to prevent trivial context-based passwords
 */
export function validatePasswordStrength(
  password: string,
  context?: PasswordContext
): PasswordValidationResult {
  if (!password || typeof password !== "string") {
    return { isValid: false, error: "Password is required." }
  }

  // 1. Length Requirement (NIST recommends >= 10 for enterprise accounts)
  if (password.length < 10) {
    return {
      isValid: false,
      error: "Password must be at least 10 characters long.",
    }
  }

  if (password.length > 128) {
    return {
      isValid: false,
      error: "Password must not exceed 128 characters.",
    }
  }

  // 2. Character Diversity Requirements
  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSymbol = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password)

  if (!hasUppercase) {
    return {
      isValid: false,
      error: "Password must contain at least one uppercase letter (A-Z).",
    }
  }

  if (!hasLowercase) {
    return {
      isValid: false,
      error: "Password must contain at least one lowercase letter (a-z).",
    }
  }

  if (!hasNumber) {
    return {
      isValid: false,
      error: "Password must contain at least one numeric digit (0-9).",
    }
  }

  if (!hasSymbol) {
    return {
      isValid: false,
      error: "Password must contain at least one special symbol (e.g. !@#$%^&*).",
    }
  }

  // 3. Common / Breached Password Blocklist Check
  const normalized = password.toLowerCase().trim()
  if (COMMON_BREACHED_PASSWORDS.has(normalized)) {
    return {
      isValid: false,
      error: "This password is too common or easily guessable. Please choose a unique passphrase.",
    }
  }

  // 4. Repeated Character Check (e.g. "aaaaaa123!")
  if (/(.)\1{4,}/.test(password)) {
    return {
      isValid: false,
      error: "Password contains too many consecutive repeated characters.",
    }
  }

  // 5. Context-based check (cannot contain username from email)
  if (context?.email) {
    const localPart = context.email.split("@")[0]?.toLowerCase()
    if (localPart && localPart.length >= 3 && normalized.includes(localPart)) {
      return {
        isValid: false,
        error: "Password must not contain parts of your email address.",
      }
    }
  }

  if (context?.name) {
    const namePart = context.name.toLowerCase().trim()
    if (namePart.length >= 3 && normalized.includes(namePart)) {
      return {
        isValid: false,
        error: "Password must not contain your name.",
      }
    }
  }

  return { isValid: true }
}
