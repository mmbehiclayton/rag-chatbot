import { notFound, redirect } from "next/navigation";
import { DocHeader } from "@/components/document/doc-parts";
import { LessonEditor } from "@/components/document/lesson-editor";
import type { LessonContent } from "@/components/document/lesson-types";
import { auth } from "@/lib/auth";
import { db, withDbRetry } from "@/lib/db";

export default async function EditLessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.userId) redirect("/login");

  const { id } = await params;
  const lesson = await withDbRetry(() =>
    db.lessonPlan.findFirst({
      where: { id, teacherId: session.userId },
      select: { id: true, topic: true, content: true },
    }),
  );
  if (!lesson) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <DocHeader
        backHref={`/dashboard/lessons/${lesson.id}`}
        backLabel="Lesson plan"
        title="Edit lesson plan"
        meta={lesson.topic}
      />
      <LessonEditor
        lessonId={lesson.id}
        initial={(lesson.content ?? {}) as LessonContent}
      />
    </div>
  );
}
