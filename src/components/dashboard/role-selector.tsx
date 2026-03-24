"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { updateUserRole } from "@/lib/actions/rbac";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export function RoleSelector({ userId, initialRole, currentSessionRole }: { userId: string, initialRole: string, currentSessionRole: string | null }) {
  const [isPending, startTransition] = useTransition();

  const handleRoleChange = (newRole: string | null) => {
    if (!newRole || newRole === initialRole) return;
    
    startTransition(async () => {
      const result = await updateUserRole(userId, newRole);
      if (result.success) {
        toast.success(`User role successfully changed to ${newRole}`);
      } else {
        toast.error(result.error);
      }
    });
  };

  // Only Superadmins get the interactive dropdown, Admins just see the badge
  if (currentSessionRole !== "SUPERADMIN") {
    return (
      <div className="px-3 py-1.5 rounded-full border border-border/50 bg-background/50 text-xs font-bold text-muted-foreground w-fit">
        {initialRole}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {isPending && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
      <Select defaultValue={initialRole} onValueChange={handleRoleChange} disabled={isPending}>
        <SelectTrigger className="w-[140px] h-9 rounded-[14px] text-xs font-bold border-border/50 bg-background/50 focus:ring-primary/20">
          <SelectValue placeholder="Select Role" />
        </SelectTrigger>
        <SelectContent className="rounded-2xl border-border/40 bg-card/95 backdrop-blur-xl shadow-xl">
          <SelectItem value="TEACHER" className="text-xs font-bold focus:bg-primary/10">TEACHER</SelectItem>
          <SelectItem value="ADMIN" className="text-xs font-bold focus:bg-primary/10">ADMIN</SelectItem>
          <SelectItem value="SUPERADMIN" className="text-xs font-bold focus:bg-red-500/10 focus:text-red-500">SUPERADMIN</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
