import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { WorkstationClient } from "@/components/dashboard/workstation-client";
import { getCurriculumData } from "@/lib/actions/structure";

export default async function WorkstationPage() {
  const session = await auth();
  if (!session?.userId) redirect("/login");

  const [schemes, lessons, notes, assessments, curriculumDocs, cbcData] = await Promise.all([
    db.schemeOfWork.findMany({
      where: { teacherId: session.userId },
      orderBy: { updatedAt: "desc" },
      take: 5
    }),
    db.lessonPlan.findMany({
      where: { teacherId: session.userId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        topic: true,
        updatedAt: true,
        scheme: { select: { grade: true, subject: true } }
      }
    }),
    db.lessonNote.findMany({
      where: { teacherId: session.userId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: {
        lessonPlan: {
          select: {
            topic: true,
            scheme: { select: { grade: true, subject: true } }
          }
        }
      }
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

  // Flatten lessons & notes so the asset library can show grade/subject context
  const initialLessons = lessons.map((l) => ({
    id: l.id,
    title: l.topic,
    topic: l.topic,
    grade: l.scheme?.grade || "—",
    subject: l.scheme?.subject || "—",
    updatedAt: l.updatedAt,
  }));

  const initialNotes = notes.map((n) => ({
    id: n.id,
    title: n.lessonPlan?.topic || "Lesson Notes",
    topic: n.lessonPlan?.topic || "Lesson Notes",
    grade: n.lessonPlan?.scheme?.grade || "—",
    subject: n.lessonPlan?.scheme?.subject || "—",
    updatedAt: n.updatedAt,
  }));

  return (
    <WorkstationClient
      initialSchemes={schemes}
      initialLessons={initialLessons}
      initialNotes={initialNotes}
      initialAssessments={assessments}
      availableCurriculum={curriculumDocs}
      cbcStructure={cbcData.success ? (cbcData.levels as any) : []}
    />
  );
}
