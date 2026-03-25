import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { WorkstationClient } from "@/components/dashboard/workstation-client";

export default async function WorkstationPage() {
  const session = await auth();
  if (!session?.userId) redirect("/login");

  const [schemes, lessons, assessments, curriculumDocs] = await Promise.all([
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
    })
  ]);

  return (
    <WorkstationClient 
      initialSchemes={schemes}
      initialLessons={lessons}
      initialAssessments={assessments}
      availableCurriculum={curriculumDocs}
    />
  );
}
