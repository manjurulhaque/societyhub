import { z } from "zod"

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email address is required")
    .email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})

export type LoginInput = z.infer<typeof loginSchema>

export const updateEmailSchema = z.object({
  newEmail: z
    .string()
    .min(1, "Email address is required")
    .email("Please enter a valid email address"),
})

export type UpdateEmailInput = z.infer<typeof updateEmailSchema>

export const updatePasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(6, "Password must be at least 6 characters long"),
    confirmPassword: z
      .string()
      .min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match. Please re-type.",
    path: ["confirmPassword"],
  })

export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>
