import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export const getCurrentUser = cache(async () => {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    return null
  }

  const dbUser = await prisma.user.findFirst({
    where: {
      email: {
        equals: user.email,
        mode: "insensitive",
      },
      isActive: true,
      deletedAt: null,
    },
    select: {
      id: true,
      email: true,
      appRole: true,
      createdAt: true,
      updatedAt: true,
      memberships: {
        select: {
          id: true,
          designation: true,
          societyId: true,
          society: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      },
    },
  })

  if (!dbUser) {
    return null
  }

  return {
    ...dbUser,
    supabaseUser: user,
  }
})
