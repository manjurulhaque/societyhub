import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth/getCurrentUser"

export default async function ProfileRouterPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login?next=/profile")
  }

  if (user.appRole === "SUPER_ADMIN") {
    redirect("/admin/profile")
  }

  if (user.memberships && user.memberships.length > 0) {
    const societyCode = user.memberships[0].society.code || user.memberships[0].society.id
    redirect(`/society/${societyCode}/profile`)
  }

  redirect("/login")
}
