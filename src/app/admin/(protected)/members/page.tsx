import Link from "next/link"
import { prisma } from "@/lib/prisma"
import {
  AdminPageHeader,
  AdminTable,
  AdminBadge,
  AdminStatCard,
  AdminButton,
  AdminEmptyState,
} from "@/components/admin"
import { formatDateInAppTimeZone } from "@/lib/datetime"

export default async function MembersPage() {
  const [members, totalUniqueUsersCount, keyOfficersCount, staffCount] = await Promise.all([
    prisma.societyMember.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        society: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            appRole: true,
          },
        },
      },
    }),
    prisma.user.count(),
    prisma.societyMember.count({
      where: {
        designation: {
          in: ["PRESIDENT", "SECRETARY", "TREASURER"],
        },
      },
    }),
    prisma.societyMember.count({
      where: {
        designation: {
          in: ["MANAGER", "ACCOUNTANT", "SECURITY"],
        },
      },
    }),
  ])

  const totalMemberships = members.length

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-6 py-8 md:px-8">
      {/* Header */}
      <AdminPageHeader
        eyebrow="Access Control & Governance"
        title="Committee & Society Members"
        description="Assign and govern administrative committee roles, managers, and staff memberships across societies."
        action={
          <AdminButton href="/admin/members/new" variant="primary" size="md">
            + Assign Member
          </AdminButton>
        }
      />

      {/* KPI Overview */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          title="Total Memberships"
          value={totalMemberships}
          subtitle="Active society assignments"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Key Office Bearers"
          value={keyOfficersCount}
          subtitle="Presidents, Secretaries, Treasurers"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Operations Staff"
          value={staffCount}
          subtitle="Managers, Accountants, Security"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Registered Users"
          value={totalUniqueUsersCount}
          subtitle="Platform user accounts"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
        />
      </div>

      {/* Members Table */}
      {members.length === 0 ? (
        <AdminEmptyState
          title="No society members assigned yet"
          description="Assign users to housing societies with designated roles such as President, Secretary, Treasurer, or Manager."
          action={
            <AdminButton href="/admin/members/new" variant="primary">
              + Assign First Member
            </AdminButton>
          }
        />
      ) : (
        <AdminTable
          headers={[
            "User / Email",
            "Assigned Society",
            "Designation / Role",
            "Platform Role",
            "Assigned Date",
            "Actions",
          ]}
          rows={members.map((member) => {
            const isOfficer = ["PRESIDENT", "SECRETARY", "TREASURER"].includes(
              member.designation
            )
            const isStaff = ["MANAGER", "ACCOUNTANT"].includes(member.designation)

            const badgeVariant = isOfficer ? "purple" : isStaff ? "info" : "neutral"

            return (
              <tr
                key={member.id}
                className="border-t border-stone-100 transition-colors hover:bg-stone-50/70"
              >
                {/* User Email */}
                <td className="px-4 py-3.5">
                  <span className="font-semibold text-stone-950 text-sm block">
                    {member.user.email}
                  </span>
                </td>

                {/* Society Name & Code */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/societies/${member.society.id}`}
                      className="font-medium text-stone-900 hover:text-stone-600 underline-offset-2 hover:underline text-xs truncate max-w-xs"
                      title={member.society.name}
                    >
                      {member.society.name}
                    </Link>
                    {member.society.code ? (
                      <AdminBadge variant="neutral" size="sm">
                        {member.society.code}
                      </AdminBadge>
                    ) : null}
                  </div>
                </td>

                {/* Designation */}
                <td className="px-4 py-3.5">
                  <AdminBadge variant={badgeVariant} size="sm" dot>
                    {member.designation.replace(/_/g, " ")}
                  </AdminBadge>
                </td>

                {/* App Role */}
                <td className="px-4 py-3.5">
                  <AdminBadge
                    variant={member.user.appRole === "SUPER_ADMIN" ? "purple" : "neutral"}
                    size="sm"
                  >
                    {member.user.appRole}
                  </AdminBadge>
                </td>

                {/* Assigned Date */}
                <td className="px-4 py-3.5 text-xs text-stone-500">
                  {formatDateInAppTimeZone(member.createdAt)}
                </td>

                {/* Actions */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <AdminButton
                      href={`/society/${member.society.code || member.society.id}/members`}
                      variant="outline"
                      size="xs"
                    >
                      Society Directory ↗
                    </AdminButton>
                  </div>
                </td>
              </tr>
            )
          })}
        />
      )}
    </div>
  )
}
