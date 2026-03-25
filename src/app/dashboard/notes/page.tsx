import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import NotesClient from "@/components/dashboard/notes-client";

export default async function NotesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const lessonPlans = await db.lessonPlan.findMany({
    where: { teacherId: session.userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, topic: true, lessonNumber: true, scheme: { select: { title: true, grade: true, subject: true } } }
  });

  return <NotesClient lessonPlans={lessonPlans} />;
}
