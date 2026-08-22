/**
 * Open Redirect Defense Utility.
 *
 * Validates and sanitizes redirect destination paths to ensure all post-authentication
 * and navigation redirects are strictly restricted to safe relative local application paths.
 * Prevents phishing via Open Redirect (CWE-601).
 */

const DEFAULT_FALLBACK_PATH = "/admin/dashboard"

/**
 * Returns a sanitized safe relative redirect path, or the fallback path if unsafe.
 *
 * @param targetUrl Candidate redirect URL string (e.g., from searchParams `next` or `redirectTo`)
 * @param fallback Trusted default redirect destination if candidate is invalid/unsafe
 * @returns Safe relative pathname string (e.g. "/society/GREEN-OAKS/dashboard")
 */
export function getSafeRedirectUrl(
  targetUrl: string | null | undefined,
  fallback = DEFAULT_FALLBACK_PATH
): string {
  if (!targetUrl || typeof targetUrl !== "string") {
    return fallback
  }

  // Strictly reject CRLF injection attempts and null bytes
  if (/[\r\n\x00-\x1F\x7F]/.test(targetUrl)) {
    return fallback
  }

  const clean = targetUrl.trim()
  if (!clean) {
    return fallback
  }

  // Must strictly start with a single slash
  if (!clean.startsWith("/")) {
    return fallback
  }

  // Prevent protocol-relative URLs (e.g. "//evil.com")
  if (clean.startsWith("//")) {
    return fallback
  }

  // Prevent Windows backslash directory traversal / redirect bypasses (e.g. "/\evil.com" or "/%5Cevil.com")
  if (clean.startsWith("/\\") || clean.startsWith("\\") || clean.toLowerCase().includes("%5c")) {
    return fallback
  }

  // Reject URL scheme indicators anywhere in the string
  if (
    clean.includes("://") ||
    /^(javascript|data|vbscript|file|about|blob):/i.test(clean)
  ) {
    return fallback
  }

  try {
    // Validate with URL parser against dummy localhost origin
    const parsed = new URL(clean, "http://localhost")
    
    // Ensure origin is unchanged localhost and path remains safe relative
    if (parsed.origin !== "http://localhost") {
      return fallback
    }

    if (!parsed.pathname.startsWith("/") || parsed.pathname.startsWith("//")) {
      return fallback
    }

    // Preserve query and hash if present
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return fallback
  }
}
