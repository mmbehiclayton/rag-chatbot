import { BookOpen, FileText, GraduationCap, Clock, ChevronRight, Plus, Database, Sparkles } from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatDistanceToNow } from "date-fns";

export async function TeacherOverview({ session }: { session: any }) {
  const [schemesCount, lessonsCount, assessmentsCount, recentDrafts] = await Promise.all([
    db.schemeOfWork.count({ where: { teacherId: session.userId } }),
    db.lessonPlan.count({ where: { teacherId: session.userId } }),
    db.assessment.count({ where: { teacherId: session.userId } }),
    db.lessonPlan.findMany({
      where: { teacherId: session.userId },
      orderBy: { updatedAt: "desc" },
      take: 4,
    })
  ]);

  const timeSaved = lessonsCount * 2;
  const isTeacher = session.role === "TEACHER";
  const name = session.email?.split('@')[0] || "Teacher";

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {isTeacher ? `Welcome back, ${name}` : "Teacher Generation Tools"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isTeacher ? "Ready to craft today's lesson?" : "Access the generative AI modules below."}
          </p>
        </div>

        {/* Quick CTA */}
        <Link
          href="/dashboard/workstation"
          className="group inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-sm hover:bg-primary/90 hover:shadow-md hover:shadow-primary/20 transition-all duration-200 shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          Open Workstation
          <Plus className="w-3.5 h-3.5 opacity-70" />
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[{
          title: "Schemes", value: schemesCount, desc: "Generated", icon: BookOpen,
          color: "text-blue-600", bg: "bg-blue-500/8", border: "border-blue-500/15"
        }, {
          title: "Lessons", value: lessonsCount, desc: "Generated", icon: FileText,
          color: "text-emerald-600", bg: "bg-emerald-500/8", border: "border-emerald-500/15"
        }, {
          title: "Assessments", value: assessmentsCount, desc: "Generated", icon: GraduationCap,
          color: "text-violet-600", bg: "bg-violet-500/8", border: "border-violet-500/15"
        }, {
          title: "Hours Saved", value: `${timeSaved}h`, desc: "Using AI", icon: Clock,
          color: "text-orange-600", bg: "bg-orange-500/8", border: "border-orange-500/15"
        }].map((stat, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 p-4 rounded-2xl bg-card border ${stat.border} hover:shadow-sm transition-shadow`}
          >
            <div className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <div className="min-w-0">
              <div className="text-lg font-bold tracking-tight">{stat.value}</div>
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide truncate">{stat.title}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="grid gap-5 xl:grid-cols-5">
        
        {/* Recent drafts */}
        <div className="xl:col-span-3 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent Drafts</h2>
            <Link href="/dashboard/lessons" className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors">
              View All
            </Link>
          </div>

          <div className="space-y-1.5">
            {recentDrafts.length > 0 ? recentDrafts.map((draft) => (
              <Link
                key={draft.id}
                href={`/dashboard/lessons`}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 hover:border-primary/20 hover:bg-primary/3 transition-all group"
              >
                <div className="w-9 h-9 rounded-xl bg-muted/60 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                  <FileText className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold truncate text-foreground">{draft.topic}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Updated {formatDistanceToNow(draft.updatedAt)} ago</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
              </Link>
            )) : (
              <div className="p-8 text-center text-sm text-muted-foreground border border-dashed border-border/60 rounded-xl">
                No recent drafts — start generating via the Workstation.
              </div>
            )}
          </div>
        </div>

        {/* Curriculum sync card */}
        <div className="xl:col-span-2">
          <div className="rounded-2xl bg-foreground text-background p-5 relative overflow-hidden h-full flex flex-col justify-between min-h-[180px]">
            <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-primary/25 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

            <div className="relative z-10">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center mb-3">
                <Database className="w-4 h-4 text-background" />
              </div>
              <h3 className="text-base font-bold tracking-tight mb-1">Curriculum Sync</h3>
              <p className="text-[13px] text-background/65 leading-relaxed">
                Embeddings fully synchronized with the KICD vector database.
              </p>
            </div>

            <div className="relative z-10 mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-background/70">Sync Status</span>
                <span className="text-emerald-400">100%</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 w-full rounded-full" />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
