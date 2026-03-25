import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { ShieldAlert, Plus, Layout, Building2, Server, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import Link from "next/link";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function TenantsPage(props: Props) {
  const session = await auth();
  if (session?.role !== "SUPERADMIN") redirect("/dashboard");

  const searchParams = await props.searchParams;
  const currentPage = Number(searchParams?.page) || 1;
  const pageSize = 15; // Scaled specifically for a compact table
  const searchQuery = typeof searchParams?.query === 'string' ? searchParams.query : "";

  const whereClause = searchQuery ? {
    name: { contains: searchQuery, mode: "insensitive" as const }
  } : {};

  const [tenants, totalCount] = await Promise.all([
    db.tenant.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
      include: {
        _count: {
          select: { users: true }
        }
      }
    }),
    db.tenant.count({ where: whereClause })
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10 mt-6 sm:mt-0">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">Tenant Management</h1>
          <p className="text-muted-foreground mt-1 text-base">Provision, monitor, and isolate school workspaces on the platform.</p>
        </div>
        <Button className="h-12 rounded-[20px] px-6 gap-2 text-sm font-bold shadow-[0_0_30px_-10px_rgba(34,197,94,0.3)] bg-green-600 hover:bg-green-700 text-white transition-all hover:scale-105">
          <Plus className="w-5 h-5" />
          Provision Tenant
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Left Side: Active Tenants Table */}
        <div className="xl:col-span-3 space-y-4">
          
          {/* Table Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/60 backdrop-blur-2xl p-4 rounded-[24px] border border-border/40 shadow-sm">
            <form method="GET" action="/dashboard/tenants" className="relative w-full sm:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                name="query" 
                defaultValue={searchQuery} 
                placeholder="Search workspaces by name..." 
                className="pl-10 h-11 rounded-[16px] bg-background border-border/50 focus-visible:ring-primary/20 placeholder:text-muted-foreground font-semibold shadow-inner" 
              />
            </form>
            <div className="text-[13px] font-bold text-muted-foreground px-2">
              <span className="text-foreground">{totalCount}</span> Total Records
            </div>
          </div>

          {/* Scalable Data Table */}
          <div className="bg-card/80 backdrop-blur-3xl rounded-[32px] border border-border/40 shadow-xl overflow-hidden flex flex-col">
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full text-left border-collapse min-w-[750px]">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30">
                    <th className="py-4 px-6 font-extrabold text-muted-foreground text-[11px] tracking-wider uppercase">Workspace / School</th>
                    <th className="py-4 px-4 font-extrabold text-muted-foreground text-[11px] tracking-wider uppercase text-center">Type</th>
                    <th className="py-4 px-4 font-extrabold text-muted-foreground text-[11px] tracking-wider uppercase text-center">Active Seats</th>
                    <th className="py-4 px-4 font-extrabold text-muted-foreground text-[11px] tracking-wider uppercase">Provisioned</th>
                    <th className="py-4 px-6 font-extrabold text-muted-foreground text-[11px] tracking-wider uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {tenants.map(tenant => (
                    <tr key={tenant.id} className="hover:bg-muted/40 transition-colors group">
                      <td className="py-3 px-6 h-[72px]">
                        <div className="flex items-center gap-4">
                          <div className={`shrink-0 w-11 h-11 rounded-[16px] flex items-center justify-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] transition-transform group-hover:scale-105 ${tenant.type === 'SCHOOL' ? 'bg-primary/10 text-primary border border-primary/20 bg-gradient-to-br from-primary/10 to-transparent' : 'bg-orange-500/10 text-orange-500 border border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-transparent'}`}>
                            {tenant.type === 'SCHOOL' ? <Building2 className="w-[22px] h-[22px]" /> : <Layout className="w-[22px] h-[22px]" />}
                          </div>
                          <div>
                            <div className="font-bold text-foreground text-[15px] truncate max-w-[240px] leading-tight">{tenant.name}</div>
                            <div className="text-[11px] text-muted-foreground font-semibold mt-0.5 truncate max-w-[240px]">ID: {tenant.id.split('-')[0]}•••</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center px-3 py-1.5 rounded-[10px] text-[10px] font-extrabold uppercase tracking-widest bg-muted text-muted-foreground border border-border/50">
                          {tenant.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="font-extrabold text-base text-foreground inline-flex items-center justify-center min-w-[32px]">{tenant._count.users}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-xs font-semibold text-muted-foreground whitespace-nowrap">{formatDistanceToNow(tenant.createdAt)} ago</div>
                      </td>
                      <td className="py-3 px-6 text-right">
                        <Button variant="secondary" size="sm" className="h-9 rounded-[14px] px-5 font-bold text-xs bg-background hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap flex-shrink-0 border border-border/50 shadow-sm">
                          Manage
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {tenants.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-16 text-center bg-muted/10">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-1">
                            <Search className="w-6 h-6 text-muted-foreground/50" />
                          </div>
                          <span className="font-extrabold text-lg text-foreground">No records found</span>
                          <span className="text-xs font-medium text-muted-foreground max-w-sm">We couldn't find any tenants matching your query. Adjust your search or provision a new one.</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Sub-bar */}
            {totalPages > 0 && (
              <div className="p-4 sm:p-5 border-t border-border/40 bg-muted/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs font-bold text-muted-foreground tracking-wide">
                  Showing <span className="text-foreground">{totalCount === 0 ? 0 : ((currentPage - 1) * pageSize) + 1}</span> to <span className="text-foreground">{Math.min(currentPage * pageSize, totalCount)}</span> of <span className="text-foreground">{totalCount}</span> entries
                </div>
                <div className="flex items-center gap-2">
                  <Link 
                    href={`/dashboard/tenants?page=${currentPage - 1}${searchQuery ? `&query=${encodeURIComponent(searchQuery)}` : ''}`}
                    className={cn(
                      "flex items-center justify-center w-9 h-9 rounded-[12px] border border-border/50 bg-background hover:bg-muted transition-colors shadow-sm",
                      currentPage <= 1 && "opacity-50 pointer-events-none"
                    )}
                  >
                    <ChevronLeft className="w-4 h-4 text-foreground" />
                  </Link>
                  <div className="flex text-xs font-extrabold items-center justify-center px-4 min-w-[100px] h-9 bg-muted/30 border border-border/50 rounded-[12px] text-foreground tracking-wide">
                    Page {currentPage} of {Math.max(1, totalPages)}
                  </div>
                  <Link 
                    href={`/dashboard/tenants?page=${currentPage + 1}${searchQuery ? `&query=${encodeURIComponent(searchQuery)}` : ''}`}
                    className={cn(
                      "flex items-center justify-center w-9 h-9 rounded-[12px] border border-border/50 bg-background hover:bg-muted transition-colors shadow-sm",
                      currentPage >= totalPages && "opacity-50 pointer-events-none"
                    )}
                  >
                    <ChevronRight className="w-4 h-4 text-foreground" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Quick Stats / Hardware */}
        <div className="xl:col-span-1 space-y-6">
          <div className="p-8 bg-gradient-to-br from-card to-muted/20 rounded-[32px] border border-border/50 shadow-sm relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
            <div className="relative z-10 w-12 h-12 bg-background/80 backdrop-blur-md rounded-[18px] flex items-center justify-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] border border-border/40 mb-6 text-primary">
              <Server className="w-6 h-6" />
            </div>
            <h3 className="relative z-10 text-xl font-extrabold mb-2 tracking-tight">Infrastructure</h3>
            <p className="relative z-10 text-muted-foreground text-[13px] font-semibold mb-8 leading-relaxed">All isolated environments are running flawlessly on the edge network.</p>
            
            <div className="relative z-10 space-y-6">
              <div>
                <div className="flex justify-between text-xs font-extrabold mb-2 text-foreground uppercase tracking-widest">
                  <span>Compute</span>
                  <span className="text-primary">42%</span>
                </div>
                <div className="w-full h-2.5 bg-background shadow-inner rounded-full overflow-hidden border border-border/40">
                  <div className="h-full bg-primary w-[42%] rounded-full relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]" style={{ transform: 'translateX(-100%)' }} />
                  </div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-extrabold mb-2 text-foreground uppercase tracking-widest">
                  <span>Connections</span>
                  <span className="text-blue-500">14/100</span>
                </div>
                <div className="w-full h-2.5 bg-background shadow-inner rounded-full overflow-hidden border border-border/40">
                  <div className="h-full bg-blue-500 w-[14%] rounded-full relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]" style={{ transform: 'translateX(-100%)' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-8 bg-card/60 backdrop-blur-2xl rounded-[32px] border border-border/50 shadow-sm flex flex-col items-center text-center relative overflow-hidden group">
            <div className="w-16 h-16 bg-red-500/10 rounded-[24px] flex items-center justify-center text-red-500 mb-5 border border-red-500/20 group-hover:scale-110 transition-transform duration-500 shadow-inner">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-extrabold mb-2 tracking-tight">Global Lockdown</h3>
            <p className="text-muted-foreground text-[13px] font-semibold mb-8 leading-relaxed px-2">Instantly revoke all active sessions across all tenants in case of a critical breach.</p>
            <Button variant="destructive" className="w-full h-12 rounded-[20px] font-extrabold text-[15px] shadow-[0_0_20px_-5px_rgba(239,68,68,0.5)] transition-all hover:scale-[1.03] active:scale-[0.97]">
              Initiate Lockdown
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
