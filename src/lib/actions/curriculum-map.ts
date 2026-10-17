"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getGradeOptions } from "@/lib/curriculum-options";
import { MAP_STATUS, getCurator, writeMapDraft } from "@/lib/curriculum-map";
import { draftMapFromDesign } from "@/lib/map-drafting";
import { explainAIError } from "@/lib/ai-errors";

type Result = { success: true } | { success: false; error: string };

const lines = z.array(z.string().trim().min(1).max(600)).max(40);

const MapInput = z.object({
  sourceNote: z.string().trim().max(1000).optional(),
  strands: z
    .array(
      z.object({
        name: z.string().trim().min(1, "Every strand needs a name.").max(200),
        subStrands: z
          .array(
            z.object({
              name: z.string().trim().min(1, "Every sub-strand needs a name.").max(200),
              lessons: z.number().int().min(1).max(60),
              term: z.number().int().min(1).max(3).nullable(),
              outcomes: lines,
              inquiryQuestions: lines,
              learningExperiences: lines,
            })
          )
          .max(40),
      })
    )
    .max(30),
});
export type MapInputData = z.infer<typeof MapInput>;

function paths(grade: string, subject: string) {
  revalidatePath("/dashboard/curriculum");
  revalidatePath(`/dashboard/curriculum/${encodeURIComponent(grade)}/${encodeURIComponent(subject)}`);
}

async function isRealClass(grade: string, subject: string) {
  const grades = await getGradeOptions();
  return grades.some((g) => g.name === grade && g.learningAreas.includes(subject));
}

/** Saves the whole map. Any change takes it out of use until another curator checks it again. */
export async function saveCurriculumMap(grade: string, subject: string, input: MapInputData): Promise<Result> {
  const session = await auth();
  const curator = await getCurator(session.userId);
  if (!curator) return { success: false, error: "Only curators can edit curriculum maps." };
  if (!(await isRealClass(grade, subject))) return { success: false, error: "That grade and learning area doesn't exist." };

  const parsed = MapInput.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Check the map and try again." };
  await writeMapDraft(grade, subject, curator.id, parsed.data);

  paths(grade, subject);
  return { success: true };
}

/** Drafts the map from the uploaded curriculum design. Only replaces a map that is still a draft. */
export async function draftCurriculumMap(grade: string, subject: string): Promise<Result> {
  const session = await auth();
  const curator = await getCurator(session.userId);
  if (!curator) return { success: false, error: "Only curators can edit curriculum maps." };
  if (!(await isRealClass(grade, subject))) return { success: false, error: "That grade and learning area doesn't exist." };

  const map = await db.curriculumMap.findUnique({ where: { grade_subject: { grade, subject } }, select: { status: true } });
  if (map && map.status !== MAP_STATUS.DRAFT) {
    return { success: false, error: "This map is waiting for a check or in use. Edit it directly instead." };
  }

  try {
    await draftMapFromDesign(grade, subject, curator.id);
  } catch (e) {
    const message = e instanceof Error && /^(No curriculum design|The design|Elimu couldn't)/.test(e.message) ? e.message : explainAIError("map draft", e);
    return { success: false, error: message };
  }
  paths(grade, subject);
  return { success: true };
}

export async function submitCurriculumMap(grade: string, subject: string): Promise<Result> {
  const session = await auth();
  const curator = await getCurator(session.userId);
  if (!curator) return { success: false, error: "Only curators can edit curriculum maps." };

  const map = await db.curriculumMap.findUnique({
    where: { grade_subject: { grade, subject } },
    select: { id: true, status: true, _count: { select: { strands: true } } },
  });
  if (!map || map._count.strands === 0) return { success: false, error: "Add at least one strand before sending it for checking." };
  if (map.status !== MAP_STATUS.DRAFT) return { success: false, error: "This map is already waiting for a check or in use." };

  await db.curriculumMap.update({ where: { id: map.id }, data: { status: MAP_STATUS.IN_REVIEW, reviewComment: null } });
  paths(grade, subject);
  return { success: true };
}

/** The second-person check: the curator who last edited a map can't approve it. */
export async function checkCurriculumMap(grade: string, subject: string, decision: "approve" | "send-back", comment?: string): Promise<Result> {
  const session = await auth();
  const curator = await getCurator(session.userId);
  if (!curator) return { success: false, error: "Only curators can check curriculum maps." };

  const map = await db.curriculumMap.findUnique({
    where: { grade_subject: { grade, subject } },
    select: { id: true, status: true, editedById: true },
  });
  if (!map || map.status !== MAP_STATUS.IN_REVIEW) return { success: false, error: "This map isn't waiting for a check." };
  if (map.editedById === curator.id) return { success: false, error: "Someone other than the last editor must check this map." };

  if (decision === "approve") {
    await db.curriculumMap.update({
      where: { id: map.id },
      data: { status: MAP_STATUS.PUBLISHED, checkedById: curator.id, publishedAt: new Date(), reviewComment: null },
    });
  } else {
    const note = comment?.trim().slice(0, 1000);
    if (!note) return { success: false, error: "Say what needs fixing so the editor knows." };
    await db.curriculumMap.update({ where: { id: map.id }, data: { status: MAP_STATUS.DRAFT, reviewComment: note } });
  }

  paths(grade, subject);
  return { success: true };
}

/** Elimu staff can put a map into use straight away, skipping the second-person check. */
export async function publishCurriculumMap(grade: string, subject: string): Promise<Result> {
  const session = await auth();
  const curator = await getCurator(session.userId);
  if (curator?.role !== "SUPERADMIN") return { success: false, error: "Only Elimu staff can publish a map without a check." };

  const map = await db.curriculumMap.findUnique({
    where: { grade_subject: { grade, subject } },
    select: { id: true, status: true, _count: { select: { strands: true } } },
  });
  if (!map || map._count.strands === 0) return { success: false, error: "Add at least one strand before publishing." };
  if (map.status === MAP_STATUS.PUBLISHED) return { success: false, error: "This map is already in use." };

  await db.curriculumMap.update({
    where: { id: map.id },
    data: { status: MAP_STATUS.PUBLISHED, checkedById: curator.id, publishedAt: new Date(), reviewComment: null },
  });
  paths(grade, subject);
  return { success: true };
}

/** Superadmins choose which teachers can curate maps. */
export async function setCurator(userId: string, isCurator: boolean): Promise<Result> {
  const session = await auth();
  if (session.role !== "SUPERADMIN") return { success: false, error: "Only superadmins can choose curators." };
  await db.user.update({ where: { id: userId }, data: { isCurator } });
  revalidatePath("/dashboard/teachers");
  return { success: true };
}
