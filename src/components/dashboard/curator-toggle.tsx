"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { setCurator } from "@/lib/actions/curriculum-map";

/** Superadmin switch: lets a teacher enter and check curriculum maps. */
export function CuratorToggle({
  userId,
  isCurator,
}: {
  userId: string;
  isCurator: boolean;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="inline-flex min-h-11 items-center gap-2 text-xs text-muted-foreground">
      <Switch
        aria-label="Toggle curator access"
        checked={isCurator}
        disabled={pending}
        onCheckedChange={(checked) =>
          startTransition(async () => {
            const result = await setCurator(userId, checked);
            if (result.success)
              toast.success(
                checked
                  ? "Can now edit curriculum maps"
                  : "No longer a curator",
              );
            else toast.error(result.error);
          })
        }
      />
      <span>Curator</span>
    </div>
  );
}
`${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
