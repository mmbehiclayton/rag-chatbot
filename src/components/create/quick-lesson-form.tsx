"use client";

import { Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { GenerationProgress } from "@/components/create/generation-progress";
import {
  defaultGradeSubject,
  GradeSubjectPicker,
} from "@/components/create/grade-subject-picker";
import { TopicPicker } from "@/components/create/topic-picker";
import { ChoiceChips } from "@/components/shared/choice-chips";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { generateQuickLessonPlan } from "@/lib/actions/generation";
import type { GradeOption } from "@/lib/curriculum-options";
import { lessonMinutesFor } from "@/lib/term-pack";

const DURATIONS = ["30 min", "35 min", "40 min"];

export function QuickLessonForm({
  grades,
  myGrades,
  mySubjects,
  topicSuggestions,
  curricula,
  initialTopic = "",
}: {
  grades: GradeOption[];
  myGrades: string[];
  mySubjects: string[];
  topicSuggestions: Record<string, string[]>;
  curricula: string[];
  initialTopic?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [target, setTarget] = useState(() =>
    defaultGradeSubject(grades, myGrades, mySubjects),
  );
  const [topic, setTopic] = useState(initialTopic);
  // Null until the teacher picks a length, so it follows the grade.
  const [durationInput, setDuration] = useState<string | null>(null);
  const duration = durationInput ?? `${lessonMinutesFor(target.grade)} min`;

  const key = `${target.grade}|${target.subject}`;
  const suggestions = topicSuggestions[key] ?? [];
  const hasCurriculum = curricula.includes(key);
  const ready = !!target.grade && !!target.subject && topic.trim().length > 1;

  const submit = () => {
    startTransition(async () => {
      try {
        const result = await generateQuickLessonPlan({
          grade: target.grade,
          subject: target.subject,
          topic,
          durationMinutes: Number.parseInt(duration, 10),
        });
        if (!result.ok) return void toast.error(result.error);
        toast.success("Lesson plan ready");
        router.push(`/dashboard/lessons/${result.id}`);
      } catch {
        toast.error(
          "We couldn't reach Elimu. Check your connection and try again.",
        );
      }
    });
  };

  if (isPending) {
    return (
      <GenerationProgress
        title="Writing your lesson plan"
        detail={`${target.grade} ${target.subject} · ${topic.trim()}`}
      />
    );
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
          <GradeSubjectPicker
            grades={grades}
            myGrades={myGrades}
            mySubjects={mySubjects}
            value={target}
            onChange={setTarget}
          />

          {target.grade && target.subject && !hasCurriculum && (
            <p className="flex gap-2 rounded-md bg-warning/10 p-3 text-sm text-foreground">
              <Info
                className="mt-0.5 size-4 shrink-0 text-warning"
                aria-hidden
              />
              The curriculum design for {target.grade} {target.subject} isn't in
              Elimu yet, so check strands and outcomes carefully.
            </p>
          )}

          {target.grade && target.subject && (
            <TopicPicker
              grade={target.grade}
              subject={target.subject}
              value={topic}
              onChange={setTopic}
              suggestions={suggestions}
              startTyped={!!initialTopic}
            />
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium">Lesson length</p>
            <ChoiceChips
              label="Lesson length"
              options={DURATIONS}
              value={[duration]}
              onChange={([d]) => d && setDuration(d)}
            />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" size="lg" className="w-full" disabled={!ready}>
        Create lesson plan
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Always review AI-generated content before you teach with it.
      </p>
    </form>
  );
}
