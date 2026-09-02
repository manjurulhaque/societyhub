import type { UnitType, OccupancyStatus } from "@/generated/prisma/client"

export type FlatActionState = {
  success?: boolean
  error?: string
  message?: string
}

export type BulkFlatItemInput = {
  blockId: string
  number: string
  floor?: number | null
  unitType?: UnitType | null
  area?: number | null
  areaUnit?: string
  status?: OccupancyStatus
  intercomNumber?: string | null
  parkingSlot?: string | null
}

export type BulkCreateFlatsResult = {
  success?: boolean
  error?: string
  message?: string
  createdCount?: number
  skippedCount?: number
  createdFlats?: { id: string; number: string; blockName: string }[]
  skippedFlats?: { number: string; blockName: string; reason: string }[]
}
