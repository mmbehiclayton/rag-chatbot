"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { CheckableKind } from "@/lib/documents";

type Result =
  | { success: true; checkedAt: string | null }
  | { success: false; error: string };

const PATHS: Record<CheckableKind, string> = {
  scheme: "/dashboard/schemes",
  lesson: "/dashboard/lessons",
  notes: "/dashboard/notes",
  assessment: "/dashboard/assessments",
};

/** The teacher has read a document through (or takes that back). Only their own documents. */
export async function setChecked(
  kind: CheckableKind,
  id: string,
  checked: boolean,
): Promise<Result> {
  const session = await auth();
  if (!session?.userId)
    return { success: false, error: "Please sign in again." };
  if (!Object.hasOwn(PATHS, kind))
    return { success: false, error: "That document couldn't be found." };

  const where = { id, teacherId: session.userId };
  const data = { checkedAt: checked ? new Date() : null };
  const { count } =
    kind === "scheme"
      ? await db.schemeOfWork.updateMany({ where, data })
      : kind === "lesson"
        ? await db.lessonPlan.updateMany({ where, data })
        : kind === "notes"
          ? await db.lessonNote.updateMany({ where, data })
          : await db.assessment.updateMany({ where, data });
  if (count === 0)
    return { success: false, error: "That document couldn't be found." };

  revalidatePath(`${PATHS[kind]}/${id}`);
  return { success: true, checkedAt: data.checkedAt?.toISOString() ?? null };
}
