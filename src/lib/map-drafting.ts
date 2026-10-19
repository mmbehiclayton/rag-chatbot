import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import {
  MAP_STATUS,
  type MapStrand,
  writeMapDraft,
} from "@/lib/curriculum-map";
import { db, withDbRetry } from "@/lib/db";

// About 15k tokens of design text per call, so each part fits easily and the reply stays short.
const WINDOW = 60_000;
const WINDOW_OVERLAP = 2_000;

const DraftSchema = z.object({
  strands: z.array(
    z.object({
      name: z
        .string()
        .describe("Strand name exactly as written, without its number"),
      subStrands: z.array(
        z.object({
          name: z
            .string()
            .describe("Sub-strand name exactly as written, without its number"),
          lessons: z
            .number()
            .int()
            .nullable()
            .describe(
              "Number of lessons given for the sub-strand, or null if not stated in this text",
            ),
          outcomes: z
            .array(z.string())
            .describe(
              "Specific learning outcomes, word for word, without the 'By the end of the sub-strand' lead-in or list letters",
            ),
          inquiryQuestions: z
            .array(z.string())
            .describe("Suggested key inquiry questions, word for word"),
          learningExperiences: z
            .array(z.string())
            .describe("Suggested learning experiences, word for word"),
        }),
      ),
    }),
  ),
});

const SYSTEM = `You copy the structure of a Kenyan KICD curriculum design into a list of strands and sub-strands.
Rules:
- Use only what is written in the text. Never add, reword or guess outcomes, questions or experiences.
- Copy wording exactly, fixing only broken spacing from the PDF.
- Leave out numbering such as "1.0", "1.1" or "a)".
- If this part of the design only lists strand and sub-strand names (for example a summary table), return the names with empty lists.
- Ignore the introduction, national goals, core competencies, values, PCIs, links to other subjects, assessment rubrics and appendices.
- Return an empty list if this part has no strands.`;

/** Joins a design's chunks back into its full text, removing the overlap the splitter added. */
export function joinChunks(chunks: string[]) {
  let text = chunks[0] ?? "";
  for (const next of chunks.slice(1)) {
    let overlap = 0;
    for (let n = Math.min(300, text.length, next.length); n >= 20; n--) {
      if (text.endsWith(next.slice(0, n))) {
        overlap = n;
        break;
      }
    }
    text += (overlap ? "" : "\n") + next.slice(overlap);
  }
  return text;
}

function windows(text: string) {
  const out: string[] = [];
  for (let start = 0; start < text.length; start += WINDOW - WINDOW_OVERLAP) {
    out.push(text.slice(start, start + WINDOW));
    if (start + WINDOW >= text.length) break;
  }
  return out;
}

