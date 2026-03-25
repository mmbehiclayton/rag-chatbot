import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import LessonsClient from "@/components/dashboard/lessons-client";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function LessonDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.userId) redirect("/login");

  const { id } = await params;

  const [lesson, schemes] = await Promise.all([
    db.lessonPlan.findUnique({
      where: { 
        id,
        teacherId: session.userId 
      }
    }),
    db.schemeOfWork.findMany({
      where: { teacherId: session.userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, grade: true, subject: true }
    })
  ]);

  if (!lesson) notFound();

  return (
    <div className="animate-in fade-in duration-500 pb-10">
      <LessonsClient schemes={schemes} initialLesson={lesson} viewOnly={true} />
    </div>
  );
}
