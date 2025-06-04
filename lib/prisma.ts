import { PrismaClient } from "./generated/prisma"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prismaClientSingleton = () => {
  return new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Log queries only in development
    // log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })
}

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
