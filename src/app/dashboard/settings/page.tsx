import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Settings, Shield, Bell, Key, CreditCard, Palette, Globe, Cpu, School, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateProfile, updateSchool } from "@/lib/actions/settings";
import { SubmitButton } from "@/components/ui/submit-button";

export default async function SettingsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.userId },
    include: { tenant: true }
  });
  if (!user) redirect("/login");

  const isSuperAdmin = session.role === "SUPERADMIN";
  const isAdmin = session.role === "ADMIN";

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10 mt-6 sm:mt-0">
      <div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          {isSuperAdmin ? "Global Settings" : "Workspace Settings"}
        </h1>
        <p className="text-muted-foreground mt-1 text-base">
          {isSuperAdmin 
            ? "Manage application-wide configurations and platform routing." 
            : "Manage your profile, preferences, and school configurations."}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Settings Sidebar */}
        <div className="w-full lg:w-64 shrink-0 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 scrollbar-hide">
           <button className="flex items-center gap-3 px-4 py-3 rounded-[20px] text-sm font-bold transition-all shrink-0 bg-primary/10 text-primary border border-primary/20">
             <Settings className="w-5 h-5" /> General
           </button>
           {[
             { name: "Security", icon: Shield, show: true },
             { name: "Notifications", icon: Bell, show: true },
             { name: "API Keys", icon: Key, show: isSuperAdmin },
             { name: "Billing", icon: CreditCard, show: isAdmin || isSuperAdmin },
             { name: "Appearance", icon: Palette, show: true },
           ].filter(tab => tab.show).map((tab, i) => (
             <button key={i} className="flex items-center gap-3 px-4 py-3 rounded-[20px] text-sm font-bold transition-all shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent">
               <tab.icon className="w-5 h-5" />
               {tab.name}
             </button>
           ))}
           
           {isAdmin && (
             <>
                <div className="w-full h-px bg-border/50 my-2 hidden lg:block" />
                <button className="flex items-center gap-3 px-4 py-3 rounded-[20px] text-sm font-bold transition-all shrink-0 text-blue-500 hover:bg-blue-500/10 border border-transparent">
                  <School className="w-5 h-5" />
                  School Config
                </button>
             </>
           )}

           {isSuperAdmin && (
             <>
                <div className="w-full h-px bg-border/50 my-2 hidden lg:block" />
                <button className="flex items-center gap-3 px-4 py-3 rounded-[20px] text-sm font-bold transition-all shrink-0 text-indigo-500 hover:bg-indigo-500/10 border border-transparent">
                  <Cpu className="w-5 h-5" />
                  Global Variables
                </button>
             </>
           )}
        </div>

        {/* Settings Content */}
        <div className="flex-1 space-y-6">
          
          <form action={updateProfile} className="p-8 bg-card/60 backdrop-blur-2xl rounded-[32px] border border-border/40 shadow-sm relative">
            <h2 className="text-xl font-bold mb-6">Profile Information</h2>
            <div className="space-y-6 max-w-2xl">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-[28px] bg-primary/10 text-primary flex items-center justify-center font-bold text-3xl border border-primary/20 shadow-inner">
                  {user.email?.charAt(0).toUpperCase() || "U"}
                </div>
                <div>
                   <Button type="button" variant="outline" className="h-10 rounded-[14px] font-bold">Upload Avatar</Button>
                   <p className="text-xs text-muted-foreground mt-2 font-medium">JPEG or PNG. Max size of 2MB.</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                <div className="space-y-3">
                  <label className="text-[13px] uppercase tracking-wider font-bold text-muted-foreground ml-2">Full Name</label>
                  <Input name="name" defaultValue={user.name || "User"} className="h-12 rounded-[16px] bg-background/50 border-border/50" />
                </div>
                <div className="space-y-3">
                  <label className="text-[13px] uppercase tracking-wider font-bold text-muted-foreground ml-2">Email Address</label>
                  <Input defaultValue={user.email || ""} disabled className="h-12 rounded-[16px] bg-muted/50 border-border/50 text-muted-foreground" />
                  <p className="text-[10px] uppercase font-bold text-muted-foreground px-2">Managed via SSO</p>
                </div>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-border/40 flex justify-end">
              <SubmitButton className="h-11 rounded-[16px] px-8 font-bold">Save Changes</SubmitButton>
            </div>
          </form>

          {/* Admin restricted school config */}
          {isAdmin && (
            <form action={updateSchool} className="p-8 bg-card/60 backdrop-blur-2xl rounded-[32px] border border-blue-500/20 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />
              <input type="hidden" name="tenantId" value={user.tenantId || ""} />

              <div className="flex items-center gap-3 mb-2 relative z-10">
                 <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <School className="w-4 h-4 text-blue-500" />
                 </div>
                 <h2 className="text-xl font-bold">School Configuration</h2>
              </div>
              <p className="text-muted-foreground text-sm font-medium mb-6 relative z-10">Configure settings specifically for {user.tenant?.name || "your school"}.</p>
              
              <div className="max-w-2xl relative z-10 space-y-6">
                <div className="space-y-3">
                  <label className="text-[13px] uppercase tracking-wider font-bold text-muted-foreground ml-2">School Name</label>
                  <Input name="name" defaultValue={user.tenant?.name || ""} className="h-12 rounded-[16px] bg-background/50 border-border/50" />
                </div>

                <div className="space-y-3">
                  <label className="text-[13px] uppercase tracking-wider font-bold text-muted-foreground ml-2">Active Curriculum Standard</label>
                  <div className="h-12 w-full rounded-[16px] bg-background/50 border border-border/50 flex items-center px-4 justify-between cursor-pointer hover:border-primary/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-primary" />
                      <span className="font-semibold">KICD (Kenya Institute of Curriculum Development)</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground border border-border/50 px-2 py-1 rounded bg-muted/50">Locked</span>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-border/40 flex justify-end relative z-10">
                <SubmitButton className="h-11 rounded-[16px] px-8 font-bold border border-blue-500/50 bg-blue-500 hover:bg-blue-600 text-white shadow-[0_0_15px_-3px_rgba(59,130,246,0.4)]">
                   Update School
                </SubmitButton>
              </div>
            </form>
          )}

          {/* Superadmin restricted global config */}
          {isSuperAdmin && (
             <div className="p-8 bg-card/80 backdrop-blur-3xl rounded-[32px] border border-indigo-500/20 shadow-[0_10px_40px_-10px_rgba(99,102,241,0.1)] relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
               
               <div className="flex items-center justify-between relative z-10 mb-6">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                      <Cpu className="w-5 h-5 text-indigo-500" />
                   </div>
                   <h2 className="text-xl font-bold">Global AI Environment</h2>
                 </div>
                 <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 font-bold text-xs uppercase tracking-wider">
                   <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                   Connected
                 </div>
               </div>
               
               <p className="text-muted-foreground text-sm font-medium mb-6 relative z-10">Master configuration endpoints and hardware models currently bound to the environment.</p>
               
               <div className="space-y-4 max-w-2xl relative z-10">
                 <div className="p-5 rounded-[24px] border border-indigo-500/20 bg-indigo-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                   <div>
                     <h3 className="font-bold text-indigo-500 mb-1">Primary Generation Model</h3>
                     <p className="text-sm font-medium text-muted-foreground">Used for Schemes and Lesson Plans</p>
                   </div>
                   <div className="font-bold text-sm select-all text-foreground bg-background rounded-[12px] px-4 py-2 shadow-inner border border-border/50 whitespace-nowrap">
                     {process.env.OPENAI_MODEL || "gpt-4-turbo"}
                   </div>
                 </div>
  
                 <div className="p-5 rounded-[24px] border border-border/50 bg-background/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                   <div>
                     <h3 className="font-bold text-foreground mb-1">Vector Embedding Model</h3>
                     <p className="text-sm font-medium text-muted-foreground">Used for Curriculum Retrieval (1536-dim)</p>
                   </div>
                   <div className="font-bold text-sm select-all text-foreground bg-background rounded-[12px] px-4 py-2 shadow-inner border border-border/50 whitespace-nowrap">
                     text-embedding-3-small
                   </div>
                 </div>
               </div>
               
               <div className="mt-8 pt-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
                 <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground max-w-md">
                    <Info className="w-4 h-4 shrink-0 text-indigo-500" />
                    AI Models are securely managed via system environment variables and are permanently bound to the vector schema dimensions. No changes required.
                 </div>
               </div>
             </div>
          )}

        </div>

      </div>
    </div>
  );
}
