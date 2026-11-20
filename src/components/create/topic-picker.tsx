"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { getTopicOptions, type TopicOptions } from "@/lib/actions/topics";

type Design = TopicOptions | null;

/**
 * Sub-strands for a class from its checked curriculum design, loaded once per class.
 * `undefined` while loading, `null` when Elimu has no checked design for it.
 */
export function useCurriculumTopics(grade: string, subject: string) {
  const [designs, setDesigns] = useState<Record<string, Design>>({});
  const key = `${grade}|${subject}`;

  useEffect(() => {
    const k = `${grade}|${subject}`;
    if (!grade || !subject || k in designs) return;
    let live = true;
    getTopicOptions({ grade, subject })
      .catch(() => null)
      .then((options) => {
        if (live) setDesigns((d) => ({ ...d, [k]: options }));
      });
    return () => {
      live = false;
    };
  }, [grade, subject, designs]);

  return grade && subject ? designs[key] : null;
}

/**
 * Topic for one lesson: the next sub-strand from the curriculum design is picked for the teacher,
 * with an optional focus and a way to type their own topic. Falls back to a text box when there's no design.
 */
export function TopicPicker({
  grade,
  subject,
  value,
  onChange,
  suggestions = [],
  startTyped = false,
  withFocus = true,
}: {
  grade: string;
  subject: string;
  /** The topic sent to Elimu. */
  value: string;
  onChange: (topic: string) => void;
  /** Topics from the teacher's own schemes, shown under the text box. */
  suggestions?: string[];
  startTyped?: boolean;
  /** False for an assessment, which covers the whole sub-strand. */
  withFocus?: boolean;
}) {
  const design = useCurriculumTopics(grade, subject);
  const [typeOwn, setTypeOwn] = useState(startTyped);
  const [subStrand, setSubStrand] = useState<Record<string, string>>({});
  const [focus, setFocus] = useState("");
  const [own, setOwn] = useState(startTyped ? value : "");

  const key = `${grade}|${subject}`;
  const useDesign = !!design && !typeOwn;
  const chosen = subStrand[key] ?? design?.suggested ?? "";
  const topic = useDesign
    ? withFocus && focus.trim()
      ? `${chosen}: ${focus.trim()}`
      : chosen
    : own;

  // Keep the parent's topic in step with what's on screen.
  useEffect(() => {
    if (topic !== value) onChange(topic);
  }, [topic, value, onChange]);

  if (design === undefined)
    return (
      <p className="text-sm text-muted-foreground">Loading sub-strands…</p>
    );

  if (useDesign) {
    const strands: { name: string; subs: TopicOptions["subStrands"] }[] = [];
    for (const s of design.subStrands) {
      const last = strands.at(-1);
      if (last?.name === s.strand) last.subs.push(s);
      else strands.push({ name: s.strand, subs: [s] });
    }
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="sub-strand">Sub-strand</Label>
          <NativeSelect
            id="sub-strand"
            className="w-full"
            value={chosen}
            onChange={(e) =>
              setSubStrand((p) => ({ ...p, [key]: e.target.value }))
            }
          >
            {strands.map((st) => (
              <NativeSelectOptGroup key={st.name} label={st.name}>
                {st.subs.map((s) => (
                  <NativeSelectOption key={s.number} value={s.name}>
                    {s.number} {s.name} · Term {s.termNumber}
                  </NativeSelectOption>
                ))}
              </NativeSelectOptGroup>
            ))}
          </NativeSelect>
          {!subStrand[key] && design.suggested && (
            <p className="text-xs text-muted-foreground">
              The next sub-strand for this term from the curriculum design.
              Change it if your class is somewhere else.
            </p>
          )}
        </div>
        {withFocus && (
          <div className="space-y-2">
            <Label htmlFor="focus">Lesson focus (optional)</Label>
            <Input
              id="focus"
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              placeholder="e.g. adding like fractions"
              maxLength={120}
              autoComplete="off"
            />
          </div>
        )}
        <Button
          type="button"
          variant="link"
          className="h-11 px-0"
          onClick={() => {
            setOwn(topic);
            setTypeOwn(true);
          }}
        >
          Type my own topic instead
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="topic">Topic or sub-strand</Label>
      <Input
        id="topic"
        value={own}
        onChange={(e) => setOwn(e.target.value)}
        placeholder="e.g. Fractions: adding like fractions"
        maxLength={200}
        autoComplete="off"
        required
      />
      {suggestions.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <p className="text-xs text-muted-foreground">
            From your schemes of work
          </p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.slice(0, 6).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setOwn(s)}
                className="min-h-11 rounded-md border bg-card px-2.5 text-left text-xs hover:bg-muted"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
      {design && (
        <Button
          type="button"
          variant="link"
          className="h-11 px-0"
          onClick={() => setTypeOwn(false)}
        >
          Pick from the curriculum design
        </Button>
      )}
    </div>
  );
}
