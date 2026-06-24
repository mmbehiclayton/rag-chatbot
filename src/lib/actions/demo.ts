"use server";

import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

const DEMO_PASSWORD = "Demo@1234";

const DEMO_USERS = [
  {
    name: "Super Admin",
    email: "superadmin@elimu.ai",
    role: "SUPERADMIN",
    tenantName: "Elimu HQ",
    tenantType: "SCHOOL",
  },
  {
    name: "School Admin",
    email: "admin@greenvalley.ac.ke",
    role: "ADMIN",
    tenantName: "Green Valley Academy",
    tenantType: "SCHOOL",
  },
  {
    name: "Jane Mwangi",
    email: "teacher@greenvalley.ac.ke",
    role: "TEACHER",
    tenantName: "Green Valley Academy",
    tenantType: "SCHOOL",
  },
] as const;

export async function ensureDemoUsers() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  for (const demo of DEMO_USERS) {
    const existing = await db.user.findUnique({ where: { email: demo.email } });
    if (existing) continue;

    // Reuse or create the tenant
    let tenant = await db.tenant.findFirst({ where: { name: demo.tenantName } });
    if (!tenant) {
      tenant = await db.tenant.create({
        data: { name: demo.tenantName, type: demo.tenantType },
      });
    }

    await db.user.create({
      data: {
        name: demo.name,
        email: demo.email,
        passwordHash,
        role: demo.role,
        tenantId: tenant.id,
        emailVerified: new Date(),
      },
    });
  }

  return { password: DEMO_PASSWORD };
}
