"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { GenerationProgress } from "@/components/create/generation-progress";
import {
  defaultGradeSubject,
  GradeSubjectPicker,
} from "@/components/create/grade-subject-picker";
import { ReusePanel } from "@/components/create/reuse-panel";
import { TopicPicker } from "@/components/create/topic-picker";
import { ChoiceChips } from "@/components/shared/choice-chips";
import { CurriculumNotice } from "@/components/shared/curriculum-notice";
import { showGenerationError } from "@/components/shared/limit-dialog";
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
  requested = [],
  initialTopic = "",
}: {
  grades: GradeOption[];
  myGrades: string[];
  mySubjects: string[];
  topicSuggestions: Record<string, string[]>;
  curricula: string[];
  /** Classes whose design the teacher has already asked for, "grade|subject". */
  requested?: string[];
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
        if (!result.ok) return void showGenerationError(result);
        toast.success(
          result.reused
            ? "Another teacher already made this lesson, so you got your own copy straight away. Use Improve to change it."
            : "Lesson plan ready",
        );
        router.push(`/dashboard/lessons/${result.id}`);
      } catch {
        toast.error(
          "We lost contact with Elimu. It may still have finished, so check your Library before you try again.",
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
            curricula={curricula}
            grades={grades}
            myGrades={myGrades}
            mySubjects={mySubjects}
            value={target}
            onChange={setTarget}
          />

          {target.grade && target.subject && !hasCurriculum && (
            <CurriculumNotice
              key={key}
              grade={target.grade}
              subject={target.subject}
              kind="lesson"
              requested={requested.includes(key)}
            />
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

      {ready && (
        <ReusePanel
          grade={target.grade}
          subject={target.subject}
          topic={topic}
        />
      )}

      <Button type="submit" size="lg" className="w-full" disabled={!ready}>
        Create lesson plan
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Always review AI-generated content before you teach with it.
      </p>
    </form>
  );
}
