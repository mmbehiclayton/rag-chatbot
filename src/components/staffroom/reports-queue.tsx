"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  keepMessage,
  muteTeacher,
  removeMessage,
} from "@/lib/actions/staffroom";
import { roomLabel } from "@/lib/staffroom";

export type ReportedMessage = {
  id: string;
  room: string;
  body: string;
  author: string;
  authorId: string;
  reports: number;
};

/** Staff only: reported Staffroom messages, to remove or keep. */
export function ReportsQueue({ items }: { items: ReportedMessage[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const run = (
    action: () => Promise<{ success: boolean; error?: string }>,
    done: string,
  ) =>
    startTransition(async () => {
      const result = await action();
      if (!result.success) return void toast.error(result.error);
      toast.success(done);
      router.refresh();
    });

  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold">
        Reported messages · {items.length}
      </h2>
      <ul className="divide-y rounded-xl border border-warning/40 bg-card">
        {items.map((m) => (
          <li key={m.id} className="space-y-2 p-4">
            <p className="text-xs text-muted-foreground">
              {m.author} in {roomLabel(m.room)} · reported {m.reports}{" "}
              {m.reports === 1 ? "time" : "times"}
            </p>
            <p className="whitespace-pre-wrap break-words text-sm">{m.body}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="destructive"
                disabled={isPending}
                onClick={() =>
                  run(() => removeMessage(m.id), "Message removed")
                }
              >
                Remove
              </Button>
              <Button
                variant="outline"
                disabled={isPending}
                onClick={() => run(() => keepMessage(m.id), "Message kept")}
              >
                Keep it
              </Button>
              <Button
                variant="outline"
                disabled={isPending}
                onClick={() =>
                  run(
                    () => muteTeacher({ userId: m.authorId, days: 7 }),
                    `${m.author} can't post for 7 days`,
                  )
                }
              >
                Pause poster 7 days
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
