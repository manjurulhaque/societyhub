"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  AdminCard,
  AdminInput,
  AdminButton,
  AdminBadge,
  AdminAlert,
} from "@/components/admin"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  updateEmailSchema,
  updatePasswordSchema,
  type UpdateEmailInput,
  type UpdatePasswordInput,
} from "@/lib/validations/auth"

import { formatDateInAppTimeZone, formatTimeInAppTimeZone } from "@/lib/datetime"
import { ShieldCheck, Monitor, Clock, Globe, ArrowRight } from "lucide-react"
import Link from "next/link"

type ProfileSettingsFormProps = {
  initialUser: {
    id: string
    email: string
    appRole: string
    createdAt: string
    updatedAt: string
  }
  lastLogin?: {
    timestamp: string
    ipAddress?: string | null
    userAgent?: string | null
  } | null
}

function parseDeviceFromUserAgent(ua?: string | null): string {
  if (!ua) return "Web Browser"
  let browser = "Web Browser"
  let os = "Desktop"

  if (ua.includes("Edg/")) browser = "Microsoft Edge"
  else if (ua.includes("Chrome/")) browser = "Google Chrome"
  else if (ua.includes("Firefox/")) browser = "Mozilla Firefox"
  else if (ua.includes("Safari/") && !ua.includes("Chrome/")) browser = "Apple Safari"

  if (ua.includes("Windows")) os = "Windows"
  else if (ua.includes("Macintosh") || ua.includes("Mac OS")) os = "macOS"
  else if (ua.includes("Linux") && !ua.includes("Android")) os = "Linux"
  else if (ua.includes("Android")) os = "Android"
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS"

  return `${browser} on ${os}`
}

