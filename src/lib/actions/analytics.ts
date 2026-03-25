"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function getSchoolUsageStats() {
  const session = await auth();
  if (!session?.tenantId || (session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
    throw new Error("Unauthorized");
  }

  const tenantId = session.tenantId;

  // Fetch all users in the school
  const teachers = await db.user.findMany({
    where: { tenantId, role: "TEACHER" },
    select: {
      id: true,
      name: true,
      email: true,
      _count: {
        select: {
          schemesOfWork: true,
          lessonPlans: true,
          assessments: true,
        }
      }
    }
  });

  // Fetch usage logs (Recompiled to include GenerationLog model)
  const logs = await (db as any).generationLog?.findMany({
    where: { tenantId }
  }) || [];

  // Aggregate totals
  const totals = teachers.reduce((acc, t) => ({
    schemes: acc.schemes + t._count.schemesOfWork,
    lessons: acc.lessons + t._count.lessonPlans,
    assessments: acc.assessments + t._count.assessments,
  }), { schemes: 0, lessons: 0, assessments: 0 });

  const usage = logs.reduce((acc, l) => ({
    promptTokens: acc.promptTokens + l.promptTokens,
    completionTokens: acc.completionTokens + l.completionTokens,
    totalTokens: acc.totalTokens + l.totalTokens,
  }), { promptTokens: 0, completionTokens: 0, totalTokens: 0 });

  return {
    teachers,
    totals,
    usage,
    schoolName: "Your Institution" 
  };
}

export async function getDetailedGenerationLog() {
  const session = await auth();
  if (!session?.tenantId || (session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
    throw new Error("Unauthorized");
  }

  // Fetch recent generations across all teachers in the tenant
  const recentSchemes = await db.schemeOfWork.findMany({
    where: { teacher: { tenantId: session.tenantId } },
    take: 10,
    orderBy: { createdAt: "desc" },
    include: { teacher: { select: { name: true } } }
  });

  const recentAssessments = await db.assessment.findMany({
    where: { teacher: { tenantId: session.tenantId } },
    take: 10,
    orderBy: { createdAt: "desc" },
    include: { teacher: { select: { name: true } } }
  });

  return { recentSchemes, recentAssessments };
}
