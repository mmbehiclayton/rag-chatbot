import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { createHref } from "@/lib/classes";
import type { TimetableLesson } from "@/lib/term-pack-data";
import { MarkLesson } from "@/components/term-pack/mark-lesson";
import { Button } from "@/components/ui/button";

/** One period on the timetable: the class, the scheme lesson that falls on it, and Taught / Carry over once it's due. */
export function TimetableLessonCard({ lesson: l, today, size = "lg" }: { lesson: TimetableLesson; today: string; size?: "default" | "lg" }) {
  const due = l.date <= today;
  return (
    <li className="space-y-3 rounded-xl border bg-card p-4">
      <div>
        <p className="text-xs text-muted-foreground">
          Period {l.period} · {l.label}
          {l.lessonNumber ? ` · Lesson ${l.lessonNumber}` : ""}
        </p>
        <p className="mt-0.5 text-sm font-medium">
          {!l.schemeId ? "No scheme of work yet" : l.lessonNumber ? l.topic : "All the lessons in the scheme are covered"}
        </p>
      </div>
      {!l.schemeId ? (
        <Button variant="outline" size={size} render={<Link href={createHref("scheme", l.grade, l.subject)} />}>
          <Plus /> Create a scheme of work
        </Button>
      ) : (
        l.lessonNumber && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            {due ? (
              <MarkLesson schemeId={l.schemeId} stream={l.stream} date={l.date} slot={l.period} status={l.status} size={size} />
            ) : (
              <span className="text-sm text-muted-foreground">Coming up</span>
            )}
            {l.lessonPlanId ? (
              <Button variant="ghost" size={size} render={<Link href={`/dashboard/lessons/${l.lessonPlanId}`} />}>
                <FileText /> Lesson plan
              </Button>
            ) : (
              <Button variant="ghost" size={size} render={<Link href={`/dashboard/schemes/${l.schemeId}#lesson-${l.lessonNumber}`} />}>
                <FileText /> Prepare plan
              </Button>
            )}
          </div>
        )
      )}
    </li>
  );
}