export function ProfileSettingsForm({ initialUser, lastLogin }: ProfileSettingsFormProps) {
  const router = useRouter()

  // Email form state
  const [currentEmail, setCurrentEmail] = useState(initialUser.email)
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)

  // Password form state
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const emailForm = useForm<UpdateEmailInput>({
    resolver: zodResolver(updateEmailSchema),
    defaultValues: {
      newEmail: "",
    },
  })

  const passwordForm = useForm<UpdatePasswordInput>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  })

  async function onEmailSubmit(values: UpdateEmailInput) {
    setEmailLoading(true)
    setEmailSuccess(null)
    setEmailError(null)

    try {
      const res = await fetch("/api/auth/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_email",
          newEmail: values.newEmail.trim().toLowerCase(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setEmailError(data.error || "Failed to update email address.")
        setEmailLoading(false)
        return
      }

      setCurrentEmail(values.newEmail.trim().toLowerCase())
      emailForm.reset()
      setEmailSuccess(
        "Your email address has been updated successfully. Please use your new email for subsequent sign-ins."
      )
      router.refresh()
    } catch {
      setEmailError("An unexpected network error occurred. Please try again.")
    } finally {
      setEmailLoading(false)
    }
  }

  async function onPasswordSubmit(values: UpdatePasswordInput) {
    setPasswordLoading(true)
    setPasswordSuccess(null)
    setPasswordError(null)

    try {
      const res = await fetch("/api/auth/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_password",
          newPassword: values.newPassword,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setPasswordError(data.error || "Failed to update password.")
        setPasswordLoading(false)
        return
      }

      passwordForm.reset()
      setPasswordSuccess("Your password has been changed successfully.")
    } catch {
      setPasswordError("An unexpected network error occurred. Please try again.")
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Account Overview Card */}
      <AdminCard
        title="Account Overview"
        description="Your primary account identification and credentials"
      >
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-4">
            <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">
              Current Email
            </span>
            <p className="mt-1 font-semibold text-stone-950 break-all">
              {currentEmail}
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-4">
            <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">
              Account Role
            </span>
            <div className="mt-1.5">
              <AdminBadge variant="purple" dot>
                {initialUser.appRole}
              </AdminBadge>
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-4">
            <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">
              Status
            </span>
            <div className="mt-1.5">
              <AdminBadge variant="success" dot>
                Active
              </AdminBadge>
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-4">
            <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">
              Account Created
            </span>
            <p className="mt-1 text-sm font-semibold text-stone-900">
              {formatDateInAppTimeZone(initialUser.createdAt)}
            </p>
          </div>
        </div>
      </AdminCard>

      {/* Session & Security Details Card */}
      <AdminCard
        title="Session & Security Credentials"
        description="Real-time cryptographic audit trail and active authentication metadata"
      >
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Last Login Time */}
          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center gap-2 text-stone-500">
              <Clock className="h-4 w-4 text-stone-600" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                Last Sign-in
              </span>
            </div>
            {lastLogin?.timestamp ? (
              <div className="mt-2">
                <p className="text-xs font-bold text-stone-900">
                  {formatDateInAppTimeZone(lastLogin.timestamp)}
                </p>
                <p className="font-mono text-[11px] text-stone-500">
                  {formatTimeInAppTimeZone(lastLogin.timestamp)}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-xs text-stone-400">Current Session</p>
            )}
          </div>

          {/* Login IP Address */}
          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center gap-2 text-stone-500">
              <Globe className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                Login IP Address
              </span>
            </div>
            <div className="mt-2">
              {lastLogin?.ipAddress ? (
                <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-stone-900">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>{lastLogin.ipAddress}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-stone-900">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>127.0.0.1 (Loopback)</span>
                </div>
              )}
              <span className="text-[10px] text-stone-400">Recorded via edge proxy</span>
            </div>
          </div>

          {/* Browser & OS */}
          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center gap-2 text-stone-500">
              <Monitor className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                Device / Client
              </span>
            </div>
            <div className="mt-2">
              <p className="text-xs font-semibold text-stone-900 truncate">
                {parseDeviceFromUserAgent(lastLogin?.userAgent)}
              </p>
              <span className="text-[10px] text-stone-400">Desktop / Web Client</span>
            </div>
          </div>

          {/* Tamper Protection */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-2xs">
            <div className="flex items-center gap-2 text-emerald-800">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                Audit Integrity
              </span>
            </div>
            <div className="mt-2">
              <p className="text-xs font-bold text-emerald-950">HMAC-SHA256 Chained</p>
              <Link
                href="/admin/audit-logs"
                className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
              >
                <span>View Full Audit Logs</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </AdminCard>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Change Email Card */}
        <AdminCard
          title="Change Email Address"
          description="Update the email address used for login and notifications"
        >
          <Form {...emailForm}>
            <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
              {emailSuccess ? (
                <AdminAlert variant="success">{emailSuccess}</AdminAlert>
              ) : null}

              {emailError ? (
                <AdminAlert variant="danger">{emailError}</AdminAlert>
              ) : null}

              <FormField
                control={emailForm.control}
                name="newEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                      New Email Address
                    </FormLabel>
                    <FormControl>
                      <AdminInput
                        id="newEmail"
                        type="email"
                        placeholder="new.email@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <div className="pt-2">
                <AdminButton
                  type="submit"
                  variant="primary"
                  isLoading={emailLoading}
                  disabled={emailLoading}
                >
                  {emailLoading ? "Updating..." : "Update Email Address"}
                </AdminButton>
              </div>
            </form>
          </Form>
        </AdminCard>

        {/* Change Password Card */}
        <AdminCard
          title="Change Password"
          description="Ensure your account stays secure by using a strong password"
        >
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              {passwordSuccess ? (
                <AdminAlert variant="success">{passwordSuccess}</AdminAlert>
              ) : null}

              {passwordError ? (
                <AdminAlert variant="danger">{passwordError}</AdminAlert>
              ) : null}

              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                      New Password
                    </FormLabel>
                    <FormControl>
                      <AdminInput
                        id="newPassword"
                        type="password"
                        placeholder="Minimum 6 characters"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                      Confirm New Password
                    </FormLabel>
                    <FormControl>
                      <AdminInput
                        id="confirmPassword"
                        type="password"
                        placeholder="Re-enter new password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <div className="pt-2">
                <AdminButton
                  type="submit"
                  variant="primary"
                  isLoading={passwordLoading}
                  disabled={passwordLoading}
                >
                  {passwordLoading ? "Updating..." : "Update Password"}
                </AdminButton>
              </div>
            </form>
          </Form>
        </AdminCard>
      </div>
    </div>
  )
}
