import crypto from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12 // Standard 96-bit IV for AES-GCM
const AUTH_TAG_LENGTH = 16
const PREFIX = "enc:v1:"

let cachedKey: Buffer | null = null
let cachedSecret: string | null = null

/**
 * Derives a 32-byte encryption key from environment secrets.
 * Caches the derived Buffer in memory to avoid repetitive SHA-256 hashing.
 */
function getEncryptionKey(): Buffer {
  const secret =
    process.env.ENCRYPTION_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "societyhub-default-fallback-secret-key-32bytes"

  if (!cachedKey || cachedSecret !== secret) {
    cachedSecret = secret
    cachedKey = crypto.createHash("sha256").update(secret).digest()
  }

  return cachedKey
}

/**
 * Checks if a string value is an AES-256-GCM encrypted ciphertext.
 */
export function isEncrypted(value: string | null | undefined): boolean {
  if (!value || typeof value !== "string") return false
  return value.startsWith(PREFIX)
}

/**
 * Encrypts sensitive plain text into AES-256-GCM authenticated ciphertext.
 *
 * @param plainText The unencrypted string (e.g. Bank Account, PAN, Loan A/C)
 * @returns Ciphertext string in format `enc:v1:<iv_hex>:<tag_hex>:<ciphertext_hex>`
 */
export function encryptData(plainText: string | null | undefined): string {
  if (!plainText) return ""
  if (isEncrypted(plainText)) return plainText // Avoid double-encryption

  try {
    const key = getEncryptionKey()
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    })

    let encrypted = cipher.update(plainText, "utf8", "hex")
    encrypted += cipher.final("hex")
    const authTag = cipher.getAuthTag().toString("hex")

    return `${PREFIX}${iv.toString("hex")}:${authTag}:${encrypted}`
  } catch (error) {
    console.error("Encryption failure:", error)
    return plainText
  }
}

const DECRYPT_CACHE_MAX = 2000
const decryptCache = new Map<string, string>()

/**
 * Decrypts AES-256-GCM authenticated ciphertext back to original plain text.
 * Gracefully handles legacy unencrypted plaintext and utilizes an in-memory LRU cache for O(1) repeated lookups.
 *
 * @param cipherText Ciphertext or legacy plaintext
 * @returns Decrypted plain text
 */
export function decryptData(cipherText: string | null | undefined): string {
  if (!cipherText) return ""
  if (!isEncrypted(cipherText)) return cipherText // Backward compatible with plaintext

  const cached = decryptCache.get(cipherText)
  if (cached !== undefined) {
    return cached
  }

  try {
    const payload = cipherText.slice(PREFIX.length)
    const parts = payload.split(":")

    if (parts.length !== 3) {
      return cipherText
    }

    const [ivHex, tagHex, encryptedHex] = parts
    const key = getEncryptionKey()
    const iv = Buffer.from(ivHex, "hex")
    const authTag = Buffer.from(tagHex, "hex")

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    })
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encryptedHex, "hex", "utf8")
    decrypted += decipher.final("utf8")

    if (decryptCache.size >= DECRYPT_CACHE_MAX) {
      const firstKey = decryptCache.keys().next().value
      if (firstKey) decryptCache.delete(firstKey)
    }
    decryptCache.set(cipherText, decrypted)

    return decrypted
  } catch {
    // If decryption fails (e.g. tampered ciphertext or corrupted key), return safe placeholder
    return "••••••••"
  }
}
