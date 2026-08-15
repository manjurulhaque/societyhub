import { notFound } from "next/navigation"
import { revalidatePath } from "next/cache"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { prisma } from "@/lib/prisma"

export default async function SocietyVendorsPage({
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

  const vendors = await prisma.vendor.findMany({
    where: { societyId: society.id, isActive: true, deletedAt: null },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { expenses: true, vendorBills: true },
      },
    },
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="inline-flex items-center rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-stone-600">
            Supplier & Contractor Directory
          </span>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-stone-900 md:text-3xl">
            Vendors & Service Providers
          </h1>
          <p className="text-sm text-stone-500">
            Register security agencies, lift maintenance providers, electricians, and contractors for {society.name}.
          </p>
        </div>
      </div>

      {/* Add Vendor Form */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-stone-950 mb-1">
          + Onboard New Vendor / Contractor
        </h2>
        <p className="text-xs text-stone-500 mb-5">
          Enter business details, GSTIN, PAN, and bank accounts for direct payments.
        </p>

        <form action={createVendor} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <input type="hidden" name="societyId" value={society.id} />
          <input type="hidden" name="code" value={code} />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Contact Person / Name *
            </label>
            <input
              type="text"
              name="name"
              required
              placeholder="e.g. Ramesh Patil"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Company / Agency Name
            </label>
            <input
              type="text"
              name="companyName"
              placeholder="e.g. Apex Security Services Pvt Ltd"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Phone Number
            </label>
            <input
              type="text"
              name="phone"
              placeholder="e.g. +91 98201 12345"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              placeholder="e.g. billing@apexsecurity.com"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              GSTIN
            </label>
            <input
              type="text"
              name="gstin"
              placeholder="e.g. 27AAAAA0000A1Z5"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs font-mono text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              PAN Number
            </label>
            <input
              type="text"
              name="panNumber"
              placeholder="e.g. ABCDE1234F"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs font-mono text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Bank Account #
            </label>
            <input
              type="text"
              name="bankAccount"
              placeholder="e.g. 50100012345678"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs font-mono text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Bank IFSC Code
            </label>
            <input
              type="text"
              name="ifscCode"
              placeholder="e.g. HDFC0000123"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs font-mono text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Office Address / Notes
            </label>
            <input
              type="text"
              name="address"
              placeholder="e.g. Shop 4, Market Complex, Road No. 2"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-950"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-xl bg-stone-950 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-stone-800"
            >
              Add Vendor
            </button>
          </div>
        </form>
      </div>

      {/* Vendors Table */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-stone-200 bg-stone-50 px-6 py-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-stone-900">Registered Vendors Directory</h2>
          <span className="text-xs text-stone-500">{vendors.length} vendors</span>
        </div>

        {vendors.length === 0 ? (
          <div className="p-12 text-center text-xs text-stone-500">
            No vendors registered yet. Onboard your first contractor or service provider above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-stone-200 bg-stone-50/50 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-4 py-3">Vendor / Agency</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Tax Identifiers</th>
                  <th className="px-4 py-3">Bank Details</th>
                  <th className="px-4 py-3 text-right">Transactions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {vendors.map((v) => (
                  <tr key={v.id} className="hover:bg-stone-50/70 transition">
                    <td className="px-4 py-3.5">
                      <span className="font-bold text-stone-950 text-xs block">
                        {v.companyName || v.name}
                      </span>
                      {v.companyName && v.name ? (
                        <span className="text-[11px] text-stone-500">
                          Contact: {v.name}
                        </span>
                      ) : null}
                    </td>

                    <td className="px-4 py-3.5 text-stone-800">
                      {v.phone ? <p className="font-medium">{v.phone}</p> : null}
                      {v.email ? <p className="text-[11px] text-stone-500">{v.email}</p> : null}
                      {!v.phone && !v.email ? <span className="text-stone-400">—</span> : null}
                    </td>

                    <td className="px-4 py-3.5 font-mono text-[11px] text-stone-700">
                      {v.gstin ? <p>GST: {v.gstin}</p> : null}
                      {v.panNumber ? <p>PAN: {v.panNumber}</p> : null}
                      {!v.gstin && !v.panNumber ? <span className="text-stone-400">—</span> : null}
                    </td>

                    <td className="px-4 py-3.5 font-mono text-[11px] text-stone-700">
                      {v.bankAccount ? <p>A/C: {v.bankAccount}</p> : null}
                      {v.ifscCode ? <p>IFSC: {v.ifscCode}</p> : null}
                      {!v.bankAccount && !v.ifscCode ? <span className="text-stone-400">—</span> : null}
                    </td>

                    <td className="px-4 py-3.5 text-right text-stone-600 font-semibold">
                      {v._count.expenses} expense payouts
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

async function createVendor(formData: FormData) {
  "use server"

  const societyId = formData.get("societyId")?.toString().trim()
  const code = formData.get("code")?.toString().trim()
  const name = formData.get("name")?.toString().trim()
  const companyName = formData.get("companyName")?.toString().trim() || null
  const phone = formData.get("phone")?.toString().trim() || null
  const email = formData.get("email")?.toString().trim() || null
  const gstin = formData.get("gstin")?.toString().trim().toUpperCase() || null
  const panNumber = formData.get("panNumber")?.toString().trim().toUpperCase() || null
  const bankAccount = formData.get("bankAccount")?.toString().trim() || null
  const ifscCode = formData.get("ifscCode")?.toString().trim().toUpperCase() || null
  const address = formData.get("address")?.toString().trim() || null

  if (!societyId || !name) {
    throw new Error("Vendor name is required")
  }

  await prisma.vendor.create({
    data: {
      societyId,
      name,
      companyName,
      phone,
      email,
      gstin,
      panNumber,
      bankAccount,
      ifscCode,
      address,
    },
  })

  revalidatePath(`/society/${code}/vendors`)
  revalidatePath(`/society/${code}/expenses`)
}
