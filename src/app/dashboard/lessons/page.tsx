import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { AssetLibrary } from "@/components/dashboard/asset-library";

export default async function LessonsPage() {
  const session = await auth();
  if (!session?.userId) redirect("/login");

  const lessons = await db.lessonPlan.findMany({
    where: { teacherId: session.userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      topic: true,
      updatedAt: true,
      scheme: {
        select: {
          grade: true,
          subject: true
        }
      }
    }
  });

  // Ensure lessons have a 'title', 'grade', and 'subject' mapping for the AssetLibrary
  const formattedLessons = lessons.map(l => ({
    ...l,
    title: l.topic,
    grade: l.scheme.grade,
    subject: l.scheme.subject
  }));

  return (
    <div className="animate-in fade-in duration-500 pb-10">
      <AssetLibrary 
        assets={formattedLessons}
        type="LESSONS"
        title="Lesson Plans Library"
        description="Your bank of generated high-fidelity lesson plans. Review sequences, download PDFs, or generate notes."
      />
    </div>
  );
}
