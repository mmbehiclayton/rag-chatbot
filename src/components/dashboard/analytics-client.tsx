"use client";

import { 
  BarChart3, 
  Users, 
  FileText, 
  BookOpen, 
  GraduationCap,
  TrendingUp,
  Clock,
  ChevronRight,
  UserCheck,
  ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AnalyticsClientProps {
  stats: any;
  logs: any;
}

export function AnalyticsClient({ stats, logs }: AnalyticsClientProps) {
  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20 mt-6 sm:mt-0">
      
      {/* Header */}
      <div className="space-y-1">
         <div className="flex items-center gap-2 text-indigo-500 font-black text-[10px] uppercase tracking-[0.2em] mb-1">
           <BarChart3 className="w-3.5 h-3.5" /> Institutional Pulse
         </div>
         <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-foreground leading-tight">
           School Analytics
         </h1>
         <p className="text-muted-foreground text-base max-w-xl font-medium leading-relaxed">
           Real-time oversight of curriculum generation and teacher productivity across {stats.schoolName}.
         </p>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard 
          label="Total Schemes" 
          value={stats.totals.schemes} 
          icon={BookOpen} 
          color="bg-emerald-500" 
          trend="+12% this month"
        />
        <StatCard 
          label="Lesson Plans" 
          value={stats.totals.lessons} 
          icon={FileText} 
          color="bg-indigo-500" 
          trend="+8% this week"
        />
        <StatCard 
          label="Assessments" 
          value={stats.totals.assessments} 
          icon={GraduationCap} 
          color="bg-amber-500" 
          trend="+24% vs last term"
        />
        <StatCard 
          label="Active Teachers" 
          value={stats.teachers.length} 
          icon={Users} 
          color="bg-primary" 
          trend="Steady"
        />
      </div>

      {/* AI Infrastructure Consumption */}
      <div className="bg-indigo-950/90 text-white rounded-[40px] p-8 border border-white/10 shadow-2xl relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-500/20 rounded-full blur-[100px] -mr-32 -mt-32" />
         
         <div className="relative z-10 flex flex-col md:flex-row justify-between gap-12">
            <div className="space-y-4 max-w-md">
               <div className="flex items-center gap-2 text-indigo-400 font-black text-[10px] uppercase tracking-widest">
                 <ShieldCheck className="w-4 h-4" /> AI Engine Health
               </div>
               <h3 className="text-3xl font-black tracking-tight">Infrastructure Consumption</h3>
               <p className="text-indigo-200/70 text-sm font-medium leading-relaxed">
                 Real-time monitoring of token utilization and estimated pedagogical compute costs. We use gpt-4o for high-fidelity KICD compliance.
               </p>
            </div>

            <div className="flex flex-1 flex-wrap gap-8 justify-around items-center">
               <div className="text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">Prompt Tokens</p>
                  <h4 className="text-3xl font-black">{(stats.usage.promptTokens / 1000).toFixed(1)}k</h4>
               </div>
               <div className="w-px h-12 bg-white/10 hidden md:block" />
               <div className="text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">Completion</p>
                  <h4 className="text-3xl font-black">{(stats.usage.completionTokens / 1000).toFixed(1)}k</h4>
               </div>
               <div className="w-px h-12 bg-white/10 hidden md:block" />
               <div className="text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">Total Utilization</p>
                  <h4 className="text-3xl sm:text-5xl font-black text-indigo-400">{(stats.usage.totalTokens / 1000).toFixed(1)}k</h4>
               </div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Teacher Productivity Leaderboard */}
        <div className="xl:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-500" />
              Teacher Productivity
            </h3>
          </div>
          
          <div className="bg-card/60 backdrop-blur-2xl rounded-[40px] border border-border/40 shadow-xl overflow-hidden overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-background/80 border-b border-border/40">
                  <th className="p-6 text-left text-xs font-black uppercase tracking-widest text-muted-foreground">Teacher</th>
                  <th className="p-6 text-center text-xs font-black uppercase tracking-widest text-muted-foreground">Schemes</th>
                  <th className="p-6 text-center text-xs font-black uppercase tracking-widest text-muted-foreground">Lessons</th>
                  <th className="p-6 text-center text-xs font-black uppercase tracking-widest text-muted-foreground">Assessments</th>
                  <th className="p-6"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {stats.teachers.map((teacher: any) => (
                  <tr key={teacher.id} className="group hover:bg-indigo-500/5 transition-colors">
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 font-bold">
                          {teacher.name?.[0] || teacher.email[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-sm">{teacher.name || teacher.email}</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{teacher.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6 text-center font-bold text-sm">{teacher._count.schemesOfWork}</td>
                    <td className="p-6 text-center font-bold text-sm">{teacher._count.lessonPlans}</td>
                    <td className="p-6 text-center font-bold text-sm">{teacher._count.assessments}</td>
                    <td className="p-6 text-right">
                       <button className="p-2 rounded-full hover:bg-background transition-colors group">
                         <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity Log */}
        <div className="space-y-6">
           <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-500" />
              Live Activity
            </h3>
            
            <div className="bg-card/60 backdrop-blur-2xl rounded-[40px] border border-border/40 p-6 space-y-6 shadow-xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4">
                  <div className="flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                  </div>
               </div>
               
               <div className="space-y-5">
                  {logs.recentSchemes.map((s: any) => (
                    <ActivityItem 
                      key={s.id}
                      title={s.title}
                      user={s.teacher.name || "Teacher"}
                      type="Scheme of Work"
                      icon={BookOpen}
                      color="text-emerald-500"
                    />
                  ))}
                  {logs.recentAssessments.map((a: any) => (
                    <ActivityItem 
                      key={a.id}
                      title={a.title}
                      user={a.teacher.name || "Teacher"}
                      type="Assessment"
                      icon={GraduationCap}
                      color="text-amber-500"
                    />
                  ))}
               </div>
            </div>
        </div>

      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, trend }: any) {
  return (
    <div className="p-8 bg-card/60 backdrop-blur-2xl rounded-[32px] border border-border/40 shadow-xl relative overflow-hidden group hover:scale-[1.02] transition-all duration-300">
      <div className={cn("absolute -top-12 -right-12 w-32 h-32 rounded-full blur-[40px] opacity-20 transition-opacity group-hover:opacity-30", color)} />
      
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className={cn("w-12 h-12 rounded-[16px] flex items-center justify-center mb-6 shadow-lg", color, "text-white")}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
           <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
           <h4 className="text-4xl font-black tracking-tighter">{value}</h4>
           <div className="mt-4 flex items-center gap-1.5 text-[10px] font-bold text-emerald-500">
             <TrendingUp className="w-3 h-3" />
             {trend}
           </div>
        </div>
      </div>
    </div>
  );
}

function ActivityItem({ title, user, type, icon: Icon, color }: any) {
  return (
    <div className="flex items-start gap-4 group">
      <div className={cn("w-10 h-10 rounded-[14px] bg-background border border-border/40 flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110", color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold truncate leading-tight group-hover:text-primary transition-colors">{title}</p>
        <p className="text-[10px] font-medium text-muted-foreground mt-1">
          <span className="text-foreground font-black">{user}</span> generated a {type}
        </p>
      </div>
    </div>
  );
}
