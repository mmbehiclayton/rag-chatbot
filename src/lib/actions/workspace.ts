"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  canSwitchWorkspace,
  WORKSPACE_COOKIE,
  type Workspace,
} from "@/components/layout/nav-config";
import { auth } from "@/lib/auth";

/** Switches an admin or staff member between their own menus and the teacher's. */
export async function switchWorkspace(workspace: Workspace) {
  const session = await auth();
  if (!session?.userId) redirect("/login");
  if (canSwitchWorkspace(session.role ?? null)) {
    (await cookies()).set(
      WORKSPACE_COOKIE,
      workspace === "teaching" ? "teaching" : "admin",
      {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 365,
      },
    );
  }
  redirect("/dashboard");
}
