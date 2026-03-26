import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { WorkstationClient } from "@/components/dashboard/workstation-client";
import { getCurriculumData } from "@/lib/actions/structure";

export default async function WorkstationPage() {
  const session = await auth();
  if (!session?.userId) redirect("/login");

  const [schemes, lessons, assessments, curriculumDocs, cbcData] = await Promise.all([
    db.schemeOfWork.findMany({
      where: { teacherId: session.userId },
      orderBy: { updatedAt: "desc" },
      take: 5
    }),
    db.lessonPlan.findMany({
      where: { teacherId: session.userId },
      orderBy: { updatedAt: "desc" },
      take: 5
    }),
    db.assessment.findMany({
      where: { teacherId: session.userId },
      orderBy: { updatedAt: "desc" },
      take: 5
    }),
    db.curriculumDocument.findMany({
      where: { status: "completed" },
      select: { gradeLevel: true, subject: true }
    }),
    getCurriculumData()
  ]);

  return (
    <WorkstationClient 
      initialSchemes={schemes}
      initialLessons={lessons}
      initialAssessments={assessments}
      availableCurriculum={curriculumDocs}
      cbcStructure={cbcData.success ? (cbcData.levels as any) : []}
    />
  );
}
