"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  AdminCard,
  AdminInput,
  AdminButton,
  AdminBadge,
  AdminAlert,
} from "@/components/admin"

type ProfileSettingsFormProps = {
  initialUser: {
    id: string
    email: string
    appRole: string
    createdAt: string
    updatedAt: string
  }
}

export function ProfileSettingsForm({ initialUser }: ProfileSettingsFormProps) {
  const router = useRouter()

  // Email form state
  const [currentEmail, setCurrentEmail] = useState(initialUser.email)
  const [newEmail, setNewEmail] = useState("")
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)

  // Password form state
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  async function handleEmailUpdate(e: React.FormEvent) {
    e.preventDefault()
    setEmailLoading(true)
    setEmailSuccess(null)
    setEmailError(null)

    try {
      const res = await fetch("/api/auth/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_email",
          newEmail: newEmail.trim().toLowerCase(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setEmailError(data.error || "Failed to update email address.")
        setEmailLoading(false)
        return
      }

      setCurrentEmail(newEmail.trim().toLowerCase())
      setNewEmail("")
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

  async function handlePasswordUpdate(e: React.FormEvent) {
    e.preventDefault()
    setPasswordLoading(true)
    setPasswordSuccess(null)
    setPasswordError(null)

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters long.")
      setPasswordLoading(false)
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match. Please re-type.")
      setPasswordLoading(false)
      return
    }

    try {
      const res = await fetch("/api/auth/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_password",
          newPassword,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setPasswordError(data.error || "Failed to update password.")
        setPasswordLoading(false)
        return
      }

      setNewPassword("")
      setConfirmPassword("")
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
              {new Date(initialUser.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      </AdminCard>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Change Email Card */}
        <AdminCard
          title="Change Email Address"
          description="Update the email address used for login and notifications"
        >
          <form onSubmit={handleEmailUpdate} className="space-y-4">
            {emailSuccess ? (
              <AdminAlert variant="success">{emailSuccess}</AdminAlert>
            ) : null}

            {emailError ? (
              <AdminAlert variant="danger">{emailError}</AdminAlert>
            ) : null}

            <div>
              <label
                htmlFor="newEmail"
                className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5"
              >
                New Email Address
              </label>
              <AdminInput
                id="newEmail"
                type="email"
                required
                placeholder="new.email@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>

            <div className="pt-2">
              <AdminButton
                type="submit"
                variant="primary"
                isLoading={emailLoading}
                disabled={!newEmail || emailLoading}
              >
                {emailLoading ? "Updating..." : "Update Email Address"}
              </AdminButton>
            </div>
          </form>
        </AdminCard>

        {/* Change Password Card */}
        <AdminCard
          title="Change Password"
          description="Ensure your account stays secure by using a strong password"
        >
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            {passwordSuccess ? (
              <AdminAlert variant="success">{passwordSuccess}</AdminAlert>
            ) : null}

            {passwordError ? (
              <AdminAlert variant="danger">{passwordError}</AdminAlert>
            ) : null}

            <div>
              <label
                htmlFor="newPassword"
                className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5"
              >
                New Password
              </label>
              <AdminInput
                id="newPassword"
                type="password"
                required
                placeholder="Minimum 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5"
              >
                Confirm New Password
              </label>
              <AdminInput
                id="confirmPassword"
                type="password"
                required
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <div className="pt-2">
              <AdminButton
                type="submit"
                variant="primary"
                isLoading={passwordLoading}
                disabled={!newPassword || !confirmPassword || passwordLoading}
              >
                {passwordLoading ? "Updating..." : "Update Password"}
              </AdminButton>
            </div>
          </form>
        </AdminCard>
      </div>
    </div>
  )
}
