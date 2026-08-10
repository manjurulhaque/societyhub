import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

type PrismaClientLike = PrismaClient & Record<string, any>;

const globalForPrisma = global as unknown as {
  prisma: PrismaClientLike | undefined;
};

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

export const prisma: PrismaClientLike =
  globalForPrisma.prisma ??
  (new PrismaClient({
    adapter,
  }) as PrismaClientLike);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
