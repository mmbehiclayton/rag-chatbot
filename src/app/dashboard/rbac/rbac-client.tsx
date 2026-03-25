"use client";

import { useState, useTransition } from "react";
import { toggleRolePermission } from "@/lib/actions/rbac";
import { cn } from "@/lib/utils";
import { Check, Loader2, Shield, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const ROLES = [
  { id: "ADMIN", label: "School Administrator", desc: "Manages a specific school/tenant" },
  { id: "TEACHER", label: "Teacher", desc: "Generates curriculum content" }
];
const ACTIONS = ["CREATE", "READ", "UPDATE", "DELETE", "MANAGE"];
const RESOURCES = [
  { id: "LessonPlan", label: "Lesson Plans", desc: "Generated daily plans" },
  { id: "SchemeOfWork", label: "Schemes of Work", desc: "Term-length objectives" },
  { id: "Assessment", label: "Assessments", desc: "Grading and rubrics" },
  { id: "User", label: "User Accounts", desc: "Manage teachers and staff" },
  { id: "Tenant", label: "Workspace / School", desc: "School-wide configuration" },
  { id: "GlobalSettings", label: "Global Settings", desc: "System AI routing" }
];

export default function RBACClient({ initialPermissions }: { initialPermissions: any[] }) {
  const [permissions, setPermissions] = useState(initialPermissions);
  const [activeRole, setActiveRole] = useState("ADMIN");
  const [isPending, startTransition] = useTransition();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const hasPermission = (action: string, resource: string) => {
    return permissions.some(
      p => p.role === activeRole && p.action === action && p.resource === resource
    );
  };

  const handleToggle = (action: string, resource: string) => {
    const currentlyEnabled = hasPermission(action, resource);
    const pKey = `${action}-${resource}`;
    setLoadingKey(pKey);

    startTransition(async () => {
      // Optimistic update
      if (currentlyEnabled) {
        setPermissions(prev => prev.filter(p => !(p.role === activeRole && p.action === action && p.resource === resource)));
      } else {
        setPermissions(prev => [...prev, { role: activeRole, action, resource, id: Math.random().toString() }]);
      }
      
      const res = await toggleRolePermission(activeRole, action, resource, !currentlyEnabled);
      if (!res?.success) {
        // Fallback or toast could go here
      }
      setLoadingKey(null);
    });
  };

  const toggleAllResource = (resource: string) => {
    const allEnabled = ACTIONS.every(a => hasPermission(a, resource));
    
    startTransition(async () => {
      if (allEnabled) {
        setPermissions(prev => prev.filter(p => !(p.role === activeRole && p.resource === resource)));
        await Promise.all(ACTIONS.map(action => toggleRolePermission(activeRole, action, resource, false)));
      } else {
        const newPerms = ACTIONS.map(action => ({ role: activeRole, action, resource, id: Math.random().toString() }));
        setPermissions(prev => [
          ...prev.filter(p => !(p.role === activeRole && p.resource === resource)), 
          ...newPerms
        ]);
        await Promise.all(ACTIONS.map(action => toggleRolePermission(activeRole, action, resource, true)));
      }
    });
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl">
      {/* Role Switcher */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full">
        {ROLES.map(role => (
          <button
            key={role.id}
            onClick={() => setActiveRole(role.id)}
            className={cn(
               "flex-1 text-left p-4 rounded-[20px] border transition-all duration-300 relative overflow-hidden group hover:cursor-pointer",
              activeRole === role.id 
                ? "bg-card/80 border-indigo-500/50 shadow-md shadow-indigo-500/10 scale-100" 
                : "bg-muted/30 border-border/50 hover:bg-muted/50 scale-[0.98] opacity-70 hover:opacity-100"
            )}
          >
            <div className={cn("absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 transition-opacity", activeRole === role.id && "opacity-100")} />
            <div className="relative z-10 flex items-start gap-4">
              <div className={cn("mt-0.5 p-2 rounded-xl", activeRole === role.id ? "bg-indigo-500/10 text-indigo-500 shadow-inner" : "bg-foreground/5 text-muted-foreground")}>
                <Shield className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className={cn("font-bold text-base sm:text-lg truncate", activeRole === role.id ? "text-foreground" : "text-muted-foreground")}>{role.label}</h3>
                <p className="text-xs font-semibold text-muted-foreground mt-0.5 truncate">{role.desc}</p>
              </div>
            </div>
            {activeRole === role.id && (
              <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-indigo-500 drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
            )}
          </button>
        ))}
      </div>

      {/* Permissions Matrix */}
      <div className="w-full overflow-hidden rounded-[24px] border border-border/40 shadow-xl bg-card/60 backdrop-blur-3xl relative">
        <div className="p-4 sm:p-5 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-indigo-500" /> Matrix Configuration
            </h2>
            <p className="text-[13px] font-semibold text-muted-foreground mt-0.5 sm:ml-7">Changes immediately map globally.</p>
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-hide w-full">
          <table className="w-full text-left border-collapse min-w-[650px]">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30 backdrop-blur-md">
                <th className="py-4 px-6 font-extrabold text-foreground min-w-[200px]">Entity / Resource</th>
                {ACTIONS.map(action => (
                  <th key={action} className="py-4 px-2 sm:px-4 font-bold text-muted-foreground text-center text-[11px] tracking-wider uppercase">
                    {action}
                  </th>
                ))}
                <th className="py-4 px-6 font-bold text-muted-foreground text-right text-[11px] tracking-wider uppercase"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {RESOURCES.map(resource => {
                const allEnabled = ACTIONS.every(a => hasPermission(a, resource.id));
                return (
                  <tr key={resource.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="py-3 sm:py-4 px-6">
                      <div className="font-bold text-foreground text-sm tracking-tight">{resource.label}</div>
                      <div className="text-[11px] text-muted-foreground font-semibold mt-0.5">{resource.desc}</div>
                    </td>
                    {ACTIONS.map(action => {
                      const enabled = hasPermission(action, resource.id);
                      const isLoading = loadingKey === `${action}-${resource.id}`;
                      return (
                        <td key={action} className="py-2 px-2 sm:px-4 text-center">
                          <button
                            onClick={() => handleToggle(action, resource.id)}
                            disabled={isPending && isLoading}
                            className={cn(
                              "w-8 h-8 sm:w-10 sm:h-10 rounded-xl mx-auto flex items-center justify-center transition-all cursor-pointer border shadow-sm",
                              enabled 
                                ? "bg-indigo-500 text-white border-indigo-600 shadow-[0_0_15px_-5px_rgba(99,102,241,0.5)] scale-105" 
                                : "bg-background/80 text-transparent border-border/50 hover:border-indigo-500/40 hover:bg-indigo-500/5",
                              isLoading && "opacity-50 cursor-not-allowed scale-95"
                            )}
                          >
                            {isLoading ? (
                              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-foreground" />
                            ) : (
                              <Check className={cn("w-4 h-4 sm:w-5 sm:h-5 transition-all duration-300", enabled ? "opacity-100 scale-100" : "opacity-0 scale-50 text-indigo-500")} />
                            )}
                          </button>
                        </td>
                      );
                    })}
                    <td className="py-3 sm:py-4 px-6 text-right">
                       <Button 
                         variant={allEnabled ? "destructive" : "secondary"} 
                         className={cn("rounded-lg font-bold text-[10px] sm:text-xs px-3 sm:px-4 h-7 sm:h-8 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap", 
                           !allEnabled && "bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20"
                         )}
                         onClick={() => toggleAllResource(resource.id)}
                       >
                         {allEnabled ? "Revoke All" : "Grant All"}
                       </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
