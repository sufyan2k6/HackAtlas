/**
 * Prisma Client Stub
 *
 * TODO: Implement Prisma integration:
 * 1. Run: npm install prisma @prisma/client
 * 2. Run: npx prisma init
 * 3. Define schema at prisma/schema.prisma
 * 4. Set DATABASE_URL in .env
 * 5. Replace this stub with the real PrismaClient instantiation below.
 *
 * Production implementation:
 * ```ts
 * import { PrismaClient } from "@prisma/client";
 *
 * const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
 *
 * export const db =
 *   globalForPrisma.prisma ??
 *   new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["query"] : [] });
 *
 * if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
 * ```
 */

export const db = null; // Replace with PrismaClient instance when ready

export type Database = typeof db;
