import { PrismaClient } from "@/app/generated/prisma/client"
const globalForPrisma = global as unknown as { prisma: PrismaClient }
export const prisma = globalForPrisma.prisma || new PrismaClient({
  datasources: { db: { url: process.env.POSTGRES_PRISMA_URL } },
})
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma