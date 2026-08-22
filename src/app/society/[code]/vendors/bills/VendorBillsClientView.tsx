"use client"

import { useState, useMemo, useTransition } from "react"
import Link from "next/link"
import { AdminStatCard, AdminBadge, AdminTable } from "@/components/admin"
import { CreateVendorBillModal, type VendorOption } from "./CreateVendorBillModal"
import { updateVendorBillStatus } from "./actions"
import { formatDateInAppTimeZone } from "@/lib/datetime"
import type { BillStatus } from "@/generated/prisma/client"

export type VendorBillListItem = {
  id: string
  vendorId: string
  vendorName: string
  vendorCompany: string | null
  vendorPan: string | null
  billNumber: string
  billDate: string
  dueDate: string | null
  amount: number
  gstAmount: number
  tdsAmount: number
  paidAmount: number
  netPayable: number
  status: BillStatus
  notes: string | null
  reference: string | null
}

interface VendorBillsClientViewProps {
  societyCode: string
  currencySymbol: string
  bills: VendorBillListItem[]
  vendors: VendorOption[]
  canManage: boolean
}

export function VendorBillsClientView({
  societyCode,
  currencySymbol,
  bills,
  vendors,
  canManage,
}: VendorBillsClientViewProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL")
  const [selectedVendor, setSelectedVendor] = useState<string>("ALL")
  const [isPending, startTransition] = useTransition()

  // Statistics
  const totalInvoiced = bills
    .filter((b) => b.status !== "CANCELLED")
    .reduce((sum, b) => sum + b.amount + b.gstAmount, 0)

  const totalTdsDeducted = bills
    .filter((b) => b.status !== "CANCELLED")
    .reduce((sum, b) => sum + b.tdsAmount, 0)

  const pendingPayable = bills
    .filter((b) => b.status === "PENDING" || b.status === "PARTIALLY_PAID" || b.status === "OVERDUE")
    .reduce((sum, b) => sum + (b.netPayable - b.paidAmount), 0)

  const paidCount = bills.filter((b) => b.status === "PAID").length

  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      if (selectedStatus !== "ALL" && b.status !== selectedStatus) return false
      if (selectedVendor !== "ALL" && b.vendorId !== selectedVendor) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          b.billNumber.toLowerCase().includes(q) ||
          b.vendorName.toLowerCase().includes(q) ||
          (b.vendorCompany || "").toLowerCase().includes(q) ||
          (b.reference || "").toLowerCase().includes(q) ||
          (b.notes || "").toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [bills, selectedStatus, selectedVendor, searchQuery])

  const handleStatusChange = (billId: string, status: BillStatus) => {
    startTransition(async () => {
      await updateVendorBillStatus(societyCode, billId, status)
    })
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          title="Total Invoiced (Gross)"
          value={`${currencySymbol}${totalInvoiced.toLocaleString("en-IN")}`}
          subtitle="Total bills received + GST"
          icon={
            <svg className="h-5 w-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Statutory TDS Deducted"
          value={`${currencySymbol}${totalTdsDeducted.toLocaleString("en-IN")}`}
          subtitle="Withheld for Govt Tax Challan"
          icon={
            <svg className="h-5 w-5 text-purple-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Pending Net Payable"
          value={`${currencySymbol}${pendingPayable.toLocaleString("en-IN")}`}
          subtitle="Net dues payable to contractors"
          icon={
            <svg className="h-5 w-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <AdminStatCard
          title="Settled Invoices"
          value={paidCount}
          subtitle="Fully paid vendor bills"
          icon={
            <svg className="h-5 w-5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bills, vendor, PO..."
              className="w-52 sm:w-60 rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2 pl-9 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none"
            />
            <svg
              className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-stone-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <select
            value={selectedVendor}
            onChange={(e) => setSelectedVendor(e.target.value)}
            className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-700 focus:border-stone-900 focus:outline-none"
          >
            <option value="ALL">All Vendors ({vendors.length})</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-700 focus:border-stone-900 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="PAID">PAID</option>
            <option value="OVERDUE">OVERDUE</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/society/${societyCode}/vendors`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 shadow-xs transition"
          >
            <span>← Vendors Directory</span>
          </Link>

          {canManage && (
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              <span>+ Record Vendor Bill</span>
            </button>
          )}
        </div>
      </div>

      {/* Vendor Bills Table */}
      {filteredBills.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-200 bg-white p-12 text-center shadow-xs">
          <p className="text-xs text-stone-500">No vendor invoices found matching your filter.</p>
        </div>
      ) : (
        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs">
          <AdminTable
            headers={[
              "Bill No. & Date",
              "Vendor / Contractor",
              "Gross Amount",
              "TDS Deducted",
              "Net Payable",
              "Due Date",
              "Status",
              ...(canManage ? ["Action"] : []),
            ]}
            rows={filteredBills.map((b) => (
              <tr key={b.id} className="border-t border-stone-100 text-xs hover:bg-stone-50/60 transition">
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <span className="font-mono font-bold text-stone-950 block">
                    #{b.billNumber}
                  </span>
                  <span className="text-[10px] text-stone-500 block">
                    {formatDateInAppTimeZone(b.billDate)}
                  </span>
                </td>

                <td className="px-4 py-3.5">
                  <span className="font-bold text-stone-900 block">{b.vendorName}</span>
                  {b.vendorCompany && (
                    <span className="text-[11px] text-stone-500 block">{b.vendorCompany}</span>
                  )}
                  {b.vendorPan && (
                    <span className="text-[10px] text-stone-400 font-mono block">PAN: {b.vendorPan}</span>
                  )}
                </td>

                <td className="px-4 py-3.5 font-mono">
                  <span className="font-semibold text-stone-900 block">
                    {currencySymbol}{(b.amount + b.gstAmount).toLocaleString("en-IN")}
                  </span>
                  {b.gstAmount > 0 && (
                    <span className="text-[10px] text-stone-400 block">
                      (Base: {currencySymbol}{b.amount.toLocaleString("en-IN")} + GST: {currencySymbol}{b.gstAmount.toLocaleString("en-IN")})
                    </span>
                  )}
                </td>

                <td className="px-4 py-3.5 font-mono">
                  {b.tdsAmount > 0 ? (
                    <span className="text-purple-700 font-bold block">
                      -{currencySymbol}{b.tdsAmount.toLocaleString("en-IN")}
                    </span>
                  ) : (
                    <span className="text-stone-400 text-[11px]">₹0.00 (0%)</span>
                  )}
                </td>

                <td className="px-4 py-3.5 font-mono font-bold text-stone-950 text-sm">
                  {currencySymbol}{b.netPayable.toLocaleString("en-IN")}
                </td>

                <td className="px-4 py-3.5 whitespace-nowrap text-stone-600">
                  {b.dueDate ? formatDateInAppTimeZone(b.dueDate) : "Immediate"}
                </td>

                <td className="px-4 py-3.5">
                  <AdminBadge
                    variant={
                      b.status === "PAID"
                        ? "success"
                        : b.status === "PENDING"
                          ? "warning"
                          : b.status === "OVERDUE"
                            ? "danger"
                            : "neutral"
                    }
                    size="sm"
                  >
                    {b.status}
                  </AdminBadge>
                </td>

                {canManage && (
                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {b.status !== "PAID" && b.status !== "CANCELLED" && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleStatusChange(b.id, "PAID")}
                          className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-[11px] font-semibold text-stone-700 hover:bg-emerald-50 hover:text-emerald-700 transition"
                        >
                          Mark Paid
                        </button>
                      )}

                      {b.status === "PENDING" && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleStatusChange(b.id, "CANCELLED")}
                          className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-[11px] font-semibold text-stone-400 hover:bg-red-50 hover:text-red-700 transition"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          />
        </div>
      )}

      {/* Create Modal */}
      <CreateVendorBillModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        societyCode={societyCode}
        vendors={vendors}
        currencySymbol={currencySymbol}
      />
    </div>
  )
}
