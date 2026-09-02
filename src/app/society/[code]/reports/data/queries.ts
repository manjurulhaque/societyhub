import { prisma } from "@/lib/prisma"

export async function fetchRawSocietyReportData(societyId: string) {
  const [
    billAggregate,
    paymentAggregate,
    expenseAggregate,
    billsByTypeRaw,
    paymentsByModeRaw,
    expensesRaw,
    accounts,
    fixedDeposits,
    fixedAssetsRaw,
    flats,
    vendorBillsRaw,
    chequesRaw,
    budgetsRaw,
    shareCertificatesRaw,
    nominationsRaw,
    propertyLiensRaw,
    memberDepositsRaw,
    financialYearsRaw,
    monthlyBills,
    monthlyPayments,
    monthlyExpenses,
    oneTimeCollectionsRaw,
    memberDepositsDetailed,
  ] = await Promise.all([
    prisma.bill.aggregate({
      where: { societyId },
      _sum: { amount: true, lateFeeAmount: true },
      _count: { _all: true },
    }),

    prisma.payment.aggregate({
      where: { societyId, status: "SUCCESS" },
      _sum: { amount: true, lateFeePaid: true, discountApplied: true },
      _count: { _all: true },
    }),

    prisma.expense.aggregate({
      where: { societyId, status: { in: ["PAID", "APPROVED"] } },
      _sum: { amount: true },
      _count: { _all: true },
    }),

    prisma.bill.groupBy({
      by: ["billType"],
      where: { societyId },
      _sum: { amount: true },
      _count: { _all: true },
    }),

    prisma.payment.groupBy({
      by: ["mode"],
      where: { societyId, status: "SUCCESS" },
      _sum: { amount: true },
      _count: { _all: true },
    }),

    prisma.expense.findMany({
      where: { societyId, status: { in: ["PAID", "APPROVED"] } },
      include: { category: { select: { name: true } } },
    }),

    prisma.account.findMany({
      where: { societyId, isActive: true, deletedAt: null },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    }),

    prisma.fixedDeposit.findMany({
      where: { societyId },
      orderBy: { maturityDate: "asc" },
    }),

    prisma.fixedAsset.findMany({
      where: { societyId, isActive: true, deletedAt: null },
      include: {
        category: { select: { name: true } },
        amcVendor: { select: { name: true, companyName: true } },
      },
      orderBy: { name: "asc" },
    }),

    prisma.flat.findMany({
      where: {
        block: { societyId },
        isActive: true,
        deletedAt: null,
      },
      include: {
        block: { select: { name: true } },
        people: {
          where: { toDate: null },
          include: { person: true },
          orderBy: { isPrimary: "desc" },
        },
        bills: {
          include: {
            payments: {
              where: { status: "SUCCESS" },
              select: { amount: true },
            },
          },
          orderBy: { dueDate: "asc" },
        },
        advancePayments: {
          where: { status: "SUCCESS", isAdvance: true },
          select: { amount: true },
        },
      },
      orderBy: [
        { block: { name: "asc" } },
        { number: "asc" },
      ],
    }),

    prisma.vendorBill.findMany({
      where: { societyId },
      include: {
        vendor: { select: { id: true, name: true, companyName: true, phone: true } },
      },
      orderBy: { billDate: "desc" },
    }),

    prisma.chequeRegister.findMany({
      where: { societyId },
      include: {
        account: { select: { name: true, bankName: true } },
      },
      orderBy: { chequeDate: "desc" },
    }),

    prisma.budget.findMany({
      where: { societyId },
      include: {
        financialYear: { select: { name: true } },
        items: {
          include: { ledger: { select: { name: true } } },
        },
      },
    }),

    prisma.shareCertificate.findMany({
      where: { societyId },
      include: {
        flat: { select: { number: true, block: { select: { name: true } } } },
        person: { select: { name: true } },
      },
      orderBy: { certificateNumber: "asc" },
    }),

    prisma.nomination.findMany({
      where: { societyId },
      include: {
        flat: { select: { number: true, block: { select: { name: true } } } },
        person: { select: { name: true } },
      },
      orderBy: { nominationDate: "desc" },
    }),

    prisma.propertyLien.findMany({
      where: { societyId },
      include: {
        flat: { select: { number: true, block: { select: { name: true } } } },
        person: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),

    prisma.memberDeposit.findMany({
      where: { societyId, status: "HELD" },
      select: { amount: true },
    }),

    prisma.financialYear.findMany({
      where: { societyId },
      orderBy: { startYear: "desc" },
      select: {
        id: true,
        name: true,
        startYear: true,
        endYear: true,
        isCurrent: true,
      },
    }),

    prisma.bill.findMany({
      where: { societyId },
      select: {
        year: true,
        month: true,
        amount: true,
        billType: true,
      },
    }),

    prisma.payment.findMany({
      where: { societyId, status: "SUCCESS" },
      select: {
        paidOn: true,
        amount: true,
      },
    }),

    prisma.expense.findMany({
      where: { societyId, status: { in: ["PAID", "APPROVED"] } },
      select: {
        expenseDate: true,
        amount: true,
      },
    }),

    prisma.oneTimeCollection.findMany({
      where: { societyId },
      include: {
        allocations: {
          include: {
            flat: {
              select: {
                id: true,
                number: true,
                area: true,
                block: { select: { name: true } },
                people: {
                  where: { toDate: null },
                  include: { person: true },
                  orderBy: { isPrimary: "desc" },
                },
              },
            },
            installments: {
              orderBy: { installmentNumber: "asc" },
            },
          },
        },
      },
      orderBy: { startDate: "desc" },
    }),

    prisma.memberDeposit.findMany({
      where: { societyId },
      include: {
        flat: { select: { number: true, block: { select: { name: true } } } },
        person: { select: { name: true, phone: true } },
      },
      orderBy: { receivedOn: "desc" },
    }),
  ])

  return {
    billAggregate,
    paymentAggregate,
    expenseAggregate,
    billsByTypeRaw,
    paymentsByModeRaw,
    expensesRaw,
    accounts,
    fixedDeposits,
    fixedAssetsRaw,
    flats,
    vendorBillsRaw,
    chequesRaw,
    budgetsRaw,
    shareCertificatesRaw,
    nominationsRaw,
    propertyLiensRaw,
    memberDepositsRaw,
    financialYearsRaw,
    monthlyBills,
    monthlyPayments,
    monthlyExpenses,
    oneTimeCollectionsRaw,
    memberDepositsDetailed,
  }
}

export type RawSocietyReportData = Awaited<ReturnType<typeof fetchRawSocietyReportData>>
