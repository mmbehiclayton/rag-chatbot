import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, Upload } from "lucide-react";
import { auth } from "@/lib/auth";
import { db, withDbRetry } from "@/lib/db";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Props = { searchParams: Promise<{ [key: string]: string | string[] | undefined }> };

type Coverage = { label: string; variant: "success" | "info" | "warning" | "destructive" | "secondary"; note: string };

/** For each class, whether its KICD design is in Elimu and whether teachers are using it. */
export default async function ContentReviewPage(props: Props) {
  const session = await auth();
  if (session?.role !== "SUPERADMIN" && session?.role !== "ADMIN") redirect("/dashboard");
  const isStaff = session.role === "SUPERADMIN";

  const [grades, designs, schemes] = await withDbRetry(() =>
    Promise.all([
      db.gradeLevel.findMany({
        orderBy: { order: "asc" },
        select: {
          id: true,
          name: true,
          learningAreas: { select: { learningArea: { select: { id: true, name: true, order: true } } } },
        },
      }),
      db.curriculumDocument.findMany({ select: { gradeLevel: true, subject: true, status: true } }),
      db.schemeOfWork.groupBy({
        by: ["grade", "subject"],
        where: isStaff ? {} : { teacher: { tenantId: session.tenantId ?? "no-school" } },
        _count: true,
      }),
    ])
  );

  const key = (grade: string, subject: string) => `${grade}|${subject}`;
  const designStatus = new Map<string, string>();
  for (const d of designs) {
    // A class can have more than one upload; any ready one counts.
    const k = key(d.gradeLevel, d.subject);
    if (designStatus.get(k) !== "completed") designStatus.set(k, d.status);
  }
  const schemeCount = new Map(schemes.map((s) => [key(s.grade, s.subject), s._count]));

  const coverage = (grade: string, subject: string): Coverage => {
    const design = designStatus.get(key(grade, subject));
    const count = schemeCount.get(key(grade, subject)) ?? 0;
    const used = count === 1 ? "1 scheme made" : `${count} schemes made`;
    if (design === "completed") {
      return count > 0
        ? { label: "In use", variant: "success", note: used }
        : { label: "Ready", variant: "info", note: "Design in Elimu, no schemes yet" };
    }
    if (design) return { label: "Design not ready", variant: "warning", note: design === "error" ? "Reading the PDF failed" : "Still being read" };
    if (count > 0) return { label: "No design", variant: "destructive", note: `${used} without the KICD design. Check them.` };
    return { label: "Not started", variant: "secondary", note: "No design uploaded" };
  };

  const params = await props.searchParams;
  const withDesign = grades.find((g) => g.learningAreas.some((la) => designStatus.has(key(g.name, la.learningArea.name))));
  const selected = grades.find((g) => g.name === params?.grade) ?? withDesign ?? grades[0];

  const all = grades.flatMap((g) => g.learningAreas.map((la) => coverage(g.name, la.learningArea.name)));
  const readyCount = all.filter((c) => c.variant === "success" || c.variant === "info").length;
  const riskCount = all.filter((c) => c.variant === "destructive").length;

  const rows = (selected?.learningAreas ?? [])
    .map((la) => la.learningArea)
    .sort((a, b) => a.order - b.order)
    .map((la) => ({ id: la.id, name: la.name, ...coverage(selected!.name, la.name) }));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Content review"
        description="Elimu only creates work for a class once its KICD curriculum design is uploaded. Check which classes are covered."
        action={
          isStaff ? (
            <Button variant="outline" className="h-11" render={<Link href="/dashboard/knowledge" />}>
              <Upload /> Upload designs
            </Button>
          ) : undefined
        }
      />

      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <dd className="text-lg font-semibold">
            {readyCount} <span className="text-sm font-normal text-muted-foreground">of {all.length}</span>
          </dd>
          <dt className="text-xs text-muted-foreground">Classes with a ready design</dt>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <dd className={riskCount > 0 ? "text-lg font-semibold text-destructive" : "text-lg font-semibold"}>{riskCount}</dd>
          <dt className="text-xs text-muted-foreground">Classes with schemes but no design</dt>
        </div>
      </dl>

      {grades.length === 0 ? (
        <EmptyState icon={BookOpen} title="No grades set up" description="Add grades and learning areas on the Curriculum structure page." />
      ) : (
        <section className="space-y-3">
          <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" aria-label="Grade">
            {grades.map((g) => (
              <Button
                key={g.id}
                size="sm"
                variant={g.id === selected?.id ? "secondary" : "ghost"}
                className="h-11 shrink-0"
                render={<Link href={`/dashboard/verification?grade=${encodeURIComponent(g.name)}`} />}
                aria-current={g.id === selected?.id ? "page" : undefined}
              >
                {g.name}
              </Button>
            ))}
          </nav>

          {rows.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title={`No learning areas for ${selected?.name}`}
              description="Link learning areas to this grade on the Curriculum structure page."
            />
          ) : (
            <ul className="divide-y rounded-xl border bg-card">
              {rows.map((r) => (
                <li key={r.id} className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.note}</p>
                  </div>
                  <Badge variant={r.variant}>{r.label}</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
