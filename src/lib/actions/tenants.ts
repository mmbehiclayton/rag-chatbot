"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type Result = { success: true } | { success: false; error: string };

// The monthly AI token limit each school or account gets (checked before every generation).
const QUOTA = { min: 10_000, max: 1_000_000_000 };

const TenantInput = z.object({
  name: z.string().trim().min(2, "Enter the school's name.").max(120),
  tokenQuota: z.coerce
    .number()
    .int()
    .min(
      QUOTA.min,
      `The monthly limit must be at least ${QUOTA.min.toLocaleString("en-KE")} tokens.`,
    )
    .max(QUOTA.max, "That monthly limit is too high."),
});

async function staff() {
  const session = await auth();
  return session?.userId && session.role === "SUPERADMIN" ? session : null;
}

export async function createSchool(input: {
  name: string;
  tokenQuota: number;
}): Promise<Result> {
  if (!(await staff()))
    return { success: false, error: "Only Elimu staff can do this." };
  const parsed = TenantInput.safeParse(input);
  if (!parsed.success)
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Check the details.",
    };
  await db.tenant.create({ data: { ...parsed.data, type: "SCHOOL" } });
  revalidatePath("/dashboard/tenants");
  return { success: true };
}

export async function updateTenant(input: {
  id: string;
  name: string;
  tokenQuota: number;
}): Promise<Result> {
  if (!(await staff()))
    return { success: false, error: "Only Elimu staff can do this." };
  const parsed = TenantInput.safeParse(input);
  if (!parsed.success)
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Check the details.",
    };
  const { count } = await db.tenant.updateMany({
    where: { id: input.id },
    data: parsed.data,
  });
  if (count === 0)
    return {
      success: false,
      error: "That school or account couldn't be found.",
    };
  revalidatePath("/dashboard/tenants");
  return { success: true };
}
