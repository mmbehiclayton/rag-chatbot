"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function getSchoolUsageStats() {
  const session = await auth();
  if (!session?.userId || (session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
    throw new Error("Unauthorized");
  }

  const isSuperAdmin = session.role === "SUPERADMIN";
  const tenantId = session.tenantId;

  // Fetch tenant info for quota (or all for stats)
  const tenant = !isSuperAdmin ? await db.tenant.findUnique({ where: { id: tenantId! } }) : null;
  const allTenants = isSuperAdmin ? await db.tenant.findMany() : [];
  
  const tokenQuota = isSuperAdmin 
    ? allTenants.reduce((acc: any, t: any) => acc + t.tokenQuota, 0)
    : tenant?.tokenQuota || 0;

  // Fetch all users in the school (or all if superadmin)
  const usersWhere: any = isSuperAdmin ? { role: "TEACHER" } : { tenantId, role: "TEACHER" };
  const teachers = await db.user.findMany({
    where: usersWhere,
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

  // Fetch usage logs
  const logsWhere: any = isSuperAdmin ? {} : { tenantId };
  const logs = await db.generationLog.findMany({
    where: logsWhere
  }) || [];

  // Aggregate totals
  const totals = teachers.reduce((acc: any, t: any) => ({
    schemes: acc.schemes + t._count.schemesOfWork,
    lessons: acc.lessons + t._count.lessonPlans,
    assessments: acc.assessments + t._count.assessments,
  }), { schemes: 0, lessons: 0, assessments: 0 });

  const usage = logs.reduce((acc: any, l: any) => ({
    promptTokens: acc.promptTokens + l.promptTokens,
    completionTokens: acc.completionTokens + l.completionTokens,
    totalTokens: acc.totalTokens + l.totalTokens,
  }), { promptTokens: 0, completionTokens: 0, totalTokens: 0 });

  return {
    teachers: teachers || [],
    totals,
    usage,
    tokenQuota,
    schoolName: isSuperAdmin ? "Global Organization" : (tenant?.name || "Your Institution")
  };
}

export async function getDetailedGenerationLog() {
  const session = await auth();
  if (!session?.userId || (session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
    throw new Error("Unauthorized");
  }

  const isSuperAdmin = session.role === "SUPERADMIN";
  const tenantId = session.tenantId;

  // Fetch recent generations across all teachers
  const logWhere: any = isSuperAdmin ? {} : { teacher: { tenantId } };

  const recentSchemes = await db.schemeOfWork.findMany({
    where: logWhere,
    take: 10,
    orderBy: { createdAt: "desc" },
    include: { teacher: { select: { name: true } } }
  });

  const recentAssessments = await db.assessment.findMany({
    where: logWhere,
    take: 10,
    orderBy: { createdAt: "desc" },
    include: { teacher: { select: { name: true } } }
  });

  return { 
    recentSchemes: recentSchemes || [], 
    recentAssessments: recentAssessments || [] 
  };
}
