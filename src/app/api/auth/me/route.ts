import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/getCurrentUser"

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

