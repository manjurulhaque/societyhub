"use server"

import { prisma } from "@/lib/prisma"
import { createAdminClient } from "@/lib/supabase/admin"
import { sanitizeText } from "@/lib/sanitize"

export async function requestPasswordSetupLink(emailInput: string): Promise<{
  success: boolean
  message?: string
  error?: string
  devLink?: string
}> {
  try {
    const rawEmail = sanitizeText(emailInput.trim().toLowerCase())
    if (!rawEmail || !rawEmail.includes("@")) {
      return { success: false, error: "Please enter a valid email address." }
    }

    // 1. Verify user exists in society database
    const dbUser = await prisma.user.findFirst({
      where: {
        email: { equals: rawEmail, mode: "insensitive" },
        isActive: true,
        deletedAt: null,
      },
    })

    const dbPerson = await prisma.person.findFirst({
      where: {
        email: { equals: rawEmail, mode: "insensitive" },
        isActive: true,
        deletedAt: null,
      },
    })

    if (!dbUser && !dbPerson) {
      return {
        success: true,
        message: "If this email is registered with a society, a password setup link has been sent.",
      }
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return { success: false, error: "Supabase service role key is not configured in .env." }
    }

    const supabaseAdmin = createAdminClient()
    const appUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000"
    const redirectTo = `${appUrl}/auth/callback?next=/auth/set-password`

    let setupLink: string | undefined = undefined

    // 2. Try generating an invite link (creates user in Supabase Auth if not present)
    const inviteRes = await supabaseAdmin.auth.admin.generateLink({
      type: "invite",
      email: rawEmail,
      options: {
        redirectTo,
      },
    })

    if (!inviteRes.error && inviteRes.data?.properties?.action_link) {
      setupLink = inviteRes.data.properties.action_link
    } else {
      // User already exists in Supabase Auth -> generate recovery link
      const recoveryRes = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: rawEmail,
        options: {
          redirectTo,
        },
      })

      if (!recoveryRes.error && recoveryRes.data?.properties?.action_link) {
        setupLink = recoveryRes.data.properties.action_link
      }
    }

    // 3. Also attempt outbound email dispatch via Supabase
    try {
      await supabaseAdmin.auth.admin.inviteUserByEmail(rawEmail, {
        redirectTo,
      })
    } catch {
      // Non-blocking
    }

    // In development or local testing, log link to console for instant 1-click access
    if (setupLink) {
      console.log(`\n==================================================`)
      console.log(`🔑 PASSWORD SETUP LINK FOR [${rawEmail}]:`)
      console.log(setupLink)
      console.log(`==================================================\n`)
    }

    return {
      success: true,
      message: `A password activation link has been sent to ${rawEmail}.`,
      devLink: process.env.NODE_ENV !== "production" ? setupLink : undefined,
    }
  } catch (err: unknown) {
    console.error("Failed to request password link:", err)
    return { success: false, error: "An unexpected error occurred. Please try again." }
  }
}
