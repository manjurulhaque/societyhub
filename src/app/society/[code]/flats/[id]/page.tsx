import { notFound } from "next/navigation"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { prisma } from "@/lib/prisma"
import { FlatProfileClient } from "./FlatProfileClient"
import { COMMITTEE_ROLES } from "@/lib/auth/requireAuth"
import type { SocietyRole } from "@/generated/prisma/client"

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

  const [flat, rawPeople, flatPayments, blocksData] = await Promise.all([
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
    prisma.block.findMany({
      where: {
        societyId: society.id,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    }),
  ])

  if (!flat) {
    notFound()
  }

  const currencySymbol = society.currencySymbol || "₹"

  const unpaidBills = flat.bills.filter((b) => b.status === "PENDING" || b.status === "OVERDUE")
  const totalUnpaidDues = unpaidBills.reduce((sum, b) => sum + Number(b.amount), 0)

  const activeDepositsTotal = flat.memberDeposits
    .filter((d) => d.status === "HELD")
    .reduce((sum, d) => sum + Number(d.amount), 0)

  return (
    <div className="space-y-6">
      <FlatProfileClient
        societyCode={code}
        societyId={society.id}
        currencySymbol={currencySymbol}
        societyInfo={{
          name: society.name,
          code: society.code,
          address: society.address,
          city: society.city,
          state: society.state,
          pincode: society.pincode,
          registrationNumber: society.registrationNumber,
          panNumber: society.panNumber,
          gstin: society.gstin,
          currencySymbol,
        }}
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
        blocks={blocksData}
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
        unpaidDues={totalUnpaidDues}
        unpaidBillsCount={unpaidBills.length}
        activeDepositsTotal={activeDepositsTotal}
        canManage={canManage}
      />
    </div>
  )
}
