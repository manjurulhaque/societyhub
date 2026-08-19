/**
 * Input sanitization utilities for mitigating Stored Cross-Site Scripting (XSS),
 * HTML injection, and malicious unicode/control characters in user inputs.
 */

/**
 * Strips HTML tags, script vectors, javascript: protocols, and invisible control characters.
 */
export function sanitizeText(input: string | null | undefined): string {
  if (!input) return ""

  return (
    input
      // Remove null bytes and dangerous control characters (keep \r, \n, \t)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")

      // Strip HTML tags
      .replace(/<[^>]*>?/gm, "")
      // Strip javascript: pseudo-protocol
      .replace(/javascript:/gi, "")
      // Strip data: text/html protocols
      .replace(/data:text\/html/gi, "")
      .trim()
  )
}

/**
 * Escapes characters with special HTML meaning (&, <, >, ", ').
 */
export function escapeHtml(input: string | null | undefined): string {
  if (!input) return ""

  const htmlEntities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }

  return input.replace(/[&<>"']/g, (match) => htmlEntities[match] || match)
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
