import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

const fallbackUrl = "postgresql://neondb_owner:npg_TCgjN0fnc2aP@ep-steep-shadow-amk94n39-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

// Invalidate cached Prisma client during Hot-Reloads to apply new schema structures seamlessly
if (process.env.NODE_ENV !== "production") {
  delete globalThis.prisma;
}

export const db = globalThis.prisma || new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL || fallbackUrl,
});

if (process.env.NODE_ENV !== "production") globalThis.prisma = db;
