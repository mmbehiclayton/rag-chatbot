import { ArrowLeft, ChevronRight, FileText } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateNotesButton } from "@/components/create/create-notes-button";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { pickClass } from "@/lib/class-filter";
import { classLessonWhere, getTeacherClasses } from "@/lib/classes";
import { db, withDbRetry } from "@/lib/db";

// Writing a document with AI can take a couple of minutes.
export const maxDuration = 300;
// Lesson notes are built from a lesson plan: pick one of your recent plans (in one class, when chosen).
export default async function NewNotesPage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string | string[] }>;
}) {
  const session = await auth();
  if (!session?.userId) redirect("/login");
  const teacherId = session.userId;

  const asked = [(await searchParams).class].flat()[0];
  const only = asked
    ? pickClass(await getTeacherClasses(teacherId), asked, undefined)
    : null;

  const plans = await withDbRetry(() =>
    db.lessonPlan.findMany({
      where: only
        ? classLessonWhere(teacherId, only.grade, only.subject)
        : { teacherId },
      orderBy: { updatedAt: "desc" },
      take: 30,
      select: {
        id: true,
        topic: true,
        grade: true,
        subject: true,
        scheme: { select: { grade: true, subject: true } },
        lessonNotes: {
          select: { id: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    }),
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button
        variant="ghost"
        className="-ml-2 h-11"
        render={<Link href="/dashboard/notes" />}
      >
        <ArrowLeft /> Lesson notes
      </Button>
      <PageHeader
        title="New lesson notes"
        description={`Choose a lesson plan${only ? ` for ${only.grade} ${only.subject}` : ""}. Elimu writes detailed teaching notes with worked examples and questions.`}
      />

      {plans.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Create a lesson plan first"
          description="Lesson notes are written from one of your lesson plans."
          action={
            <Button render={<Link href="/dashboard/create/lesson" />}>
              Create lesson plan
            </Button>
          }
        />
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {plans.map((plan) => {
            const note = plan.lessonNotes[0];
            const meta = [
              plan.grade ?? plan.scheme?.grade,
              plan.subject ?? plan.scheme?.subject,
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <li
                key={plan.id}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{plan.topic}</p>
                  {meta && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {meta}
                    </p>
                  )}
                </div>
                {note ? (
                  <Button
                    variant="ghost"
                    render={<Link href={`/dashboard/notes/${note.id}`} />}
                  >
                    Open notes <ChevronRight />
                  </Button>
                ) : (
                  <CreateNotesButton lessonPlanId={plan.id} />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
