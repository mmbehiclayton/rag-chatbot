import { formatDistanceToNow } from "date-fns";
import { BookOpen, ClipboardCheck, FileText, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { auth } from "@/lib/auth";
import { db, withDbRetry } from "@/lib/db";
import { cn } from "@/lib/utils";

const TEACHER_LIMIT = 50;

const CONTENT_LABEL: Record<string, string> = {
  SCHEME_OF_WORK: "Schemes of work",
  LESSON_PLAN: "Lesson plans",
  LESSON_NOTES: "Lesson notes",
  ASSESSMENT: "Assessments",
  CHAT: "Ask Elimu answers",
};

const num = (n: number) => n.toLocaleString("en-KE");

/** What teachers have prepared and how much of the monthly AI limit is used. Admins see their school; staff see everyone. */
export default async function UsagePage() {
  const session = await auth();
  if (session?.role !== "ADMIN" && session?.role !== "SUPERADMIN")
    redirect("/dashboard");

  const isStaff = session.role === "SUPERADMIN";
  const tenantId = session.tenantId ?? "no-school";
  const teacherWhere = isStaff
    ? { role: "TEACHER" }
    : { role: "TEACHER", tenantId };
  const workWhere = isStaff ? {} : { teacher: { tenantId } };
  const logWhere = isStaff ? {} : { tenantId };

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    school,
    quota,
    teacherCount,
    schemes,
    lessons,
    assessments,
    month,
    byType,
    teachers,
    recentSchemes,
    recentLessons,
    recentAssessments,
  ] = await withDbRetry(() =>
    Promise.all([
      isStaff
        ? null
        : db.tenant.findUnique({
            where: { id: tenantId },
            select: { name: true },
          }),
      db.tenant.aggregate({
        where: isStaff ? {} : { id: tenantId },
        _sum: { tokenQuota: true },
      }),
      db.user.count({ where: teacherWhere }),
      db.schemeOfWork.count({ where: workWhere }),
      db.lessonPlan.count({ where: workWhere }),
      db.assessment.count({ where: workWhere }),
      db.generationLog.aggregate({
        where: { ...logWhere, createdAt: { gte: monthStart } },
        _sum: { totalTokens: true, promptTokens: true, completionTokens: true },
        _count: true,
      }),
      db.generationLog.groupBy({
        by: ["contentType"],
        where: { ...logWhere, createdAt: { gte: monthStart } },
        _count: true,
      }),
      db.user.findMany({
        where: teacherWhere,
        orderBy: { lessonPlans: { _count: "desc" } },
        take: TEACHER_LIMIT,
        select: {
          id: true,
          name: true,
          email: true,
          _count: {
            select: {
              schemesOfWork: true,
              lessonPlans: true,
              assessments: true,
            },
          },
        },
      }),
      db.schemeOfWork.findMany({
        where: workWhere,
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          title: true,
          createdAt: true,
          teacher: { select: { name: true, email: true } },
        },
      }),
      db.lessonPlan.findMany({
        where: workWhere,
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          topic: true,
          createdAt: true,
          teacher: { select: { name: true, email: true } },
        },
      }),
      db.assessment.findMany({
        where: workWhere,
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          title: true,
          createdAt: true,
          teacher: { select: { name: true, email: true } },
        },
      }),
    ]),
  );

  const limit = quota._sum.tokenQuota ?? 0;
  const used = month._sum.totalTokens ?? 0;
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  // GPT-4o list prices: $2.50 per million input tokens, $10 per million output tokens.
  const costUsd =
    ((month._sum.promptTokens ?? 0) * 2.5 +
      (month._sum.completionTokens ?? 0) * 10) /
    1_000_000;
  const monthName = monthStart.toLocaleDateString("en-KE", { month: "long" });

  const totals = [
    { label: "Teachers", value: teacherCount, icon: Users },
    { label: "Schemes of work", value: schemes, icon: BookOpen },
    { label: "Lesson plans", value: lessons, icon: FileText },
    { label: "Assessments", value: assessments, icon: ClipboardCheck },
  ];

  const recent = [
    ...recentSchemes.map((s) => ({
      id: s.id,
      title: s.title,
      kind: "Scheme of work",
      at: s.createdAt,
      by: s.teacher,
    })),
    ...recentLessons.map((l) => ({
      id: l.id,
      title: l.topic,
      kind: "Lesson plan",
      at: l.createdAt,
      by: l.teacher,
    })),
    ...recentAssessments.map((a) => ({
      id: a.id,
      title: a.title,
      kind: "Assessment",
      at: a.createdAt,
      by: a.teacher,
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 8);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Usage"
        description={
          isStaff
            ? "Every school and teacher account on Elimu."
            : `What teachers at ${school?.name ?? "your school"} have prepared, and how much of the monthly AI limit is used.`
        }
      />

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {totals.map((t) => (
          <div
            key={t.label}
            className="flex items-start gap-3 rounded-xl border bg-card p-4"
          >
            <t.icon
              className="mt-0.5 size-5 shrink-0 text-primary"
              aria-hidden
            />
            <div className="min-w-0">
              <dd className="text-lg font-semibold">{num(t.value)}</dd>
              <dt className="text-xs text-muted-foreground">{t.label}</dt>
            </div>
          </div>
        ))}
      </dl>

      <section className="space-y-3 rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold">AI use in {monthName}</h2>
          <p className="text-sm text-muted-foreground">
            {num(month._count)} generations
          </p>
        </div>
        <div className="space-y-1">
          <div className="h-2 overflow-hidden rounded-md bg-muted" aria-hidden>
            <div
              className={cn(
                "h-full",
                pct >= 90
                  ? "bg-destructive"
                  : pct >= 70
                    ? "bg-warning"
                    : "bg-primary",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-sm">
            {num(used)} of {num(limit)} tokens used ({pct}%)
          </p>
          <p className="text-xs text-muted-foreground">
            The limit resets on the 1st of each month. When it runs out,
            teachers can't create new work until then.
          </p>
        </div>
        {byType.length > 0 && (
          <ul className="flex flex-wrap gap-x-4 gap-y-1 border-t pt-3 text-xs text-muted-foreground">
            {byType.map((t) => (
              <li key={t.contentType}>
                {CONTENT_LABEL[t.contentType] ?? t.contentType}:{" "}
                <span className="font-medium text-foreground">
                  {num(t._count)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {isStaff && (
          <p className="border-t pt-3 text-xs text-muted-foreground">
            Estimated AI cost this month:{" "}
            <span className="font-medium text-foreground">
              ${costUsd.toFixed(2)}
            </span>{" "}
            (at GPT-4o prices)
          </p>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Teachers</h2>
        {teachers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No teachers yet"
            description="Teachers show here once they create an account."
          />
        ) : (
          <>
            <ul className="divide-y rounded-xl border bg-card">
              {teachers.map((t) => (
                <li key={t.id} className="flex items-center gap-3 p-4">
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm font-semibold text-primary"
                    aria-hidden
                  >
                    {(t.name || t.email).charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {t.name || t.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t._count.lessonPlans} lessons · {t._count.schemesOfWork}{" "}
                      schemes · {t._count.assessments} assessments
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            {teacherCount > TEACHER_LIMIT && (
              <p className="text-xs text-muted-foreground">
                Showing the {TEACHER_LIMIT} teachers with the most lesson plans,
                out of {num(teacherCount)}.
              </p>
            )}
          </>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Latest work</h2>
        {recent.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Nothing created yet"
            description="Schemes, lesson plans and assessments show here."
          />
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {recent.map((r) => (
              <li key={`${r.kind}-${r.id}`} className="p-4">
                <p className="truncate text-sm font-medium">{r.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {r.kind} · {r.by.name || r.by.email} ·{" "}
                  {formatDistanceToNow(r.at, { addSuffix: true })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
