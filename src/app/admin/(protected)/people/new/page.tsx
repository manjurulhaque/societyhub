import Link from "next/link"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import {
  AdminPageHeader,
  AdminCard,
  AdminSelect,
  AdminInput,
  AdminButton,
} from "@/components/admin"

export default async function NewPersonPage() {
  const societies = await prisma.society.findMany({
    where: { isActive: true, deletedAt: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  })

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-6 py-8 md:px-8">
      <AdminPageHeader
        eyebrow="Resident Registration"
        title="Register New Person"
        description="Add a new flat owner, tenant, or family resident to a housing society."
        action={
          <Link
            href="/admin/people"
            className="rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-stone-700 transition hover:bg-stone-100 shadow-sm"
          >
            Cancel
          </Link>
        }
      />

      <form action={createPerson} className="space-y-8">
        {/* 1. Basic Profile */}
        <AdminCard
          title="Personal Profile & Society"
          description="Select housing society and basic resident contact details"
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

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Full Name *
              </label>
              <AdminInput
                name="name"
                required
                placeholder="e.g. Ramesh Chandra Sharma"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Phone Number
              </label>
              <AdminInput
                name="phone"
                type="tel"
                placeholder="+91 98765 43210"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Email Address
              </label>
              <AdminInput
                name="email"
                type="email"
                placeholder="ramesh@example.com"
              />
            </div>
          </div>
        </AdminCard>

        {/* 2. KYC & Identifiers */}
        <AdminCard
          title="KYC & Statutory Identifiers"
          description="Official government identity documents for society records"
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                PAN Number
              </label>
              <AdminInput
                name="panNumber"
                placeholder="e.g. ABCDE1234F"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Aadhaar Number (Last 4 Digits / Masked)
              </label>
              <AdminInput
                name="aadhaarNumber"
                placeholder="e.g. XXXX-XXXX-1234"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Occupation
              </label>
              <AdminInput
                name="occupation"
                placeholder="e.g. Software Engineer, Business"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Blood Group
              </label>
              <AdminSelect
                name="bloodGroup"
                defaultValue=""
                options={[
                  { label: "Select Blood Group", value: "" },
                  { label: "A+", value: "A+" },
                  { label: "A-", value: "A-" },
                  { label: "B+", value: "B+" },
                  { label: "B-", value: "B-" },
                  { label: "O+", value: "O+" },
                  { label: "O-", value: "O-" },
                  { label: "AB+", value: "AB+" },
                  { label: "AB-", value: "AB-" },
                ]}
              />
            </div>
          </div>
        </AdminCard>

        {/* 3. Emergency Contact */}
        <AdminCard
          title="Emergency Contact"
          description="Next of kin or emergency point of contact"
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Emergency Contact Name
              </label>
              <AdminInput
                name="emergencyContactName"
                placeholder="e.g. Sunita Sharma"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Emergency Contact Phone
              </label>
              <AdminInput
                name="emergencyContactPhone"
                type="tel"
                placeholder="+91 98765 00000"
              />
            </div>
          </div>
        </AdminCard>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/admin/people"
            className="rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
          >
            Cancel
          </Link>
          <AdminButton type="submit" variant="primary" size="lg">
            Register Person
          </AdminButton>
        </div>
      </form>
    </div>
  )
}

import { requireSuperAdmin } from "@/lib/auth/requireAuth"
import { recordAuditLog } from "@/lib/audit"
import { encryptData } from "@/lib/crypto"
import { sanitizeText } from "@/lib/sanitize"

async function createPerson(formData: FormData) {
  "use server"

  const admin = await requireSuperAdmin()

  const societyId = formData.get("societyId")?.toString().trim()
  const rawName = formData.get("name")?.toString().trim()
  const name = sanitizeText(rawName)
  const rawPhone = formData.get("phone")?.toString().trim() || null
  const phone = rawPhone ? sanitizeText(rawPhone) : null
  const rawEmail = formData.get("email")?.toString().trim().toLowerCase() || null
  const email = rawEmail ? sanitizeText(rawEmail) : null
  const rawPan = formData.get("panNumber")?.toString().trim().toUpperCase() || null
  const panNumber = rawPan ? encryptData(rawPan) : null
  const rawAadhaar = formData.get("aadhaarNumber")?.toString().trim() || null
  const aadhaarNumber = rawAadhaar ? encryptData(rawAadhaar) : null
  const rawOccupation = formData.get("occupation")?.toString().trim() || null
  const occupation = rawOccupation ? sanitizeText(rawOccupation) : null
  const rawBloodGroup = formData.get("bloodGroup")?.toString().trim() || null
  const bloodGroup = rawBloodGroup ? sanitizeText(rawBloodGroup) : null
  const rawEmergencyName = formData.get("emergencyContactName")?.toString().trim() || null
  const emergencyContactName = rawEmergencyName ? sanitizeText(rawEmergencyName) : null
  const rawEmergencyPhone = formData.get("emergencyContactPhone")?.toString().trim() || null
  const emergencyContactPhone = rawEmergencyPhone ? sanitizeText(rawEmergencyPhone) : null

  if (!societyId || !name) {
    throw new Error("Society and name are required")
  }

  const person = await prisma.person.create({
    data: {
      societyId,
      name,
      phone,
      email,
      panNumber,
      aadhaarNumber,
      occupation,
      bloodGroup,
      emergencyContactName,
      emergencyContactPhone,
    },
  })

  await recordAuditLog({
    societyId,
    userId: admin.id,
    action: "CREATE",
    entity: "Person",
    entityId: person.id,
    description: `Super Admin ${admin.email} registered person ${name}`,
    newData: { name, email, phone },
  })

  revalidatePath("/admin/people")
  revalidatePath(`/admin/societies/${societyId}`)
  redirect("/admin/people")
}

