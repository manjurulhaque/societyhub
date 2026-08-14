import slugify from "slugify"
import { prisma } from "@/lib/prisma"

/**
 * Automatically generates a unique, human-friendly society code from the society name.
 * e.g., "Palm Grove Residency" -> "PALM-GROVE-RESIDENCY" (or "PALM-GROVE-RESIDENCY-2" if collision occurs)
 */
export async function generateUniqueSocietyCode(name: string, customCode?: string | null): Promise<string> {
  if (customCode && customCode.trim()) {
    return slugify(customCode.trim(), {
      strict: true,
      trim: true,
    }).toUpperCase()
  }

  const baseCode = (
    slugify(name.trim(), {
      strict: true,
      trim: true,
    }).toUpperCase() || "SOCIETY"
  ).slice(0, 20)

  let candidate = baseCode
  let count = 1

  while (true) {
    const existing = await prisma.society.findUnique({
      where: { code: candidate },
      select: { id: true },
    })

    if (!existing) {
      return candidate
    }

    count += 1
    candidate = `${baseCode}-${count}`
  }
}
