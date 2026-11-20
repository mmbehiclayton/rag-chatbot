import { cookies } from "next/headers";
import {
  parseWorkspace,
  WORKSPACE_COOKIE,
} from "@/components/layout/nav-config";

/** The workspace this user last picked (always "teaching" for teachers). */
export async function getWorkspace(role: string | null) {
  return parseWorkspace((await cookies()).get(WORKSPACE_COOKIE)?.value, role);
}
