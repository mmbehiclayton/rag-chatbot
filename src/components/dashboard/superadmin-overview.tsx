import Link from "next/link";
import { BookOpen, Building2, ChevronRight, ShieldCheck, Ticket, Users } from "lucide-react";
import { db, withDbRetry } from "@/lib/db";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export async function SuperAdminOverview() {
  const [chunks, schools, teachers, docs] = await withDbRetry(() =>
    Promise.all([
      db.curriculumChunk.count(),
      db.tenant.count({ where: { type: "SCHOOL" } }),
      db.user.count({ where: { role: "TEACHER" } }),
      db.curriculumDocument.findMany({
        orderBy: { uploadDate: "desc" },
        take: 4,
        select: { id: true, title: true, status: true, _count: { select: { chunks: true } } },
      }),
    ])
  );
  const num = (n: number) => n.toLocaleString("en-KE");

  const cards = [
    { title: "Curriculum designs", value: num(chunks), desc: "Indexed sections Elimu can draw on", icon: BookOpen, href: "/dashboard/knowledge" },
    { title: "Teachers", value: num(teachers), desc: "Teacher accounts on Elimu", icon: Users, href: "/dashboard/teachers" },
    { title: "Schools", value: num(schools), desc: "Schools added by Elimu staff", icon: Building2, href: "/dashboard/tenants" },
    { title: "Pilot", value: "Payments", desc: "Test mode, term pass price, M-Pesa codes", icon: Ticket, href: "/dashboard/pilot" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Elimu staff" description="Curriculum, schools, teachers and the pilot." />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="flex items-center gap-3 rounded-xl border bg-card p-4 hover:bg-muted sm:flex-col sm:items-start">
            <c.icon className="size-5 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold">{c.value}</p>
              <p className="text-sm font-medium">{c.title}</p>
              <p className="truncate text-xs text-muted-foreground">{c.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      <Link href="/dashboard/rbac" className="flex min-h-11 items-center gap-3 rounded-xl border bg-card p-4 hover:bg-muted">
        <ShieldCheck className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="flex-1 text-sm">Access control: what each role can open</span>
        <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
      </Link>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Latest uploads</h2>
          <Button variant="ghost" size="sm" className="h-11" render={<Link href="/dashboard/knowledge" />}>
            See all
          </Button>
        </div>
        {docs.length === 0 ? (
          <EmptyState icon={BookOpen} title="No curriculum designs yet" description="Upload KICD designs on the Curriculum designs page." />
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center gap-3 p-4">
                <p className="min-w-0 flex-1 truncate text-sm font-medium">{d.title}</p>
                <span className="text-xs text-muted-foreground">{num(d._count.chunks)} sections</span>
                <Badge variant={d.status === "completed" ? "success" : d.status === "error" ? "destructive" : "warning"}>
                  {d.status === "completed" ? "Ready" : d.status === "error" ? "Failed" : "Indexing"}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
