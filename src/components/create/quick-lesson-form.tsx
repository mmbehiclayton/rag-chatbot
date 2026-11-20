"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { GenerationProgress } from "@/components/create/generation-progress";
import {
  defaultGradeSubject,
  GradeSubjectPicker,
} from "@/components/create/grade-subject-picker";
import { ReusePanel } from "@/components/create/reuse-panel";
import { TopicPicker } from "@/components/create/topic-picker";
import { ChoiceChips } from "@/components/shared/choice-chips";
import { CurriculumNotice } from "@/components/shared/curriculum-notice";
import { FormError } from "@/components/shared/form-error";
import { makeDocument, useStillHere } from "@/components/shared/making";
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
  const [isPending, setPending] = useState(false);
  const here = useStillHere();
  const [target, setTarget] = useState(() =>
    defaultGradeSubject(grades, myGrades, mySubjects),
  );
  const [topic, setTopic] = useState(initialTopic);
  // Null until the teacher picks a length, so it follows the grade.
  const [durationInput, setDuration] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; lost?: boolean }>();
  const duration = durationInput ?? `${lessonMinutesFor(target.grade)} min`;

  const key = `${target.grade}|${target.subject}`;
  const suggestions = topicSuggestions[key] ?? [];
  const hasCurriculum = curricula.includes(key);
  // What's still needed, said under the greyed-out button.
  const missing = !target.grade
    ? "Choose a grade to continue."
    : !target.subject
      ? "Choose a subject to continue."
      : topic.trim().length <= 1
        ? "Type the topic to continue."
        : null;
  const ready = !missing;

  const submit = async () => {
    setError(undefined);
    setPending(true);
    await makeDocument({
      what: "lesson plan",
      detail: `${target.grade} ${target.subject} · ${topic.trim()}`,
      run: () =>
        generateQuickLessonPlan({
          grade: target.grade,
          subject: target.subject,
          topic,
          durationMinutes: Number.parseInt(duration, 10),
        }),
      href: (id) => `/dashboard/lessons/${id}`,
      router,
      here,
      onError: setError,
      readyMessage: ({ reused }) =>
        reused
          ? "Another teacher already made this lesson, so you got your own copy straight away. Use Improve to change it."
          : "Your lesson plan is ready",
    });
    setPending(false);
  };

  if (isPending) {
    return (
      <GenerationProgress
        title="Writing your lesson plan"
        detail={`${target.grade} ${target.subject} · ${topic.trim()}`}
        estimate="It takes about 30 seconds. You can leave this page: we'll tell you when it's ready."
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

      {error && (
        <FormError
          title="Your lesson plan wasn't made"
          message={error.message}
          onRetry={submit}
          showDocuments={error.lost}
        />
      )}
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={!ready}
        aria-describedby={missing ? "create-missing" : undefined}
      >
        Create lesson plan
      </Button>
      {missing && (
        <p
          id="create-missing"
          className="text-center text-sm text-muted-foreground"
        >
          {missing}
        </p>
      )}
      <p className="text-center text-xs text-muted-foreground">
        Always review AI-generated content before you teach with it.
      </p>
    </form>
  );
}
