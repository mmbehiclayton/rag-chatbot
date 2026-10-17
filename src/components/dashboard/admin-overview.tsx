import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { BarChart3, BookOpen, ChevronRight, ClipboardCheck, FileText, Users } from "lucide-react";
import { db, withDbRetry } from "@/lib/db";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

/** A school admin's home: their teachers and what they have prepared. */
export async function AdminOverview({ session }: { session: { tenantId?: string | null } }) {
  const tenantId = session.tenantId ?? "no-school";
  const workWhere = { teacher: { tenantId } };

  const [school, teachersCount, schemesCount, lessonsCount, assessmentsCount, recentTeachers] = await withDbRetry(() =>
    Promise.all([
      db.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
      db.user.count({ where: { role: "TEACHER", tenantId } }),
      db.schemeOfWork.count({ where: workWhere }),
      db.lessonPlan.count({ where: workWhere }),
      db.assessment.count({ where: workWhere }),
      db.user.findMany({
        where: { role: "TEACHER", tenantId },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: { id: true, name: true, email: true, updatedAt: true, _count: { select: { schemesOfWork: true, lessonPlans: true } } },
      }),
    ])
  );
  const num = (n: number) => n.toLocaleString("en-KE");

  const cards = [
    { title: "Teachers", value: teachersCount, icon: Users, href: "/dashboard/teachers" },
    { title: "Schemes of work", value: schemesCount, icon: BookOpen, href: "/dashboard/admin/analytics" },
    { title: "Lesson plans", value: lessonsCount, icon: FileText, href: "/dashboard/admin/analytics" },
    { title: "Assessments", value: assessmentsCount, icon: ClipboardCheck, href: "/dashboard/admin/analytics" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={school?.name ?? "Your school"} description="Your teachers and what they have prepared." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.title} href={c.href} className="flex items-start gap-3 rounded-xl border bg-card p-4 hover:bg-muted">
            <c.icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0">
              <p className="text-lg font-semibold">{num(c.value)}</p>
              <p className="text-xs text-muted-foreground">{c.title}</p>
            </div>
          </Link>
        ))}
      </div>

      <Link href="/dashboard/admin/analytics" className="flex min-h-11 items-center gap-3 rounded-xl border bg-card p-4 hover:bg-muted">
        <BarChart3 className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="flex-1 text-sm">Usage: AI use this month and each teacher's work</span>
        <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
      </Link>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Recently active</h2>
          <Button variant="ghost" size="sm" className="h-11" render={<Link href="/dashboard/teachers" />}>
            All teachers
          </Button>
        </div>
        {recentTeachers.length === 0 ? (
          <EmptyState icon={Users} title="No teachers yet" description="Teachers at your school show here once they create an account." />
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {recentTeachers.map((t) => (
              <li key={t.id} className="flex items-center gap-3 p-4">
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm font-semibold text-primary"
                  aria-hidden
                >
                  {(t.name || t.email).charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.name || t.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {t._count.lessonPlans} lessons · {t._count.schemesOfWork} schemes · active{" "}
                    {formatDistanceToNow(t.updatedAt, { addSuffix: true })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
