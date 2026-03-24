import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Settings, Shield, Bell, Key, CreditCard, Palette, Globe, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default async function SettingsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user) redirect("/login");

  const isSuperAdmin = session.role === "SUPERADMIN";

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10 mt-6 sm:mt-0">
      <div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">Workspace Settings</h1>
        <p className="text-muted-foreground mt-1 text-base">Manage your profile, preferences, and platform configurations.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Settings Sidebar */}
        <div className="w-full lg:w-64 shrink-0 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 scrollbar-hide">
           <button className="flex items-center gap-3 px-4 py-3 rounded-[20px] text-sm font-bold transition-all shrink-0 bg-primary/10 text-primary border border-primary/20">
             <Settings className="w-5 h-5" /> General
           </button>
           {[
             { name: "Security", icon: Shield },
             { name: "Notifications", icon: Bell },
             { name: "API Keys", icon: Key },
             { name: "Billing", icon: CreditCard },
             { name: "Appearance", icon: Palette },
           ].map((tab, i) => (
             <button key={i} className="flex items-center gap-3 px-4 py-3 rounded-[20px] text-sm font-bold transition-all shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent">
               <tab.icon className="w-5 h-5" />
               {tab.name}
             </button>
           ))}
           {/* Superadmin restricted tabs */}
           {isSuperAdmin && (
             <>
                <div className="w-full h-px bg-border/50 my-2 hidden lg:block" />
                <button className="flex items-center gap-3 px-4 py-3 rounded-[20px] text-sm font-bold transition-all shrink-0 text-indigo-500 hover:bg-indigo-500/10 border border-transparent">
                  <Cpu className="w-5 h-5" />
                  Global Routing
                </button>
             </>
           )}
        </div>

        {/* Settings Content */}
        <div className="flex-1 space-y-6">
          
          <div className="p-8 bg-card/60 backdrop-blur-2xl rounded-[32px] border border-border/40 shadow-sm">
            <h2 className="text-xl font-bold mb-6">Profile Information</h2>
            <div className="space-y-6 max-w-2xl">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-[28px] bg-primary/10 text-primary flex items-center justify-center font-bold text-3xl border border-primary/20 shadow-inner">
                  {user.email?.charAt(0).toUpperCase() || "U"}
                </div>
                <div>
                   <Button variant="outline" className="h-10 rounded-[14px] font-bold">Upload Avatar</Button>
                   <p className="text-xs text-muted-foreground mt-2 font-medium">JPEG or PNG. Max size of 2MB.</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                <div className="space-y-3">
                  <label className="text-[13px] uppercase tracking-wider font-bold text-muted-foreground ml-2">Full Name</label>
                  <Input defaultValue={user.name || "Admin User"} className="h-12 rounded-[16px] bg-background/50 border-border/50" />
                </div>
                <div className="space-y-3">
                  <label className="text-[13px] uppercase tracking-wider font-bold text-muted-foreground ml-2">Email Address</label>
                  <Input defaultValue={user.email || ""} disabled className="h-12 rounded-[16px] bg-muted/50 border-border/50 text-muted-foreground" />
                </div>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-border/40 flex justify-end">
              <Button className="h-11 rounded-[16px] px-8 font-bold">Save Changes</Button>
            </div>
          </div>

          <div className="p-8 bg-card/60 backdrop-blur-2xl rounded-[32px] border border-border/40 shadow-sm relative overflow-hidden">
            <h2 className="text-xl font-bold mb-2 relative z-10">Regional Preferences</h2>
            <p className="text-muted-foreground text-sm font-medium mb-6 relative z-10">Set your curriculum localization ensuring the AI generates aligned content.</p>
            <div className="max-w-2xl relative z-10">
              <div className="space-y-3">
                <label className="text-[13px] uppercase tracking-wider font-bold text-muted-foreground ml-2">Active Curriculum Standard</label>
                <div className="h-12 w-full rounded-[16px] bg-background/50 border border-border/50 flex items-center px-4 justify-between cursor-pointer hover:border-primary/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-primary" />
                    <span className="font-semibold">KICD (Kenya Institute of Curriculum Development)</span>
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs font-bold text-primary">Change</Button>
                </div>
              </div>
            </div>
          </div>

          {/* Superadmin restricted global config */}
          {isSuperAdmin && (
             <div className="p-8 bg-card/80 backdrop-blur-3xl rounded-[32px] border border-indigo-500/20 shadow-[0_10px_40px_-10px_rgba(99,102,241,0.1)] relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
               
               <div className="flex items-center gap-3 mb-6 relative z-10">
                 <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                    <Cpu className="w-5 h-5 text-indigo-500" />
                 </div>
                 <h2 className="text-xl font-bold">Global AI Routing</h2>
               </div>
               
               <p className="text-muted-foreground text-sm font-medium mb-6 relative z-10">Master configuration for Language Model endpoints and database connections.</p>
               
               <div className="space-y-4 max-w-2xl relative z-10">
                 <div className="p-5 rounded-[24px] border border-indigo-500/20 bg-indigo-500/5 flex items-center justify-between">
                   <div>
                     <h3 className="font-bold text-indigo-500 mb-1">Primary Generation Model</h3>
                     <p className="text-sm font-medium text-muted-foreground">Used for Schemes and Lesson Plans</p>
                   </div>
                   <div className="px-4 py-2 bg-background border border-border/50 rounded-[12px] font-bold text-sm shadow-sm select-all">
                     gpt-4-turbo
                   </div>
                 </div>
  
                 <div className="p-5 rounded-[24px] border border-border/50 bg-background/50 flex items-center justify-between">
                   <div>
                     <h3 className="font-bold text-foreground mb-1">Embedding Model</h3>
                     <p className="text-sm font-medium text-muted-foreground">Used for Curriculum Vectorization</p>
                   </div>
                   <div className="px-4 py-2 bg-background border border-border/50 rounded-[12px] font-bold text-sm shadow-sm select-all">
                     text-embedding-3-small
                   </div>
                 </div>
               </div>
               
               <div className="mt-8 pt-6 border-t border-border/40 flex justify-end relative z-10">
                 <Button className="h-11 rounded-[16px] px-8 font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg">Update Routing</Button>
               </div>
             </div>
          )}

        </div>

      </div>
    </div>
  );
}
