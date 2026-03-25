import { Database, Users, Server, Activity, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { db } from "@/lib/db";

export async function SuperAdminOverview({ session }: { session: any }) {
  const [chunksCount, tenantsCount, recentDocs] = await Promise.all([
    db.curriculumChunk.count(),
    db.tenant.count(),
    db.curriculumDocument.findMany({
      orderBy: { uploadDate: "desc" },
      take: 4,
      include: {
        _count: { select: { chunks: true } }
      }
    })
  ]);
  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-10">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-[34px] sm:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
            Platform Operations
          </h1>
          <p className="text-muted-foreground mt-1 text-base">Manage the underlying KB, monitor usage, and configure tenants.</p>
        </div>
      </div>

      <div className="w-full pb-4 scrollbar-hide">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          {[{
            title: "Database Nodes", value: chunksCount.toLocaleString(), desc: "Indexed curriculum chunks", icon: Database, color: "text-blue-500", bg: "bg-blue-500/10", href: "/dashboard/knowledge"
          }, {
            title: "Active Tenants", value: tenantsCount.toString(), desc: "Registered schools", icon: Users, color: "text-green-500", bg: "bg-green-500/10", href: "/dashboard/tenants"
          }, {
            title: "Access Control", value: "Roles", desc: "Granular permissions matrix", icon: Server, color: "text-indigo-500", bg: "bg-indigo-500/10", href: "/dashboard/rbac"
          }, {
            title: "System Health", value: "Operational", desc: "All services running smoothly", icon: Activity, color: "text-primary", bg: "bg-primary/10", href: "#"
          }].map((stat, i) => (
            <Link key={i} href={stat.href} className="w-full h-full p-6 text-left rounded-[32px] bg-card/80 backdrop-blur-md border border-border/40 shadow-xl shadow-primary/5 relative overflow-hidden group hover:border-primary/20 transition-all hover:scale-[1.02]">
              <div className="flex flex-row sm:flex-col items-center sm:items-start gap-4 sm:gap-5 relative z-10 w-full min-w-0">
                 <div className={`shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-[18px] sm:rounded-[22px] ${stat.bg} flex items-center justify-center`}>
                   <stat.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${stat.color}`} />
                 </div>
                 <div className="flex flex-row items-center sm:flex-col sm:items-start flex-1 gap-3 sm:gap-0 w-full min-w-0">
                   <div className="text-xl sm:text-3xl font-extrabold tracking-tight min-w-[2.5rem]">{stat.value}</div>
                   <div className="flex flex-col flex-1 truncate">
                     <h3 className="font-bold sm:font-semibold text-foreground sm:text-muted-foreground text-sm sm:text-xs sm:uppercase tracking-wide sm:tracking-wider sm:mt-1 truncate">{stat.title}</h3>
                     <p className="text-xs text-muted-foreground sm:mt-2 truncate">{stat.desc}</p>
                   </div>
                 </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="p-8 rounded-[32px] bg-card/60 backdrop-blur-sm border border-border/30 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <h3 className="text-xl font-extrabold tracking-tight">Recent KB Uploads</h3>
          <Link href="/dashboard/knowledge" className="text-sm font-bold text-primary hover:text-primary/80 transition-colors tracking-wide bg-primary/10 px-4 py-2 rounded-full">
            View All Tasks
          </Link>
        </div>
        
        <div className="space-y-3">
          {recentDocs.length > 0 ? recentDocs.map((row, i) => (
            <div key={row.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 border border-border/40 rounded-[28px] hover:bg-muted/30 transition-all group hover:shadow-sm">
              <div className="flex flex-col sm:flex-row md:items-center gap-4 flex-1">
                 <h4 className="font-bold text-[15px] text-foreground sm:w-1/3 truncate">{row.title}</h4>
                 <p className="text-sm font-medium text-muted-foreground sm:w-1/3">Global</p>
                 <div className="sm:w-1/3">
                   <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${row.status === 'completed' ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'}`}>
                     {row.status}
                   </span>
                 </div>
              </div>
              <div className="flex items-center gap-6 sm:gap-10 sm:justify-end">
                <div className="text-left sm:text-right">
                  <div className="font-extrabold text-lg">{row._count.chunks}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Chunks</div>
                </div>
                <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors shrink-0">
                   <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                </div>
              </div>
            </div>
          )) : (
            <div className="p-8 text-center text-muted-foreground border border-dashed border-border/50 rounded-[28px]">
              No documents have been uploaded to the pipeline yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
