import { redirect } from "next/navigation"
import { getAdmin } from "@/lib/auth/getAdmin"
import { AdminPageHeader } from "@/components/admin"
import { ProfileSettingsForm } from "./ProfileSettingsForm"

export default async function AdminProfilePage() {
  const admin = await getAdmin()

  if (!admin || admin.role !== "SUPER_ADMIN") {
    redirect("/login")
  }

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
      />
    </div>
  )
}
