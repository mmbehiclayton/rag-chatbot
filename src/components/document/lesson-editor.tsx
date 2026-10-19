"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { updateLessonPlan } from "@/lib/actions/generation";
import type { LessonActivity, LessonContent } from "./lesson-types";

const toLines = (v: unknown) => (Array.isArray(v) ? v.join("\n") : "");
const fromLines = (v: string) =>
  v
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

function TextField({
  id,
  label,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  value?: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-20 text-base"
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ListField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value?: string[];
  onChange: (v: string[]) => void;
}) {
  // Keep the raw text while typing so blank lines don't vanish mid-edit.
  const [text, setText] = useState(toLines(value));
  return (
    <TextField
      id={id}
      label={label}
      value={text}
      hint="One item per line"
      onChange={(v) => {
        setText(v);
        onChange(fromLines(v));
      }}
    />
  );
}

function Section({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset
      id={id}
      className="scroll-mt-20 space-y-4 rounded-xl border bg-card p-4 sm:p-5"
    >
      <legend className="px-1 text-base font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

export function LessonEditor({
  lessonId,
  initial,
}: {
  lessonId: string;
  initial: LessonContent;
}) {
  const router = useRouter();
  const [c, setC] = useState<LessonContent>(() => {
    const copy = structuredClone(initial);
    // Older plans kept the extended activity as homework in the conclusion.
    if (!copy.extendedActivity && copy.lessonStructure?.conclusion?.homework)
      copy.extendedActivity = copy.lessonStructure.conclusion.homework;
    return copy;
  });
  const [isPending, startTransition] = useTransition();
  const s = c.lessonStructure ?? {};

  const set = (patch: Partial<LessonContent>) =>
    setC((prev) => ({ ...prev, ...patch }));
  const setStructure = <
    K extends keyof NonNullable<LessonContent["lessonStructure"]>,
  >(
    key: K,
    patch: Partial<
      NonNullable<NonNullable<LessonContent["lessonStructure"]>[K]>
    >,
  ) =>
    setC((prev) => ({
      ...prev,
      lessonStructure: {
        ...prev.lessonStructure,
        [key]: { ...(prev.lessonStructure?.[key] as object), ...patch },
      },
    }));
  const setActivity = (i: number, patch: Partial<LessonActivity>) =>
    setC((prev) => {
      const list = [...(prev.lessonStructure?.mainActivities ?? [])];
      list[i] = { ...list[i], ...patch };
      return {
        ...prev,
        lessonStructure: { ...prev.lessonStructure, mainActivities: list },
      };
    });

  const save = () =>
    startTransition(async () => {
      try {
        await updateLessonPlan(lessonId, c);
        toast.success("Lesson plan saved");
        router.push(`/dashboard/lessons/${lessonId}`);
        router.refresh();
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Could not save. Please try again.",
        );
      }
    });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <Section title="Overview">
        <div className="space-y-1.5">
          <Label htmlFor="topic">Lesson title</Label>
          <Input
            id="topic"
            value={c.topic ?? ""}
            onChange={(e) => set({ topic: e.target.value })}
            className="text-base"
          />
        </div>
        <ListField
          id="slo"
          label="Specific learning outcomes"
          value={c.specificLearningOutcomes}
          onChange={(v) => set({ specificLearningOutcomes: v })}
        />
        <ListField
          id="kiq"
          label="Key inquiry questions"
          value={c.keyInquiryQuestions}
          onChange={(v) => set({ keyInquiryQuestions: v })}
        />
        <ListField
          id="res"
          label="Learning resources"
          value={c.learningResources}
          onChange={(v) => set({ learningResources: v })}
        />
        <TextField
          id="org"
          label="Organisation of learning"
          value={c.organisationOfLearning}
          onChange={(v) => set({ organisationOfLearning: v })}
          hint="Where the lesson happens and how learners are grouped"
        />
      </Section>

      <Section title="Introduction">
        <TextField
          id="recap"
          label="Recap"
          value={s.introduction?.recap}
          onChange={(v) => setStructure("introduction", { recap: v })}
        />
        <TextField
          id="life"
          label="Link to learners' lives"
          value={s.introduction?.connectionToLearnersLives}
          onChange={(v) =>
            setStructure("introduction", { connectionToLearnersLives: v })
          }
        />
        <TextField
          id="intent"
          label="Learning intentions"
          value={s.introduction?.learningIntentions}
          onChange={(v) =>
            setStructure("introduction", { learningIntentions: v })
          }
        />
        <TextField
          id="success"
          label="Success criteria"
          value={s.introduction?.successCriteria}
          onChange={(v) => setStructure("introduction", { successCriteria: v })}
        />
      </Section>

      {(s.mainActivities ?? []).map((a, i) => (
        <Section
          key={a.activityName ?? `activity-${i}`}
          title={`Step ${i + 1}`}
        >
          <div className="space-y-1.5">
            <Label htmlFor={`a${i}-name`}>Name</Label>
            <Input
              id={`a${i}-name`}
              value={a.activityName ?? ""}
              onChange={(e) => setActivity(i, { activityName: e.target.value })}
              className="text-base"
            />
          </div>
          <ListField
            id={`a${i}-l`}
            label="Learners"
            value={a.learnerActions}
            onChange={(v) => setActivity(i, { learnerActions: v })}
          />
          <ListField
            id={`a${i}-t`}
            label="Teacher"
            value={a.teacherActions}
            onChange={(v) => setActivity(i, { teacherActions: v })}
          />
          <TextField
            id={`a${i}-i`}
            label="Competencies, values and issues"
            value={a.integration}
            onChange={(v) => setActivity(i, { integration: v })}
          />
          <TextField
            id={`a${i}-f`}
            label="Check for understanding"
            value={a.formativeAssessment}
            onChange={(v) => setActivity(i, { formativeAssessment: v })}
          />
        </Section>
      ))}

      <Section title="Differentiation">
        <TextField
          id="d1"
          label="Learners needing support"
          value={s.differentiation?.learnersNeedingSupport}
          onChange={(v) =>
            setStructure("differentiation", { learnersNeedingSupport: v })
          }
        />
        <TextField
          id="d2"
          label="Most learners"
          value={s.differentiation?.averageLearners}
          onChange={(v) =>
            setStructure("differentiation", { averageLearners: v })
          }
        />
        <TextField
          id="d3"
          label="Learners ready for more"
          value={s.differentiation?.advancedLearners}
          onChange={(v) =>
            setStructure("differentiation", { advancedLearners: v })
          }
        />
      </Section>

      <Section title="Conclusion">
        <TextField
          id="sum"
          label="Summary"
          value={s.conclusion?.summary}
          onChange={(v) => setStructure("conclusion", { summary: v })}
        />
        <TextField
          id="exit"
          label="Exit ticket"
          value={s.conclusion?.exitTicket}
          onChange={(v) => setStructure("conclusion", { exitTicket: v })}
        />
      </Section>

      <Section title="Extended activity">
        <TextField
          id="ext"
          label="Task for home or the community"
          value={c.extendedActivity}
          onChange={(v) => set({ extendedActivity: v })}
        />
      </Section>

      <Section id="reflection" title="Reflection">
        <TextField
          id="refl"
          label="After the lesson"
          value={c.reflection}
          onChange={(v) => set({ reflection: v })}
          hint="What went well, which learners need more help, and what you will change"
        />
      </Section>

      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 flex gap-2 border-t bg-background py-3 md:bottom-0">
        <Button
          type="submit"
          size="lg"
          className="flex-1 sm:flex-none"
          disabled={isPending}
        >
          {isPending && <Spinner />} Save changes
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          render={<Link href={`/dashboard/lessons/${lessonId}`} />}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
