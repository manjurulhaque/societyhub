import { cache } from "react"
import { getCurrentUser } from "@/lib/auth/getCurrentUser"

export const getAdmin = cache(async () => {
  const user = await getCurrentUser()

  if (!user || user.appRole !== "SUPER_ADMIN") {
    return null
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    appRole: user.appRole,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    role: user.appRole,
  }
})