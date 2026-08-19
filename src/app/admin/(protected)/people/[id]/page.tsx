import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { maskPan, maskAadhaar, maskPhone } from "@/lib/masking"
import {
  AdminPageHeader,
  AdminCard,
  AdminBadge,
  AdminDetailItem,
  AdminButton,
  AdminTable,
} from "@/components/admin"
import { formatDateInAppTimeZone } from "@/lib/datetime"


export default async function PersonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const person = await prisma.person.findUnique({
    where: { id },
    include: {
      society: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      flats: {
        include: {
          flat: {
            select: {
              id: true,
              number: true,
              floor: true,
              unitType: true,
              status: true,
              block: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
      payments: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  })

  if (!person) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-8 md:px-8">
      {/* Header */}
      <AdminPageHeader
        eyebrow="Resident Profile"
        title={person.name}
        description={`Registered resident in ${person.society.name}.`}
        action={
          <div className="flex items-center gap-2">
            <AdminButton
              href={`/society/${person.society.code || person.society.id}/members`}
              variant="outline"
              size="sm"
            >
              Society Directory ↗
            </AdminButton>
            <Link
              href="/admin/people"
              className="rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-stone-700 transition hover:bg-stone-100 shadow-sm"
            >
              Back to list
            </Link>
          </div>
        }
      />

      {/* 1. General Info & Society Affiliation */}
      <AdminCard
        title="Contact & Society Information"
        description="General contact details and assigned housing society"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AdminDetailItem label="Full Name" value={person.name} />
          <AdminDetailItem
            label="Housing Society"
            value={`${person.society.name} (${person.society.code || "CHS"})`}
          />
          <AdminDetailItem label="Phone" value={person.phone ? maskPhone(person.phone) : "Not provided"} />
          <AdminDetailItem label="Email" value={person.email ?? "Not provided"} />
        </div>
      </AdminCard>

      {/* 2. KYC & Statutory Details */}
      <AdminCard
        title="KYC & Statutory Verification"
        description="Official government documents and personal details"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AdminDetailItem
            label="KYC Status"
            value={
              <AdminBadge
                variant={person.kycVerified ? "success" : "warning"}
                size="sm"
                dot
              >
                {person.kycVerified ? "Verified" : "Pending Verification"}
              </AdminBadge>
            }
          />
          <AdminDetailItem label="PAN Number" value={person.panNumber ? maskPan(person.panNumber) : "—"} />
          <AdminDetailItem label="Aadhaar" value={person.aadhaarNumber ? maskAadhaar(person.aadhaarNumber) : "—"} />

          <AdminDetailItem label="Blood Group" value={person.bloodGroup ?? "—"} />
          <AdminDetailItem label="Occupation" value={person.occupation ?? "—"} />
          <AdminDetailItem
            label="Emergency Contact"
            value={
              person.emergencyContactName
                ? `${person.emergencyContactName} (${person.emergencyContactPhone || "No phone"})`
                : "—"
            }
          />
          <AdminDetailItem
            label="Registered On"
            value={formatDateInAppTimeZone(person.createdAt)}
          />
        </div>
      </AdminCard>

      {/* 3. Associated Units / Flats */}
      <AdminCard
        title="Associated Flats & Properties"
        description="Units currently or historically occupied by this resident"
      >
        {person.flats.length === 0 ? (
          <p className="py-6 text-center text-xs text-stone-500">
            No flats or units currently associated with this resident.
          </p>
        ) : (
          <AdminTable
            headers={["Flat Number", "Block", "Floor", "Unit Type", "Tenancy Role", "Occupancy Status", "Since"]}
            rows={person.flats.map((entry) => (
              <tr key={entry.id} className="border-t border-stone-100 hover:bg-stone-50/60">
                <td className="px-4 py-3 font-semibold text-stone-950 text-xs">
                  {entry.flat.number}
                </td>
                <td className="px-4 py-3 text-stone-700 text-xs">{entry.flat.block.name}</td>
                <td className="px-4 py-3 text-stone-600 text-xs">{entry.flat.floor ?? "—"}</td>
                <td className="px-4 py-3 text-stone-600 text-xs">{entry.flat.unitType ?? "—"}</td>
                <td className="px-4 py-3">
                  <AdminBadge
                    variant={
                      entry.role === "OWNER"
                        ? "purple"
                        : entry.role === "TENANT"
                          ? "info"
                          : "neutral"
                    }
                    size="sm"
                  >
                    {entry.role}
                  </AdminBadge>
                </td>
                <td className="px-4 py-3">
                  <AdminBadge
                    variant={entry.flat.status === "OCCUPIED" ? "success" : "neutral"}
                    size="sm"
                    dot
                  >
                    {entry.flat.status}
                  </AdminBadge>
                </td>
                <td className="px-4 py-3 text-stone-500 text-xs">
                  {formatDateInAppTimeZone(entry.fromDate)}
                </td>
              </tr>
            ))}
          />
        )}
      </AdminCard>
    </div>
  )
}
