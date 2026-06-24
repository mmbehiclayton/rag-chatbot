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

/**
 * Runs a DB operation, retrying on transient connection errors. Neon's serverless
 * tier auto-suspends after inactivity, so the first query during a cold start can
 * fail before the compute wakes — a short retry almost always succeeds.
 */
export async function withDbRetry<T>(fn: () => Promise<T>, retries = 2, baseDelayMs = 500): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      const code = err?.code;
      const msg = String(err?.message ?? "");
      const transient =
        code === "P1001" || code === "P1002" || code === "P1008" || code === "P1017" ||
        /can'?t reach database|connection|timed out|ECONNRESET|ETIMEDOUT/i.test(msg);
      if (!transient || attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** attempt));
    }
  }
  throw lastErr;
}
