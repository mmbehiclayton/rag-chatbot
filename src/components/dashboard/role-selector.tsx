"use client";

import { Loader2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateUserRole } from "@/lib/actions/rbac";

const ROLE_LABEL: Record<string, string> = {
  TEACHER: "Teacher",
  ADMIN: "School admin",
  SUPERADMIN: "Elimu staff",
};

export function RoleSelector({
  userId,
  initialRole,
  currentSessionRole,
}: {
  userId: string;
  initialRole: string;
  currentSessionRole: string | null;
}) {
  const [isPending, startTransition] = useTransition();

  const handleRoleChange = (newRole: string | null) => {
    if (!newRole || newRole === initialRole) return;
    startTransition(async () => {
      const result = await updateUserRole(userId, newRole);
      if (result.success)
        toast.success(`Role changed to ${ROLE_LABEL[newRole] ?? newRole}`);
      else toast.error(result.error);
    });
  };

  // Only Elimu staff can change roles; school admins just see the role.
  if (currentSessionRole !== "SUPERADMIN") {
    return (
      <Badge variant="secondary">
        {ROLE_LABEL[initialRole] ?? initialRole}
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        defaultValue={initialRole}
        onValueChange={handleRoleChange}
        disabled={isPending}
      >
        <SelectTrigger className="h-11 w-40" aria-label="Role">
          <SelectValue>
            {(value: string) => ROLE_LABEL[value] ?? value}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Object.entries(ROLE_LABEL).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isPending && (
        <Loader2
          className="size-4 animate-spin text-primary"
          aria-label="Saving"
        />
      )}
    </div>
  );
}
