import crypto from "crypto"
import type { AuditAction } from "@/generated/prisma/client"

export type AlertSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "INFO"

export interface AuditAlertContext {
  id: string
  action: AuditAction
  entity: string
  entityId?: string | null
  userId?: string | null
  userEmail?: string | null
  userRole?: string | null
  societyId?: string | null
  societyName?: string | null
  description?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  oldData?: unknown
  newData?: unknown
  createdAt: Date | string
}

export interface AuditAlertEvaluation {
  isAlertable: boolean
  severity: AlertSeverity
  category: "FINANCIAL" | "SECURITY_ACCESS" | "STATUTORY_GOVERNANCE" | "OPERATIONAL"
  reason: string
}

const HIGH_VALUE_FINANCIAL_THRESHOLD = 50000
const MEDIUM_VALUE_FINANCIAL_THRESHOLD = 10000

/**
 * Evaluates whether an audit log entry constitutes a High-Risk or Critical event.
 */
export function evaluateAuditAlertSeverity(log: AuditAlertContext): AuditAlertEvaluation {
  const { action, entity, oldData, newData, description } = log

  // 1. High-Value Financial Mutations
  const newAmount = typeof newData === "object" && newData !== null && "amount" in newData ? Number((newData as Record<string, unknown>).amount) : 0
  const oldAmount = typeof oldData === "object" && oldData !== null && "amount" in oldData ? Number((oldData as Record<string, unknown>).amount) : 0
  const maxAmount = Math.max(newAmount || 0, oldAmount || 0)

  if (["Expense", "Payment", "LedgerVoucher", "Bill"].includes(entity)) {
    if (maxAmount >= HIGH_VALUE_FINANCIAL_THRESHOLD) {
      return {
        isAlertable: true,
        severity: "CRITICAL",
        category: "FINANCIAL",
        reason: `High-value financial transaction of ₹${maxAmount.toLocaleString("en-IN")} on ${entity}`,
      }
    }
    if (maxAmount >= MEDIUM_VALUE_FINANCIAL_THRESHOLD) {
      return {
        isAlertable: true,
        severity: "HIGH",
        category: "FINANCIAL",
        reason: `Substantial financial transaction of ₹${maxAmount.toLocaleString("en-IN")} on ${entity}`,
      }
    }
  }

  // 2. Bank Account & Treasury Mutations
  if (entity === "Account") {
    if (action === "DELETE") {
      return {
        isAlertable: true,
        severity: "CRITICAL",
        category: "FINANCIAL",
        reason: "Bank Account / Ledger Head was DELETED",
      }
    }
    if (action === "UPDATE") {
      return {
        isAlertable: true,
        severity: "HIGH",
        category: "FINANCIAL",
        reason: "Bank Account details or IFSC was modified",
      }
    }
    if (action === "CREATE") {
      return {
        isAlertable: true,
        severity: "HIGH",
        category: "FINANCIAL",
        reason: "New Bank Account was added to society ledger",
      }
    }
  }

  // 3. Cheque Status Alerts (Bounced / Cancelled)
  if (entity === "Cheque" && action === "STATUS_CHANGE") {
    const status = (newData && typeof newData === "object" && "status" in newData) ? String((newData as Record<string, unknown>).status) : ""
    if (["BOUNCED", "CANCELLED", "REJECTED"].includes(status.toUpperCase())) {
      return {
        isAlertable: true,
        severity: "CRITICAL",
        category: "FINANCIAL",
        reason: `Cheque status flagged as ${status.toUpperCase()}`,
      }
    }
  }

  // 4. Committee Access & Role Privileges (Security & Governance)
  if (entity === "SocietyMember") {
    if (action === "DELETE") {
      return {
        isAlertable: true,
        severity: "CRITICAL",
        category: "SECURITY_ACCESS",
        reason: "Management Committee member was REMOVED",
      }
    }
    if (action === "CREATE") {
      return {
        isAlertable: true,
        severity: "HIGH",
        category: "SECURITY_ACCESS",
        reason: "New Management Committee member was provisioned",
      }
    }
  }

  if (["Role", "SocietyRole", "CustomRole"].includes(entity)) {
    return {
      isAlertable: true,
      severity: "HIGH",
      category: "SECURITY_ACCESS",
      reason: `Role definition or permission structure was ${action}D`,
    }
  }

  // 5. Society Settings & Statutory Bylaws Modification
  if (entity === "Society" && action === "UPDATE") {
    return {
      isAlertable: true,
      severity: "HIGH",
      category: "STATUTORY_GOVERNANCE",
      reason: "Society registration, tax identifiers, or bylaws were updated",
    }
  }

  // 6. Generic Deletions across any entity
  if (action === "DELETE") {
    return {
      isAlertable: true,
      severity: "MEDIUM",
      category: "OPERATIONAL",
      reason: `Record in ${entity} table was deleted`,
    }
  }

  // Description-based heuristic fallback (e.g. KYC revocation or critical remarks)
  if (description && /(tamper|breach|unauthorized|revoked|override)/i.test(description)) {
    return {
      isAlertable: true,
      severity: "HIGH",
      category: "SECURITY_ACCESS",
      reason: `Security-sensitive audit event: ${description}`,
    }
  }

  return {
    isAlertable: false,
    severity: "INFO",
    category: "OPERATIONAL",
    reason: "Standard operational mutation",
  }
}

