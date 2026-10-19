import { generateObject } from "ai";
import { z } from "zod";
import { aiModel } from "@/lib/ai-models";
import { type Located, mapToPrompt } from "@/lib/curriculum-map";

/**
 * Writes a full-term scheme of work without the model cutting it short.
 *
 * Asked for a whole term in one go, the model stops after about 20 rows. So the lesson slots
 * (which sub-strand, which outcomes, which week) are planned here in code, and the model only
 * writes the rows, a few weeks at a time and in parallel. A batch that comes back short is asked
 * again once; anything still missing is filled from the curriculum, so a scheme always has every
 * lesson the teacher's timetable needs.
 */

/** A sub-strand to teach this term, from the curriculum map or read out of the design. */
type Unit = {
  strand: string;
  subStrand: string;
  /** Suggested number of lessons, used to share out the term. */
  lessons: number;
  outcomes: string[];
  inquiryQuestions: string[];
  learningExperiences: string[];
  /** Curriculum text for this sub-strand, for the prompt. */
  detail: string;
};

type Slot = {
  lesson: number;
  week: number;
  unit: Unit;
  /** This is lesson `part` of `parts` on the sub-strand. */
  part: number;
  parts: number;
  outcomes: string[];
};

export type SchemeRow = {
  strand: string;
  subStrand: string;
  specificLearningOutcomes: string[];
  keyInquiryQuestions: string[];
  learningExperiences: string[];
  learningResources: string[];
  assessmentMethods: string[];
  reflection: string;
};

export type WrittenScheme = {
  title: string;
  termlyOverview: {
    totalLessons: number;
    strandsCovered: string[];
    communityServiceActivities: string[];
    parentalEngagementStrategies: string[];
    crossCurricularIntegration: string[];
  };
  weeks: { weekNumber: number; rows: SchemeRow[] }[];
};

export type SchemeRequest = {
  grade: string;
  subject: string;
  term: string;
  durationMinutes: number;
  /** Weeks with lessons in them. */
  teachingWeeks: number;
  totalLessons: number;
  /** Sub-strands from the checked curriculum map, when the class has one. */
  subStrands: Located[] | null;
  /** Extracts from the uploaded curriculum design, used when there's no map. */
  designText: string | null;
  /** Elimu staff's extra rules for schemes. */
  customRules: string;
  /** What the teacher asked to change, when rewriting an existing scheme. */
  instruction?: string;
};

/** Rows per model call: small enough that the model writes them all. */
const ROWS_PER_CALL = 12;

/** Splits `total` across items in proportion to their weights, at least 1 each while there's enough. */
export function shareOut(weights: number[], total: number): number[] {
  const n = weights.length;
  if (n === 0 || total <= 0) return weights.map(() => 0);
  if (total < n) return weights.map((_, i) => (i < total ? 1 : 0));
  const w = weights.map((x) => Math.max(1, x));
  const sum = w.reduce((a, b) => a + b, 0);
  const quota = w.map((x) => (x / sum) * total);
  const out = quota.map((q) => Math.max(1, Math.floor(q)));
  let left = total - out.reduce((a, b) => a + b, 0);
  while (left !== 0) {
    let best = -1;
    for (let i = 0; i < n; i++) {
      if (left < 0 && out[i] <= 1) continue;
      const gap = left > 0 ? quota[i] - out[i] : out[i] - quota[i];
      if (
        best === -1 ||
        gap > (left > 0 ? quota[best] - out[best] : out[best] - quota[best])
      )
        best = i;
    }
    if (best === -1) break;
    out[best] += left > 0 ? 1 : -1;
    left += left > 0 ? -1 : 1;
  }
  return out;
}

/** The outcomes lesson `k` (0-based) of `n` on a sub-strand focuses on, taken in order. */
function outcomesFor(outcomes: string[], k: number, n: number) {
  const m = outcomes.length;
  if (m === 0) return [];
  if (m >= n)
    return outcomes.slice(
      Math.floor((k * m) / n),
      Math.floor(((k + 1) * m) / n),
    );
  return [outcomes[Math.floor((k * m) / n)]];
}

