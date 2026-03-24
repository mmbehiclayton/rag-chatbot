import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { ShieldAlert, Plus, Users, Layout, Building2, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";

export default async function TenantsPage() {
  const session = await auth();
  if (session?.role !== "SUPERADMIN") redirect("/dashboard");

  const tenants = await db.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { users: true }
      }
    }
  });

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Active Tenants List */}
        <div className="lg:col-span-2 space-y-4">
          {tenants.map(tenant => (
            <div key={tenant.id} className="p-6 sm:p-8 bg-card/60 backdrop-blur-2xl rounded-[32px] border border-border/40 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition-shadow group">
               <div className="flex items-center gap-5">
                 <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center text-xl font-bold shadow-inner ${tenant.type === 'SCHOOL' ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'}`}>
                   {tenant.type === 'SCHOOL' ? <Building2 className="w-8 h-8" /> : <Layout className="w-8 h-8" />}
                 </div>
                 <div>
                   <h3 className="text-xl font-bold tracking-tight text-foreground">{tenant.name}</h3>
                   <div className="flex items-center gap-3 text-sm text-muted-foreground font-semibold mt-1">
                     <span className="uppercase tracking-wider text-[11px]">{tenant.type}</span>
                     <span className="w-1 h-1 rounded-full bg-border" />
                     <span>Provisioned {formatDistanceToNow(tenant.createdAt)} ago</span>
                   </div>
                 </div>
               </div>

               <div className="flex items-center gap-8 pl-21 md:pl-0">
                 <div className="text-center">
                   <div className="text-2xl font-black">{tenant._count.users}</div>
                   <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Active Seats</div>
                 </div>
                 <Button variant="outline" className="h-10 rounded-[16px] px-5 font-bold border-border/50 bg-background/50 hover:bg-muted">Manage</Button>
               </div>
            </div>
          ))}

          {tenants.length === 0 && (
            <div className="p-12 text-center text-muted-foreground bg-card/40 border border-dashed border-border/50 rounded-[32px]">
              No tenants provisioned.
            </div>
          )}
        </div>

        {/* Right Side: Quick Stats / Hardware */}
        <div className="space-y-6">
          <div className="p-8 bg-gradient-to-br from-card to-muted/20 rounded-[32px] border border-border/50 shadow-sm">
            <div className="w-12 h-12 bg-background rounded-[18px] flex items-center justify-center shadow-sm mb-6 text-primary">
              <Server className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">Infrastructure Status</h3>
            <p className="text-muted-foreground text-sm font-medium mb-6">All isolated environments are running flawlessly on the edge network.</p>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm font-bold mb-2 text-foreground">
                  <span>Compute Allocation</span>
                  <span>42%</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-[42%] rounded-full" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm font-bold mb-2 text-foreground">
                  <span>Database Connections</span>
                  <span>14/100</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-[14%] rounded-full" />
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-8 bg-card/60 backdrop-blur-xl rounded-[32px] border border-border/50 shadow-sm flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-red-500/10 rounded-[20px] flex items-center justify-center text-red-500 mb-4 border border-red-500/20">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold mb-2">Global Lockdown</h3>
            <p className="text-muted-foreground text-sm font-medium mb-6">Instantly revoke all active sessions across all tenants in case of a critical breach.</p>
            <Button variant="destructive" className="w-full h-12 rounded-[20px] font-bold">Initiate Lockdown</Button>
          </div>
        </div>

      </div>
    </div>
  );
}
