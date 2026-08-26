import { redirect, notFound } from "next/navigation"
import { getCurrentUser } from "@/lib/auth/getCurrentUser"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { prisma } from "@/lib/prisma"
import { AdminPageHeader, AdminCard, AdminBadge } from "@/components/admin"
import { ShieldCheck, User, Home, Phone } from "lucide-react"
import { ProfileSettingsForm } from "@/app/admin/(protected)/profile/ProfileSettingsForm"

export default async function SocietyProfilePage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const user = await getCurrentUser()

  if (!user) {
    redirect(`/login?next=/society/${encodeURIComponent(code)}/profile`)
  }

  const context = await getSocietyAdmin(code)
  if (!context) {
    notFound()
  }

  const { society, designation, isSuperAdmin } = context

  // Fetch linked resident / person profile in this society
  const person = await prisma.person.findFirst({
    where: {
      OR: [
        { userId: user.id },
        { email: user.email, societyId: society.id },
      ],
      deletedAt: null,
    },
    include: {
      flats: {
        where: { toDate: null },
        include: {
          flat: {
            include: {
              block: true,
            },
          },
        },
      },
    },
  })

  // Fetch latest login audit log
  const lastLogin = await prisma.auditLog.findFirst({
    where: {
      userId: user.id,
      action: "LOGIN",
    },
    orderBy: { createdAt: "desc" },
    select: {
      createdAt: true,
      ipAddress: true,
      userAgent: true,
    },
  })

  const assignedFlats =
    person?.flats.map((fp) => `${fp.flat.block?.name ? `${fp.flat.block.name}-` : ""}${fp.flat.number}`).filter(Boolean) || []

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-8 md:px-8">
      <AdminPageHeader
        eyebrow="My Account"
        title="Profile & Security Settings"
        description={`Manage your credentials, resident profile, and security preferences for ${society.name}`}
      />

      {/* Resident Identity Card if linked */}
      {person && (
        <AdminCard
          title="Resident Directory Profile"
          description="Your linked identity in the society directory and ownership register"
        >
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-4">
              <div className="flex items-center gap-1.5 text-stone-500 text-xs font-semibold uppercase tracking-wider">
                <User className="h-3.5 w-3.5" />
                <span>Full Name</span>
              </div>
              <p className="mt-1 font-bold text-stone-950">{person.name}</p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-4">
              <div className="flex items-center gap-1.5 text-stone-500 text-xs font-semibold uppercase tracking-wider">
                <Home className="h-3.5 w-3.5" />
                <span>Assigned Flat(s)</span>
              </div>
              <div className="mt-1">
                {assignedFlats.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {assignedFlats.map((flatNum) => (
                      <span key={flatNum} className="rounded bg-white border border-stone-200 px-2 py-0.5 font-bold font-mono text-xs text-stone-900">
                        {flatNum}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-stone-400">No flat assigned</span>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-4">
              <div className="flex items-center gap-1.5 text-stone-500 text-xs font-semibold uppercase tracking-wider">
                <Phone className="h-3.5 w-3.5" />
                <span>Registered Phone</span>
              </div>
              <p className="mt-1 font-mono text-xs font-semibold text-stone-900">
                {person.phone || "—"}
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-4">
              <div className="flex items-center gap-1.5 text-stone-500 text-xs font-semibold uppercase tracking-wider">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Committee Role</span>
              </div>
              <div className="mt-1.5">
                <AdminBadge variant={isSuperAdmin ? "purple" : "info"} dot>
                  {designation}
                </AdminBadge>
              </div>
            </div>
          </div>
        </AdminCard>
      )}

      {/* Account & Security Form */}
      <ProfileSettingsForm
        initialUser={{
          id: user.id,
          email: user.email,
          appRole: user.appRole,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
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
        auditLogsHref={`/society/${society.code || society.id}/audit-logs`}
      />
    </div>
  )
}
