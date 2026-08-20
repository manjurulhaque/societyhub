import { z } from "zod"

export const societySettingsSchema = z.object({
  name: z.string().min(1, "Society name is required"),
  code: z.string().default(""),
  societyType: z.string().default("COOPERATIVE_HOUSING_SOCIETY"),
  phone: z.string().default(""),
  email: z
    .string()
    .email("Please enter a valid email address")
    .or(z.literal(""))
    .default(""),
  address: z.string().default(""),
  city: z.string().default(""),
  state: z.string().default(""),
  pincode: z.string().default(""),

  registrationNumber: z.string().default(""),
  panNumber: z.string().default(""),
  tanNumber: z.string().default(""),
  gstin: z.string().default(""),

  maintenanceType: z.string().default("FIXED"),
  fixedRate: z.string().default(""),
  ratePerSqft: z.string().default(""),
  billGenerationDay: z
    .number()
    .min(1, "Must be between 1 and 28")
    .max(28, "Must be between 1 and 28")
    .default(1),
  dueDayOfMonth: z
    .number()
    .min(1, "Must be between 1 and 28")
    .max(28, "Must be between 1 and 28")
    .default(10),
  gracePeriodDays: z
    .number()
    .min(0, "Cannot be negative")
    .max(60, "Cannot exceed 60 days")
    .default(0),
  lateFeeRate: z
    .number()
    .min(0, "Cannot be negative")
    .max(100, "Cannot exceed 100%")
    .default(21.0),
  timezone: z.string().default("Asia/Kolkata"),
  invoicePrefix: z.string().default("INV"),
  receiptPrefix: z.string().default("RCPT"),
})

export type SocietySettingsInput = z.infer<typeof societySettingsSchema>
