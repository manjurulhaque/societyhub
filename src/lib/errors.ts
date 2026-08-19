/**
 * Production safe error message extractor.
 * Prevents leaking raw SQL schema details, table names, or internal stack traces
 * to clients in production while maintaining clear feedback for authorized exceptions.
 */

export function getSafeErrorMessage(error: unknown, fallback = "An unexpected error occurred. Please try again."): string {
  if (error instanceof Error) {
    // Custom auth guards are safe to display
    if (error.name === "UnauthorizedError" || error.name === "ForbiddenError") {
      return error.message
    }

    // In production, obfuscate internal Prisma / database constraint violations
    if (process.env.NODE_ENV === "production") {
      const msg = error.message.toLowerCase()
      const isInternalLeak =
        msg.includes("prisma") ||
        msg.includes("constraint") ||
        msg.includes("foreign key") ||
        msg.includes("unique constraint") ||
        msg.includes("column") ||
        msg.includes("table") ||
        msg.includes("query") ||
        msg.includes("select") ||
        msg.includes("syntax error")

      if (isInternalLeak) {
        return fallback
      }
    }

    return error.message || fallback
  }

  return fallback
}
