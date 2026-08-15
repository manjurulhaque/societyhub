import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/getCurrentUser"
import { createAdminClient } from "@/lib/supabase/admin"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || !currentUser.supabaseUser) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in first." },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { action } = body

    const supabaseAdmin = createAdminClient()

    // 1. UPDATE EMAIL
    if (action === "update_email") {
      const newEmail = String(body.newEmail ?? "").trim().toLowerCase()

      if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        return NextResponse.json(
          { error: "Please provide a valid email address." },
          { status: 400 }
        )
      }

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

      return NextResponse.json({
        success: true,
        message: "Email address updated successfully.",
        user: updatedDbUser,
      })
    }

    // 2. UPDATE PASSWORD
    if (action === "update_password") {
      const newPassword = String(body.newPassword ?? "")

      if (!newPassword || newPassword.length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters long." },
          { status: 400 }
        )
      }

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
