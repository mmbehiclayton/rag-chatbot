import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Database Permissions and RBAC Baseline...");
  
  // 1. Create a Master Tenant
  const genesisTenant = await prisma.tenant.upsert({
    where: { id: "genesis_tenant_seed_id" },
    update: {},
    create: {
      id: "genesis_tenant_seed_id",
      name: "Mwalimu System Headquarters",
      type: "SCHOOL"
    }
  });

  const passwordHash = await bcrypt.hash("password123", 10);

  // 2. Superadmin
  await prisma.user.upsert({
    where: { email: "superadmin@mwalimu.ai" },
    update: { role: "SUPERADMIN", tenantId: genesisTenant.id },
    create: {
      email: "superadmin@mwalimu.ai",
      name: "Global Commander",
      passwordHash,
      role: "SUPERADMIN",
      tenantId: genesisTenant.id
    }
  });

  // 3. Admin
  await prisma.user.upsert({
    where: { email: "admin@mwalimu.ai" },
    update: { role: "ADMIN", tenantId: genesisTenant.id },
    create: {
      email: "admin@mwalimu.ai",
      name: "School Principal",
      passwordHash,
      role: "ADMIN",
      tenantId: genesisTenant.id
    }
  });

  // 4. Teacher
  await prisma.user.upsert({
    where: { email: "teacher@mwalimu.ai" },
    update: { role: "TEACHER", tenantId: genesisTenant.id },
    create: {
      email: "teacher@mwalimu.ai",
      name: "Senior Educator",
      passwordHash,
      role: "TEACHER",
      tenantId: genesisTenant.id
    }
  });

  console.log("Successfully seeded RBAC hierarchy (SUPERADMIN > ADMIN > TEACHER).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
