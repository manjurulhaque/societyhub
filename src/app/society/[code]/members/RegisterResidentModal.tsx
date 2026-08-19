"use client"

import { useState, useTransition } from "react"
import { registerResident } from "./residentActions"
import type { FlatRole } from "@/generated/prisma/client"

export type FlatOption = {
  id: string
  number: string
  blockName: string
}

interface RegisterResidentModalProps {
  isOpen: boolean
  onClose: () => void
  societyCode: string
  availableFlats: FlatOption[]
}

const FLAT_ROLE_OPTIONS: { value: FlatRole; label: string; desc: string }[] = [
  { value: "OWNER", label: "Primary Owner", desc: "Title deed holder of the flat unit" },
  { value: "JOINT_OWNER", label: "Joint / Co-Owner", desc: "Secondary title deed holder" },
  { value: "TENANT", label: "Tenant / Lessee", desc: "Rental agreement occupant" },
  { value: "FAMILY", label: "Family Member", desc: "Residing family relation" },
]

export function RegisterResidentModal({
  isOpen,
  onClose,
  societyCode,
  availableFlats,
}: RegisterResidentModalProps) {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [panNumber, setPanNumber] = useState("")
  const [aadhaarNumber, setAadhaarNumber] = useState("")
  const [permanentAddress, setPermanentAddress] = useState("")
  const [emergencyContactName, setEmergencyContactName] = useState("")
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("")

  const [flatId, setFlatId] = useState(availableFlats[0]?.id || "")
  const [role, setRole] = useState<FlatRole>("OWNER")
  const [fromDate, setFromDate] = useState(new Date().toISOString().split("T")[0])

  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (!isOpen) return null

  const handleSave = () => {
    if (!name.trim()) {
      setError("Please enter the resident's full name.")
      return
    }

    setError(null)

    startTransition(async () => {
      try {
        const res = await registerResident(societyCode, {
          name: name.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          panNumber: panNumber.trim() || undefined,
          aadhaarNumber: aadhaarNumber.trim() || undefined,
          permanentAddress: permanentAddress.trim() || undefined,
          emergencyContactName: emergencyContactName.trim() || undefined,
          emergencyContactPhone: emergencyContactPhone.trim() || undefined,
          flatId: flatId || undefined,
          role,
          fromDate,
        })

        if (res.error) {
          setError(res.error)
        } else {
          setName("")
          setPhone("")
          setEmail("")
          setPanNumber("")
          setAadhaarNumber("")
          setPermanentAddress("")
          onClose()
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to register resident."
        setError(msg)
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-stone-950/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl transition-all">
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between border-b border-stone-100 px-6 py-5">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-stone-950">Register New Resident</h3>
            <p className="mt-1 text-xs text-stone-500">
              Add a property owner, tenant, or family member and map them to their flat unit.
            </p>
          </div>

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

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {error ? (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
              <svg className="h-4 w-4 shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          ) : null}

          {/* Personal Info */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-900 mb-3">
              Personal & Contact Information
            </h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isPending}
                  placeholder="e.g. Anand R. Kulkarni"
                  className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isPending}
                  placeholder="+91 98765 43210"
                  className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isPending}
                  placeholder="resident@example.com"
                  className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  PAN Number (Optional)
                </label>
                <input
                  type="text"
                  value={panNumber}
                  onChange={(e) => setPanNumber(e.target.value)}
                  disabled={isPending}
                  placeholder="ABCDE1234F"
                  className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Aadhaar Number (Optional)
                </label>
                <input
                  type="text"
                  value={aadhaarNumber}
                  onChange={(e) => setAadhaarNumber(e.target.value)}
                  disabled={isPending}
                  placeholder="XXXX-XXXX-1234"
                  className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Emergency Contact Name
                </label>
                <input
                  type="text"
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                  disabled={isPending}
                  placeholder="e.g. Smt. Sunita Kulkarni"
                  className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Emergency Contact Phone
                </label>
                <input
                  type="tel"
                  value={emergencyContactPhone}
                  onChange={(e) => setEmergencyContactPhone(e.target.value)}
                  disabled={isPending}
                  placeholder="+91 98111 22233"
                  className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Flat Assignment Section */}
          <div className="space-y-4 pt-4 border-t border-stone-100">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-900">
                Flat Unit & Occupancy Assignment
              </h4>
              <p className="text-xs text-stone-500">
                Assign this resident to their corresponding flat and tenancy status.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Assigned Flat
                </label>
                <select
                  value={flatId}
                  onChange={(e) => setFlatId(e.target.value)}
                  disabled={isPending}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none"
                >
                  <option value="">No flat assigned yet</option>
                  {availableFlats.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.blockName} - {f.number}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Occupancy Start Date
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  disabled={isPending}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {/* Flat Role selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
                Resident Role in Flat
              </label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {FLAT_ROLE_OPTIONS.map((opt) => {
                  const isSelected = role === opt.value

                  return (
                    <label
                      key={opt.value}
                      className={`flex cursor-pointer items-start gap-2.5 rounded-2xl border p-3 transition-colors ${
                        isSelected
                          ? "border-stone-900 bg-stone-50 shadow-2xs"
                          : "border-stone-200 bg-white hover:border-stone-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="flatRole"
                        value={opt.value}
                        checked={isSelected}
                        onChange={() => setRole(opt.value)}
                        disabled={isPending}
                        className="mt-0.5 h-4 w-4 shrink-0 text-stone-900 focus:ring-stone-900"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="block text-xs font-bold text-stone-900">{opt.label}</span>
                        <p className="mt-0.5 text-[11px] text-stone-500 leading-tight">
                          {opt.desc}
                        </p>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-stone-100 bg-stone-50/50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition disabled:opacity-50"
          >
            {isPending ? (
              <>
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Registering...</span>
              </>
            ) : (
              <span>Register Resident</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
