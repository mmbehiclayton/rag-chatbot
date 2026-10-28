"use client";

import {
  ArrowDown,
  ArrowUp,
  Check,
  Plus,
  Rocket,
  Send,
  Trash2,
  Undo2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { confirmAction } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import {
  checkCurriculumMap,
  type MapInputData,
  publishCurriculumMap,
  saveCurriculumMap,
  submitCurriculumMap,
} from "@/lib/actions/curriculum-map";

type SubStrand = {
  key: string;
  name: string;
  lessons: number;
  term: number | null;
  outcomes: string;
  inquiryQuestions: string;
  learningExperiences: string;
};
type Strand = { key: string; name: string; subStrands: SubStrand[] };
type Initial = {
  sourceNote: string;
  lessonsPerWeek: number | null;
  strands: {
    name: string;
    subStrands: {
      name: string;
      lessons: number;
      term: number | null;
      outcomes: string[];
      inquiryQuestions: string[];
      learningExperiences: string[];
    }[];
  }[];
};

const newKey = () => Math.random().toString(36).slice(2);
const toLines = (v: string) =>
  v
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
const blankSub = (): SubStrand => ({
  key: newKey(),
  name: "",
  lessons: 1,
  term: null,
  outcomes: "",
  inquiryQuestions: "",
  learningExperiences: "",
});

function move<T>(list: T[], i: number, by: number) {
  const j = i + by;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the control is passed in as children
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {hint && (
        <span className="block text-xs text-muted-foreground">{hint}</span>
      )}
      {children}
    </label>
  );
}

