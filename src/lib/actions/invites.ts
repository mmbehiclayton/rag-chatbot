"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { newInviteCode } from "@/lib/invites";

type Result = { success: true } | { success: false; error: string };

/** A school admin replaces their school's invite link, for when the old one has been shared too widely. */
export async function resetSchoolInviteLink(): Promise<Result> {
  const session = await auth();
  if (!session?.userId || session.role !== "ADMIN")
    return { success: false, error: "Only a school admin can do this." };
  await newInviteCode(session.userId);
  revalidatePath("/dashboard/teachers");
  return { success: true };
}
