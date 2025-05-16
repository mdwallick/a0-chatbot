import { PrismaClient } from "@prisma/client"
import { sql } from "@vercel/postgres"

// Use Vercel Postgres in production, local PostgreSQL in development
const prisma = new PrismaClient()

export { sql, prisma }
