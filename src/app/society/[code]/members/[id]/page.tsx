import { notFound } from "next/navigation"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { prisma } from "@/lib/prisma"
import { decryptData } from "@/lib/crypto"
import { EXECUTIVE_ROLES } from "@/lib/auth/requireAuth"
import type { SocietyRole } from "@/generated/prisma/client"
import {
  ResidentProfileClient,
  type FlatPortfolioItem,
  type ResidentBillItem,
  type ResidentPaymentItem,
  type ResidentStatutoryData,
  type ResidentProfileData,
} from "./ResidentProfileClient"

export default async function SocietyResidentProfilePage({
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
  const canManage =
    isSuperAdmin ||
    EXECUTIVE_ROLES.includes(designation as SocietyRole) ||
    designation === "MANAGER"

  // Fetch the target person with all relational details
  const person = await prisma.person.findFirst({
    where: {
      id,
      societyId: society.id,
      deletedAt: null,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          appRole: true,
          isActive: true,
          createdAt: true,
        },
      },
      flats: {
        where: {
          toDate: null,
        },
        include: {
          flat: {
            include: {
              block: {
                select: {
                  id: true,
                  name: true,
                },
              },
              shareCertificate: true,
              nominations: {
                where: { status: "ACTIVE" },
              },
              people: {
                where: { toDate: null },
                include: {
                  person: {
                    select: {
                      id: true,
                      name: true,
                      phone: true,
                      email: true,
                    },
                  },
                },
              },
              bills: {
                where: {
                  status: { in: ["PENDING", "OVERDUE", "PARTIALLY_PAID"] },
                },
                select: {
                  id: true,
                  amount: true,
                  status: true,
                  payments: {
                    where: { status: "SUCCESS" },
                    select: { amount: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { fromDate: "desc" },
      },
      ownershipTransfersTo: {
        include: {
          flat: {
            select: {
              number: true,
              block: { select: { name: true } },
            },
          },
          fromPerson: {
            select: { name: true },
          },
        },
        orderBy: { transferDate: "desc" },
      },
      ownershipTransfersFrom: {
        include: {
          flat: {
            select: {
              number: true,
              block: { select: { name: true } },
            },
          },
          toPerson: {
            select: { name: true },
          },
        },
        orderBy: { transferDate: "desc" },
      },
      shareCertificates: {
        where: { societyId: society.id },
        include: {
          flat: {
            select: {
              number: true,
              block: { select: { name: true } },
            },
          },
        },
        orderBy: { certificateNumber: "asc" },
      },
      nominationsFiled: {
        where: { societyId: society.id },
        include: {
          flat: {
            select: {
              number: true,
              block: { select: { name: true } },
            },
          },
        },
        orderBy: { nominationDate: "desc" },
      },
      propertyLiens: {
        where: { societyId: society.id },
        include: {
          flat: {
            select: {
              number: true,
              block: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      memberDeposits: {
        where: { societyId: society.id },
        include: {
          flat: {
            select: {
              number: true,
              block: { select: { name: true } },
            },
          },
        },
        orderBy: { receivedOn: "desc" },
      },
    },
  })

  if (!person) {
    notFound()
  }

  const flatIds = person.flats.map((fp) => fp.flatId)

  // Fetch all billing and payment registers associated with this resident & their flats
  const [rawBills, rawPayments] = await Promise.all([
    prisma.bill.findMany({
      where: {
        societyId: society.id,
        flatId: { in: flatIds },
      },
      include: {
        flat: {
          select: {
            id: true,
            number: true,
            block: { select: { name: true } },
          },
        },
        payments: {
          where: { status: "SUCCESS" },
          select: { amount: true },
        },
      },
      orderBy: [
        { year: "desc" },
        { month: "desc" },
      ],
      take: 100,
    }),

    prisma.payment.findMany({
      where: {
        societyId: society.id,
        OR: [
          { paidById: person.id },
          { flatId: { in: flatIds } },
        ],
      },
      include: {
        flat: {
          select: {
            number: true,
            block: { select: { name: true } },
          },
        },
      },
      orderBy: { paidOn: "desc" },
      take: 100,
    }),
  ])

  // Decrypt sensitive KYC information
  const decryptedPan = person.panNumber ? decryptData(person.panNumber) : null
  const decryptedAadhaar = person.aadhaarNumber ? decryptData(person.aadhaarNumber) : null

  // Map Resident Profile Data
  const residentProfile: ResidentProfileData = {
    id: person.id,
    name: person.name,
    phone: person.phone,
    email: person.email,
    panNumber: decryptedPan,
    aadhaarNumber: decryptedAadhaar,
    passportNumber: person.passportNumber,
    voterId: person.voterId,
    dob: person.dob ? person.dob.toISOString() : null,
    gender: person.gender,
    bloodGroup: person.bloodGroup,
    occupation: person.occupation,
    permanentAddress: person.permanentAddress,
    emergencyContactName: person.emergencyContactName,
    emergencyContactPhone: person.emergencyContactPhone,
    kycVerified: Boolean(person.kycVerified),
    kycVerifiedAt: person.kycVerifiedAt ? person.kycVerifiedAt.toISOString() : null,
    createdAt: person.createdAt.toISOString(),
    userAccount: person.user
      ? {
          id: person.user.id,
          email: person.user.email,
          appRole: person.user.appRole,
          isActive: person.user.isActive,
          createdAt: person.user.createdAt.toISOString(),
        }
      : null,
  }

  // Map Flat Portfolio Items
  const flats: FlatPortfolioItem[] = person.flats.map((fp) => {
    const flat = fp.flat
    const unpaidBillsSum = flat.bills.reduce((sum, b) => {
      if (b.status === "PAID") return sum
      const paid = b.payments.reduce((pSum, p) => pSum + Number(p.amount), 0)
      return sum + Math.max(0, Number(b.amount) - paid)
    }, 0)

    const otherOccupants = flat.people
      .filter((p) => p.personId !== person.id)
      .map((p) => ({
        id: p.id,
        name: p.person.name,
        role: p.role,
        phone: p.person.phone,
        email: p.person.email,
      }))

    return {
      id: fp.id,
      flatId: flat.id,
      number: flat.number,
      floor: flat.floor,
      unitType: flat.unitType,
      status: flat.status,
      area: flat.area ? Number(flat.area) : null,
      areaUnit: flat.areaUnit,
      intercomNumber: flat.intercomNumber,
      parkingSlot: flat.parkingSlot,
      blockId: flat.block.id,
      blockName: flat.block.name,
      role: fp.role,
      isPrimary: fp.isPrimary,
      fromDate: fp.fromDate.toISOString(),
      toDate: fp.toDate ? fp.toDate.toISOString() : null,
      occupants: otherOccupants,
      unpaidDues: unpaidBillsSum,
      unpaidBillsCount: flat.bills.length,
      shareCertificateNumber: flat.shareCertificate?.certificateNumber || null,
      hasActiveNomination: flat.nominations.length > 0,
    }
  })

  // Map Bills
  const bills: ResidentBillItem[] = rawBills.map((b) => {
    const paid = b.status === "PAID"
      ? Number(b.amount)
      : b.payments.reduce((sum, p) => sum + Number(p.amount), 0)
    const balance = Math.max(0, Number(b.amount) - paid)

    return {
      id: b.id,
      billNumber: b.billNumber,
      flatId: b.flat.id,
      flatNumber: b.flat.number,
      blockName: b.flat.block.name,
      billType: b.billType,
      year: b.year,
      month: b.month,
      amount: Number(b.amount),
      paidAmount: paid,
      balanceAmount: balance,
      status: b.status,
      dueDate: b.dueDate ? b.dueDate.toISOString() : null,
      createdAt: b.createdAt.toISOString(),
    }
  })

  // Map Payments
  const payments: ResidentPaymentItem[] = rawPayments.map((p) => ({
    id: p.id,
    receiptNumber: p.receiptNumber,
    flatNumber: p.flat?.number || null,
    blockName: p.flat?.block?.name || null,
    amount: Number(p.amount),
    paidOn: p.paidOn.toISOString(),
    mode: p.mode,
    status: p.status,
    referenceNumber: p.reference,
    remarks: p.remarks,
  }))

  // Map Statutory Records
  const statutory: ResidentStatutoryData = {
    shareCertificates: person.shareCertificates.map((s) => ({
      id: s.id,
      certificateNumber: s.certificateNumber,
      sharesCount: s.sharesCount,
      distinctiveRange:
        s.shareDistinctFrom && s.shareDistinctTo
          ? `${s.shareDistinctFrom} – ${s.shareDistinctTo}`
          : null,
      faceValue: Number(s.faceValuePerShare) * s.sharesCount,
      issueDate: s.issueDate.toISOString(),
      status: s.status,
      flatNumber: s.flat.number,
      blockName: s.flat.block.name,
    })),
    nominations: person.nominationsFiled.map((n) => ({
      id: n.id,
      nomineeName: n.nomineeName,
      relationship: n.relationship,
      percentageShare: Number(n.percentageShare),
      status: n.status,
      nominationDate: n.nominationDate.toISOString(),
      flatNumber: n.flat.number,
      blockName: n.flat.block.name,
    })),
    liens: person.propertyLiens.map((l) => ({
      id: l.id,
      bankName: l.bankName,
      loanAccountNumber: l.loanAccountNumber,
      sanctionAmount: l.sanctionAmount ? Number(l.sanctionAmount) : null,
      nocReference: l.nocReference,
      isCleared: l.isCleared,
      flatNumber: l.flat.number,
      blockName: l.flat.block.name,
    })),
    ownershipTransfers: [
      ...person.ownershipTransfersTo.map((t) => ({
        id: t.id,
        flatNumber: t.flat.number,
        blockName: t.flat.block.name,
        transferType: t.transferType,
        transferDate: t.transferDate.toISOString(),
        isAcquisition: true,
        counterpartyName: t.fromPerson?.name || "Original Allotment",
        registeredDocNumber: t.registeredDocNumber,
        transferFeePaid: t.transferFeePaid ? Number(t.transferFeePaid) : null,
        nocReference: t.nocReference,
      })),
      ...person.ownershipTransfersFrom.map((t) => ({
        id: t.id,
        flatNumber: t.flat.number,
        blockName: t.flat.block.name,
        transferType: t.transferType,
        transferDate: t.transferDate.toISOString(),
        isAcquisition: false,
        counterpartyName: t.toPerson.name,
        registeredDocNumber: t.registeredDocNumber,
        transferFeePaid: t.transferFeePaid ? Number(t.transferFeePaid) : null,
        nocReference: t.nocReference,
      })),
    ].sort((a, b) => new Date(b.transferDate).getTime() - new Date(a.transferDate).getTime()),
    deposits: person.memberDeposits.map((d) => ({
      id: d.id,
      depositType: d.depositType,
      amount: Number(d.amount),
      status: d.status,
      receivedOn: d.receivedOn.toISOString(),
      refundedOn: d.refundedOn ? d.refundedOn.toISOString() : null,
      flatNumber: d.flat?.number || null,
      blockName: d.flat?.block?.name || null,
    })),
  }

  const currencySymbol = society.currencySymbol || "₹"

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-8 md:px-8">
      <ResidentProfileClient
        societyCode={code}
        societyId={society.id}
        currencySymbol={currencySymbol}
        resident={residentProfile}
        flats={flats}
        bills={bills}
        payments={payments}
        statutory={statutory}
        canManage={canManage}
      />
    </div>
  )
}
