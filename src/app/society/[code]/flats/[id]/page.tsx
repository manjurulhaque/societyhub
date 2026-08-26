import Link from "next/link"
import { notFound } from "next/navigation"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { prisma } from "@/lib/prisma"
import { AdminBadge, AdminStatCard } from "@/components/admin"
import { FlatProfileClient } from "./FlatProfileClient"
import { COMMITTEE_ROLES } from "@/lib/auth/requireAuth"
import type { SocietyRole } from "@/generated/prisma/client"
import { EntityAuditDrawer } from "@/components/audit/EntityAuditDrawer"

export default async function SocietyFlatProfilePage({
  params,
}: {
  params: Promise<{ code: string; id: string }>
}) {
  const { code, id } = await params
  const context = await getSocietyAdmin(code)

  if (!context) {
    notFound()
  }

  const { society, designation, isSuperAdmin } = context
  const canManage = isSuperAdmin || COMMITTEE_ROLES.includes(designation as SocietyRole)

  const [flat, rawPeople, flatPayments] = await Promise.all([
    prisma.flat.findFirst({
      where: {
        id,
        block: { societyId: society.id },
        deletedAt: null,
      },
      include: {
        block: true,
        people: {
          include: { person: true },
          orderBy: { fromDate: "desc" },
        },
        ownershipHistory: {
          include: {
            fromPerson: true,
            toPerson: true,
          },
          orderBy: { transferDate: "desc" },
        },
        shareCertificate: true,
        nominations: {
          orderBy: { nominationDate: "desc" },
        },
        propertyLiens: {
          orderBy: { createdAt: "desc" },
        },
        bills: {
          orderBy: [{ year: "desc" }, { month: "desc" }],
          take: 10,
        },
        memberDeposits: {
          orderBy: { receivedOn: "desc" },
        },
      },
    }),
    prisma.person.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.payment.findMany({
      where: {
        flatId: id,
        societyId: society.id,
      },
      orderBy: { paidOn: "desc" },
      take: 20,
    }),
  ])

  if (!flat) {
    notFound()
  }

  const currencySymbol = society.currencySymbol || "₹"

  const currentOwner =
    flat.ownershipHistory.find((h) => h.isCurrentOwner)?.toPerson.name ||
    flat.people.find((p) => p.role === "OWNER" && !p.toDate)?.person.name ||
    "Unassigned"

  const unpaidBills = flat.bills.filter((b) => b.status === "PENDING" || b.status === "OVERDUE")
  const totalUnpaidDues = unpaidBills.reduce((sum, b) => sum + Number(b.amount), 0)

  const activeDepositsTotal = flat.memberDeposits
    .filter((d) => d.status === "HELD")
    .reduce((sum, d) => sum + Number(d.amount), 0)

  return (
    <div className="space-y-6">
      {/* Back Link & Title */}
      <div>
        <Link
          href={`/society/${code}/flats`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900 transition mb-3"
        >
          <span>←</span>
          <span>Back to Blocks & Flats</span>
        </Link>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                {flat.block.name}
              </span>
              <AdminBadge
                variant={
                  flat.status === "OCCUPIED"
                    ? "success"
                    : flat.status === "UNDER_RENOVATION"
                      ? "warning"
                      : "neutral"
                }
                size="sm"
              >
                {flat.status}
              </AdminBadge>
              {flat.unitType && (
                <span className="rounded-md bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-700">
                  {flat.unitType}
                </span>
              )}
            </div>

            <h1 className="text-xl font-bold tracking-tight text-stone-950 sm:text-2xl">
              Flat {flat.number}
            </h1>

            <p className="text-xs text-stone-500">
              {flat.floor !== null ? `Floor ${flat.floor} • ` : ""}
              {flat.area ? `${flat.area} ${flat.areaUnit} • ` : ""}
              {flat.parkingSlot ? `🚗 Parking: ${flat.parkingSlot} • ` : ""}
              {flat.intercomNumber ? `📞 Intercom: ${flat.intercomNumber}` : ""}
            </p>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-2">
            <EntityAuditDrawer
              entity="Flat"
              entityId={flat.id}
              entityTitle={`Flat ${flat.block.name}-${flat.number}`}
              societyId={society.id}
              relatedEntityIds={[
                ...flat.people.map((p) => p.id),
                ...(flat.shareCertificate ? [flat.shareCertificate.id] : []),
                ...flat.propertyLiens.map((l) => l.id),
                ...flat.nominations.map((n) => n.id),
              ]}
              buttonVariant="outline"
            />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          title="Registered Owner"
          value={currentOwner}
          subtitle={`Tenure since ${flat.ownershipHistory[0] ? flat.ownershipHistory[0].transferDate.toISOString().split("T")[0] : "Allotment"}`}
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Outstanding Maintenance"
          value={`${currencySymbol}${totalUnpaidDues.toLocaleString("en-IN")}`}
          subtitle={unpaidBills.length > 0 ? `${unpaidBills.length} unpaid bill(s)` : "All dues cleared"}
          icon={
            <svg className="h-5 w-5 text-red-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Active Member Deposits"
          value={`${currencySymbol}${activeDepositsTotal.toLocaleString("en-IN")}`}
          subtitle="Held security / fitout deposits"
          icon={
            <svg className="h-5 w-5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Share Certificate"
          value={flat.shareCertificate?.certificateNumber || "Not Issued"}
          subtitle={
            flat.shareCertificate
              ? `${flat.shareCertificate.sharesCount} shares (${flat.shareCertificate.status})`
              : "Form I register pending"
          }
          icon={
            <svg className="h-5 w-5 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />
      </div>

      {/* Flat Profile Client Tabs Container */}
      <FlatProfileClient
        societyCode={code}
        currencySymbol={currencySymbol}
        flat={{
          id: flat.id,
          number: flat.number,
          floor: flat.floor,
          unitType: flat.unitType,
          status: flat.status,
          area: flat.area ? Number(flat.area) : null,
          areaUnit: flat.areaUnit,
          intercomNumber: flat.intercomNumber,
          parkingSlot: flat.parkingSlot,
          blockId: flat.blockId,
          blockName: flat.block.name,
        }}
        occupants={flat.people.map((p) => ({
          id: p.id,
          personId: p.personId,
          personName: p.person.name,
          personPhone: p.person.phone,
          personEmail: p.person.email,
          role: p.role,
          isPrimary: p.isPrimary,
          fromDate: p.fromDate.toISOString(),
          toDate: p.toDate ? p.toDate.toISOString() : null,
          isActive: !p.toDate,
        }))}
        ownershipHistory={flat.ownershipHistory.map((h) => ({
          id: h.id,
          fromPersonName: h.fromPerson?.name || null,
          toPersonName: h.toPerson.name,
          transferType: h.transferType,
          transferDate: h.transferDate.toISOString(),
          fromDate: h.fromDate.toISOString(),
          toDate: h.toDate ? h.toDate.toISOString() : null,
          isCurrentOwner: h.isCurrentOwner,
          registeredDocNumber: h.registeredDocNumber,
          registrationDate: h.registrationDate ? h.registrationDate.toISOString() : null,
          transferFeePaid: h.transferFeePaid ? Number(h.transferFeePaid) : null,
          nocReference: h.nocReference,
          nocIssuedDate: h.nocIssuedDate ? h.nocIssuedDate.toISOString() : null,
          resolutionNumber: h.resolutionNumber,
          committeeApprovalDate: h.committeeApprovalDate ? h.committeeApprovalDate.toISOString() : null,
          remarks: h.remarks,
        }))}
        statutory={{
          shareCertificate: flat.shareCertificate
            ? {
                certificateNumber: flat.shareCertificate.certificateNumber,
                sharesCount: flat.shareCertificate.sharesCount,
                distinctiveRange:
                  flat.shareCertificate.shareDistinctFrom && flat.shareCertificate.shareDistinctTo
                    ? `${flat.shareCertificate.shareDistinctFrom} – ${flat.shareCertificate.shareDistinctTo}`
                    : null,
                faceValue: Number(flat.shareCertificate.faceValuePerShare) * flat.shareCertificate.sharesCount,
                issueDate: flat.shareCertificate.issueDate.toISOString(),
                status: flat.shareCertificate.status,
              }
            : null,
          nominations: flat.nominations.map((n) => ({
            id: n.id,
            nomineeName: n.nomineeName,
            relationship: n.relationship,
            percentageShare: Number(n.percentageShare),
            status: n.status,
            nominationDate: n.nominationDate.toISOString(),
          })),
          liens: flat.propertyLiens.map((l) => ({
            id: l.id,
            bankName: l.bankName,
            loanAccountNumber: l.loanAccountNumber,
            sanctionAmount: l.sanctionAmount ? Number(l.sanctionAmount) : null,
            nocReference: l.nocReference,
            nocIssuedDate: l.nocIssuedDate ? l.nocIssuedDate.toISOString() : null,
            isCleared: l.isCleared,
          })),
        }}
        financial={{
          bills: flat.bills.map((b) => ({
            id: b.id,
            billNumber: b.billNumber,
            year: b.year,
            month: b.month,
            amount: Number(b.amount),
            status: b.status,
            dueDate: b.dueDate ? b.dueDate.toISOString() : null,
          })),
          payments: flatPayments.map((p) => ({
            id: p.id,
            receiptNumber: p.receiptNumber,
            amount: Number(p.amount),
            paidOn: p.paidOn.toISOString(),
            mode: p.mode,
            status: p.status,
          })),
          deposits: flat.memberDeposits.map((d) => ({
            id: d.id,
            depositType: d.depositType,
            amount: Number(d.amount),
            status: d.status,
            receivedOn: d.receivedOn.toISOString(),
            refundedOn: d.refundedOn ? d.refundedOn.toISOString() : null,
          })),
        }}
        people={rawPeople}
        canManage={canManage}
      />
    </div>
  )
}
