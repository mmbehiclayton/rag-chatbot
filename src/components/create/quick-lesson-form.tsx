"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Info } from "lucide-react";
import { toast } from "sonner";
import { generateQuickLessonPlan } from "@/lib/actions/generation";
import type { GradeOption } from "@/lib/curriculum-options";
import { GradeSubjectPicker, defaultGradeSubject } from "@/components/create/grade-subject-picker";
import { GenerationProgress } from "@/components/create/generation-progress";
import { ChoiceChips } from "@/components/shared/choice-chips";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DURATIONS = ["30 min", "35 min", "40 min"];

export function QuickLessonForm({
  grades,
  myGrades,
  mySubjects,
  topicSuggestions,
  curricula,
}: {
  grades: GradeOption[];
  myGrades: string[];
  mySubjects: string[];
  topicSuggestions: Record<string, string[]>;
  curricula: string[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [target, setTarget] = useState(() => defaultGradeSubject(grades, myGrades, mySubjects));
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState("40 min");

  const key = `${target.grade}|${target.subject}`;
  const suggestions = topicSuggestions[key] ?? [];
  const hasCurriculum = curricula.includes(key);
  const ready = !!target.grade && !!target.subject && topic.trim().length > 1;

  const submit = () => {
    startTransition(async () => {
      try {
        const { id } = await generateQuickLessonPlan({
          grade: target.grade,
          subject: target.subject,
          topic,
          durationMinutes: Number.parseInt(duration, 10),
        });
        toast.success("Lesson plan ready");
        router.push(`/dashboard/lessons/${id}`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not create the lesson plan. Please try again.");
      }
    });
  };

  if (isPending) {
    return <GenerationProgress title="Writing your lesson plan" detail={`${target.grade} ${target.subject} · ${topic.trim()}`} />;
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) submit();
      }}
    >
      <Card>
        <CardContent className="space-y-5">
          <GradeSubjectPicker grades={grades} myGrades={myGrades} mySubjects={mySubjects} value={target} onChange={setTarget} />

          {target.grade && target.subject && !hasCurriculum && (
            <p className="flex gap-2 rounded-md bg-warning/10 p-3 text-sm text-foreground">
              <Info className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
              The curriculum design for {target.grade} {target.subject} isn't in Elimu yet, so check strands and outcomes carefully.
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="topic">Topic or sub-strand</Label>
            <Input
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Fractions: adding like fractions"
              maxLength={200}
              autoComplete="off"
              required
            />
            {suggestions.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <p className="text-xs text-muted-foreground">From your schemes of work</p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.slice(0, 6).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setTopic(s)}
                      className="min-h-9 rounded-md border bg-card px-2.5 text-left text-xs hover:bg-muted"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Lesson length</p>
            <ChoiceChips label="Lesson length" options={DURATIONS} value={[duration]} onChange={([d]) => d && setDuration(d)} />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" size="lg" className="w-full" disabled={!ready}>
        Create lesson plan
      </Button>
      <p className="text-center text-xs text-muted-foreground">Always review AI-generated content before you teach with it.</p>
    </form>
  );
}
