import { redirect } from "next/navigation"
import { getAdmin } from "@/lib/auth/getAdmin"
import { prisma } from "@/lib/prisma"
import { AdminPageHeader } from "@/components/admin"
import { ProfileSettingsForm } from "./ProfileSettingsForm"

export default async function AdminProfilePage() {
  const admin = await getAdmin()

  if (!admin || admin.role !== "SUPER_ADMIN") {
    redirect("/login")
  }

  // Fetch the latest login audit log for this user
  const lastLogin = await prisma.auditLog.findFirst({
    where: {
      userId: admin.id,
      action: "LOGIN",
    },
    orderBy: { createdAt: "desc" },
    select: {
      createdAt: true,
      ipAddress: true,
      userAgent: true,
    },
  })

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-8 md:px-8">
      <AdminPageHeader
        eyebrow="Admin Portal"
        title="Account Settings"
        description="Manage your account profile, email address, and security credentials"
      />

      <ProfileSettingsForm
        initialUser={{
          id: admin.id,
          email: admin.email,
          appRole: admin.role,
          createdAt: admin.createdAt.toISOString(),
          updatedAt: admin.updatedAt.toISOString(),
        }}
        lastLogin={
          lastLogin
            ? {
                timestamp: lastLogin.createdAt.toISOString(),
                ipAddress: lastLogin.ipAddress,
                userAgent: lastLogin.userAgent,
              }
            : null
        }
      />
    </div>
  )
}
