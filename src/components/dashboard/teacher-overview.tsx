import Link from "next/link";
import { BookOpen, ChevronRight, ClipboardList, FileText, GraduationCap, Info, NotebookPen, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { db, withDbRetry } from "@/lib/db";
import { getIndexedCurricula } from "@/lib/curriculum-options";
import { classHref, classSummary, getTeacherClasses, nextLessonInScheme, type NextLesson } from "@/lib/classes";
import { parseTitle } from "@/components/document/doc-parts";
import { EmptyState } from "@/components/shared/empty-state";
import { LinkList, SectionTitle, type LinkListItem } from "@/components/shared/link-list";
import { Button } from "@/components/ui/button";

type Recent = LinkListItem & { updatedAt: Date };

export async function TeacherOverview({ session }: { session: { userId: string; tenantId?: string | null } }) {
  const teacherId = session.userId;
  const [user, classes, schemes, lessons, notes, assessments, curricula] = await Promise.all([
    withDbRetry(() => db.user.findUnique({ where: { id: teacherId }, select: { name: true } })),
    getTeacherClasses(teacherId),
    // Latest schemes, newest first, so each class keeps only its current one below.
    withDbRetry(() =>
      db.schemeOfWork.findMany({
        where: { teacherId },
        orderBy: { updatedAt: "desc" },
        take: 20,
        select: {
          id: true,
          title: true,
          grade: true,
          subject: true,
          term: true,
          content: true,
          updatedAt: true,
          lessonPlans: { select: { lessonNumber: true } },
        },
      })
    ),
    withDbRetry(() =>
      db.lessonPlan.findMany({
        where: { teacherId },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: { id: true, topic: true, grade: true, subject: true, updatedAt: true, scheme: { select: { grade: true, subject: true } } },
      })
    ),
    withDbRetry(() =>
      db.lessonNote.findMany({
        where: { teacherId },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: { id: true, updatedAt: true, lessonPlan: { select: { topic: true } } },
      })
    ),
    withDbRetry(() =>
      db.assessment.findMany({
        where: { teacherId },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: { id: true, title: true, grade: true, subject: true, updatedAt: true },
      })
    ),
    getIndexedCurricula(session.tenantId),
  ]);

  const firstName = user?.name?.trim().split(/\s+/)[0] || "Teacher";

  // One "next lesson to prepare" per class, from that class's most recent scheme.
  const seen = new Set<string>();
  const upNext: (NextLesson & { label: string })[] = [];
  for (const s of schemes) {
    const k = `${s.grade}|${s.subject}`;
    if (seen.has(k)) continue;
    seen.add(k);
    const next = nextLessonInScheme(s, new Set(s.lessonPlans.map((l) => l.lessonNumber)));
    if (next) upNext.push({ ...next, label: `${s.grade} · ${s.subject}` });
  }

  const recent: Recent[] = [
    ...lessons.map((l) => ({
      key: `lesson-${l.id}`,
      href: `/dashboard/lessons/${l.id}`,
      title: l.topic,
      meta: ["Lesson plan", l.grade ?? l.scheme?.grade, l.subject ?? l.scheme?.subject].filter(Boolean).join(" · "),
      icon: FileText,
      updatedAt: l.updatedAt,
    })),
    ...schemes.slice(0, 5).map((s) => ({
      key: `scheme-${s.id}`,
      href: `/dashboard/schemes/${s.id}`,
      title: parseTitle(s.title).title,
      meta: `Scheme of work · ${s.grade} · ${s.subject}`,
      icon: BookOpen,
      updatedAt: s.updatedAt,
    })),
    ...notes.map((n) => ({
      key: `note-${n.id}`,
      href: `/dashboard/notes/${n.id}`,
      title: n.lessonPlan.topic,
      meta: "Lesson notes",
      icon: NotebookPen,
      updatedAt: n.updatedAt,
    })),
    ...assessments.map((a) => ({
      key: `assessment-${a.id}`,
      href: `/dashboard/assessments/${a.id}`,
      title: parseTitle(a.title).title,
      meta: `Assessment · ${a.grade} · ${a.subject}`,
      icon: ClipboardList,
      updatedAt: a.updatedAt,
    })),
  ]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 5)
    .map((r) => ({ ...r, meta: `${r.meta} · ${formatDistanceToNow(r.updatedAt, { addSuffix: true })}` }));

  // Honest notice when none of the teacher's classes has a curriculum design in Elimu yet.
  const noCurriculum = classes.length > 0 && !classes.some((c) => curricula.includes(`${c.grade}|${c.subject}`));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">Habari, {firstName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {upNext.length > 0 ? "Here is what to prepare next." : "What are you teaching tomorrow?"}
        </p>
      </div>

      {noCurriculum && (
        <p className="flex gap-2 rounded-lg border bg-card p-3 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          <span>
            The curriculum designs for your classes aren't in Elimu yet. You can still create documents, but check strands and outcomes
            carefully.
          </span>
        </p>
      )}

      {upNext.length > 0 && (
        <section className="space-y-2">
          <SectionTitle title="Next lessons to prepare" />
          <ul className="space-y-2">
            {upNext.map((n) => (
              <li key={n.schemeId} className="rounded-xl border bg-card p-4">
                <p className="text-xs text-muted-foreground">
                  {n.label} · Week {n.weekNumber}, lesson {n.lessonNumber}
                </p>
                <p className="mt-0.5 truncate text-sm font-medium">{n.topic}</p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">
                    {n.done} of {n.total} lesson plans ready
                  </span>
                  <Button size="sm" render={<Link href={`/dashboard/schemes/${n.schemeId}#week-${n.weekNumber}`} />}>
                    Prepare week {n.weekNumber}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link
        href="/dashboard/create/lesson"
        className="flex min-h-16 items-center gap-4 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/60"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Plus className="size-6" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold">Quick lesson plan</span>
          <span className="mt-0.5 block text-sm text-muted-foreground">One lesson for tomorrow, no scheme needed</span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      </Link>

      <section className="space-y-2">
        <SectionTitle
          title="My classes"
          action={
            classes.length > 0 && (
              <Link href="/dashboard/classes" className="inline-flex min-h-10 items-center text-sm font-medium text-primary hover:underline">
                See all
              </Link>
            )
          }
        />
        {classes.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="Add the classes you teach"
            description="Each class gets its own page for the scheme, lesson plans and assessments."
            action={<Button render={<Link href="/onboarding?from=profile" />}>Add classes</Button>}
          />
        ) : (
          <LinkList
            items={classes.slice(0, 4).map((c) => ({
              href: classHref(c.grade, c.subject),
              title: `${c.grade} · ${c.subject}`,
              meta: classSummary(c),
              icon: GraduationCap,
            }))}
          />
        )}
      </section>

      {recent.length > 0 && (
        <section className="space-y-2">
          <SectionTitle
            title="Recently opened"
            action={
              <Link href="/dashboard/library" className="inline-flex min-h-10 items-center text-sm font-medium text-primary hover:underline">
                All documents
              </Link>
            }
          />
          <LinkList items={recent} />
        </section>
      )}
    </div>
  );
}
