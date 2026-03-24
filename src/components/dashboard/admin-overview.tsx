import { Users, GraduationCap, Clock, Award, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { db } from "@/lib/db";
import { formatDistanceToNow } from "date-fns";

export async function AdminOverview({ session }: { session: any }) {
  // If tenant-based in the future, filter by session.tenantId
  const [teachersCount, schemesCount, assessmentsCount, topTeachers] = await Promise.all([
    db.user.count({ where: { role: "TEACHER" } }),
    db.schemeOfWork.count(),
    db.assessment.count(),
    db.user.findMany({
      where: { role: "TEACHER" },
      include: {
        _count: {
          select: { schemesOfWork: true, lessonPlans: true }
        }
      },
      orderBy: { updatedAt: "desc" },
      take: 3,
    })
  ]);

  const hoursSaved = schemesCount * 12 + assessmentsCount * 1.5;
  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-10">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-[34px] sm:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
            School Administration
          </h1>
          <p className="text-muted-foreground mt-1 text-base">Oversee teacher activity, adoption metrics, and curriculum progress.</p>
        </div>
      </div>

      <div className="w-full overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-4 scrollbar-hide">
        <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 w-max sm:w-full">
          {[{
            title: "Active Teachers", value: teachersCount.toString(), desc: "Registered accounts", icon: Users, color: "text-blue-500", bg: "bg-blue-500/10"
          }, {
            title: "Schemes", value: schemesCount.toString(), desc: "School-wide total", icon: Award, color: "text-amber-500", bg: "bg-amber-500/10"
          }, {
            title: "Assessments", value: assessmentsCount.toString(), desc: "Lifetime total", icon: GraduationCap, color: "text-purple-500", bg: "bg-purple-500/10"
          }, {
            title: "Hours Saved", value: `${hoursSaved}h`, desc: "Cost & time equivalent", icon: Clock, color: "text-green-500", bg: "bg-green-500/10"
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

      <div className="grid gap-8 lg:grid-cols-1 pt-2">
        <div className="p-8 rounded-[32px] bg-card/60 backdrop-blur-sm border border-border/30 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <h3 className="text-xl font-extrabold tracking-tight">Teacher Activity Leaderboard</h3>
            <Link href="/dashboard/teachers" className="text-sm font-bold text-primary hover:text-primary/80 transition-colors tracking-wide bg-primary/10 px-4 py-2 rounded-full">
              Manage Teachers
            </Link>
          </div>
          
          <div className="space-y-3">
            {topTeachers.map((teacher, i) => {
              const generations = teacher._count.schemesOfWork + teacher._count.lessonPlans;
              return (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 border border-border/40 rounded-[24px] hover:bg-muted/30 transition-all group hover:shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-[18px] bg-primary/10 text-primary flex items-center justify-center font-bold text-lg group-hover:scale-105 transition-transform">
                    {(teacher.name || teacher.email).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-[15px]">{teacher.name || teacher.email.split('@')[0]}</div>
                    <div className="text-xs font-semibold text-muted-foreground mt-0.5">Teacher</div>
                  </div>
                </div>
                <div className="flex items-center gap-6 sm:gap-10 sm:justify-end">
                  <div className="text-left sm:text-right">
                    <div className="font-extrabold text-lg">{generations}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Generations</div>
                  </div>
                  <div className="text-xs font-medium text-muted-foreground w-24 text-right">Active {formatDistanceToNow(teacher.updatedAt)} ago</div>
                </div>
              </div>
            )})}
          </div>
        </div>
      </div>
    </div>
  );
}
