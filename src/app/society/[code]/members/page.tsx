import { notFound } from "next/navigation"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { prisma } from "@/lib/prisma"
import { AdminPageHeader, AdminTable, AdminBadge, AdminCard } from "@/components/admin"

export default async function SocietyMembersPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const context = await getSocietyAdmin(code)

  if (!context) {
    notFound()
  }

  const { society } = context

  const [committeeMembers, residents] = await Promise.all([
    prisma.societyMember.findMany({
      where: { societyId: society.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            appRole: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),

    prisma.person.findMany({
      where: {
        societyId: society.id,
        isActive: true,
        deletedAt: null,
      },
      include: {
        flats: {
          where: { toDate: null },
          include: {
            flat: {
              select: {
                number: true,
                block: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
  ])

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-6 py-8 md:px-8">
      <AdminPageHeader
        eyebrow="Directory"
        title="Members & Residents"
        description={`Manage committee roles and view resident directory for ${society.name}.`}
      />

      {/* Committee Members */}
      <AdminCard
        title="Management Committee & Staff"
        description="Users authorized to manage and administer this society"
      >
        {committeeMembers.length === 0 ? (
          <p className="py-4 text-center text-xs text-stone-500">
            No committee members assigned yet.
          </p>
        ) : (
          <AdminTable
            headers={["User / Email", "Designation", "Platform Role", "Assigned On"]}
            rows={committeeMembers.map((m) => (
              <tr key={m.id} className="border-t border-stone-100 hover:bg-stone-50/60">
                <td className="px-4 py-3 text-xs font-semibold text-stone-950">
                  {m.user.email}
                </td>
                <td className="px-4 py-3">
                  <AdminBadge variant="purple" size="sm" dot>
                    {m.designation}
                  </AdminBadge>
                </td>
                <td className="px-4 py-3 text-xs text-stone-600">
                  {m.user.appRole}
                </td>
                <td className="px-4 py-3 text-xs text-stone-500">
                  {new Date(m.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
              </tr>
            ))}
          />
        )}
      </AdminCard>

      {/* Residents Directory */}
      <AdminCard
        title="Registered Residents & People"
        description="Owners, tenants, and family members residing in this society"
      >
        {residents.length === 0 ? (
          <p className="py-4 text-center text-xs text-stone-500">
            No residents registered in this society yet.
          </p>
        ) : (
          <AdminTable
            headers={["Name", "Phone", "Email", "Associated Flat(s)", "Role"]}
            rows={residents.map((r) => {
              const flatList = r.flats
                .map((f) => `${f.flat.block.name} - ${f.flat.number} (${f.role})`)
                .join(", ")

              const primaryRole = r.flats[0]?.role || "RESIDENT"

              return (
                <tr key={r.id} className="border-t border-stone-100 hover:bg-stone-50/60">
                  <td className="px-4 py-3 text-xs font-semibold text-stone-950">
                    {r.name}
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-600">{r.phone || "—"}</td>
                  <td className="px-4 py-3 text-xs text-stone-600">{r.email || "—"}</td>
                  <td className="px-4 py-3 text-xs text-stone-700">
                    {flatList || <span className="text-stone-400">None assigned</span>}
                  </td>
                  <td className="px-4 py-3">
                    <AdminBadge
                      variant={
                        primaryRole === "OWNER"
                          ? "info"
                          : primaryRole === "TENANT"
                            ? "warning"
                            : "neutral"
                      }
                      size="sm"
                    >
                      {primaryRole}
                    </AdminBadge>
                  </td>
                </tr>
              )
            })}
          />
        )}
      </AdminCard>
    </div>
  )
}