const key = (v: string) =>
  v
    .toLowerCase()
    .replace(/^[\d.\s]+/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

function addLines(into: string[], lines: string[]) {
  const seen = new Set(into.map(key));
  for (const raw of lines) {
    const line = raw.replace(/\s+/g, " ").trim().slice(0, 600);
    if (line && !seen.has(key(line)) && into.length < 40) {
      seen.add(key(line));
      into.push(line);
    }
  }
}

/** Merges the parts in design order. A strand or sub-strand found in several parts is combined. */
function merge(parts: z.infer<typeof DraftSchema>[]): MapStrand[] {
  const strands: MapStrand[] = [];
  for (const part of parts) {
    for (const s of part.strands) {
      const name = s.name
        .replace(/^[\d.\s]+/, "")
        .trim()
        .slice(0, 200);
      if (!name) continue;
      let strand = strands.find((x) => key(x.name) === key(name));
      if (!strand) {
        if (strands.length >= 30) continue;
        strand = { name, subStrands: [] };
        strands.push(strand);
      }
      for (const u of s.subStrands) {
        const subName = u.name
          .replace(/^[\d.\s]+/, "")
          .trim()
          .slice(0, 200);
        if (!subName) continue;
        let sub = strand.subStrands.find((x) => key(x.name) === key(subName));
        if (!sub) {
          if (strand.subStrands.length >= 40) continue;
          sub = {
            name: subName,
            lessons: 0,
            term: null,
            outcomes: [],
            inquiryQuestions: [],
            learningExperiences: [],
          };
          strand.subStrands.push(sub);
        }
        if (u.lessons && u.lessons > 0)
          sub.lessons = Math.max(sub.lessons, Math.min(u.lessons, 60));
        addLines(sub.outcomes, u.outcomes);
        addLines(sub.inquiryQuestions, u.inquiryQuestions);
        addLines(sub.learningExperiences, u.learningExperiences);
      }
    }
  }
  for (const s of strands) for (const u of s.subStrands) u.lessons ||= 1;
  return strands.filter((s) => s.subStrands.length > 0);
}

/** Reads a design's text in parts and returns its strands in design order. */
export async function extractStrands(
  grade: string,
  subject: string,
  text: string,
) {
  const parts = await Promise.all(
    windows(text).map(async (part, i, all) => {
      const { object } = await generateObject({
        model: openai("gpt-4o"),
        schema: DraftSchema,
        system: SYSTEM,
        prompt: `${grade} ${subject} curriculum design, part ${i + 1} of ${all.length}:\n\n${part}`,
        temperature: 0,
        maxOutputTokens: 16_000,
      });
      return object;
    }),
  );
  return merge(parts);
}

/** The indexed curriculum design for a class, if one has been uploaded. */
export async function findDesign(grade: string, subject: string) {
  return withDbRetry(() =>
    db.curriculumDocument.findFirst({
      where: {
        gradeLevel: grade,
        subject,
        status: "completed",
        tenantId: null,
      },
      orderBy: { uploadDate: "desc" },
      select: { id: true, title: true },
    }),
  );
}

/**
 * Reads a class's curriculum design and saves its strands, sub-strands and outcomes as a draft map.
 * The draft counts as `editorId`'s edit, so a different curator still has to check it.
 */
export async function draftMapFromDesign(
  grade: string,
  subject: string,
  editorId: string | null,
) {
  const design = await findDesign(grade, subject);
  if (!design)
    throw new Error(
      `No curriculum design is uploaded for ${grade} ${subject}.`,
    );

  const chunks = await db.curriculumChunk.findMany({
    where: { curriculumId: design.id },
    orderBy: { chunkIndex: "asc" },
    select: { chunkText: true },
  });
  const text = joinChunks(chunks.map((c) => c.chunkText));
  if (!text.trim()) throw new Error("The design has no readable text.");

  const strands = await extractStrands(grade, subject, text);
  if (strands.length === 0)
    throw new Error("Elimu couldn't find any strands in the design.");

  const date = new Date().toLocaleDateString("en-KE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  await writeMapDraft(grade, subject, editorId, {
    sourceNote: `Drafted by Elimu from "${design.title}" on ${date}. Check every strand, sub-strand and outcome against the design before sending it for checking.`,
    strands,
  });
  return {
    strands: strands.length,
    subStrands: strands.reduce((n, s) => n + s.subStrands.length, 0),
  };
}

/** After a design is indexed, draft its map unless curators have already started one. */
export async function draftMapAfterUpload(documentId: string) {
  const doc = await db.curriculumDocument.findUnique({
    where: { id: documentId },
    select: {
      gradeLevel: true,
      subject: true,
      uploadedBy: true,
      tenantId: true,
    },
  });
  if (!doc || doc.tenantId) return;
  const existing = await db.curriculumMap.findUnique({
    where: { grade_subject: { grade: doc.gradeLevel, subject: doc.subject } },
    select: { status: true, _count: { select: { strands: true } } },
  });
  if (
    existing &&
    (existing.status !== MAP_STATUS.DRAFT || existing._count.strands > 0)
  )
    return;

  const result = await draftMapFromDesign(
    doc.gradeLevel,
    doc.subject,
    doc.uploadedBy,
  );
  console.log(
    `[map draft] ${doc.gradeLevel} ${doc.subject}: ${result.strands} strands, ${result.subStrands} sub-strands`,
  );
}
