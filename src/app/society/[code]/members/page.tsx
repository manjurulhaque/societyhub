import type { Metadata } from "next"
import { notFound } from "next/navigation"

export const metadata: Metadata = { title: "Members" }
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { prisma } from "@/lib/prisma"
import { decryptData } from "@/lib/crypto"
import { AdminPageHeader, AdminCard } from "@/components/admin"
import { CommitteeMembersClient, type CommitteeMemberItem } from "./CommitteeMembersClient"
import { ResidentsDirectoryClient, type ResidentItem } from "./ResidentsDirectoryClient"
import { type FlatOption } from "./RegisterResidentModal"
import { EXECUTIVE_ROLES } from "@/lib/auth/requireAuth"
import type { SocietyRole } from "@/generated/prisma/client"

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

  const { society, designation, isSuperAdmin } = context
  const canManage =
    isSuperAdmin ||
    EXECUTIVE_ROLES.includes(designation as SocietyRole) ||
    designation === "MANAGER"

  const [rawCommitteeMembers, availableRolesData, rawResidents, availableFlatsData] = await Promise.all([
    prisma.societyMember.findMany({
      where: { societyId: society.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            appRole: true,
            person: {
              select: {
                id: true,
                name: true,
                phone: true,
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
            },
          },
        },
        customRoles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                isSystem: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),

    prisma.role.findMany({
      where: {
        OR: [
          { societyId: null },
          { societyId: society.id },
        ],
      },
      include: {
        _count: {
          select: {
            rolePermissions: true,
          },
        },
      },
      orderBy: [
        { isSystem: "desc" },
        { name: "asc" },
      ],
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

    prisma.flat.findMany({
      where: {
        block: { societyId: society.id },
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        number: true,
        block: {
          select: { name: true },
        },
      },
      orderBy: [
        { block: { name: "asc" } },
        { number: "asc" },
      ],
    }),
  ])

  const committeeMembers: CommitteeMemberItem[] = rawCommitteeMembers.map((m) => {
    const person = m.user.person
    const flatsDisplay = person?.flats?.length
      ? person.flats.map((f) => `${f.flat.block.name} - ${f.flat.number}`).join(", ")
      : null

    return {
      id: m.id,
      userId: m.user.id,
      personId: person?.id || null,
      email: m.user.email,
      name: person?.name || null,
      phone: person?.phone || null,
      flatsDisplay,
      designation: m.designation,
      appRole: m.user.appRole,
      createdAt: m.createdAt.toISOString(),
      customRoles: m.customRoles.map((cr) => ({
        id: cr.role.id,
        name: cr.role.name,
        isSystem: cr.role.isSystem,
      })),
    }
  })

  const availableRoles = availableRolesData.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    isSystem: r.isSystem,
    permissionCount: r._count.rolePermissions,
  }))

  const availableFlats: FlatOption[] = availableFlatsData.map((f) => ({
    id: f.id,
    number: f.number,
    blockName: f.block.name,
  }))

  const residents: ResidentItem[] = rawResidents.map((r) => {
    const flatList = r.flats
      .map((f) => `${f.flat.block.name} - ${f.flat.number} (${f.role})`)
      .join(", ")

    const primaryRole = r.flats[0]?.role || "RESIDENT"

    const decryptedPan = r.panNumber ? decryptData(r.panNumber) : null
    const decryptedAadhaar = r.aadhaarNumber ? decryptData(r.aadhaarNumber) : null

    return {
      id: r.id,
      name: r.name,
      phone: r.phone,
      email: r.email,
      panNumber: decryptedPan,
      aadhaarNumber: decryptedAadhaar,
      passportNumber: r.passportNumber,
      voterId: r.voterId,
      dob: r.dob ? r.dob.toISOString() : null,
      gender: r.gender,
      bloodGroup: r.bloodGroup,
      occupation: r.occupation,
      permanentAddress: r.permanentAddress,
      emergencyContactName: r.emergencyContactName,
      emergencyContactPhone: r.emergencyContactPhone,
      primaryRole,
      flatsDisplay: flatList,
      kycVerified: Boolean(r.kycVerified),
    }
  })

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-6 py-8 md:px-8">
      <AdminPageHeader
        eyebrow="Directory & Access"
        title="Members & Residents"
        description={`Manage committee roles, operational staff assignments, and resident directory for ${society.name}.`}
      />

      {/* Committee Members & Staff */}
      <AdminCard
        title="Managing Committee & Staff"
        description="Users authorized to manage, disburse funds, or administer operations for this society"
      >
        <CommitteeMembersClient
          societyCode={code}
          members={committeeMembers}
          availableRoles={availableRoles}
          residents={residents}
          canManageMembers={canManage}
        />
      </AdminCard>

      {/* Residents Directory */}
      <AdminCard
        title="Registered Residents & People"
        description="Owners, tenants, and family members residing in this society"
      >
        <ResidentsDirectoryClient
          societyCode={code}
          residents={residents}
          availableFlats={availableFlats}
          canManageResidents={canManage}
        />
      </AdminCard>
    </div>
  )
}
