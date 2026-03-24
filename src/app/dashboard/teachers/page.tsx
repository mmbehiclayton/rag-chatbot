import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Users, Search, Mail, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import { RoleSelector } from "@/components/dashboard/role-selector";

export default async function TeachersPage() {
  const session = await auth();
  if (!session || (session.role !== "SUPERADMIN" && session.role !== "ADMIN")) {
    redirect("/dashboard");
  }

  // Superadmins see all users for RBAC management. Admins typically only see their tenant.
  // Here we'll display everyone for the demo sandbox.
  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { schemesOfWork: true, lessonPlans: true, assessments: true }
      }
    }
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10 mt-6 sm:mt-0">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">User & Access Management</h1>
          <p className="text-muted-foreground mt-1 text-base">Superadmin Manual RBAC (Role-Based Access Control) assignment and monitoring.</p>
        </div>
        <Button className="h-12 rounded-[20px] px-6 gap-2 text-sm font-bold shadow-[0_0_30px_-10px_rgba(59,130,246,0.5)] transition-all hover:scale-105">
          <Mail className="w-5 h-5" />
          Invite User
        </Button>
      </div>

      <div className="w-full bg-card/60 backdrop-blur-2xl rounded-[32px] border border-border/40 shadow-sm overflow-hidden p-6 sm:p-8">
        
        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-8">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input 
              placeholder="Search by name or email..." 
              className="pl-12 h-12 rounded-[20px] bg-background/50 border-border/50 shadow-sm"
            />
          </div>
          <div className="flex items-center gap-3">
             <div className="px-4 py-2 rounded-full border border-border/50 bg-background/50 text-sm font-bold text-muted-foreground">
               Total Identities: <span className="text-foreground">{users.length}</span>
             </div>
          </div>
        </div>

        <div className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-6 border border-border/40 rounded-[28px] bg-background/40 hover:bg-muted/30 transition-all group shadow-sm hover:shadow-md hover:border-primary/30">
              
              <div className="flex items-center gap-5 flex-1 min-w-0">
                <div className="w-14 h-14 rounded-[20px] bg-primary/10 text-primary flex items-center justify-center font-bold text-xl border border-primary/20 group-hover:scale-105 transition-transform shrink-0">
                  {(user.name || user.email).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                     <h3 className="text-base sm:text-lg font-bold tracking-tight text-foreground truncate">{user.name || "Unnamed User"}</h3>
                     {user.id === session.userId && (
                       <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase tracking-wider">You</span>
                     )}
                  </div>
                  <div className="flex items-center gap-3 text-xs sm:text-sm text-muted-foreground font-semibold mt-1 flex-wrap">
                    <span>{user.email}</span>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    <span>Joined {formatDistanceToNow(user.createdAt)} ago</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6 justify-between md:justify-end shrink-0 pl-19 md:pl-0">
                <div className="flex gap-6 text-center">
                  <div>
                    <span className="text-lg font-black">{user._count.schemesOfWork + user._count.lessonPlans}</span>
                    <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Generations</div>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2">
                  <RoleSelector userId={user.id} initialRole={user.role} currentSessionRole={session.role} />
                  
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-[14px] text-red-500 hover:text-red-600 hover:bg-red-500/10">
                    <ShieldAlert className="w-4 h-4" />
                  </Button>
                </div>
              </div>

            </div>
          ))}

          {users.length === 0 && (
            <div className="flex flex-col items-center justify-center p-16 border-2 border-dashed border-border/40 rounded-[32px] bg-background/20">
              <div className="w-20 h-20 bg-muted rounded-[28px] flex items-center justify-center text-muted-foreground mb-6">
                <Users className="w-10 h-10 opacity-50" />
              </div>
              <h3 className="text-xl font-bold tracking-tight mb-2">No Identities Found</h3>
              <p className="text-muted-foreground text-center max-w-sm mb-6 font-medium">Your universal tenant directory is empty.</p>
              <Button className="h-12 rounded-[20px] px-8 font-bold">Invite User</Button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
