"use client";

import { CheckCircle2, FileText, Clock, AlertCircle, FileMinus, Sparkles, MoreHorizontal, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const NOTIFICATIONS = [
  {
    id: 1,
    group: "Today",
    icon: CheckCircle2,
    title: "Scheme Generation Complete",
    description: "Your Grade 4 Mathematics scheme is ready! Check your dashboard for the mappings and curriculum alignment.",
    time: "10:00 am",
    unread: true,
  },
  {
    id: 2,
    group: "Today",
    icon: FileText,
    title: "Subscription Renewed",
    description: "Your monthly Premium Plan subscription was processed successfully! Enjoy uninterrupted AI generations.",
    time: "09:45 am",
    unread: true,
  },
  {
    id: 3,
    group: "Today",
    icon: Clock,
    title: "Lesson Verification Pending",
    description: "Your scheduled lesson starts soon! Please verify the differentiation rubric before the block begins.",
    time: "09:00 am",
    unread: false,
  },
  {
    id: 4,
    group: "Previous",
    icon: AlertCircle,
    title: "Low Token Warning",
    description: "Token Alert! Please upgrade your plan as soon as possible to avoid generation interruptions.",
    time: "Yesterday",
    unread: false,
  },
  {
    id: 5,
    group: "Previous",
    icon: FileMinus,
    title: "Ingestion Failed",
    description: "Your KICD Document PDF Could Not Be Extracted. Formatting unsupported.",
    time: "Yesterday",
    unread: false,
  },
  {
    id: 6,
    group: "Previous",
    icon: Sparkles,
    title: "Discount Notification",
    description: "Congratulations! You've unlocked a 10% discount on your next enterprise tenant renewal.",
    time: "Yesterday",
    unread: false,
  }
];

export default function NotificationsPage() {
  const todayNotifications = NOTIFICATIONS.filter(n => n.group === "Today");
  const previousNotifications = NOTIFICATIONS.filter(n => n.group === "Previous");
  const unreadCount = todayNotifications.filter(n => n.unread).length;

  return (
    <div className="max-w-2xl mx-auto w-full min-h-[calc(100vh-8rem)] bg-card/40 backdrop-blur-xl border border-border/40 sm:rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-700 flex flex-col mb-10">
      
      {/* App-like Header */}
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-2xl px-6 py-5 flex items-center justify-between border-b border-border/40">
        <Link href="/dashboard">
          <Button variant="outline" size="icon" className="w-12 h-12 rounded-full shadow-sm">
             <ChevronLeft className="w-6 h-6" />
          </Button>
        </Link>
        <h1 className="text-xl font-black tracking-tight">Notification</h1>
        <Button variant="outline" size="icon" className="w-12 h-12 rounded-full shadow-sm text-muted-foreground">
          <MoreHorizontal className="w-6 h-6" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto pb-8">
        {/* Today Group */}
        <div className="pt-6">
          <div className="px-8 pb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight">Today</h2>
            <span className="text-sm font-semibold tracking-wide text-muted-foreground">{unreadCount} Unread Notification</span>
          </div>
          
          <div className="space-y-1 relative">
            {todayNotifications.map((notif, idx) => {
              const Icon = notif.icon;
              return (
                <div key={notif.id} className="group relative">
                  {/* Subtle hover background */}
                  <div className="absolute inset-x-4 inset-y-0 rounded-2xl bg-muted/0 group-hover:bg-muted/40 transition-colors" />
                  
                  <div className="relative px-8 py-5 flex gap-5 items-start">
                    <div className="w-14 h-14 shrink-0 rounded-full border-[1.5px] border-border/60 bg-background/50 flex items-center justify-center shadow-sm">
                       <Icon className="w-6 h-6 text-foreground/80 stroke-[1.5]" />
                    </div>
                    
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-start justify-between gap-4 mb-1">
                        <h3 className="font-bold text-base tracking-tight truncate">{notif.title}</h3>
                        <div className="flex items-center gap-2 shrink-0">
                           <span className="text-xs font-semibold text-muted-foreground">{notif.time}</span>
                           {notif.unread && <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] animate-pulse" />}
                        </div>
                      </div>
                      <p className="text-sm font-medium text-muted-foreground leading-relaxed line-clamp-2 pr-4">
                        {notif.description}
                      </p>
                    </div>
                  </div>
                  
                  {/* Internal divider avoiding the edge */}
                  {idx < todayNotifications.length - 1 && (
                     <div className="border-b border-border/30 ml-28 mr-8" />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Separator block simulating app background structure */}
        <div className="w-full h-4 bg-muted/20 border-y border-border/30 my-4" />

        {/* Previous Group */}
        <div className="pt-4">
          <div className="px-8 pb-4">
            <h2 className="text-xl font-bold tracking-tight">Previous</h2>
          </div>
          
          <div className="space-y-1 relative">
            {previousNotifications.map((notif, idx) => {
              const Icon = notif.icon;
              return (
                <div key={notif.id} className="group relative">
                  <div className="absolute inset-x-4 inset-y-0 rounded-2xl bg-muted/0 group-hover:bg-muted/40 transition-colors" />
                  
                  <div className="relative px-8 py-5 flex gap-5 items-start">
                    <div className="w-14 h-14 shrink-0 rounded-full border-[1.5px] border-border/60 bg-background/50 flex items-center justify-center shadow-sm">
                       <Icon className="w-6 h-6 text-foreground/80 stroke-[1.5]" />
                    </div>
                    
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-start justify-between gap-4 mb-1">
                        <h3 className="font-bold text-base tracking-tight truncate">{notif.title}</h3>
                        <div className="flex items-center gap-2 shrink-0">
                           <span className="text-xs font-semibold text-muted-foreground">{notif.time}</span>
                           {notif.unread && <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] animate-pulse" />}
                        </div>
                      </div>
                      <p className="text-sm font-medium text-muted-foreground leading-relaxed line-clamp-2 pr-4">
                        {notif.description}
                      </p>
                    </div>
                  </div>
                  
                  {idx < previousNotifications.length - 1 && (
                     <div className="border-b border-border/30 ml-28 mr-8" />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
      
    </div>
  );
}
