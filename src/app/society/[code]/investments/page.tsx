import { notFound } from "next/navigation"

import { revalidatePath } from "next/cache"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { prisma } from "@/lib/prisma"
import { formatDateInAppTimeZone } from "@/lib/datetime"
import type { PayoutFrequency, FdStatus } from "@/generated/prisma/client"

export default async function SocietyInvestmentsPage({
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

  const [fixedDeposits, accounts] = await Promise.all([
    prisma.fixedDeposit.findMany({
      where: { societyId: society.id },
      orderBy: { maturityDate: "asc" },
    }),
    prisma.account.findMany({
      where: { societyId: society.id, accountType: "BANK", isActive: true, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, currentBalance: true },
    }),
  ])

  const activeFds = fixedDeposits.filter((fd) => fd.status === "ACTIVE")
  const totalPrincipal = activeFds.reduce((acc, fd) => acc + Number(fd.principalAmount), 0)
  const totalMaturity = activeFds.reduce((acc, fd) => acc + Number(fd.maturityAmount || fd.principalAmount), 0)
  const projectedInterest = Math.max(0, totalMaturity - totalPrincipal)

  const today = new Date().toISOString().split("T")[0]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="inline-flex items-center rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-stone-600">
            Treasury & Sinking Funds
          </span>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-stone-900 md:text-3xl">
            Fixed Deposits & Investments
          </h1>
          <p className="text-sm text-stone-500">
            Manage long-term reserve fund investments, fixed deposit certificates, and maturity proceeds for {society.name}.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
            Active Invested Principal
          </p>
          <p className="mt-2 text-2xl font-bold text-stone-950">
            ₹{totalPrincipal.toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            {activeFds.length} active fixed deposits
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
            Projected Maturity Corpus
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">
            ₹{totalMaturity.toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            Principal + compounding interest
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
            Projected Interest Yield
          </p>
          <p className="mt-2 text-2xl font-bold text-blue-700">
            ₹{projectedInterest.toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            Total interest earned
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
            Total FD Certificates
          </p>
          <p className="mt-2 text-2xl font-bold text-stone-950">
            {fixedDeposits.length}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            {fixedDeposits.filter((fd) => fd.status === "MATURED").length} matured / settled
          </p>
        </div>
      </div>

      {/* Book New FD Form */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-stone-950 mb-1">
          + Book New Fixed Deposit (FD)
        </h2>
        <p className="text-xs text-stone-500 mb-5">
          Invest society sinking / repair reserves into scheduled bank fixed deposits.
        </p>

        <form action={bookFixedDeposit} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <input type="hidden" name="societyId" value={society.id} />
          <input type="hidden" name="code" value={code} />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Bank Name *
            </label>
            <input
              type="text"
              name="bankName"
              required
              placeholder="e.g. State Bank of India"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Branch Name
            </label>
            <input
              type="text"
              name="branch"
              placeholder="e.g. Andheri East Branch"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              FD Certificate / Receipt # *
            </label>
            <input
              type="text"
              name="fdNumber"
              required
              placeholder="e.g. FD-SBI-2026-081"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs font-mono font-bold text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Principal Amount (₹) *
            </label>
            <input
              type="number"
              step="0.01"
              name="principalAmount"
              required
              placeholder="e.g. 500000"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs font-bold text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Interest Rate (% p.a.) *
            </label>
            <input
              type="number"
              step="0.01"
              name="interestRate"
              required
              placeholder="e.g. 7.25"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs font-bold text-emerald-700 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Deposit Start Date *
            </label>
            <input
              type="date"
              name="startDate"
              required
              defaultValue={today}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Maturity Date *
            </label>
            <input
              type="date"
              name="maturityDate"
              required
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Maturity Amount (₹) *
            </label>
            <input
              type="number"
              step="0.01"
              name="maturityAmount"
              required
              placeholder="e.g. 537150"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs font-bold text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Compounding Payout Frequency
            </label>
            <select
              name="interestPayout"
              defaultValue="ON_MATURITY"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            >
              <option value="ON_MATURITY">On Maturity (Cumulative)</option>
              <option value="QUARTERLY">Quarterly Payout</option>
              <option value="MONTHLY">Monthly Payout</option>
              <option value="ANNUALLY">Annual Payout</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Paid From Bank Account (Optional)
            </label>
            <select
              name="accountId"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            >
              <option value="">Do not debit bank account (Direct)...</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} (Bal: ₹{Number(a.currentBalance).toLocaleString("en-IN")})
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Remarks / Fund Allocation
            </label>
            <input
              type="text"
              name="remarks"
              placeholder="e.g. Sinking Fund Reserve allocation for 2026-27"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-xl bg-stone-950 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-stone-800"
            >
              Book Deposit & Disburse
            </button>
          </div>
        </form>
      </div>

      {/* Fixed Deposits Table */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-stone-200 bg-stone-50 px-6 py-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-stone-900">Fixed Deposit Portfolio</h2>
          <span className="text-xs text-stone-500">{fixedDeposits.length} deposits</span>
        </div>

        {fixedDeposits.length === 0 ? (
          <div className="p-12 text-center text-xs text-stone-500">
            No fixed deposits booked yet. Invest your first reserve fund above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-stone-200 bg-stone-50/50 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-4 py-3">FD Number & Bank</th>
                  <th className="px-4 py-3 text-right">Principal (₹)</th>
                  <th className="px-4 py-3 text-center">Interest Rate</th>
                  <th className="px-4 py-3 text-right">Maturity Value (₹)</th>
                  <th className="px-4 py-3">Start & Maturity Date</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {fixedDeposits.map((fd) => (
                  <tr key={fd.id} className="hover:bg-stone-50/70 transition">
                    <td className="px-4 py-3.5">
                      <span className="font-mono font-bold text-stone-950 text-xs block">
                        {fd.fdNumber}
                      </span>
                      <span className="text-[11px] text-stone-600">
                        {fd.bankName} {fd.branch ? `(${fd.branch})` : ""}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-right font-bold text-stone-950">
                      ₹{Number(fd.principalAmount).toLocaleString("en-IN")}
                    </td>

                    <td className="px-4 py-3.5 text-center font-bold text-emerald-700">
                      {Number(fd.interestRate)}%
                      <span className="text-[9px] text-stone-500 font-normal block">
                        {fd.interestPayout.toLowerCase().replace(/_/g, " ")}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-right font-bold text-stone-950">
                      ₹{Number(fd.maturityAmount).toLocaleString("en-IN")}
                    </td>

                    <td className="px-4 py-3.5 text-stone-700">
                      <p>{formatDateInAppTimeZone(fd.maturityDate)}</p>
                      <p className="text-[10px] text-stone-400">
                        Started {formatDateInAppTimeZone(fd.startDate)}
                      </p>
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          fd.status === "ACTIVE"
                            ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                            : fd.status === "MATURED"
                              ? "bg-blue-50 border border-blue-200 text-blue-700"
                              : "bg-stone-100 text-stone-700"
                        }`}
                      >
                        {fd.status}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      {fd.status === "ACTIVE" ? (
                        <form action={settleMaturity} className="inline-block">
                          <input type="hidden" name="fdId" value={fd.id} />
                          <input type="hidden" name="code" value={code} />
                          <button
                            type="submit"
                            className="rounded-lg border border-blue-300 bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-800 hover:bg-blue-100 transition shadow-sm"
                          >
                            Mark Matured ✓
                          </button>
                        </form>
                      ) : (
                        <span className="text-[10px] text-stone-400">Settled</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

import { requireSocietyAccess } from "@/lib/auth/requireAuth"
import { recordAuditLog } from "@/lib/audit"

async function bookFixedDeposit(formData: FormData) {
  "use server"

  const code = formData.get("code")?.toString().trim()
  if (!code) throw new Error("Society code is required")

  const authContext = await requireSocietyAccess(code)
  const verifiedSocietyId = authContext.society.id

  const bankName = formData.get("bankName")?.toString().trim()
  const branch = formData.get("branch")?.toString().trim() || null
  const fdNumber = formData.get("fdNumber")?.toString().trim()
  const rawPrincipal = formData.get("principalAmount")?.toString().trim()
  const rawRate = formData.get("interestRate")?.toString().trim()
  const startDateStr = formData.get("startDate")?.toString().trim()
  const maturityDateStr = formData.get("maturityDate")?.toString().trim()
  const rawMaturity = formData.get("maturityAmount")?.toString().trim()
  const interestPayout = formData.get("interestPayout")?.toString().trim() || "ON_MATURITY"
  const accountId = formData.get("accountId")?.toString().trim() || null
  const remarks = formData.get("remarks")?.toString().trim() || null

  if (!bankName || !fdNumber || !rawPrincipal || !rawRate || !startDateStr || !maturityDateStr || !rawMaturity) {
    throw new Error("All required fields must be filled")
  }

  const principalAmount = parseFloat(rawPrincipal)
  const interestRate = parseFloat(rawRate)
  const maturityAmount = parseFloat(rawMaturity)

  if (isNaN(principalAmount) || principalAmount <= 0) {
    throw new Error("Invalid principal amount")
  }

  await prisma.$transaction(async (tx) => {
    // If accountId provided, verify it belongs to this society
    if (accountId) {
      const account = await tx.account.findFirst({
        where: { id: accountId, societyId: verifiedSocietyId },
      })
      if (!account) {
        throw new Error("Specified account does not belong to this society")
      }
    }

    const fd = await tx.fixedDeposit.create({
      data: {
        societyId: verifiedSocietyId,
        bankName,
        branch,
        fdNumber,
        principalAmount,
        interestRate: !isNaN(interestRate) ? interestRate : 0,
        startDate: new Date(startDateStr),
        maturityDate: new Date(maturityDateStr),
        maturityAmount: !isNaN(maturityAmount) ? maturityAmount : principalAmount,
        interestPayout: interestPayout as PayoutFrequency,
        status: "ACTIVE" as FdStatus,
        remarks,
      },
    })

    // If linked bank account provided, deduct principal
    if (accountId) {
      await tx.account.update({
        where: { id: accountId },
        data: {
          currentBalance: { decrement: principalAmount },
        },
      })
    }

    await recordAuditLog({
      societyId: verifiedSocietyId,
      userId: authContext.user.id,
      action: "CREATE",
      entity: "FixedDeposit",
      entityId: fd.id,
      description: `${authContext.user.email} booked Fixed Deposit ₹${principalAmount} with ${bankName} (FD #${fdNumber})`,
      newData: { bankName, fdNumber, principalAmount, interestRate, maturityAmount },
    })
  })

  revalidatePath(`/society/${code}/investments`)
  revalidatePath(`/society/${code}/accounts`)
  revalidatePath("/admin/investments")
  revalidatePath("/admin/accounts")
}

async function settleMaturity(formData: FormData) {
  "use server"

  const code = formData.get("code")?.toString().trim()
  const fdId = formData.get("fdId")?.toString().trim()

  if (!code || !fdId) return

  const authContext = await requireSocietyAccess(code)
  const verifiedSocietyId = authContext.society.id

  // Verify FD belongs to this society (IDOR prevention)
  const fd = await prisma.fixedDeposit.findFirst({
    where: { id: fdId, societyId: verifiedSocietyId },
  })

  if (!fd) {
    throw new Error("Fixed deposit not found for this society")
  }

  await prisma.fixedDeposit.update({
    where: { id: fdId },
    data: {
      status: "MATURED",
    },
  })

  await recordAuditLog({
    societyId: verifiedSocietyId,
    userId: authContext.user.id,
    action: "STATUS_CHANGE",
    entity: "FixedDeposit",
    entityId: fdId,
    description: `${authContext.user.email} marked Fixed Deposit ${fd.fdNumber} as MATURED`,
  })

  revalidatePath(`/society/${code}/investments`)
  revalidatePath(`/society/${code}/accounts`)
  revalidatePath("/admin/investments")
  revalidatePath("/admin/accounts")
}

