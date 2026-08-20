"use client"

import { formatDateInAppTimeZone } from "@/lib/datetime"

export type PaymentReceiptData = {
  receiptNumber: string
  societyName: string
  societyCode: string
  payerName: string
  payerPhone?: string | null
  flatDisplay: string
  billPeriod?: string | null
  billType?: string | null
  amount: number
  mode: string
  reference?: string | null
  paidOn: string
  remarks?: string | null
  accountName?: string | null
}

interface PaymentReceiptModalProps {
  isOpen: boolean
  onClose: () => void
  receipt: PaymentReceiptData
}

export function PaymentReceiptModal({
  isOpen,
  onClose,
  receipt,
}: PaymentReceiptModalProps) {
  if (!isOpen) return null

  const handlePrint = () => {
    window.print()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 print:p-0"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-stone-950/40 backdrop-blur-sm transition-opacity print:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl transition-all print:max-w-none print:border-none print:shadow-none print:rounded-none">
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between border-b border-stone-100 px-6 py-5 print:hidden">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-stone-950">Payment Receipt</h3>
            <p className="mt-1 text-xs text-stone-500">Official Society Acknowledgement Slip</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
              aria-label="Close"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          {/* Society Header */}
          <div className="border-b border-stone-200 pb-5 text-center">
            <h2 className="text-lg font-black tracking-tight text-stone-950 uppercase">
              {receipt.societyName}
            </h2>
            <p className="mt-0.5 text-xs text-stone-500 font-mono font-medium">
              Registration / Code: {receipt.societyCode}
            </p>
            <div className="mt-3 inline-block rounded-full bg-stone-100 px-4 py-1 text-[11px] font-bold text-stone-700 uppercase tracking-wider">
              Official Collection Receipt
            </div>
          </div>

          {/* Receipt Meta & Payer Details */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase text-stone-500">Receipt No:</span>
              <p className="font-mono font-bold text-stone-950">{receipt.receiptNumber}</p>
            </div>

            <div className="space-y-1 text-right">
              <span className="text-[11px] font-semibold uppercase text-stone-500">Receipt Date:</span>
              <p className="font-medium text-stone-900">
                {formatDateInAppTimeZone(new Date(receipt.paidOn))}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase text-stone-500">Received From:</span>
              <p className="font-bold text-stone-950">{receipt.payerName}</p>
              {receipt.payerPhone ? (
                <p className="text-stone-500 font-mono">{receipt.payerPhone}</p>
              ) : null}
            </div>

            <div className="space-y-1 text-right">
              <span className="text-[11px] font-semibold uppercase text-stone-500">Flat / Unit:</span>
              <p className="font-bold text-stone-950">{receipt.flatDisplay}</p>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="overflow-hidden rounded-2xl border border-stone-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Description / Assessment</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                <tr>
                  <td className="px-4 py-3.5 text-stone-900">
                    <span className="font-semibold">{receipt.billType || "Maintenance Payment"}</span>
                    {receipt.billPeriod ? (
                      <span className="text-stone-500 block text-[11px]">
                        Period: {receipt.billPeriod}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3.5 text-right font-bold text-stone-950">
                    ₹{receipt.amount.toLocaleString("en-IN")}
                  </td>
                </tr>
                <tr className="bg-stone-50/70 font-bold">
                  <td className="px-4 py-3 text-stone-900">Total Received</td>
                  <td className="px-4 py-3 text-right text-emerald-700 text-sm">
                    ₹{receipt.amount.toLocaleString("en-IN")}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Payment Method Details */}
          <div className="rounded-2xl border border-stone-100 bg-stone-50/50 p-4 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-stone-500">Payment Mode:</span>
              <span className="font-semibold text-stone-900">{receipt.mode}</span>
            </div>
            {receipt.reference ? (
              <div className="flex justify-between">
                <span className="text-stone-500">Transaction Reference / UTR:</span>
                <span className="font-mono font-medium text-stone-900">{receipt.reference}</span>
              </div>
            ) : null}
            {receipt.accountName ? (
              <div className="flex justify-between">
                <span className="text-stone-500">Credited To:</span>
                <span className="font-medium text-stone-900">{receipt.accountName}</span>
              </div>
            ) : null}
            {receipt.remarks ? (
              <div className="flex justify-between">
                <span className="text-stone-500">Remarks:</span>
                <span className="text-stone-700">{receipt.remarks}</span>
              </div>
            ) : null}
          </div>

          {/* Footer Signatures */}
          <div className="flex justify-between items-end pt-8 border-t border-dashed border-stone-200 text-xs text-stone-500">
            <div>
              <p className="text-[10px] text-stone-400">Computer Generated Receipt</p>
              <p className="text-[10px] text-stone-400">No physical signature required</p>
            </div>
            <div className="text-right">
              <div className="h-8 border-b border-stone-300 w-32 mb-1"></div>
              <p className="font-semibold text-stone-700">Authorized Signatory</p>
              <p className="text-[10px] text-stone-400">{receipt.societyName}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-stone-100 bg-stone-50/50 px-6 py-4 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Print Receipt</span>
          </button>
        </div>
      </div>
    </div>
  )
}
