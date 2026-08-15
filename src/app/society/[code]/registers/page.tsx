import Link from "next/link"
import { notFound } from "next/navigation"
import { getSocietyAdmin } from "@/lib/auth/getSocietyAdmin"
import { prisma } from "@/lib/prisma"

export default async function SocietyRegistersHubPage({
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

  const [sharesCount, nominationsCount, mortgagesCount, meetingsCount] =
    await Promise.all([
      prisma.shareCertificate.count({ where: { societyId: society.id } }),
      prisma.nomination.count({ where: { societyId: society.id, status: "ACTIVE" } }),
      prisma.propertyLien.count({ where: { societyId: society.id, status: "ACTIVE" } }),
      prisma.meeting.count({ where: { societyId: society.id } }),
    ])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <span className="inline-flex items-center rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-stone-600">
          Statutory Compliance
        </span>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-stone-900 md:text-3xl">
          Statutory Registers & Bye-Laws
        </h1>
        <p className="text-sm text-stone-500">
          Official statutory record books prescribed under Cooperative Housing Society Bye-Laws for {society.name}.
        </p>
      </div>

      {/* Grid of 4 Statutory Registers */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* 1. "I" Register: Share Certificates */}
        <Link
          href={`/society/${code}/registers/shares`}
          className="group flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:border-stone-400 hover:shadow-md"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-blue-50 px-3 py-1 font-mono text-xs font-bold text-blue-700 border border-blue-200">
                "I" REGISTER
              </span>
              <span className="text-xs font-bold text-stone-900">
                {sharesCount} Certificates
              </span>
            </div>

            <h2 className="mt-4 text-lg font-bold text-stone-950 group-hover:text-blue-600 transition">
              Register of Members & Shares
            </h2>
            <p className="mt-1 text-xs text-stone-500 leading-relaxed">
              Official share certificates issued to flat owners, distinctive share number ranges, face values, and transfer records.
            </p>
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-stone-100 pt-4 text-xs font-semibold text-stone-800 group-hover:text-blue-600">
            <span>Manage Share Certificates</span>
            <span>→</span>
          </div>
        </Link>

        {/* 2. "J" Register: Form X Nominations */}
        <Link
          href={`/society/${code}/registers/nominations`}
          className="group flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:border-stone-400 hover:shadow-md"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-emerald-50 px-3 py-1 font-mono text-xs font-bold text-emerald-700 border border-emerald-200">
                "J" REGISTER (FORM X)
              </span>
              <span className="text-xs font-bold text-stone-900">
                {nominationsCount} Active
              </span>
            </div>

            <h2 className="mt-4 text-lg font-bold text-stone-950 group-hover:text-emerald-600 transition">
              Nomination Register
            </h2>
            <p className="mt-1 text-xs text-stone-500 leading-relaxed">
              Form X nominations filed by members, relationship details, percentage share allocations, and minor guardian records.
            </p>
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-stone-100 pt-4 text-xs font-semibold text-stone-800 group-hover:text-emerald-600">
            <span>Manage Form X Nominations</span>
            <span>→</span>
          </div>
        </Link>

        {/* 3. "M" Register: Mortgages & Bank NOCs */}
        <Link
          href={`/society/${code}/registers/mortgages`}
          className="group flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:border-stone-400 hover:shadow-md"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-purple-50 px-3 py-1 font-mono text-xs font-bold text-purple-700 border border-purple-200">
                "M" REGISTER
              </span>
              <span className="text-xs font-bold text-stone-900">
                {mortgagesCount} Active Liens
              </span>
            </div>

            <h2 className="mt-4 text-lg font-bold text-stone-950 group-hover:text-purple-600 transition">
              Mortgages & Bank NOCs Register
            </h2>
            <p className="mt-1 text-xs text-stone-500 leading-relaxed">
              Bank home loan liens, loan account numbers, sanction amounts, society NOC references, and loan clearance discharge notes.
            </p>
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-stone-100 pt-4 text-xs font-semibold text-stone-800 group-hover:text-purple-600">
            <span>Manage Bank Mortgages</span>
            <span>→</span>
          </div>
        </Link>

        {/* 4. Meetings & Minutes */}
        <Link
          href={`/society/${code}/registers/meetings`}
          className="group flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:border-stone-400 hover:shadow-md"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-amber-50 px-3 py-1 font-mono text-xs font-bold text-amber-700 border border-amber-200">
                MINUTES BOOK
              </span>
              <span className="text-xs font-bold text-stone-900">
                {meetingsCount} Meetings
              </span>
            </div>

            <h2 className="mt-4 text-lg font-bold text-stone-950 group-hover:text-amber-600 transition">
              Meetings & Resolutions Register
            </h2>
            <p className="mt-1 text-xs text-stone-500 leading-relaxed">
              Official minutes of AGMs, SGMs, and Managing Committee Meetings (MCM), quorum attendance, and passed resolution records.
            </p>
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-stone-100 pt-4 text-xs font-semibold text-stone-800 group-hover:text-amber-600">
            <span>Manage Meetings & Resolutions</span>
            <span>→</span>
          </div>
        </Link>
      </div>
    </div>
  )
}