export function MapEditor({
  grade,
  subject,
  status,
  canCheck,
  canPublish = false,
  initial,
}: {
  grade: string;
  subject: string;
  status: string;
  canCheck: boolean;
  /** Elimu staff can skip the second check. */
  canPublish?: boolean;
  initial: Initial;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dirty, setDirty] = useState(false);
  const [sourceNote, setSourceNote] = useState(initial.sourceNote);
  const [perWeek, setPerWeek] = useState(
    initial.lessonsPerWeek ? String(initial.lessonsPerWeek) : "",
  );
  const [comment, setComment] = useState("");
  const [strands, setStrands] = useState<Strand[]>(() =>
    initial.strands.map((s) => ({
      key: newKey(),
      name: s.name,
      subStrands: s.subStrands.map((u) => ({
        key: newKey(),
        name: u.name,
        lessons: u.lessons,
        term: u.term,
        outcomes: u.outcomes.join("\n"),
        inquiryQuestions: u.inquiryQuestions.join("\n"),
        learningExperiences: u.learningExperiences.join("\n"),
      })),
    })),
  );

  const update = (fn: (s: Strand[]) => Strand[]) => {
    setStrands(fn);
    setDirty(true);
  };
  const updateStrand = (i: number, patch: Partial<Strand>) =>
    update((s) => s.map((st, k) => (k === i ? { ...st, ...patch } : st)));
  const updateSub = (i: number, j: number, patch: Partial<SubStrand>) =>
    update((s) =>
      s.map((st, k) =>
        k === i
          ? {
              ...st,
              subStrands: st.subStrands.map((u, m) =>
                m === j ? { ...u, ...patch } : u,
              ),
            }
          : st,
      ),
    );

  const totalLessons = strands.reduce(
    (sum, s) => sum + s.subStrands.reduce((a, u) => a + (u.lessons || 0), 0),
    0,
  );
  const subCount = strands.reduce((sum, s) => sum + s.subStrands.length, 0);

  const run = (
    fn: () => Promise<{ success: boolean; error?: string }>,
    done: string,
    after?: () => void,
  ) =>
    startTransition(async () => {
      const result = await fn();
      if (result.success) {
        toast.success(done);
        after?.();
        router.refresh();
      } else toast.error(result.error ?? "Something went wrong. Try again.");
    });

  const save = () => {
    const data: MapInputData = {
      sourceNote,
      lessonsPerWeek: perWeek ? Math.round(Number(perWeek)) : null,
      strands: strands.map((s) => ({
        name: s.name,
        subStrands: s.subStrands.map((u) => ({
          name: u.name,
          lessons: Math.max(1, Math.min(60, Math.round(u.lessons || 1))),
          term: u.term,
          outcomes: toLines(u.outcomes),
          inquiryQuestions: toLines(u.inquiryQuestions),
          learningExperiences: toLines(u.learningExperiences),
        })),
      })),
    };
    run(
      () => saveCurriculumMap(grade, subject, data),
      "Map saved",
      () => setDirty(false),
    );
  };

  return (
    <div className="space-y-6 pb-24">
      <Field
        label="Source"
        hint="Which curriculum design and edition you entered this from, e.g. KICD Grade 7 Integrated Science design, 2024."
      >
        <Input
          value={sourceNote}
          onChange={(e) => {
            setSourceNote(e.target.value);
            setDirty(true);
          }}
        />
      </Field>

      <Field
        label="Lessons a week"
        hint="The time allocation the design gives this learning area, e.g. 5. Teachers' schemes start from this number."
      >
        <Input
          type="number"
          inputMode="numeric"
          min={1}
          max={10}
          className="w-24"
          value={perWeek}
          onChange={(e) => {
            setPerWeek(e.target.value);
            setDirty(true);
          }}
        />
      </Field>

      {status === "PUBLISHED" && (
        <p className="rounded-xl border bg-card p-3 text-sm text-muted-foreground">
          This map is in use. If you save changes, Elimu stops using it until
          another curator checks it again.
        </p>
      )}

      <p className="text-sm text-muted-foreground">
        {strands.length} strand{strands.length === 1 ? "" : "s"} · {subCount}{" "}
        sub-strand{subCount === 1 ? "" : "s"} · {totalLessons} suggested lesson
        {totalLessons === 1 ? "" : "s"}
      </p>

      {strands.map((strand, i) => (
        <section
          key={strand.key}
          className="space-y-4 rounded-xl border bg-card p-4"
        >
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <Field label={`Strand ${i + 1}`}>
                <Input
                  value={strand.name}
                  onChange={(e) => updateStrand(i, { name: e.target.value })}
                  placeholder="e.g. Mixtures, Elements and Compounds"
                />
              </Field>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Move strand ${i + 1} up`}
              disabled={i === 0}
              onClick={() => update((s) => move(s, i, -1))}
            >
              <ArrowUp />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Move strand ${i + 1} down`}
              disabled={i === strands.length - 1}
              onClick={() => update((s) => move(s, i, 1))}
            >
              <ArrowDown />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Remove strand ${i + 1}`}
              onClick={async () => {
                if (
                  strand.subStrands.length === 0 ||
                  (await confirmAction({
                    title: `Remove strand ${i + 1} and its sub-strands?`,
                    confirm: "Remove",
                    destructive: true,
                  }))
                )
                  update((s) => s.filter((_, k) => k !== i));
              }}
            >
              <Trash2 />
            </Button>
          </div>

          {strand.subStrands.map((sub, j) => (
            <details
              key={sub.key}
              open={!sub.name}
              className="rounded-xl border bg-background"
            >
              <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-3 text-sm font-medium">
                <span className="text-muted-foreground">
                  {i + 1}.{j + 1}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {sub.name || "New sub-strand"}
                </span>
                <span className="text-xs font-normal text-muted-foreground">
                  {sub.lessons} lesson{sub.lessons === 1 ? "" : "s"}
                </span>
              </summary>
              <div className="space-y-4 border-t p-3">
                <Field label="Sub-strand">
                  <Input
                    value={sub.name}
                    onChange={(e) => updateSub(i, j, { name: e.target.value })}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Suggested lessons">
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={60}
                      value={sub.lessons}
                      onChange={(e) =>
                        updateSub(i, j, { lessons: Number(e.target.value) })
                      }
                    />
                  </Field>
                  <Field label="Term">
                    <NativeSelect
                      value={sub.term ?? ""}
                      onChange={(e) =>
                        updateSub(i, j, {
                          term: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    >
                      <NativeSelectOption value="">Not sure</NativeSelectOption>
                      <NativeSelectOption value="1">Term 1</NativeSelectOption>
                      <NativeSelectOption value="2">Term 2</NativeSelectOption>
                      <NativeSelectOption value="3">Term 3</NativeSelectOption>
                    </NativeSelect>
                  </Field>
                </div>
                <Field
                  label="Specific learning outcomes"
                  hint="One per line, as written in the design."
                >
                  <Textarea
                    rows={4}
                    value={sub.outcomes}
                    onChange={(e) =>
                      updateSub(i, j, { outcomes: e.target.value })
                    }
                  />
                </Field>
                <Field label="Key inquiry questions" hint="One per line.">
                  <Textarea
                    rows={2}
                    value={sub.inquiryQuestions}
                    onChange={(e) =>
                      updateSub(i, j, { inquiryQuestions: e.target.value })
                    }
                  />
                </Field>
                <Field
                  label="Suggested learning experiences"
                  hint="One per line. Summarise in your own words."
                >
                  <Textarea
                    rows={3}
                    value={sub.learningExperiences}
                    onChange={(e) =>
                      updateSub(i, j, { learningExperiences: e.target.value })
                    }
                  />
                </Field>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={j === 0}
                    onClick={() =>
                      updateStrand(i, {
                        subStrands: move(strand.subStrands, j, -1),
                      })
                    }
                  >
                    <ArrowUp /> Up
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={j === strand.subStrands.length - 1}
                    onClick={() =>
                      updateStrand(i, {
                        subStrands: move(strand.subStrands, j, 1),
                      })
                    }
                  >
                    <ArrowDown /> Down
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() =>
                      updateStrand(i, {
                        subStrands: strand.subStrands.filter((_, m) => m !== j),
                      })
                    }
                  >
                    <Trash2 /> Remove
                  </Button>
                </div>
              </div>
            </details>
          ))}

          <Button
            variant="outline"
            onClick={() =>
              updateStrand(i, {
                subStrands: [...strand.subStrands, blankSub()],
              })
            }
          >
            <Plus /> Add sub-strand
          </Button>
        </section>
      ))}

      <Button
        variant="outline"
        onClick={() =>
          update((s) => [
            ...s,
            { key: newKey(), name: "", subStrands: [blankSub()] },
          ])
        }
      >
        <Plus /> Add strand
      </Button>

      {canCheck && !dirty && (
        <section className="space-y-3 rounded-xl border bg-card p-4">
          <h2 className="text-base font-semibold">Check this map</h2>
          <p className="text-sm text-muted-foreground">
            Compare every strand, sub-strand and outcome with the curriculum
            design. Approve only if it matches.
          </p>
          <Field label="What needs fixing (only if you send it back)">
            <Textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </Field>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              disabled={pending}
              onClick={() =>
                run(
                  () => checkCurriculumMap(grade, subject, "approve"),
                  "Map approved and now in use",
                )
              }
            >
              <Check /> Approve and use
            </Button>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() =>
                run(
                  () =>
                    checkCurriculumMap(grade, subject, "send-back", comment),
                  "Sent back to the editor",
                  () => setComment(""),
                )
              }
            >
              <Undo2 /> Send back
            </Button>
          </div>
        </section>
      )}

      <div className="fixed inset-x-0 bottom-16 z-10 border-t bg-card p-3 md:bottom-0 md:left-60">
        <div className="mx-auto flex max-w-3xl flex-col gap-2 sm:flex-row sm:justify-end">
          {status === "DRAFT" && !dirty && strands.length > 0 && (
            <Button
              variant="outline"
              disabled={pending}
              onClick={() =>
                run(
                  () => submitCurriculumMap(grade, subject),
                  "Sent for checking",
                )
              }
            >
              <Send /> Send for checking
            </Button>
          )}
          {canPublish &&
            status !== "PUBLISHED" &&
            !dirty &&
            strands.length > 0 && (
              <Button
                variant="outline"
                disabled={pending}
                onClick={async () => {
                  if (
                    !(await confirmAction({
                      title: "Publish without a second check?",
                      body: "No second curator has checked this map. Teachers' generations will use it straight away.",
                      confirm: "Publish now",
                    }))
                  )
                    return;
                  run(
                    () => publishCurriculumMap(grade, subject),
                    "Map published and now in use",
                  );
                }}
              >
                <Rocket /> Publish now
              </Button>
            )}
          <Button disabled={pending || !dirty} onClick={save}>
            {pending ? "Saving…" : dirty ? "Save changes" : "Saved"}
          </Button>
        </div>
      </div>
    </div>
  );
}
