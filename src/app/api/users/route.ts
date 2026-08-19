import { prisma } from "@/lib/prisma"
import { requireSuperAdmin } from "@/lib/auth/requireAuth"
import { z } from "zod"
import { NextResponse } from "next/server"

const createUserSchema = z.object({
  email: z.string().email("A valid email address is required").toLowerCase().trim(),
})

export async function GET() {
  try {
    await requireSuperAdmin()

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        appRole: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    return NextResponse.json(users)
  } catch (error: unknown) {
    const isError = error instanceof Error
    const status = isError && error.name === "UnauthorizedError" ? 401 : isError && error.name === "ForbiddenError" ? 403 : 500
    return NextResponse.json(
      { error: isError ? error.message : "Failed to retrieve users" },
      { status }
    )
  }
}

export async function POST(req: Request) {
  try {
    await requireSuperAdmin()

    const body = await req.json()
    const parsed = createUserSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input data" },
        { status: 400 }
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email address already exists." },
        { status: 409 }
      )
    }

    const user = await prisma.user.create({
      data: {
        email: parsed.data.email,
      },
      select: {
        id: true,
        email: true,
        appRole: true,
        createdAt: true,
      },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error: unknown) {
    const isError = error instanceof Error
    const status = isError && error.name === "UnauthorizedError" ? 401 : isError && error.name === "ForbiddenError" ? 403 : 500
    return NextResponse.json(
      { error: isError ? error.message : "Failed to create user" },
      { status }
    )
  }
}