/** Lessons in each teaching week, spread as evenly as possible. */
function lessonsPerWeek(total: number, weeks: number) {
  const w = Math.max(1, weeks);
  const base = Math.floor(total / w);
  const extra = total % w;
  return Array.from({ length: w }, (_, i) => base + (i < extra ? 1 : 0));
}

function planSlots(units: Unit[], total: number, weeks: number): Slot[] {
  const counts = shareOut(
    units.map((u) => u.lessons),
    total,
  );
  const flat: Omit<Slot, "lesson" | "week">[] = [];
  units.forEach((unit, i) => {
    for (let k = 0; k < counts[i]; k++)
      flat.push({
        unit,
        part: k + 1,
        parts: counts[i],
        outcomes: outcomesFor(unit.outcomes, k, counts[i]),
      });
  });
  const slots: Slot[] = [];
  let next = 0;
  lessonsPerWeek(flat.length, weeks).forEach((count, wi) => {
    for (let j = 0; j < count && next < flat.length; j++, next++)
      slots.push({ ...flat[next], lesson: next + 1, week: wi + 1 });
  });
  return slots;
}

function unitsFromMap(subStrands: Located[]): Unit[] {
  return subStrands.map((s) => ({
    strand: s.strand,
    subStrand: s.name,
    lessons: s.lessons,
    outcomes: s.outcomes,
    inquiryQuestions: s.inquiryQuestions,
    learningExperiences: s.learningExperiences,
    detail: mapToPrompt([s]),
  }));
}

const OutlineSchema = z.object({
  subStrands: z.array(
    z.object({
      strand: z.string(),
      subStrand: z.string(),
      lessons: z.number().describe("Suggested number of lessons"),
      specificLearningOutcomes: z
        .array(z.string())
        .describe("Exactly as written in the design, without the stem"),
    }),
  ),
});

type Usage = { inputTokens: number; outputTokens: number };
const addUsage = (
  total: Usage,
  u: { inputTokens?: number; outputTokens?: number },
) => {
  total.inputTokens += u.inputTokens ?? 0;
  total.outputTokens += u.outputTokens ?? 0;
};

/** Without a map, read the term's sub-strands out of the design extracts first (a short answer). */
async function unitsFromDesign(req: SchemeRequest, usage: Usage) {
  const { object, usage: u } = await generateObject({
    model: aiModel("write"),
    schema: OutlineSchema,
    system: `You read KICD curriculum designs. List the strands and sub-strands for ${req.grade} ${req.subject}, ${req.term}, in the order they are taught, using the names and specific learning outcomes exactly as written in the extracts. Only use what is in the extracts.\n\nCURRICULUM EXTRACTS:\n${req.designText ?? ""}`,
    prompt: "List the sub-strands now.",
  });
  addUsage(usage, u);
  return object.subStrands
    .filter((s) => s.subStrand.trim())
    .map<Unit>((s) => ({
      strand: s.strand,
      subStrand: s.subStrand,
      lessons: s.lessons,
      outcomes: s.specificLearningOutcomes,
      inquiryQuestions: [],
      learningExperiences: [],
      detail: `Strand: ${s.strand}\nSub-strand: ${s.subStrand}\nSpecific learning outcomes:\n${s.specificLearningOutcomes.map((o) => `  - ${o}`).join("\n")}`,
    }));
}

const RowsSchema = z.object({
  rows: z.array(
    z.object({
      lesson: z.number().describe("The lesson number you were given"),
      specificLearningOutcomes: z.array(z.string()),
      keyInquiryQuestions: z.array(z.string()),
      learningExperiences: z.array(z.string()),
      learningResources: z.array(z.string()),
      assessmentMethods: z.array(z.string()),
    }),
  ),
});
type ModelRow = z.infer<typeof RowsSchema>["rows"][number];

