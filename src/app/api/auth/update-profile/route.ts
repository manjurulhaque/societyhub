import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/getCurrentUser"
import { createAdminClient } from "@/lib/supabase/admin"
import { prisma } from "@/lib/prisma"
import { checkRateLimit } from "@/lib/rateLimit"
import { recordAuditLog } from "@/lib/audit"
import { updateEmailSchema, updatePasswordSchema } from "@/lib/validations/auth"

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || !currentUser.supabaseUser) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in first." },
        { status: 401 }
      )
    }

    // Rate limiting: max 5 requests per 5 minutes per user
    const rateLimit = checkRateLimit(`profile-update:${currentUser.id}`, {
      maxRequests: 5,
      windowSeconds: 300,
    })

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Too many profile update requests. Please wait ${rateLimit.retryAfterSeconds} seconds before trying again.`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds ?? 60),
          },
        }
      )
    }

    const body = await req.json()
    const { action } = body

    const supabaseAdmin = createAdminClient()

    // 1. UPDATE EMAIL
    if (action === "update_email") {
      const parsed = updateEmailSchema.safeParse({ newEmail: body.newEmail })
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message || "Please provide a valid email address." },
          { status: 400 }
        )
      }

      const newEmail = parsed.data.newEmail.toLowerCase().trim()

      if (newEmail === currentUser.email.toLowerCase()) {
        return NextResponse.json(
          { error: "New email must be different from current email." },
          { status: 400 }
        )
      }

      // Check if email is already taken by another database user
      const existingUser = await prisma.user.findFirst({
        where: {
          email: {
            equals: newEmail,
            mode: "insensitive",
          },
          id: {
            not: currentUser.id,
          },
        },
      })

      if (existingUser) {
        return NextResponse.json(
          { error: "This email address is already in use by another account." },
          { status: 400 }
        )
      }

      // Update Supabase Auth user
      const { error: supabaseError } =
        await supabaseAdmin.auth.admin.updateUserById(
          currentUser.supabaseUser.id,
          {
            email: newEmail,
            email_confirm: true,
          }
        )

      if (supabaseError) {
        return NextResponse.json(
          { error: supabaseError.message },
          { status: 500 }
        )
      }

      // Update Prisma PostgreSQL Database user
      const updatedDbUser = await prisma.user.update({
        where: { id: currentUser.id },
        data: { email: newEmail },
        select: {
          id: true,
          email: true,
          appRole: true,
          updatedAt: true,
        },
      })

      await recordAuditLog({
        userId: currentUser.id,
        action: "UPDATE",
        entity: "User",
        entityId: currentUser.id,
        description: `User changed email from ${currentUser.email} to ${newEmail}`,
        oldData: { email: currentUser.email },
        newData: { email: newEmail },
      })

      return NextResponse.json({
        success: true,
        message: "Email address updated successfully.",
        user: updatedDbUser,
      })
    }

    // 2. UPDATE PASSWORD
    if (action === "update_password") {
      const parsed = updatePasswordSchema.safeParse({
        newPassword: body.newPassword,
        confirmPassword: body.confirmPassword ?? body.newPassword,
      })

      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message || "Password does not meet complexity requirements." },
          { status: 400 }
        )
      }

      const { newPassword } = parsed.data

      const { error: supabaseError } =
        await supabaseAdmin.auth.admin.updateUserById(
          currentUser.supabaseUser.id,
          {
            password: newPassword,
          }
        )

      if (supabaseError) {
        return NextResponse.json(
          { error: supabaseError.message },
          { status: 500 }
        )
      }

      await recordAuditLog({
        userId: currentUser.id,
        action: "UPDATE",
        entity: "User",
        entityId: currentUser.id,
        description: "User successfully updated their password",
      })

      return NextResponse.json({
        success: true,
        message: "Password updated successfully.",
      })
    }

    return NextResponse.json(
      { error: "Invalid action. Supported actions: update_email, update_password." },
      { status: 400 }
    )
  } catch (error) {
    console.error("Profile update error:", error)
    return NextResponse.json(
      { error: "Internal server error while updating profile." },
      { status: 500 }
    )
  }
}
