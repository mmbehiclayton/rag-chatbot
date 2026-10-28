"use client";

import { AlertCircle, Check, ChevronRight, Plus, RotateCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, use, useState, useTransition } from "react";
import { toast } from "sonner";
import { showGenerationError } from "@/components/shared/limit-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { generateLessonPlan, reviewScheme } from "@/lib/actions/generation";

type RowLesson = {
  lessonNumber: number;
  topic: string;
  lessonId: string | null;
};
type RowState = {
  status: "idle" | "running" | "done" | "failed";
  lessonId?: string;
  error?: string;
};

type WeekContext = {
  states: Record<number, RowState>;
  run: (rows: RowLesson[]) => Promise<void>;
  busy: boolean;
};

const Week = createContext<WeekContext | null>(null);

function useWeek() {
  const ctx = use(Week);
  if (!ctx) throw new Error("Lesson actions must be inside <WeekLessons>");
  return ctx;
}

/**
 * Holds lesson-generation state for one week of a scheme so the week's batch
 * button and each row's button share progress. Lessons run one at a time and a
 * failure doesn't stop the rest; failed rows offer a retry.
 */
export function WeekLessons({
  schemeId,
  rows,
  children,
}: {
  schemeId: string;
  rows: RowLesson[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [states, setStates] = useState<Record<number, RowState>>(() =>
    Object.fromEntries(
      rows.map((r) => [
        r.lessonNumber,
        r.lessonId
          ? { status: "done", lessonId: r.lessonId }
          : { status: "idle" },
      ]),
    ),
  );
  // Plain state, not a transition: React holds navigations until an async transition ends,
  // and the teacher should be able to leave while the lessons are written.
  const [busy, setBusy] = useState(false);

  const run = async (targets: RowLesson[]) => {
    setBusy(true);
    let failed = 0;
    let limited = false;
    for (const row of targets) {
      setStates((s) => ({
        ...s,
        [row.lessonNumber]: { status: "running" },
      }));
      const result = await generateLessonPlan(
        schemeId,
        row.lessonNumber,
        row.topic,
      ).catch(() => ({
        ok: false as const,
        error: "We couldn't reach Elimu. Check your connection and try again.",
      }));
      if (result.ok) {
        setStates((s) => ({
          ...s,
          [row.lessonNumber]: { status: "done", lessonId: result.id },
        }));
      } else {
        failed++;
        setStates((s) => ({
          ...s,
          [row.lessonNumber]: { status: "failed", error: result.error },
        }));
        // Stop early on limits that would fail every remaining lesson too.
        if ("limit" in result && result.limit) {
          limited = true;
          showGenerationError(result);
          break;
        }
        if (/last hour/i.test(result.error)) {
          toast.error(result.error);
          break;
        }
      }
    }
    if (failed && !limited)
      toast.error(
        `${failed} lesson plan${failed === 1 ? "" : "s"} could not be created. Tap Retry to try again.`,
      );
    else if (targets.length > 1)
      toast.success(`${targets.length} lesson plans ready`);
    router.refresh();
    setBusy(false);
  };

  return <Week value={{ states, run, busy }}>{children}</Week>;
}

export function WeekBatchButton({ rows }: { rows: RowLesson[] }) {
  const { states, run, busy } = useWeek();
  const todo = rows.filter((r) => states[r.lessonNumber]?.status !== "done");
  const running = rows.findIndex(
    (r) => states[r.lessonNumber]?.status === "running",
  );

  if (todo.length === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-success">
        <Check className="size-4" /> All lesson plans created
      </span>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={() => run(todo)}
    >
      {busy && running >= 0 ? (
        <>
          <Spinner /> Lesson {running + 1} of {rows.length}…
        </>
      ) : (
        <>
          <Plus /> Create{" "}
          {todo.length === rows.length
            ? "this week's"
            : `${todo.length} remaining`}{" "}
          lesson plan{todo.length === 1 ? "" : "s"}
        </>
      )}
    </Button>
  );
}

export function LessonRowAction({ row }: { row: RowLesson }) {
  const { states, run, busy } = useWeek();
  const state = states[row.lessonNumber] ?? { status: "idle" };

  if (state.status === "done" && state.lessonId) {
    return (
      <Button
        variant="ghost"
        size="sm"
        render={<Link href={`/dashboard/lessons/${state.lessonId}`} />}
      >
        Open lesson plan <ChevronRight />
      </Button>
    );
  }
  if (state.status === "running") {
    return (
      <output
        aria-live="polite"
        className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground"
      >
        <Spinner /> Writing lesson plan…
      </output>
    );
  }
  if (state.status === "failed") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm text-destructive">
          <AlertCircle className="size-4" /> Not created
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => run([row])}
        >
          <RotateCw /> Retry
        </Button>
      </div>
    );
  }
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={() => run([row])}
    >
      <Plus /> Create lesson plan
    </Button>
  );
}

export function ApproveSchemeButton({ schemeId }: { schemeId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          try {
            await reviewScheme(schemeId);
            toast.success("Marked as reviewed");
            router.refresh();
          } catch (e) {
            toast.error(
              e instanceof Error ? e.message : "Could not update the scheme",
            );
          }
        })
      }
    >
      {isPending ? <Spinner /> : <Check />} Mark as reviewed
    </Button>
  );
}
