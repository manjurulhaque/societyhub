"use server"

import { requireCommitteeAccess, COMMITTEE_ROLES } from "@/lib/auth/requireAuth"
import { prisma } from "@/lib/prisma"
import { getSafeErrorMessage } from "@/lib/errors"
import { logger } from "@/lib/logger"

/**
 * Fetches comprehensive statement and financial ledger payload for a single flat
 * to generate and download official PDF statement from anywhere in the UI.
 */
export async function getFlatStatementData(
  societyCode: string,
  flatId: string
) {
  try {
    const context = await requireCommitteeAccess(societyCode, COMMITTEE_ROLES)
    const society = context.society

    const flat = await prisma.flat.findFirst({
      where: {
        id: flatId,
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
        propertyLiens: {
          orderBy: { createdAt: "desc" },
        },
        bills: {
          orderBy: [{ year: "desc" }, { month: "desc" }],
          take: 50,
        },
        memberDeposits: {
          orderBy: { receivedOn: "desc" },
        },
      },
    })

    if (!flat) return { error: "Flat record not found." }

    const flatPayments = await prisma.payment.findMany({
      where: {
        flatId,
        societyId: society.id,
      },
      orderBy: { paidOn: "desc" },
      take: 50,
    })

    // 1. Build combined chronological ledger
    const allEvents: {
      date: string
      type: "BILL" | "PAYMENT"
      description: string
      refNumber: string
      debit: number
      credit: number
      status: string
    }[] = []

    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ]

    flat.bills.forEach((b) => {
      const period = `${monthNames[(b.month || 1) - 1]} ${b.year}`
      allEvents.push({
        date: b.dueDate ? b.dueDate.toISOString() : new Date(b.year, (b.month || 1) - 1, 1).toISOString(),
        type: "BILL",
        description: `Maintenance Bill (${period})`,
        refNumber: b.billNumber || "—",
        debit: Number(b.amount),
        credit: 0,
        status: b.status,
      })
    })

    flatPayments.forEach((p) => {
      allEvents.push({
        date: p.paidOn.toISOString(),
        type: "PAYMENT",
        description: `Maintenance Collection (${p.mode})`,
        refNumber: p.receiptNumber || "—",
        debit: 0,
        credit: Number(p.amount),
        status: p.status,
      })
    })

    allEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    let runningBalance = 0
    const ledger = allEvents.map((evt) => {
      runningBalance += evt.debit - evt.credit
      return {
        ...evt,
        balance: runningBalance,
      }
    })

    ledger.reverse()

    const totalDemanded = flat.bills.reduce((s, b) => s + Number(b.amount), 0)
    const totalPaid = flatPayments.filter((p) => p.status === "SUCCESS").reduce((s, p) => s + Number(p.amount), 0)
    const unpaidBills = flat.bills.filter((b) => b.status === "PENDING" || b.status === "OVERDUE")
    const unpaidDues = unpaidBills.reduce((s, b) => s + Number(b.amount), 0)
    const activeDepositsTotal = flat.memberDeposits
      .filter((d) => d.status === "HELD")
      .reduce((s, d) => s + Number(d.amount), 0)

    const owner = flat.ownershipHistory.find((h) => h.isCurrentOwner) || flat.ownershipHistory[0]

    return {
      success: true,
      data: {
        society: {
          name: society.name,
          code: society.code,
          address: society.address,
          city: society.city,
          state: society.state,
          pincode: society.pincode,
          registrationNumber: society.registrationNumber,
          panNumber: society.panNumber,
          gstin: society.gstin,
          currencySymbol: society.currencySymbol || "₹",
        },
        flat: {
          number: flat.number,
          blockName: flat.block.name,
          floor: flat.floor,
          unitType: flat.unitType,
          area: flat.area ? Number(flat.area) : null,
          areaUnit: flat.areaUnit,
          status: flat.status,
          parkingSlot: flat.parkingSlot,
          intercomNumber: flat.intercomNumber,
        },
        currentOwner: owner
          ? {
              name: owner.toPerson.name,
              fromDate: owner.fromDate.toISOString(),
              registrationDoc: owner.registeredDocNumber,
            }
          : null,
        activeOccupants: flat.people
          .filter((p) => !p.toDate)
          .map((p) => ({
            name: p.person.name,
            role: p.role,
            phone: p.person.phone,
            email: p.person.email,
            fromDate: p.fromDate.toISOString(),
          })),
        statutory: {
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
          activeLiens: flat.propertyLiens
            .filter((l) => !l.isCleared)
            .map((l) => ({
              bankName: l.bankName,
              loanAccountNumber: l.loanAccountNumber,
              sanctionAmount: l.sanctionAmount ? Number(l.sanctionAmount) : null,
              nocReference: l.nocReference,
            })),
        },
        summary: {
          totalDemanded,
          totalPaid,
          currentOutstanding: unpaidDues,
          activeDeposits: activeDepositsTotal,
          unpaidBillsCount: unpaidBills.length,
        },
        ledger,
        deposits: flat.memberDeposits.map((d) => ({
          depositType: d.depositType,
          amount: Number(d.amount),
          status: d.status,
          receivedOn: d.receivedOn.toISOString(),
          refundedOn: d.refundedOn ? d.refundedOn.toISOString() : null,
        })),
      },
    }
  } catch (err: unknown) {
    logger.error("Failed to fetch flat statement data", err, "getFlatStatementData", { societyCode, flatId })
    return { error: getSafeErrorMessage(err, "Failed to generate statement data.") }
  }
}
