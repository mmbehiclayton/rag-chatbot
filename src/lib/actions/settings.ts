"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: FormData) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const name = formData.get("name") as string;
  if (!name) return { error: "Name is required" };

  await db.user.update({
    where: { id: session.userId },
    data: { name }
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateSchool(formData: FormData) {
  const session = await auth();
  if (!session || session.role !== "ADMIN") throw new Error("Unauthorized");

  const name = formData.get("name") as string;
  const tenantId = formData.get("tenantId") as string;
  
  if (!name || !tenantId) return { error: "Invalid data" };

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (user?.tenantId !== tenantId) throw new Error("Unauthorized tenant");

  await db.tenant.update({
    where: { id: tenantId },
    data: { name }
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  return { success: true };
}
