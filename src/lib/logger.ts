export type LogLevel = "debug" | "info" | "warn" | "error"

export interface LogEntry {
  timestamp: string
  level: LogLevel
  action?: string
  message: string
  data?: Record<string, unknown>
  error?: {
    name: string
    message: string
    stack?: string
  }
}

class StructuredLogger {
  private formatLog(
    level: LogLevel,
    message: string,
    action?: string,
    meta?: Record<string, unknown>,
    err?: unknown
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    }

    if (action) entry.action = action
    if (meta && Object.keys(meta).length > 0) entry.data = meta

    if (err) {
      if (err instanceof Error) {
        entry.error = {
          name: err.name,
          message: err.message,
          stack: err.stack,
        }
      } else {
        entry.error = {
          name: "UnknownError",
          message: String(err),
        }
      }
    }

    return entry
  }

  private write(entry: LogEntry) {
    if (process.env.NODE_ENV === "production") {
      // In production, log single-line JSON for structured log aggregators
      const json = JSON.stringify(entry)
      if (entry.level === "error") {
        console.error(json)
      } else if (entry.level === "warn") {
        console.warn(json)
      } else {
        console.log(json)
      }
    } else {
      // In development / local testing, format clean readable output
      const prefix = `[${entry.timestamp.slice(11, 19)}] [${entry.level.toUpperCase()}]${entry.action ? ` [${entry.action}]` : ""}`
      if (entry.level === "error") {
        console.error(`${prefix} ${entry.message}`, entry.error?.message || entry.error || "", entry.data || "")
      } else if (entry.level === "warn") {
        console.warn(`${prefix} ${entry.message}`, entry.data || "")
      } else {
        console.log(`${prefix} ${entry.message}`, entry.data || "")
      }
    }
  }

  info(message: string, action?: string, data?: Record<string, unknown>) {
    this.write(this.formatLog("info", message, action, data))
  }

  warn(message: string, action?: string, data?: Record<string, unknown>) {
    this.write(this.formatLog("warn", message, action, data))
  }

  error(message: string, error?: unknown, action?: string, data?: Record<string, unknown>) {
    this.write(this.formatLog("error", message, action, data, error))
  }

  debug(message: string, action?: string, data?: Record<string, unknown>) {
    if (process.env.NODE_ENV !== "production" || process.env.DEBUG === "true") {
      this.write(this.formatLog("debug", message, action, data))
    }
  }

  /**
   * Creates a contextual logger with pre-bound action name
   */
  action(actionName: string) {
    return {
      info: (message: string, data?: Record<string, unknown>) => this.info(message, actionName, data),
      warn: (message: string, data?: Record<string, unknown>) => this.warn(message, actionName, data),
      error: (message: string, err?: unknown, data?: Record<string, unknown>) =>
        this.error(message, err, actionName, data),
      debug: (message: string, data?: Record<string, unknown>) => this.debug(message, actionName, data),
    }
  }
}

export const logger = new StructuredLogger()
