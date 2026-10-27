import { formatDistanceToNow } from "date-fns";
import {
  BookOpen,
  Briefcase,
  ClipboardList,
  FileText,
  GraduationCap,
  Info,
  MessagesSquare,
  NotebookPen,
} from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { TeacherStats } from "@/components/dashboard/teacher-stats";
import { parseTitle } from "@/components/document/doc-parts";
import { CREATE_NAV } from "@/components/layout/nav-config";
import { EmptyState } from "@/components/shared/empty-state";
import { InstallAppCard } from "@/components/shared/install-app";
import {
  LinkList,
  type LinkListItem,
  SectionTitle,
} from "@/components/shared/link-list";
import { TodayLessons } from "@/components/term-pack/today-lessons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getTeacherClasses,
  gradeHref,
  gradeSummary,
  groupByGrade,
  type NextLesson,
  nextLessonInScheme,
} from "@/lib/classes";
import { getIndexedCurricula } from "@/lib/curriculum-options";
import { db, withDbRetry } from "@/lib/db";

type Recent = LinkListItem & { updatedAt: Date };

/** The other pages are in the menu; Home points teachers to each other. */
const COMMUNITY = [
  {
    href: "/dashboard/staffroom",
    icon: MessagesSquare,
    title: "Staffroom",
    note: "Ask and share with teachers",
  },
  {
    href: "/dashboard/jobs",
    icon: Briefcase,
    title: "Jobs",
    note: "Teaching jobs near you",
  },
];

export async function TeacherOverview({
  session,
}: {
  session: { userId: string; tenantId?: string | null };
}) {
  const teacherId = session.userId;
  const [user, classes, schemes, lessons, notes, assessments, curricula] =
    await Promise.all([
      withDbRetry(() =>
        db.user.findUnique({
          where: { id: teacherId },
          select: { name: true },
        }),
      ),
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
        }),
      ),
      withDbRetry(() =>
        db.lessonPlan.findMany({
          where: { teacherId },
          orderBy: { updatedAt: "desc" },
          take: 5,
          select: {
            id: true,
            topic: true,
            grade: true,
            subject: true,
            updatedAt: true,
            scheme: { select: { grade: true, subject: true } },
          },
        }),
      ),
      withDbRetry(() =>
        db.lessonNote.findMany({
          where: { teacherId },
          orderBy: { updatedAt: "desc" },
          take: 5,
          select: {
            id: true,
            updatedAt: true,
            lessonPlan: { select: { topic: true } },
          },
        }),
      ),
      withDbRetry(() =>
        db.assessment.findMany({
          where: { teacherId },
          orderBy: { updatedAt: "desc" },
          take: 5,
          select: {
            id: true,
            title: true,
            grade: true,
            subject: true,
            updatedAt: true,
          },
        }),
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
    const next = nextLessonInScheme(
      s,
      new Set(s.lessonPlans.map((l) => l.lessonNumber)),
    );
    if (next) upNext.push({ ...next, label: `${s.grade} · ${s.subject}` });
  }

  const recent: Recent[] = [
    ...lessons.map((l) => ({
      key: `lesson-${l.id}`,
      href: `/dashboard/lessons/${l.id}`,
      title: l.topic,
      meta: [
        "Lesson plan",
        l.grade ?? l.scheme?.grade,
        l.subject ?? l.scheme?.subject,
      ]
        .filter(Boolean)
        .join(" · "),
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
    .map((r) => ({
      ...r,
      meta: `${r.meta} · ${formatDistanceToNow(r.updatedAt, { addSuffix: true })}`,
    }));

  // Honest notice when none of the teacher's classes has a curriculum design in Elimu yet.
  const noCurriculum =
    classes.length > 0 &&
    !classes.some((c) => curricula.includes(`${c.grade}|${c.subject}`));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">
          Habari, {firstName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {upNext.length > 0
            ? "Here is what to prepare next."
            : "What are you teaching tomorrow?"}
        </p>
      </div>

      <InstallAppCard />

      {noCurriculum && (
        <p className="flex gap-2 rounded-lg border bg-card p-3 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          <span>
            The curriculum designs for your classes aren't in Elimu yet. You can
            make lesson plans and notes, but check them against your design.
            Schemes of work and assessments need the design: open a class to
            tell us you need it.
          </span>
        </p>
      )}

      <section id="make" className="scroll-mt-4 space-y-2">
        <SectionTitle title="Make something" />
        <ul className="grid grid-cols-2 gap-2">
          {CREATE_NAV.map((m, i) => (
            <li key={m.href}>
              <Link
                href={m.href}
                className={
                  i === 0
                    ? "flex h-full min-h-24 flex-col justify-between gap-2 rounded-xl border border-primary bg-primary p-4 text-primary-foreground transition-colors hover:bg-primary/90"
                    : "flex h-full min-h-24 flex-col justify-between gap-2 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/60"
                }
              >
                <m.icon
                  className={
                    i === 0 ? "size-5" : "size-5 text-muted-foreground"
                  }
                  aria-hidden
                />
                <span>
                  <span className="block text-sm font-semibold">{m.name}</span>
                  <span
                    className={
                      i === 0
                        ? "block text-xs text-primary-foreground/80"
                        : "block text-xs text-muted-foreground"
                    }
                  >
                    {m.note}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <TodayLessons teacherId={teacherId} hasSchemes={schemes.length > 0} />

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
                  <Button
                    size="sm"
                    render={
                      <Link
                        href={`/dashboard/schemes/${n.schemeId}#week-${n.weekNumber}`}
                      />
                    }
                  >
                    Prepare week {n.weekNumber}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Suspense fallback={<Skeleton className="h-40 rounded-xl" />}>
        <TeacherStats teacherId={teacherId} />
      </Suspense>

      <section className="space-y-2">
        <SectionTitle
          title="My classes"
          action={
            classes.length > 0 && (
              <Link
                href="/onboarding?from=profile"
                className="inline-flex min-h-10 items-center text-sm font-medium text-primary hover:underline"
              >
                Change
              </Link>
            )
          }
        />
        {classes.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="Add the classes you teach"
            description="Each class gets its own page for the scheme, lesson plans and assessments."
            action={
              <Button render={<Link href="/onboarding?from=profile" />}>
                Add classes
              </Button>
            }
          />
        ) : (
          <LinkList
            items={groupByGrade(classes).map((g) => ({
              href: gradeHref(g.grade),
              title: g.grade,
              meta: gradeSummary(g.classes),
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
              <Link
                href="/dashboard/lessons"
                className="inline-flex min-h-10 items-center text-sm font-medium text-primary hover:underline"
              >
                All lesson plans
              </Link>
            }
          />
          <LinkList items={recent} />
        </section>
      )}

      <section className="space-y-2">
        <SectionTitle title="Teachers on Elimu" />
        <ul className="grid grid-cols-2 gap-2">
          {COMMUNITY.map((c) => (
            <li key={c.href}>
              <Link
                href={c.href}
                className="flex h-full min-h-20 flex-col justify-between gap-2 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/60"
              >
                <c.icon className="size-5 text-primary" aria-hidden />
                <span>
                  <span className="block text-sm font-semibold">{c.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {c.note}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
