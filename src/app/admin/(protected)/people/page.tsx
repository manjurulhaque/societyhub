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

export default async function PeoplePage() {
  const [people, ownerCount, tenantCount, kycVerifiedCount] = await Promise.all([
    prisma.person.findMany({
      where: { isActive: true, deletedAt: null },
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
        flats: {
          where: { toDate: null },
          include: {
            flat: {
              select: {
                id: true,
                number: true,
                block: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
    }),
    prisma.flatPerson.count({
      where: { role: "OWNER", toDate: null },
    }),
    prisma.flatPerson.count({
      where: { role: "TENANT", toDate: null },
    }),
    prisma.person.count({
      where: { kycVerified: true, isActive: true, deletedAt: null },
    }),
  ])

  const totalPeople = people.length

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-6 py-8 md:px-8">
      {/* Header */}
      <AdminPageHeader
        eyebrow="Resident & Stakeholder Directory"
        title="People & Residents"
        description="Directory of all flat owners, joint owners, tenants, and family members residing across societies."
        action={
          <AdminButton href="/admin/people/new" variant="primary" size="md">
            + New Person
          </AdminButton>
        }
      />

      {/* KPI Overview */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          title="Total People"
          value={totalPeople}
          subtitle="Registered across all societies"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Property Owners"
          value={ownerCount}
          subtitle="Registered title deed holders"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          }
        />

        <AdminStatCard
          title="Active Tenants"
          value={tenantCount}
          subtitle="Registered lease agreements"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />

        <AdminStatCard
          title="KYC Verified"
          value={kycVerifiedCount}
          subtitle={`${totalPeople > 0 ? Math.round((kycVerifiedCount / totalPeople) * 100) : 0}% compliance rate`}
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        />
      </div>

      {/* People Table */}
      {people.length === 0 ? (
        <AdminEmptyState
          title="No residents or people registered yet"
          description="Register your first flat owner, tenant, or committee resident into SocietyHub."
          action={
            <AdminButton href="/admin/people/new" variant="primary">
              + Register First Person
            </AdminButton>
          }
        />
      ) : (
        <AdminTable
          headers={[
            "Resident Name",
            "Society & Code",
            "Associated Flat(s) & Role",
            "Contact Details",
            "KYC Status",
            "Registered Date",
            "Actions",
          ]}
          rows={people.map((person) => {
            const primaryFlat = person.flats[0]
            const society = person.society

            return (
              <tr
                key={person.id}
                className="border-t border-stone-100 transition-colors hover:bg-stone-50/70"
              >
                {/* Name */}
                <td className="px-4 py-3.5">
                  <Link
                    href={`/admin/people/${person.id}`}
                    className="font-bold text-stone-950 text-sm hover:text-stone-700 block"
                  >
                    {person.name}
                  </Link>
                </td>

                {/* Society */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/admin/societies/${society.id}`}
                      className="text-xs font-medium text-stone-900 hover:underline truncate max-w-[140px]"
                      title={society.name}
                    >
                      {society.name}
                    </Link>
                    {society.code ? (
                      <AdminBadge variant="neutral" size="sm">
                        {society.code}
                      </AdminBadge>
                    ) : null}
                  </div>
                </td>

                {/* Associated Flats */}
                <td className="px-4 py-3.5">
                  {person.flats.length === 0 ? (
                    <span className="text-xs text-stone-400">Unassigned</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {person.flats.map((f) => (
                        <span
                          key={f.id}
                          className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2 py-0.5 text-xs text-stone-800"
                        >
                          <span className="font-semibold">{f.flat.block.name}-{f.flat.number}</span>
                          <span className="text-[10px] text-stone-500">({f.role})</span>
                        </span>
                      ))}
                    </div>
                  )}
                </td>

                {/* Contact */}
                <td className="px-4 py-3.5 text-xs text-stone-700">
                  {person.phone ? <p className="font-medium">{person.phone}</p> : null}
                  {person.email ? <p className="text-stone-500 truncate max-w-[180px]">{person.email}</p> : null}
                  {!person.phone && !person.email ? <span className="text-stone-400">—</span> : null}
                </td>

                {/* KYC */}
                <td className="px-4 py-3.5">
                  <AdminBadge
                    variant={person.kycVerified ? "success" : "warning"}
                    size="sm"
                    dot
                  >
                    {person.kycVerified ? "Verified" : "Pending"}
                  </AdminBadge>
                </td>

                {/* Registered Date */}
                <td className="px-4 py-3.5 text-xs text-stone-500">
                  {formatDateInAppTimeZone(person.createdAt)}
                </td>

                {/* Actions */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <AdminButton
                      href={`/admin/people/${person.id}`}
                      variant="secondary"
                      size="xs"
                    >
                      Details
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
