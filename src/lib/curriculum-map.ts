import { db, withDbRetry } from "@/lib/db";

export const MAP_STATUS = { DRAFT: "DRAFT", IN_REVIEW: "IN_REVIEW", PUBLISHED: "PUBLISHED" } as const;
export type MapStatus = keyof typeof MAP_STATUS;

export type MapSubStrand = {
  name: string;
  lessons: number;
  term: number | null;
  outcomes: string[];
  inquiryQuestions: string[];
  learningExperiences: string[];
};
export type MapStrand = { name: string; subStrands: MapSubStrand[] };
export type PublishedMap = { id: string; grade: string; subject: string; strands: MapStrand[] };

const strandSelect = {
  orderBy: { order: "asc" as const },
  select: {
    name: true,
    subStrands: {
      orderBy: { order: "asc" as const },
      select: { name: true, lessons: true, term: true, outcomes: true, inquiryQuestions: true, learningExperiences: true },
    },
  },
};

/** Superadmins and teachers marked as curators can enter and check curriculum maps. */
export async function getCurator(userId: string | null) {
  if (!userId) return null;
  const user = await withDbRetry(() =>
    db.user.findUnique({ where: { id: userId }, select: { id: true, role: true, isCurator: true } })
  );
  return user && (user.role === "SUPERADMIN" || user.isCurator) ? user : null;
}

/** The checked map for a class, or null. Only published maps are used for generation. */
export async function getPublishedMap(grade: string, subject: string): Promise<PublishedMap | null> {
  const map = await withDbRetry(() =>
    db.curriculumMap.findFirst({
      where: { grade, subject, status: MAP_STATUS.PUBLISHED },
      select: { id: true, grade: true, subject: true, strands: strandSelect },
    })
  );
  return map && map.strands.some((s) => s.subStrands.length > 0) ? map : null;
}

/** "Grade|Learning area" keys for every published map. */
export async function getPublishedMapKeys() {
  const maps = await withDbRetry(() =>
    db.curriculumMap.findMany({ where: { status: MAP_STATUS.PUBLISHED }, select: { grade: true, subject: true } })
  );
  return maps.map((m) => `${m.grade}|${m.subject}`);
}

type Located = MapSubStrand & { strand: string; strandNumber: number; number: string };

function flatten(map: PublishedMap): Located[] {
  return map.strands.flatMap((strand, si) =>
    strand.subStrands.map((sub, ui) => ({ ...sub, strand: strand.name, strandNumber: si + 1, number: `${si + 1}.${ui + 1}` }))
  );
}

/**
 * Sub-strands taught in a term. Curators can tag a term on each sub-strand; untagged ones
 * are split evenly across the three terms by suggested lessons, in curriculum order.
 */
export function subStrandsForTerm(map: PublishedMap, term: string) {
  const n = Number(term.match(/[123]/)?.[0] ?? 0);
  const all = flatten(map);
  if (!n) return all;
  const untagged = all.filter((s) => !s.term);
  const total = untagged.reduce((sum, s) => sum + Math.max(1, s.lessons), 0);
  let before = 0;
  const evenTerm = new Map<Located, number>();
  for (const s of untagged) {
    // The term a sub-strand starts in decides where it goes.
    evenTerm.set(s, Math.min(3, Math.floor((before / Math.max(1, total)) * 3) + 1));
    before += Math.max(1, s.lessons);
  }
  return all.filter((s) => (s.term ?? evenTerm.get(s)) === n);
}

function describe(s: Located) {
  const lines = [`Sub-strand ${s.number}: ${s.name} (${s.lessons} lesson${s.lessons === 1 ? "" : "s"})`];
  if (s.outcomes.length) lines.push("  Specific learning outcomes:", ...s.outcomes.map((o, i) => `    ${String.fromCharCode(97 + (i % 26))}) ${o}`));
  if (s.inquiryQuestions.length) lines.push("  Key inquiry questions:", ...s.inquiryQuestions.map((q) => `    - ${q}`));
  if (s.learningExperiences.length) lines.push("  Suggested learning experiences:", ...s.learningExperiences.map((e) => `    - ${e}`));
  return lines.join("\n");
}

/** Prompt text for a list of sub-strands, grouped under their strands. */
export function mapToPrompt(subStrands: Located[]) {
  const out: string[] = [];
  let strand = -1;
  for (const s of subStrands) {
    if (s.strandNumber !== strand) {
      strand = s.strandNumber;
      out.push(`Strand ${s.strandNumber}: ${s.strand}`);
    }
    out.push(describe(s));
  }
  return out.join("\n");
}

const normalise = (v: string) => v.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

/** The sub-strand a free-text topic most likely refers to, or null. */
export function findSubStrand(map: PublishedMap, topic: string) {
  const t = normalise(topic);
  if (!t) return null;
  const all = flatten(map);
  return (
    all.find((s) => normalise(s.name) === t) ??
    all.find((s) => t.includes(normalise(s.name)) || normalise(s.name).includes(t)) ??
    null
  );
}

/** Grounding for a single lesson: the matching sub-strand in full, plus the outline so the model can place it. */
export function lessonGrounding(map: PublishedMap, topic: string) {
  const match = findSubStrand(map, topic);
  const outline = map.strands
    .map((st, si) => `Strand ${si + 1}: ${st.name} — ${st.subStrands.map((s, ui) => `${si + 1}.${ui + 1} ${s.name}`).join("; ")}`)
    .join("\n");
  return match
    ? `${mapToPrompt([match])}\n\nFULL OUTLINE (for context):\n${outline}`
    : `The topic did not match a sub-strand exactly. Choose the closest sub-strand from this outline and use its name as written:\n${outline}`;
}

export function allSubStrands(map: PublishedMap) {
  return flatten(map);
}
