"use client";

import { Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  findLessonsToReuse,
  type ReusableLesson,
  reuseLessonPlan,
} from "@/lib/actions/reuse";

/**
 * Lesson plans other teachers already made on this sub-strand. "Use this" copies one into the
 * teacher's library at once, with no AI allowance used; their edits stay on their own copy.
 */
export function ReusePanel({
  grade,
  subject,
  topic,
}: {
  grade: string;
  subject: string;
  topic: string;
}) {
  const router = useRouter();
  const [found, setFound] = useState<ReusableLesson[]>([]);
  const [using, setUsing] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let live = true;
    // Wait for the teacher to stop typing before asking.
    const timer = setTimeout(() => {
      findLessonsToReuse({ grade, subject, topic })
        .catch(() => [])
        .then((r) => live && setFound(r));
    }, 500);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [grade, subject, topic]);

  if (found.length === 0) return null;

  const use = (id: string) => {
    setUsing(id);
    startTransition(async () => {
      const result = await reuseLessonPlan({ id, grade, subject });
      if (!result.ok) {
        setUsing(null);
        return void toast.error(result.error);
      }
      toast.success("Lesson plan added to your library");
      router.push(`/dashboard/lessons/${result.id}`);
    });
  };

  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex gap-2">
        <Users className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <div>
          <h2 className="text-sm font-semibold">
            Ready-made by other teachers
          </h2>
          <p className="text-xs text-muted-foreground">
            Use one now, free and instant. You get your own copy to change as
            you like.
          </p>
        </div>
      </div>
      <ul className="divide-y">
        {found.map((l) => (
          <li
            key={l.id}
            className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-medium">{l.topic}</p>
              <div className="flex flex-wrap gap-1.5">
                {l.checked && <Badge variant="success">Checked</Badge>}
                {l.edited && (
                  <Badge variant="info">Improved by a teacher</Badge>
                )}
                {l.hasNotes && <Badge variant="secondary">With notes</Badge>}
                <Badge variant="outline">{l.durationMinutes} min</Badge>
                {l.uses > 0 && (
                  <Badge variant="outline">
                    Used by {l.uses} teacher{l.uses === 1 ? "" : "s"}
                  </Badge>
                )}
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-11 shrink-0"
              disabled={isPending}
              onClick={() => use(l.id)}
            >
              {using === l.id && <Spinner />} Use this
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
