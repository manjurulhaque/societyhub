import Link from "next/link"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import type { AccountType } from "@/generated/prisma/client"
import {
  AdminPageHeader,
  AdminCard,
  AdminSelect,
  AdminInput,
  AdminButton,
} from "@/components/admin"

export default async function NewAccountPage() {
  const societies = await prisma.society.findMany({
    where: { isActive: true, deletedAt: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  })

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-6 py-8 md:px-8">
      <AdminPageHeader
        eyebrow="Treasury Setup"
        title="Create Bank or Cash Account"
        description="Register an operational bank account, reserve fund account, or cash in hand float for a society."
        action={
          <Link
            href="/admin/accounts"
            className="rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-stone-700 transition hover:bg-stone-100 shadow-sm"
          >
            Cancel
          </Link>
        }
      />

      <form action={createAccount} className="space-y-8">
        {/* 1. Account Classification */}
        <AdminCard
          title="Account Classification & Society"
          description="Select the housing society and financial account category"
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Housing Society *
              </label>
              <AdminSelect
                name="societyId"
                required
                options={[
                  { label: "Select a housing society...", value: "", disabled: true },
                  ...societies.map((s) => ({
                    label: s.code ? `${s.name} (${s.code})` : s.name,
                    value: s.id,
                  })),
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Account Name / Ledger Label *
              </label>
              <AdminInput
                name="name"
                required
                placeholder="e.g. HDFC Main Operational A/C"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Account Type *
              </label>
              <AdminSelect
                name="accountType"
                defaultValue="BANK"
                options={[
                  { label: "Bank Account (Current / Savings)", value: "BANK" },
                  { label: "Cash in Hand", value: "CASH" },
                  { label: "Petty Cash Float (Imprest)", value: "PETTY_CASH" },
                ]}
              />
            </div>
          </div>
        </AdminCard>

        {/* 2. Banking Details */}
        <AdminCard
          title="Banking Credentials & Balances"
          description="Account number, IFSC code, and opening ledger balance"
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Bank Name
              </label>
              <AdminInput
                name="bankName"
                placeholder="e.g. HDFC Bank, SBI, ICICI"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Bank Account Number
              </label>
              <AdminInput
                name="accountNumber"
                placeholder="e.g. 50200012345678"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                IFSC Code
              </label>
              <AdminInput
                name="ifscCode"
                placeholder="e.g. HDFC0000123"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Branch Name / Location
              </label>
              <AdminInput
                name="branch"
                placeholder="e.g. Bandra West Branch"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Opening Balance (₹) *
              </label>
              <AdminInput
                name="openingBalance"
                type="number"
                step="0.01"
                defaultValue="0"
                required
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
                <span>Set as Default Collection Account for Society</span>
              </label>
            </div>
          </div>
        </AdminCard>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/admin/accounts"
            className="rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
          >
            Cancel
          </Link>
          <AdminButton type="submit" variant="primary" size="lg">
            Create Account
          </AdminButton>
        </div>
      </form>
    </div>
  )
}

async function createAccount(formData: FormData) {
  "use server"

  const societyId = formData.get("societyId")?.toString().trim()
  const name = formData.get("name")?.toString().trim()
  const accountType = formData.get("accountType")?.toString().trim() || "BANK"
  const bankName = formData.get("bankName")?.toString().trim() || null
  const accountNumber = formData.get("accountNumber")?.toString().trim() || null
  const ifscCode = formData.get("ifscCode")?.toString().trim().toUpperCase() || null
  const branch = formData.get("branch")?.toString().trim() || null
  const rawOpeningBalance = formData.get("openingBalance")?.toString().trim()
  const isDefault = formData.get("isDefault") === "true"

  if (!societyId || !name) {
    throw new Error("Society and account name are required")
  }

  const openingBalance = rawOpeningBalance ? parseFloat(rawOpeningBalance) : 0
  const validOpening = !isNaN(openingBalance) ? openingBalance : 0

  if (isDefault) {
    // Unset other default accounts in this society
    await prisma.account.updateMany({
      where: { societyId },
      data: { isDefault: false },
    })
  }

  await prisma.account.create({
    data: {
      societyId,
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

  revalidatePath("/admin/accounts")
  revalidatePath(`/society/${societyId}/accounts`)
  redirect("/admin/accounts")
}
