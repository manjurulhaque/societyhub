/**
 * Input sanitization utilities for mitigating Stored Cross-Site Scripting (XSS),
 * HTML injection, and malicious unicode/control characters in user inputs.
 */

const DANGEROUS_CHARS_REGEX = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F<]|javascript:|data:/i

const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}

/**
 * Strips HTML tags, script vectors, javascript: protocols, and invisible control characters.
 * Includes fast-path check for clean plain text strings.
 */
export function sanitizeText(input: string | null | undefined): string {
  if (!input) return ""

  // Fast-path: return trimmed string if no control characters, HTML tags, or suspicious protocols exist
  if (!DANGEROUS_CHARS_REGEX.test(input)) {
    return input.trim()
  }

  return (
    input
      // Remove null bytes and dangerous control characters (keep \r, \n, \t)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")

      // Strip full <script>...</script> and <style>...</style> blocks with content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")

      // Strip remaining HTML tags
      .replace(/<[^>]*>?/gm, "")
      // Strip javascript: pseudo-protocol URIs
      .replace(/javascript:\S*/gi, "")
      // Strip data: text/html protocols
      .replace(/data:text\/html\S*/gi, "")
      .trim()
  )
}

/**
 * Escapes characters with special HTML meaning (&, <, >, ", ').
 */
export function escapeHtml(input: string | null | undefined): string {
  if (!input) return ""

  return input.replace(/[&<>"']/g, (match) => HTML_ENTITIES[match] || match)
}

/**
 * Recursively sanitizes all string properties in a record or object.
 */
export function sanitizeObject<T>(data: T): T {
  if (data === null || data === undefined) {
    return data
  }

  if (typeof data === "string") {
    return sanitizeText(data) as unknown as T
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeObject(item)) as unknown as T
  }

  if (typeof data === "object") {
    const sanitized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeObject(value)
    }
    return sanitized as T
  }

  return data
}
