import Link from "next/link";
import { BookOpen, ChevronRight, ClipboardList, FileText, Info, NotebookPen, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { db, withDbRetry } from "@/lib/db";
import { getIndexedCurricula } from "@/lib/curriculum-options";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

type Recent = { id: string; href: string; title: string; meta: string; kind: string; icon: typeof FileText; updatedAt: Date };

export async function TeacherOverview({ session }: { session: { userId: string; tenantId?: string | null } }) {
  const [user, lessons, schemes, notes, assessments, counts, curricula] = await Promise.all([
    withDbRetry(() =>
      db.user.findUnique({ where: { id: session.userId }, select: { name: true, gradesTaught: true, subjectsTaught: true } })
    ),
    withDbRetry(() =>
      db.lessonPlan.findMany({
        where: { teacherId: session.userId },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: { id: true, topic: true, grade: true, subject: true, updatedAt: true, scheme: { select: { grade: true, subject: true } } },
      })
    ),
    withDbRetry(() =>
      db.schemeOfWork.findMany({
        where: { teacherId: session.userId },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: { id: true, title: true, grade: true, subject: true, term: true, updatedAt: true },
      })
    ),
    withDbRetry(() =>
      db.lessonNote.findMany({
        where: { teacherId: session.userId },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: { id: true, updatedAt: true, lessonPlan: { select: { topic: true } } },
      })
    ),
    withDbRetry(() =>
      db.assessment.findMany({
        where: { teacherId: session.userId },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: { id: true, title: true, grade: true, subject: true, updatedAt: true },
      })
    ),
    withDbRetry(() =>
      Promise.all([
        db.lessonPlan.count({ where: { teacherId: session.userId } }),
        db.schemeOfWork.count({ where: { teacherId: session.userId } }),
        db.assessment.count({ where: { teacherId: session.userId } }),
      ])
    ),
    getIndexedCurricula(session.tenantId),
  ]);

  const firstName = user?.name?.trim().split(/\s+/)[0] || "Teacher";
  const [lessonCount, schemeCount, assessmentCount] = counts;

  const recent: Recent[] = [
    ...lessons.map((l) => ({
      id: l.id,
      href: `/dashboard/lessons/${l.id}`,
      title: l.topic,
      meta: [l.grade ?? l.scheme?.grade, l.subject ?? l.scheme?.subject].filter(Boolean).join(" · "),
      kind: "Lesson plan",
      icon: FileText,
      updatedAt: l.updatedAt,
    })),
    ...schemes.map((s) => ({
      id: s.id,
      href: `/dashboard/schemes/${s.id}`,
      title: s.title.replace(/^\[Needs Review\]\s*/i, ""),
      meta: `${s.grade} · ${s.subject} · ${s.term}`,
      kind: "Scheme of work",
      icon: BookOpen,
      updatedAt: s.updatedAt,
    })),
    ...notes.map((n) => ({
      id: n.id,
      href: `/dashboard/notes/${n.id}`,
      title: n.lessonPlan.topic,
      meta: "",
      kind: "Lesson notes",
      icon: NotebookPen,
      updatedAt: n.updatedAt,
    })),
    ...assessments.map((a) => ({
      id: a.id,
      href: `/dashboard/assessments/${a.id}`,
      title: a.title.replace(/^\[Needs Review\]\s*/i, ""),
      meta: `${a.grade} · ${a.subject}`,
      kind: "Assessment",
      icon: ClipboardList,
      updatedAt: a.updatedAt,
    })),
  ]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 5);

  // Honest notice when the teacher's own classes have no curriculum design indexed yet.
  const missing = (user?.gradesTaught ?? [])
    .flatMap((g) => (user?.subjectsTaught ?? []).map((s) => `${g}|${s}`))
    .filter((key) => !curricula.includes(key));
  const anyCovered = (user?.gradesTaught ?? []).some((g) => (user?.subjectsTaught ?? []).some((s) => curricula.includes(`${g}|${s}`)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">Habari, {firstName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">What are you teaching tomorrow?</p>
      </div>

      <Link
        href="/dashboard/create/lesson"
        className="flex items-center gap-4 rounded-xl bg-primary p-5 text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-white/15">
          <Plus className="size-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold">Create a lesson plan</span>
          <span className="mt-0.5 block text-sm text-primary-foreground/85">Ready in about 30 seconds</span>
        </span>
        <ChevronRight className="size-5 shrink-0" />
      </Link>

      {missing.length > 0 && !anyCovered && (
        <p className="flex gap-2 rounded-lg border bg-card p-3 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          <span>
            The curriculum designs for your classes aren't in Elimu yet. You can still create lesson plans, but check strands and outcomes
            carefully.
          </span>
        </p>
      )}

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Continue where you left off</h2>
          {recent.length > 0 && (
            <Link href="/dashboard/library" className="text-sm font-medium text-primary hover:underline">
              See all
            </Link>
          )}
        </div>
        {recent.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Nothing here yet"
            description="Your lesson plans, schemes and assessments will appear here."
            action={<Button render={<Link href="/dashboard/create" />}>Start creating</Button>}
          />
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {recent.map((item) => (
              <li key={`${item.kind}-${item.id}`}>
                <Link href={item.href} className="flex min-h-16 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60">
                  <item.icon className="size-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {[item.kind, item.meta, formatDistanceToNow(item.updatedAt, { addSuffix: true })].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Your work so far" className="grid grid-cols-3 divide-x rounded-xl border bg-card">
        {[
          { label: "Lesson plans", value: lessonCount },
          { label: "Schemes", value: schemeCount },
          { label: "Assessments", value: assessmentCount },
        ].map((stat) => (
          <div key={stat.label} className="px-3 py-4 text-center">
            <p className="text-xl font-semibold">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
