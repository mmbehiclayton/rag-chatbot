"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function updateGenerationRule(contentType: string, customPrompt: string) {
  const session = await auth();
  if (session?.role !== "SUPERADMIN") throw new Error("Unauthorized: Superadmin access required");

  const rule = await db.generationRule.upsert({
    where: { contentType },
    update: { customPrompt },
    create: { contentType, customPrompt }
  });

  revalidatePath("/dashboard/rules");
  return rule;
}

export async function getGenerationRules() {
  const session = await auth();
  if (session?.role !== "SUPERADMIN") throw new Error("Unauthorized");

  return db.generationRule.findMany();
}