/**
 * Signs an outbound webhook payload using HMAC-SHA256.
 */
export function signWebhookPayload(payloadString: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payloadString, "utf8").digest("hex")
}

/**
 * Formats standard JSON, Slack blocks, or Discord embed payloads for audit alerts.
 */
export function formatAuditAlertPayload(
  log: AuditAlertContext,
  evaluation: AuditAlertEvaluation
): {
  genericJson: Record<string, unknown>
  slackPayload: Record<string, unknown>
  discordPayload: Record<string, unknown>
} {
  const timestamp = typeof log.createdAt === "string" ? log.createdAt : log.createdAt.toISOString()
  const severityColors = {
    CRITICAL: 0xdc2626, // Red
    HIGH: 0xf59e0b,     // Amber
    MEDIUM: 0x3b82f6,   // Blue
    INFO: 0x10b981,     // Emerald
  }

  const genericJson = {
    event: "audit.high_risk_alert",
    severity: evaluation.severity,
    category: evaluation.category,
    reason: evaluation.reason,
    timestamp,
    record: {
      id: log.id,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId || null,
      societyId: log.societyId || null,
      description: log.description || null,
      actor: {
        userId: log.userId || null,
        userEmail: log.userEmail || null,
        ipAddress: log.ipAddress || null,
        userAgent: log.userAgent || null,
      },
      oldData: log.oldData || null,
      newData: log.newData || null,
    },
  }

  const slackPayload = {
    text: `⚠️ [${evaluation.severity}] SocietyHub High-Risk Audit Alert: ${evaluation.reason}`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `🚨 ${evaluation.severity} Audit Alert: ${evaluation.category}`,
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Reason:* ${evaluation.reason}\n*Action:* \`${log.action}\` on \`${log.entity}\`\n*Description:* ${log.description || "—"}`,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Operator:* ${log.userEmail || log.userId || "System"}`,
          },
          {
            type: "mrkdwn",
            text: `*IP Address:* \`${log.ipAddress || "Internal"}\``,
          },
          {
            type: "mrkdwn",
            text: `*Time:* ${timestamp}`,
          },
          {
            type: "mrkdwn",
            text: `*Audit ID:* \`${log.id.slice(0, 8)}...\``,
          },
        ],
      },
    ],
  }

  const discordPayload = {
    embeds: [
      {
        title: `🚨 ${evaluation.severity}: ${evaluation.reason}`,
        description: log.description || "High-risk audit activity recorded.",
        color: severityColors[evaluation.severity],
        fields: [
          { name: "Entity", value: `\`${log.entity}\``, inline: true },
          { name: "Action", value: `\`${log.action}\``, inline: true },
          { name: "Severity", value: evaluation.severity, inline: true },
          { name: "Operator", value: log.userEmail || "System", inline: true },
          { name: "IP Address", value: `\`${log.ipAddress || "Internal"}\``, inline: true },
          { name: "Audit ID", value: `\`${log.id}\``, inline: false },
        ],
        timestamp,
        footer: { text: "SocietyHub Cryptographic Audit Monitor" },
      },
    ],
  }

  return { genericJson, slackPayload, discordPayload }
}

/**
 * Asynchronously dispatches a high-risk audit alert webhook.
 * Non-blocking: will never throw, slow down, or block the calling thread.
 */
export async function dispatchAuditAlertWebhook(log: AuditAlertContext): Promise<void> {
  try {
    const webhookUrl =
      process.env.AUDIT_ALERT_WEBHOOK_URL ||
      process.env.ALERT_WEBHOOK_URL ||
      null

    if (!webhookUrl) {
      return
    }

    const evaluation = evaluateAuditAlertSeverity(log)
    if (!evaluation.isAlertable) {
      return
    }

    const { genericJson, slackPayload, discordPayload } = formatAuditAlertPayload(log, evaluation)
    const secret = process.env.AUDIT_ALERT_WEBHOOK_SECRET || process.env.AUDIT_SECRET_KEY || "societyhub-audit-alert-key"

    let bodyPayload: unknown = genericJson
    if (webhookUrl.includes("hooks.slack.com")) {
      bodyPayload = slackPayload
    } else if (webhookUrl.includes("discord.com/api/webhooks")) {
      bodyPayload = discordPayload
    }

    const payloadString = JSON.stringify(bodyPayload)
    const signature = signWebhookPayload(payloadString, secret)

    // Fire and forget with 5s timeout
    void fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-SocietyHub-Signature": `sha256=${signature}`,
        "X-SocietyHub-Event": "audit.high_risk_alert",
        "X-SocietyHub-Severity": evaluation.severity,
        "User-Agent": "SocietyHub-AuditAlert/1.0",
      },
      body: payloadString,
      signal: AbortSignal.timeout(5000),
    }).catch((err) => {
      console.warn("[AuditAlertWebhook] Webhook delivery failed:", err?.message || err)
    })
  } catch (error) {
    console.warn("[AuditAlertWebhook] Alert dispatch failed:", error)
  }
}
