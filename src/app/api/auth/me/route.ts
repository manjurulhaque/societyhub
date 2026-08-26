import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/getCurrentUser"
import { recordAuditLog } from "@/lib/audit"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json(
      { authenticated: false },
      {
        status: 401,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" },
      }
    )
  }

  // Record LOGIN audit log if not logged in the last 60 seconds (throttled to avoid reload duplication)
  try {
    const recentLogin = await prisma.auditLog.findFirst({
      where: {
        userId: user.id,
        action: "LOGIN",
        createdAt: {
          gte: new Date(Date.now() - 60000),
        },
      },
      select: { id: true },
    })

    if (!recentLogin) {
      void recordAuditLog({
        action: "LOGIN",
        entity: "User",
        entityId: user.id,
        userId: user.id,
        societyId: user.memberships?.[0]?.societyId || null,
        description: `User ${user.email} signed in (${user.appRole})`,
      })
    }
  } catch {
    // Non-blocking
  }

  let redirectUrl = "/"
  if (user.appRole === "SUPER_ADMIN") {
    redirectUrl = "/admin/dashboard"
  } else if (user.memberships && user.memberships.length > 0) {
    const defaultSociety = user.memberships[0].society
    redirectUrl = defaultSociety.code
      ? `/society/${defaultSociety.code}/dashboard`
      : "/dashboard"
  } else {
    redirectUrl = "/dashboard"
  }

  return NextResponse.json(
    {
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        appRole: user.appRole,
        memberships: user.memberships,
      },
      redirectUrl,
    },
    {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" },
    }
  )
}

