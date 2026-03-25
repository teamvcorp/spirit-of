import { PrismaClient } from "@/app/generated/prisma/client"
const globalForPrisma = global as unknown as { prisma: PrismaClient }
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasourceUrl:
      process.env.POSTGRES_PRISMA_URL ||
      process.env.POSTGRES_URL,
  })
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma