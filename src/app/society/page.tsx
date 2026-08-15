import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth/getCurrentUser"
import { prisma } from "@/lib/prisma"

export default async function SocietyRootPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  if (user.appRole === "SUPER_ADMIN") {
    // If Super Admin, find the first society or redirect to societies list
    const firstSociety = await prisma.society.findFirst({
      orderBy: { createdAt: "desc" },
      select: { code: true, id: true },
    })

    if (firstSociety) {
      redirect(`/society/${firstSociety.code || firstSociety.id}/dashboard`)
    }

    redirect("/admin/societies")
  }

  // Regular user: find their first society membership
  const membership = user.memberships?.[0]
  if (membership?.society) {
    redirect(`/society/${membership.society.code || membership.society.id}/dashboard`)
  }

  redirect("/login")
}
