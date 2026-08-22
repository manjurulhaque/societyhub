import Link from "next/link"
import { notFound } from "next/navigation"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { requireCommitteeAccess, FINANCIAL_ROLES } from "@/lib/auth/requireAuth"
import { recordAuditLog } from "@/lib/audit"
import { encryptData } from "@/lib/crypto"
import { sanitizeText } from "@/lib/sanitize"
import { maskBankAccount } from "@/lib/masking"
import { prisma } from "@/lib/prisma"
import type { AccountType, LedgerGroup, BalanceType } from "@/generated/prisma/client"

export default async function NewSocietyAccountPage({
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

  async function createSocietyAccount(formData: FormData) {
    "use server"

    const authContext = await requireCommitteeAccess(code, FINANCIAL_ROLES)
    const verifiedSocietyId = authContext.society.id

    const rawName = formData.get("name")?.toString().trim()
    const name = sanitizeText(rawName)
    const accountType = formData.get("accountType")?.toString().trim() || "BANK"
    const rawBankName = formData.get("bankName")?.toString().trim() || null
    const bankName = rawBankName ? sanitizeText(rawBankName) : null
    const rawAccountNumber = formData.get("accountNumber")?.toString().trim() || null
    const accountNumber = rawAccountNumber ? encryptData(rawAccountNumber) : null
    const rawIfsc = formData.get("ifscCode")?.toString().trim().toUpperCase() || null
    const ifscCode = rawIfsc ? sanitizeText(rawIfsc) : null
    const rawBranch = formData.get("branch")?.toString().trim() || null
    const branch = rawBranch ? sanitizeText(rawBranch) : null
    const rawOpeningBalance = formData.get("openingBalance")?.toString().trim()
    const isDefault = formData.get("isDefault") === "true"

    if (!name) {
      throw new Error("Account name is required")
    }

    const openingBalance = rawOpeningBalance ? parseFloat(rawOpeningBalance) : 0
    const validOpening = !isNaN(openingBalance) ? openingBalance : 0

    if (isDefault) {
      await prisma.account.updateMany({
        where: { societyId: verifiedSocietyId },
        data: { isDefault: false },
      })
    }

    const account = await prisma.account.create({
      data: {
        societyId: verifiedSocietyId,
        name,
        accountType: accountType as AccountType,
        bankName,
        accountNumber,
        ifscCode,
        branch,
        openingBalance: validOpening,
        currentBalance: validOpening,
        isDefault,
      },
    })

    // Auto-sync / link a corresponding sub-ledger under "Cash & Bank Balances" in Chart of Accounts
    const parentCashBank = await prisma.ledger.findFirst({
      where: {
        societyId: verifiedSocietyId,
        OR: [
          { code: "1100" },
          { name: { contains: "Cash & Bank", mode: "insensitive" } },
        ],
      },
    })

    const existingLedger = await prisma.ledger.findUnique({
      where: {
        societyId_name: {
          societyId: verifiedSocietyId,
          name,
        },
      },
    })

    if (!existingLedger) {
      await prisma.ledger.create({
        data: {
          societyId: verifiedSocietyId,
          name,
          group: "ASSET" as LedgerGroup,
          balanceType: "DEBIT" as BalanceType,
          openingBalance: validOpening,
          parentLedgerId: parentCashBank?.id ?? null,
          description: accountType === "BANK"
            ? `Bank Account - ${bankName ?? ""} (A/C: ${accountNumber ? maskBankAccount(accountNumber) : ""})`
            : "Cash / Imprest Float Account",
          isSystem: false,
        },
      })
    }

    await recordAuditLog({
      societyId: verifiedSocietyId,
      userId: authContext.user.id,
      action: "CREATE",
      entity: "Account",
      entityId: account.id,
      description: `${authContext.user.email} added account ${name} (${accountType})`,
      newData: { name, accountType, bankName, accountNumber, validOpening },
    })

    revalidatePath(`/society/${code}/accounts`)
    revalidatePath(`/society/${code}/ledgers`)
    revalidatePath("/admin/accounts")
    redirect(`/society/${code}/accounts`)
  }


  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <span className="inline-flex items-center rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-stone-600">
          Account Setup
        </span>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-stone-900 md:text-3xl">
          Add Bank or Cash Account
        </h1>
        <p className="text-sm text-stone-500">
          Add an operational bank account, sinking fund account, or cash in hand ledger for {society.name}.
        </p>
      </div>

      <form action={createSocietyAccount} className="space-y-6">
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-stone-950">Account Details</h2>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
              Account Name / Ledger Title *
            </label>
            <input
              type="text"
              name="name"
              required
              placeholder="e.g. HDFC Main Operational A/C"
              className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
              Account Category *
            </label>
            <select
              name="accountType"
              defaultValue="BANK"
              className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            >
              <option value="BANK">Bank Account (Current / Savings)</option>
              <option value="CASH">Cash in Hand Register</option>
              <option value="PETTY_CASH">Petty Cash Float (Imprest)</option>
            </select>
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-stone-950">Banking & Balance Details</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                Bank Name
              </label>
              <input
                type="text"
                name="bankName"
                placeholder="e.g. HDFC Bank, SBI"
                className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                Account Number
              </label>
              <input
                type="text"
                name="accountNumber"
                placeholder="e.g. 50200012345678"
                className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                IFSC Code
              </label>
              <input
                type="text"
                name="ifscCode"
                placeholder="e.g. HDFC0000123"
                className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                Branch Location
              </label>
              <input
                type="text"
                name="branch"
                placeholder="e.g. Bandra West Branch"
                className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                Opening Balance (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                name="openingBalance"
                defaultValue="0"
                required
                className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
              />
            </div>

            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 text-xs font-semibold text-stone-800 cursor-pointer">
                <input
                  type="checkbox"
                  name="isDefault"
                  value="true"
                  className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-950"
                />
                <span>Set as Default Collection Account</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href={`/society/${code}/accounts`}
            className="rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="rounded-full bg-stone-950 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-800"
          >
            Save Account
          </button>
        </div>
      </form>
    </div>
  )
}
