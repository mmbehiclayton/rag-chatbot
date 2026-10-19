"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db, withDbRetry } from "@/lib/db";
import { filingFor } from "@/lib/filing";
import { BEST_FIRST, copyLessonPlan } from "@/lib/reuse";

export type ReusableLesson = {
  id: string;
  topic: string;
  durationMinutes: number;
  /** Teachers who reused it before. */
  uses: number;
  /** Its teacher read it through. */
  checked: boolean;
  /** Its teacher changed it after it was written. */
  edited: boolean;
  hasNotes: boolean;
};

/** The sub-strand part of a topic ("Fractions: adding like fractions" → "Fractions"). */
const subStrandOf = (topic: string) => topic.split(":")[0].trim();

/** Other teachers' lesson plans on the same sub-strand, best first. */
export async function findLessonsToReuse(input: {
  grade: string;
  subject: string;
  topic: string;
}): Promise<ReusableLesson[]> {
  const session = await auth();
  const topic = subStrandOf(input.topic ?? "").slice(0, 200);
  if (!session?.userId || !input.grade || !input.subject || topic.length < 3)
    return [];

  const plans = await withDbRetry(() =>
    db.lessonPlan.findMany({
      where: {
        teacherId: { not: session.userId },
        topic: { contains: topic, mode: "insensitive" },
        OR: [
          { grade: input.grade, subject: input.subject },
          { scheme: { grade: input.grade, subject: input.subject } },
        ],
        NOT: { topic: { startsWith: "[Needs Review]" } },
      },
      orderBy: BEST_FIRST,
      take: 12,
      select: {
        id: true,
        topic: true,
        content: true,
        durationMinutes: true,
        sharesCount: true,
        checkedAt: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { lessonNotes: true } },
      },
    }),
  );

  // Copies of one plan look the same; show each version once.
  const seen = new Set<string>();
  const out: ReusableLesson[] = [];
  for (const p of plans) {
    const sig = JSON.stringify(p.content);
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push({
      id: p.id,
      topic: p.topic,
      durationMinutes: p.durationMinutes,
      uses: p.sharesCount,
      checked: !!p.checkedAt,
      edited: p.updatedAt.getTime() - p.createdAt.getTime() > 60_000,
      hasNotes: p._count.lessonNotes > 0,
    });
    if (out.length === 3) break;
  }
  return out;
}

/** Copy another teacher's lesson plan (and its notes) into this teacher's library. */
export async function reuseLessonPlan(input: {
  id: string;
  grade: string;
  subject: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.userId)
    return {
      ok: false,
      error: "Your session has ended. Please sign in again.",
    };

  const plan = await copyLessonPlan(
    input.id,
    { userId: session.userId, tenantId: session.tenantId },
    {
      grade: input.grade,
      subject: input.subject,
      ...(await filingFor(session.userId)),
    },
  );
  if (!plan)
    return { ok: false, error: "That lesson plan is no longer available." };

  revalidatePath("/dashboard/library");
  revalidatePath("/dashboard");
  return { ok: true, id: plan.id };
}
