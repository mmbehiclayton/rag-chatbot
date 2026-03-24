"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateUserRole(userId: string, newRole: string) {
  try {
    const session = await auth();
    if (!session || session.role !== "SUPERADMIN") {
      return { success: false, error: "Unauthorized: Only Superadmins can manually mutate RBAC controls." };
    }

    // Protection against self-demotion
    if (session.userId === userId) {
      return { success: false, error: "Cannot mutate your own role." };
    }

    const validRoles = ["TEACHER", "ADMIN", "SUPERADMIN"];
    if (!validRoles.includes(newRole)) {
      return { success: false, error: "Invalid Role Specification." };
    }

    await db.user.update({
      where: { id: userId },
      data: { role: newRole }
    });

    revalidatePath("/dashboard/teachers");
    return { success: true };
    
  } catch (error: any) {
    console.error("[RBAC_ERROR]", error);
    return { success: false, error: error.message || "Failed to update user role." };
  }
}
