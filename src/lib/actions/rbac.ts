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

export type RoleAction = "CREATE" | "READ" | "UPDATE" | "DELETE" | "MANAGE";
export type RoleResource = "LessonPlan" | "SchemeOfWork" | "Assessment" | "User" | "Tenant" | "GlobalSettings" | "RolePermission";

export async function getRolePermissions() {
  const session = await auth();
  if (session?.role !== "SUPERADMIN") {
    throw new Error("Unauthorized");
  }

  const permissions = await db.rolePermission.findMany({
    orderBy: [
      { role: 'asc' },
      { resource: 'asc' },
      { action: 'asc' }
    ]
  });
  
  return permissions;
}

export async function toggleRolePermission(role: string, action: string, resource: string, enabled: boolean) {
  const session = await auth();
  if (session?.role !== "SUPERADMIN") {
    throw new Error("Unauthorized");
  }

  try {
    if (enabled) {
      await db.rolePermission.upsert({
        where: {
          role_action_resource: { role, action, resource }
        },
        update: {},
        create: { role, action, resource }
      });
    } else {
      await db.rolePermission.delete({
        where: {
          role_action_resource: { role, action, resource }
        }
      }).catch(() => {}); // ignore record not found
    }
    
    revalidatePath("/dashboard/rbac");
    return { success: true };
  } catch (error) {
    console.error("Failed to toggle permission:", error);
    return { success: false, error: "Failed to update permission." };
  }
}

export async function hasPermission(role: string, action: string, resource: string) {
  // SUPERADMIN bypasses generic permission checks
  if (role === "SUPERADMIN") return true;

  const permission = await db.rolePermission.findUnique({
    where: {
      role_action_resource: { role, action, resource }
    }
  });

  return !!permission;
}
