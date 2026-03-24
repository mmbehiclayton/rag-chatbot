import { auth } from "@/lib/auth";
import { logout } from "@/lib/actions/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeft, MoreHorizontal, Edit2, 
  Heart, Clock, Bell, PlugZap, 
  Settings, Globe, UserPlus, Shield, Headset, LogOut,
  ChevronRight
} from "lucide-react";

export default async function ProfilePage() {
  const session = await auth();
  if (!session) redirect("/login");

  // Re-map the exact structure from the provided mockup to educational contexts
  const GENERAL_ITEMS = [
    { label: "Favorite Schemes", icon: Heart, href: "/dashboard/schemes" },
    { label: "Generation History", icon: Clock, href: "/dashboard" },
    { label: "Notifications", icon: Bell, href: "/dashboard/notifications" },
    { label: "Connected Apps", icon: PlugZap, href: "/dashboard/settings" },
  ];

  const SUPPORT_ITEMS = [
    { label: "Settings", icon: Settings, href: "/dashboard/settings" },
    { label: "Languages", icon: Globe, href: "#" },
    { label: "Invite Teachers", icon: UserPlus, href: "#" },
    { label: "Privacy Policy", icon: Shield, href: "#" },
    { label: "Help & Support", icon: Headset, href: "#" },
  ];

  return (
    <div className="max-w-2xl mx-auto w-full min-h-[calc(100vh-8rem)] bg-card/40 backdrop-blur-xl border border-border/40 sm:rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-700 flex flex-col mb-10">
      
      {/* App-like Header */}
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-2xl px-6 py-5 flex items-center justify-between border-b border-border/40">
        <Button variant="outline" size="icon" className="w-12 h-12 rounded-full shadow-sm" asChild>
          <Link href="/dashboard">
             <ChevronLeft className="w-6 h-6" />
          </Link>
        </Button>
        <h1 className="text-xl font-black tracking-tight">Profile</h1>
        <Button variant="outline" size="icon" className="w-12 h-12 rounded-full shadow-sm text-muted-foreground">
          <MoreHorizontal className="w-6 h-6" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto pb-10">
        
        {/* Profile Card Header */}
        <div className="px-8 py-8 flex items-center justify-between">
          <div className="flex items-center gap-5">
             <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 p-1">
                  <div className="w-full h-full rounded-full bg-background flex items-center justify-center border-[3px] border-background overflow-hidden relative">
                    <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${session.name || "User"}&backgroundColor=transparent`} alt="Avatar" className="w-full h-full object-cover" />
                  </div>
                </div>
                {/* Edit avatar button */}
                <button className="absolute bottom-0 right-0 w-7 h-7 bg-background border border-border text-foreground rounded-full flex items-center justify-center shadow-md transition-transform hover:scale-105">
                  <Edit2 className="w-3 h-3" />
                </button>
             </div>
             <div>
                <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                  {session.name || "Mwalimu User"}
                </h2>
                <p className="text-sm font-semibold text-muted-foreground/80 lowercase mt-0.5">{session.email}</p>
             </div>
          </div>
          
          <Link href="/dashboard/settings" className="flex flex-col items-center gap-1 group">
             <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
               <Edit2 className="w-4 h-4" />
             </div>
             <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider group-hover:text-primary transition-colors">Edit Profile</span>
          </Link>
        </div>

        <div className="w-full h-[1px] bg-border/40" />

        {/* General Section */}
        <div className="px-8 pt-8">
           <h3 className="text-sm font-black uppercase tracking-wider mb-4">General</h3>
           <div className="space-y-2">
              {GENERAL_ITEMS.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <Link key={idx} href={item.href} className="flex items-center justify-between p-3 rounded-2xl hover:bg-muted/50 transition-colors group">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full border border-border/60 bg-background/50 flex items-center justify-center shadow-sm group-hover:border-primary/30 group-hover:bg-primary/5 transition-all">
                           <Icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors stroke-[1.5]" />
                        </div>
                        <span className="font-bold text-sm">{item.label}</span>
                     </div>
                     <ChevronRight className="w-5 h-5 text-border group-hover:text-primary/50 transition-colors" />
                  </Link>
                )
              })}
           </div>
        </div>

        {/* Support Section */}
        <div className="px-8 pt-10">
           <h3 className="text-sm font-black uppercase tracking-wider mb-4">Support</h3>
           <div className="space-y-2">
              {SUPPORT_ITEMS.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <Link key={idx} href={item.href} className="flex items-center justify-between p-3 rounded-2xl hover:bg-muted/50 transition-colors group">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full border border-border/60 bg-background/50 flex items-center justify-center shadow-sm group-hover:border-primary/30 group-hover:bg-primary/5 transition-all">
                           <Icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors stroke-[1.5]" />
                        </div>
                        <span className="font-bold text-sm">{item.label}</span>
                     </div>
                     <ChevronRight className="w-5 h-5 text-border group-hover:text-primary/50 transition-colors" />
                  </Link>
                )
              })}

              {/* Log out mapped to Server Action */}
              <form action={logout}>
                <button type="submit" className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-red-500/5 transition-colors group">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full border border-border/60 bg-background/50 flex items-center justify-center shadow-sm group-hover:border-red-500/30 group-hover:bg-red-500/10 transition-all">
                         <LogOut className="w-5 h-5 text-muted-foreground group-hover:text-red-500 transition-colors stroke-[1.5]" />
                      </div>
                      <span className="font-bold text-sm group-hover:text-red-600 transition-colors">Log out</span>
                   </div>
                   <ChevronRight className="w-5 h-5 text-border group-hover:text-red-500/50 transition-colors" />
                </button>
              </form>

           </div>
        </div>

      </div>
    </div>
  );
}
