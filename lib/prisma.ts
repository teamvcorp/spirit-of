import { PrismaClient } from "@/app/generated/prisma/client"
import path from "path"

// Next.js bundles the generated Prisma client, so import.meta.url in the
// compiled output no longer points to the source directory. Prisma therefore
// can't locate the .node engine binary via __dirname at runtime on Vercel.
// We manually point it to the binary before the client is instantiated.
if (process.env.NODE_ENV === "production" && !process.env.PRISMA_QUERY_ENGINE_LIBRARY) {
  process.env.PRISMA_QUERY_ENGINE_LIBRARY = path.join(
    process.cwd(),
    "app/generated/prisma/libquery_engine-rhel-openssl-3.0.x.so.node"
  )
}

const globalForPrisma = global as unknown as { prisma: PrismaClient }
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasourceUrl:
      process.env.POSTGRES_PRISMA_URL ||
      process.env.POSTGRES_URL,
  })
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma