import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, BookOpen, ChevronRight, ClipboardCheck, ClipboardList, FileText, Info, NotebookPen, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { auth } from "@/lib/auth";
import { db, withDbRetry } from "@/lib/db";
import { classLessonWhere, createHref, nextLessonInScheme } from "@/lib/classes";
import { getIndexedCurricula } from "@/lib/curriculum-options";
import { parseTitle } from "@/components/document/doc-parts";
import { LinkList, SectionTitle } from "@/components/shared/link-list";
import { Button } from "@/components/ui/button";

function decode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function ago(date: Date) {
  return formatDistanceToNow(date, { addSuffix: true });
}

function NewButton({ href, label }: { href: string; label: string }) {
  return (
    <Button variant="ghost" size="sm" render={<Link href={href} />} aria-label={label}>
      <Plus /> New
    </Button>
  );
}

export default async function ClassPage({ params }: { params: Promise<{ grade: string; subject: string }> }) {
  const session = await auth();
  if (!session?.userId) redirect("/login");

  const raw = await params;
  const grade = decode(raw.grade);
  const subject = decode(raw.subject);
  if (!grade || !subject) notFound();
  const teacherId = session.userId;

  const [schemes, lessons, notes, assessments, curricula] = await Promise.all([
    withDbRetry(() =>
      db.schemeOfWork.findMany({
        where: { teacherId, grade, subject },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: { id: true, title: true, term: true, content: true, updatedAt: true, lessonPlans: { select: { lessonNumber: true } } },
      })
    ),
    withDbRetry(() =>
      db.lessonPlan.findMany({
        where: classLessonWhere(teacherId, grade, subject),
        orderBy: { updatedAt: "desc" },
        take: 20,
        select: { id: true, topic: true, lessonNumber: true, schemeId: true, updatedAt: true },
      })
    ),
    withDbRetry(() =>
      db.lessonNote.findMany({
        where: { teacherId, lessonPlan: classLessonWhere(teacherId, grade, subject) },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: { id: true, updatedAt: true, lessonPlan: { select: { topic: true } } },
      })
    ),
    withDbRetry(() =>
      db.assessment.findMany({
        where: { teacherId, grade, subject },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: { id: true, title: true, type: true, updatedAt: true },
      })
    ),
    getIndexedCurricula(session.tenantId),
  ]);

  const current = schemes[0];
  const next = current ? nextLessonInScheme(current, new Set(current.lessonPlans.map((l) => l.lessonNumber))) : null;
  const hasCurriculum = curricula.includes(`${grade}|${subject}`);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-3">
        <Link href="/dashboard/classes" className="inline-flex min-h-10 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> My classes
        </Link>
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">
            {grade} · {subject}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Everything you have prepared for this class.</p>
        </div>
        {!hasCurriculum && (
          <p className="flex gap-2 rounded-lg border bg-card p-3 text-sm">
            <Info className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
            <span>
              The curriculum design for this class isn't in Elimu yet. You can still create documents, but check strands and outcomes
              carefully.
            </span>
          </p>
        )}
      </div>

      <section className="space-y-2">
        <SectionTitle
          title="Scheme of work"
          action={current && <NewButton href={createHref("scheme", grade, subject)} label="New scheme of work" />}
        />
        {current ? (
          <div className="rounded-xl border bg-card">
            <Link
              href={`/dashboard/schemes/${current.id}`}
              className="flex min-h-14 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60"
            >
              <BookOpen className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{parseTitle(current.title).title}</span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                  {current.term}
                  {next ? ` · ${next.done} of ${next.total} lesson plans ready` : " · all lesson plans ready"}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
            {next && (
              <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">
                    Next to prepare · Week {next.weekNumber}, lesson {next.lessonNumber}
                  </p>
                  <p className="truncate text-sm font-medium">{next.topic}</p>
                </div>
                <Button render={<Link href={`/dashboard/schemes/${current.id}#week-${next.weekNumber}`} />}>
                  Prepare week {next.weekNumber}
                </Button>
              </div>
            )}
            <Link
              href={`/dashboard/schemes/${current.id}/record`}
              className="flex min-h-12 items-center gap-3 border-t px-4 py-3 text-sm transition-colors hover:bg-muted/60"
            >
              <ClipboardCheck className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="flex-1 font-medium">Record of work</span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          </div>
        ) : (
          <div className="space-y-3 rounded-xl border border-dashed bg-card p-4">
            <p className="text-sm text-muted-foreground">
              Start with the scheme for the term. Elimu then creates the lesson plans from it, week by week.
            </p>
            <Button render={<Link href={createHref("scheme", grade, subject)} />}>
              <BookOpen /> Create the scheme of work
            </Button>
          </div>
        )}
        {schemes.length > 1 && (
          <LinkList
            items={schemes.slice(1).map((s) => ({
              href: `/dashboard/schemes/${s.id}`,
              title: parseTitle(s.title).title,
              meta: `${s.term} · updated ${ago(s.updatedAt)}`,
              icon: BookOpen,
            }))}
          />
        )}
      </section>

      <section className="space-y-2">
        <SectionTitle title="Lesson plans" action={<NewButton href={createHref("lesson", grade, subject)} label="New lesson plan" />} />
        {lessons.length === 0 ? (
          <p className="rounded-xl border border-dashed bg-card p-4 text-sm text-muted-foreground">
            No lesson plans yet. Create them from the scheme, or make a single lesson plan with New.
          </p>
        ) : (
          <LinkList
            items={lessons.map((l) => ({
              href: `/dashboard/lessons/${l.id}`,
              title: l.topic,
              meta: [l.schemeId && `Lesson ${l.lessonNumber}`, `updated ${ago(l.updatedAt)}`].filter(Boolean).join(" · "),
              icon: FileText,
            }))}
          />
        )}
      </section>

      {notes.length > 0 && (
        <section className="space-y-2">
          <SectionTitle title="Lesson notes" />
          <LinkList
            items={notes.map((n) => ({
              href: `/dashboard/notes/${n.id}`,
              title: n.lessonPlan.topic,
              meta: `updated ${ago(n.updatedAt)}`,
              icon: NotebookPen,
            }))}
          />
        </section>
      )}

      <section className="space-y-2">
        <SectionTitle
          title="Assessments"
          action={<NewButton href={createHref("assessment", grade, subject)} label="New assessment" />}
        />
        {assessments.length === 0 ? (
          <p className="rounded-xl border border-dashed bg-card p-4 text-sm text-muted-foreground">No assessments yet.</p>
        ) : (
          <LinkList
            items={assessments.map((a) => ({
              href: `/dashboard/assessments/${a.id}`,
              title: parseTitle(a.title).title,
              meta: `${a.type} · updated ${ago(a.updatedAt)}`,
              icon: ClipboardList,
            }))}
          />
        )}
      </section>
    </div>
  );
}