function rowRules(req: SchemeRequest) {
  return `You are an experienced Kenyan teacher writing rows of a CBC scheme of work for ${req.grade} ${req.subject}, ${req.term}. Lessons are ${req.durationMinutes} minutes.${req.customRules}

RULES:
- Write one row for every lesson listed, with the same lesson number, in the same order. Do not skip or merge lessons.
- Use the specific learning outcomes given for each lesson exactly as written. If none are given, take them from the curriculum text without paraphrasing.
- Keep each row brief: 1-2 key inquiry questions, 2-3 learning experiences, 2-3 learning resources and 1-2 assessment methods, each a short phrase.
- Learning experiences are learner-centred ("Learners are guided to…") and move forward from one lesson to the next on the same sub-strand, so lessons are not repeats of each other.
- Resources are things a Kenyan public school has or can make. Do not invent textbook titles or page numbers.
- Across the rows, develop the core competencies (communication and collaboration, critical thinking, creativity, citizenship, digital literacy, learning to learn, self-efficacy).`;
}

function describeSlot(s: Slot) {
  const focus = s.outcomes.length
    ? `\n  Outcomes for this lesson: ${s.outcomes.join("; ")}`
    : "";
  return `Lesson ${s.lesson} (week ${s.week}): ${s.unit.strand} > ${s.unit.subStrand}, lesson ${s.part} of ${s.parts} on this sub-strand.${focus}`;
}

async function writeRows(
  req: SchemeRequest,
  slots: Slot[],
  usage: Usage,
  current?: Map<number, SchemeRow>,
): Promise<Map<number, ModelRow>> {
  const units = [...new Set(slots.map((s) => s.unit))];
  const curriculum = req.subStrands
    ? units.map((u) => u.detail).join("\n\n")
    : `${units.map((u) => u.detail).join("\n\n")}\n\nCURRICULUM EXTRACTS:\n${req.designText ?? ""}`;
  const existing = current
    ? `\n\nTHE TEACHER'S CURRENT ROWS (keep what works, change what the teacher asked for):\n${slots
        .map(
          (s) =>
            `Lesson ${s.lesson}: ${JSON.stringify(current.get(s.lesson) ?? null)}`,
        )
        .join("\n")}`
    : "";
  const ask = req.instruction
    ? `\n\nTHE TEACHER ASKED FOR THIS CHANGE (follow it unless it breaks the rules above or the curriculum):\n${req.instruction}`
    : "";

  const { object, usage: u } = await generateObject({
    model: aiModel("write"),
    schema: RowsSchema,
    system: `${rowRules(req)}\n\nCURRICULUM (use these names and outcomes exactly):\n${curriculum}${existing}${ask}`,
    prompt: `Write these ${slots.length} rows:\n${slots.map(describeSlot).join("\n")}`,
    maxOutputTokens: 8000,
  });
  addUsage(usage, u);
  const wanted = new Set(slots.map((s) => s.lesson));
  return new Map(
    object.rows.filter((r) => wanted.has(r.lesson)).map((r) => [r.lesson, r]),
  );
}

/** A row built straight from the curriculum, for a lesson the model didn't write. */
function fallbackRow(s: Slot): Omit<ModelRow, "lesson"> {
  const { unit } = s;
  const pick = <T>(xs: T[], n: number) =>
    xs.length
      ? xs
          .slice((s.part - 1) % xs.length)
          .concat(xs)
          .slice(0, n)
      : [];
  return {
    specificLearningOutcomes: s.outcomes,
    keyInquiryQuestions: pick(unit.inquiryQuestions, 1),
    learningExperiences: unit.learningExperiences.length
      ? pick(unit.learningExperiences, 2)
      : s.outcomes.map((o) => `Learners are guided to ${o}`),
    learningResources: [],
    assessmentMethods: ["Oral questions", "Observation"],
  };
}

function toRow(s: Slot, r: Omit<ModelRow, "lesson">): SchemeRow {
  return {
    // Names come from the curriculum, not the model, so coverage and lesson plans match them.
    strand: s.unit.strand,
    subStrand: s.unit.subStrand,
    specificLearningOutcomes: s.outcomes.length
      ? s.outcomes
      : r.specificLearningOutcomes,
    keyInquiryQuestions: r.keyInquiryQuestions,
    learningExperiences: r.learningExperiences,
    learningResources: r.learningResources,
    assessmentMethods: r.assessmentMethods,
    reflection: "",
  };
}

