import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export async function getAdmin() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    return null
  }

  const admin = await prisma.user.findFirst({
    where: {
      email: user.email,
      appRole: "SUPER_ADMIN",
    },
    select: {
      id: true,
      email: true,
      appRole: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!admin) {
    return null
  }

  return {
    id: admin.id,
    email: admin.email,
    appRole: admin.appRole,
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt,
    role: admin.appRole,
  }
}