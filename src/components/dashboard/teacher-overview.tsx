import { BookOpen, FileText, GraduationCap, Clock, ChevronRight, Plus, Database } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
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
      take: 3,
    })
  ]);

  // Rough estimate logic for time saved (2h per lesson plan)
  const timeSaved = lessonsCount * 2;
  const isTeacher = session.role === "TEACHER";

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-10 mt-16 sm:mt-0">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-[34px] sm:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
            {isTeacher ? `Hi, ${session.email?.split('@')[0] || "Teacher"}` : "Teacher Generation Tools"}
          </h1>
          <p className="text-muted-foreground mt-1 text-base">{isTeacher ? "Let's craft the perfect lesson today." : "Access the generative AI modules below."}</p>
        </div>
        
        <Link 
          href="/chat" 
          className="group relative flex w-full items-center justify-between overflow-hidden rounded-[32px] bg-foreground text-background p-6 lg:p-8 shadow-2xl transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-primary/20 blur-3xl transition-all group-hover:bg-primary/30" />
          <div className="relative z-10 flex flex-col gap-1.5">
            <span className="text-2xl lg:text-3xl font-extrabold tracking-tight">Create New Plan</span>
            <span className="text-sm lg:text-base text-background/70 font-semibold tracking-wide">AI-powered generation</span>
          </div>
          <div className="relative z-10 flex h-14 w-14 lg:h-16 lg:w-16 items-center justify-center rounded-full bg-background/10 backdrop-blur-md transition-colors group-hover:bg-background/20">
            <Plus className="h-6 w-6 lg:h-7 lg:w-7 text-background" />
          </div>
        </Link>
      </div>

      <div className="w-full overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-4 scrollbar-hide">
        <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 w-max sm:w-full">
          {[{
            title: "Schemes", value: schemesCount.toString(), desc: "Lifetime generation", icon: BookOpen, color: "text-blue-500", bg: "bg-blue-500/10"
          }, {
            title: "Lessons", value: lessonsCount.toString(), desc: "Lifetime generation", icon: FileText, color: "text-green-500", bg: "bg-green-500/10"
          }, {
            title: "Tests", value: assessmentsCount.toString(), desc: "Lifetime generation", icon: GraduationCap, color: "text-purple-500", bg: "bg-purple-500/10"
          }, {
            title: "Time Saved", value: `${timeSaved}h`, desc: "Using AI tools", icon: Clock, color: "text-orange-500", bg: "bg-orange-500/10"
          }].map((stat, i) => (
            <div key={i} className="flex-none w-[160px] sm:w-auto p-5 rounded-[28px] bg-card/80 backdrop-blur-md border border-border/40 shadow-xl shadow-primary/5 relative overflow-hidden group hover:border-primary/20 transition-colors">
              <div className="flex flex-col gap-4 relative z-10">
                 <div className={`w-12 h-12 rounded-[20px] ${stat.bg} flex items-center justify-center`}>
                   <stat.icon className={`w-5 h-5 ${stat.color}`} />
                 </div>
                 <div>
                   <div className="text-2xl font-extrabold tracking-tight">{stat.value}</div>
                   <h3 className="font-semibold text-muted-foreground text-xs uppercase tracking-wider mt-1">{stat.title}</h3>
                 </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-7 pt-2">
        <div className="xl:col-span-4 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-extrabold tracking-tight">Recent Drafts</h3>
            <Link href="#" className="text-sm font-bold text-primary hover:text-primary/80 transition-colors tracking-wide">View All</Link>
          </div>
          
          <div className="flex flex-col gap-3">
            {recentDrafts.length > 0 ? recentDrafts.map((draft) => (
               <Link key={draft.id} href={`/dashboard/lessons`} className="flex items-center p-4 rounded-[28px] bg-card/60 backdrop-blur-sm border border-border/30 hover:bg-card/90 shadow-sm transition-all group">
                 <div className="w-14 h-14 rounded-[20px] bg-secondary flex items-center justify-center text-secondary-foreground group-hover:scale-105 transition-transform">
                   <FileText className="w-6 h-6" />
                 </div>
                 <div className="flex-1 ml-4 truncate">
                   <h4 className="font-bold text-[15px] leading-snug tracking-tight truncate">{draft.topic}</h4>
                   <p className="text-xs text-muted-foreground font-semibold mt-1">Updated {formatDistanceToNow(draft.updatedAt)} ago</p>
                 </div>
                 <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted/50 group-hover:bg-primary/10 transition-colors ml-4 shrink-0">
                   <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                 </div>
              </Link>
            )) : (
              <div className="p-8 text-center text-muted-foreground border border-dashed border-border/50 rounded-[28px]">
                No recent lesson drafts. Generate one via Chat!
              </div>
            )}
          </div>
        </div>

        <div className="xl:col-span-3">
           <div className="p-8 rounded-[32px] bg-gradient-to-br from-foreground to-foreground/90 text-background shadow-2xl relative overflow-hidden">
             <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
             <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px]" />
             
             <div className="relative z-10 flex flex-col h-full justify-between gap-8">
               <div>
                 <div className="w-14 h-14 rounded-[20px] bg-background/10 backdrop-blur-md flex items-center justify-center mb-6">
                   <Database className="w-6 h-6 text-background" />
                 </div>
                 <h3 className="text-2xl font-extrabold tracking-tight mb-2">Curriculum Sync</h3>
                 <p className="text-[15px] text-background/70 font-semibold leading-relaxed">
                   Your embeddings are fully synchronized with the core KICD vector database. Ready for generation.
                 </p>
               </div>
               
               <div className="space-y-3">
                 <div className="flex items-center justify-between text-sm font-bold tracking-wide">
                    <span>Sync Status</span>
                    <span className="text-green-400">100%</span>
                 </div>
                 <div className="w-full h-3 bg-background/20 rounded-full overflow-hidden">
                    <div className="h-full bg-green-400 w-full rounded-full" />
                 </div>
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