/** Batches of whole weeks, about ROWS_PER_CALL rows each. */
function batches(slots: Slot[]) {
  const out: Slot[][] = [];
  let cur: Slot[] = [];
  for (const s of slots) {
    const newWeek = cur.length > 0 && cur[cur.length - 1].week !== s.week;
    if (newWeek && cur.length >= ROWS_PER_CALL) {
      out.push(cur);
      cur = [];
    }
    cur.push(s);
  }
  if (cur.length) out.push(cur);
  return out;
}

async function writeBatch(
  req: SchemeRequest,
  batch: Slot[],
  usage: Usage,
  current?: Map<number, SchemeRow>,
) {
  const rows = await writeRows(req, batch, usage, current).catch(
    () => new Map<number, ModelRow>(),
  );
  const missing = batch.filter((s) => !rows.has(s.lesson));
  if (missing.length) {
    const again = await writeRows(req, missing, usage, current).catch(
      () => new Map<number, ModelRow>(),
    );
    for (const [k, v] of again) rows.set(k, v);
  }
  return batch.map((s) => {
    const r = rows.get(s.lesson);
    if (r) return toRow(s, r);
    const kept = current?.get(s.lesson);
    return kept ?? toRow(s, fallbackRow(s));
  });
}

const OverviewSchema = z.object({
  communityServiceActivities: z.array(z.string()),
  parentalEngagementStrategies: z.array(z.string()),
  crossCurricularIntegration: z.array(z.string()),
});

async function writeOverview(req: SchemeRequest, units: Unit[], usage: Usage) {
  const { object, usage: u } = await generateObject({
    model: aiModel("write"),
    schema: OverviewSchema,
    system: `You are an experienced Kenyan CBC teacher planning ${req.grade} ${req.subject}, ${req.term}.${req.customRules}`,
    prompt: `The term covers these sub-strands: ${units.map((x) => `${x.strand} > ${x.subStrand}`).join("; ")}.\nGive 2-3 community service learning activities, 2-3 ways to involve parents and 2-3 links to other learning areas. Short, practical phrases a Kenyan public school can do.${req.instruction ? `\nThe teacher asked: ${req.instruction}` : ""}`,
  });
  addUsage(usage, u);
  return object;
}

/** Plans and writes a whole term. Throws only when the curriculum gives nothing to plan from. */
export async function writeScheme(
  req: SchemeRequest,
  current?: WrittenScheme,
): Promise<{ content: WrittenScheme } & Usage> {
  const usage: Usage = { inputTokens: 0, outputTokens: 0 };
  const units = req.subStrands?.length
    ? unitsFromMap(req.subStrands)
    : await unitsFromDesign(req, usage);
  if (units.length === 0) throw new Error("No sub-strands to plan from");

  const slots = planSlots(units, req.totalLessons, req.teachingWeeks);
  const currentRows = current
    ? new Map(
        current.weeks
          .flatMap((w) => w.rows)
          .map((r, i) => [i + 1, r] as [number, SchemeRow]),
      )
    : undefined;

  const [written, overview] = await Promise.all([
    Promise.all(
      batches(slots).map((b) => writeBatch(req, b, usage, currentRows)),
    ),
    writeOverview(req, units, usage).catch(() => ({
      communityServiceActivities:
        current?.termlyOverview.communityServiceActivities ?? [],
      parentalEngagementStrategies:
        current?.termlyOverview.parentalEngagementStrategies ?? [],
      crossCurricularIntegration:
        current?.termlyOverview.crossCurricularIntegration ?? [],
    })),
  ]);

  const rows = written.flat();
  const weeks: WrittenScheme["weeks"] = [];
  slots.forEach((s, i) => {
    let week = weeks.find((w) => w.weekNumber === s.week);
    if (!week) {
      week = { weekNumber: s.week, rows: [] };
      weeks.push(week);
    }
    week.rows.push(rows[i]);
  });

  return {
    content: {
      title:
        current?.title ??
        `${req.grade} ${req.subject} ${req.term} Scheme of Work`,
      termlyOverview: {
        totalLessons: slots.length,
        strandsCovered: [...new Set(units.map((u) => u.strand))],
        ...overview,
      },
      weeks,
    },
    ...usage,
  };
}
