"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

async function checkAdmin() {
  const session = await auth();
  if (session?.role !== "SUPERADMIN") {
    throw new Error("Unauthorized");
  }
}

// ─── Level Actions ─────────────────────────────────────────────

export async function createLevel(data: { name: string; order: number }) {
  await checkAdmin();
  try {
    const level = await db.curriculumLevel.create({ data });
    revalidatePath("/dashboard/structure");
    return { success: true, level };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function updateLevel(
  id: string,
  data: { name?: string; order?: number },
) {
  await checkAdmin();
  try {
    const level = await db.curriculumLevel.update({ where: { id }, data });
    revalidatePath("/dashboard/structure");
    return { success: true, level };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function deleteLevel(id: string) {
  await checkAdmin();
  try {
    await db.curriculumLevel.delete({ where: { id } });
    revalidatePath("/dashboard/structure");
    return { success: true };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}

// ─── Grade Actions ─────────────────────────────────────────────

export async function createGrade(data: {
  name: string;
  order: number;
  levelId: string;
}) {
  await checkAdmin();
  try {
    const grade = await db.gradeLevel.create({ data });
    revalidatePath("/dashboard/structure");
    return { success: true, grade };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function updateGrade(
  id: string,
  data: { name?: string; order?: number; levelId?: string },
) {
  await checkAdmin();
  try {
    const grade = await db.gradeLevel.update({ where: { id }, data });
    revalidatePath("/dashboard/structure");
    return { success: true, grade };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function deleteGrade(id: string) {
  await checkAdmin();
  try {
    await db.gradeLevel.delete({ where: { id } });
    revalidatePath("/dashboard/structure");
    return { success: true };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}

// ─── Learning Area Actions ─────────────────────────────────────

export async function createLearningArea(data: {
  name: string;
  order: number;
}) {
  await checkAdmin();
  try {
    const area = await db.learningArea.create({ data });
    revalidatePath("/dashboard/structure");
    return { success: true, area };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function updateLearningArea(
  id: string,
  data: { name?: string; order?: number },
) {
  await checkAdmin();
  try {
    const area = await db.learningArea.update({ where: { id }, data });
    revalidatePath("/dashboard/structure");
    return { success: true, area };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function deleteLearningArea(id: string) {
  await checkAdmin();
  try {
    await db.learningArea.delete({ where: { id } });
    revalidatePath("/dashboard/structure");
    return { success: true };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}

// ─── Junction Actions (Link/Unlink) ────────────────────────────

export async function linkAreaToGrade(gradeId: string, learningAreaId: string) {
  await checkAdmin();
  try {
    await db.levelLearningArea.create({
      data: { gradeId, learningAreaId },
    });
    revalidatePath("/dashboard/structure");
    return { success: true };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function unlinkAreaFromGrade(
  gradeId: string,
  learningAreaId: string,
) {
  await checkAdmin();
  try {
    await db.levelLearningArea.delete({
      where: {
        gradeId_learningAreaId: { gradeId, learningAreaId },
      },
    });
    revalidatePath("/dashboard/structure");
    return { success: true };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}

// ─── Data Retrieval ────────────────────────────────────────────

export async function getCurriculumData() {
  try {
    const levels = await db.curriculumLevel.findMany({
      orderBy: { order: "asc" },
      include: {
        grades: {
          orderBy: { order: "asc" },
          include: {
            learningAreas: {
              include: {
                learningArea: true,
              },
            },
          },
        },
      },
    });

    return { success: true, levels };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}
