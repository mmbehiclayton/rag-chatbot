"use server";

import { Prisma } from "@prisma/client";
import { generateObject } from "ai";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { explainAIError } from "@/lib/ai-errors";
import { aiModel, modelName } from "@/lib/ai-models";
import { auth } from "@/lib/auth";
import {
  allSubStrands,
  getPublishedMap,
  type Located,
  lessonGrounding,
  mapToPrompt,
  subStrandsForTerm,
} from "@/lib/curriculum-map";
import { db } from "@/lib/db";
import { filingFor, filingOf } from "@/lib/filing";
import {
  type ClassRef,
  coversClass,
  freePlanMessage,
  getAccess,
  plansOn,
} from "@/lib/plans";
import { retrieveContext } from "@/lib/rag";
import { DOCS_PER_HOUR, overLimit } from "@/lib/rate-limit";
import {
  BEST_FIRST,
  BEST_SCHEME_FIRST,
  copyLessonPlan,
  countReuse,
  logReuse,
} from "@/lib/reuse";
import { type WrittenScheme, writeScheme } from "@/lib/scheme-writer";
import { lessonMinutesFor, schemeLessons } from "@/lib/term-pack";
import { getTeacherTerms } from "@/lib/term-pack-data";

// ─── Results and errors ───────────────────────────────────────────────────────

// Next hides the message of anything thrown from a server action in production, so the
// generators return their outcome instead. TeacherError messages are shown as written.
class TeacherError extends Error {}

export type GenerationResult =
  | { ok: true; id: string; reused?: boolean }
  | { ok: false; error: string };

function explain(label: string, e: unknown): string {
  return e instanceof TeacherError ? e.message : explainAIError(label, e);
}

async function asResult(
  label: string,
  fn: () => Promise<{ id: string; reused?: boolean }>,
): Promise<GenerationResult> {
  try {
    const { id, reused } = await fn();
    return reused ? { ok: true, id, reused } : { ok: true, id };
  } catch (e) {
    return { ok: false, error: explain(label, e) };
  }
}

async function requireSession() {
  const session = await auth();
  if (!session?.userId)
    throw new TeacherError("Your session has ended. Please sign in again.");
  return session as typeof session & { userId: string };
}

/** Lower-case words only, without numbering like "1.2", so names compare loosely. */
const plainName = (s: string) =>
  s
    .toLowerCase()
    .replace(/^[\d.\s]+/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * Checks the sub-strands a document names are in its curriculum, without another AI call.
 * With a checked map every name must match; with design extracts most must appear in them,
 * because the extracts are only part of the design.
 */
function passesVerification(names: string[], grounding: Grounding) {
  const wanted = [...new Set(names.map(plainName).filter(Boolean))];
  if (wanted.length === 0) return true;
  const known = grounding.subStrands?.map((s) => plainName(s.name));
  const text = plainName(grounding.text);
  const unknown = wanted.filter((n) =>
    known
      ? !known.some((k) => k === n || k.includes(n) || n.includes(k))
      : !text.includes(n),
  );
  if (unknown.length)
    console.warn("[generation] sub-strands not in the curriculum:", unknown);
  return known ? unknown.length === 0 : unknown.length <= wanted.length / 4;
}

/**
 * The scheme rows a lesson plan is written from: this lesson's row, with the rows before and
 * after for continuity. Sending the whole scheme for every lesson cost far more for no better plan.
 */
function schemeRowsFor(content: unknown, lessonNumber: number) {
  const weeks = (
    content as { weeks?: { weekNumber?: number; rows?: unknown[] }[] }
  )?.weeks;
  const rows = (Array.isArray(weeks) ? weeks : []).flatMap((w, i) =>
    (Array.isArray(w?.rows) ? w.rows : []).map((r) => ({
      week: w.weekNumber ?? i + 1,
      ...(r as object),
    })),
  );
  const row = rows[lessonNumber - 1];
  if (!row)
    return `SCHEME CONTENT TO EXTRACT FROM:
${JSON.stringify(content)}`;
  const before = rows[lessonNumber - 2];
  const after = rows[lessonNumber];
  return `THIS LESSON'S ROW IN THE SCHEME OF WORK (write the plan from this):
${JSON.stringify(row)}
${
  before
    ? `
THE LESSON BEFORE (for continuity only):
${JSON.stringify(before)}`
    : ""
}${
  after
    ? `
THE LESSON AFTER (for continuity only):
${JSON.stringify(after)}`
    : ""
}`;
}

// ─── Shared Guards ────────────────────────────────────────────────────────────

async function checkGenerationGuards(
  session: { userId: string; tenantId?: string | null },
  cls: ClassRef,
) {
  // 0. Plan: the free plan covers one class
  if (await plansOn()) {
    const access = await getAccess(session.userId);
    if (!coversClass(access, cls))
      throw new TeacherError(freePlanMessage(access));
  }

  // 1. Rate limit: 20 documents per teacher per hour
  if (await overLimit(`gen_${session.userId}`, DOCS_PER_HOUR, 60 * 60 * 1000)) {
    throw new TeacherError(
      `You have created ${DOCS_PER_HOUR} documents in the last hour. Please wait a while before creating more.`,
    );
  }

  // 2. Token quota: check tenant monthly usage
  if (session.tenantId) {
    const tenant = await db.tenant.findUnique({
      where: { id: session.tenantId },
    });
    if (tenant) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const usage = await db.generationLog.aggregate({
        where: { tenantId: session.tenantId, createdAt: { gte: startOfMonth } },
        _sum: { totalTokens: true },
      });

      const usedTokens = usage._sum.totalTokens ?? 0;
      if (usedTokens >= tenant.tokenQuota) {
        throw new TeacherError(
          `Your school has used this month's allowance (${usedTokens.toLocaleString()} of ${tenant.tokenQuota.toLocaleString()} tokens). Ask your school admin to raise it.`,
        );
      }
    }
  }
}

// ─── Curriculum grounding ─────────────────────────────────────────────────────

type Grounding = {
  source: "map" | "design";
  text: string;
  curriculumId: string | null;
  /** The map's sub-strands for the term, when grounded on a map. */
  subStrands: Located[] | null;
};

const MAP_RULES = `The CURRICULUM MAP below was entered and checked by practising teachers. Use only its strands, sub-strands and specific learning outcomes, with names and outcomes exactly as written, in the order given.`;

/**
 * What generation is grounded on, in order of trust: the checked curriculum map for the
 * class, then extracts from an uploaded curriculum design. Null when neither exists.
 */
async function termGrounding(
  grade: string,
  subject: string,
  term: string,
  tenantId: string | null | undefined,
): Promise<Grounding | null> {
  const map = await getPublishedMap(grade, subject);
  if (map) {
    const forTerm = subStrandsForTerm(map, term);
    const subStrands = forTerm.length ? forTerm : allSubStrands(map);
    return {
      source: "map",
      text: mapToPrompt(subStrands),
      curriculumId: null,
      subStrands,
    };
  }

  const doc = await db.curriculumDocument.findFirst({
    where: {
      gradeLevel: grade,
      subject,
      status: "completed",
      OR: [{ tenantId: tenantId ?? null }, { tenantId: null }],
    },
    select: { id: true },
  });
  if (!doc) return null;
  const chunks = await retrieveContext(
    `Curriculum for ${grade} ${subject} ${term}`,
    12,
    { grade, subject, tenantId: tenantId ?? undefined },
  );
  return {
    source: "design",
    text: chunks.map((c) => c.chunkText).join("\n\n"),
    curriculumId: doc.id,
    subStrands: null,
  };
}

function groundingBlock(g: Grounding) {
  return g.source === "map"
    ? `${MAP_RULES}\n\nCURRICULUM MAP:\n${g.text}`
    : `CURRICULUM CONTEXT (extracts from the KICD curriculum design):\n${g.text}`;
}

const missingCurriculum = (grade: string, subject: string) =>
  `The curriculum for ${grade} ${subject} isn't in Elimu yet, so we can't create this without guessing. Try another class, or check back soon.`;

// --- Validations & Schemas ---

const SchemeOfWorkSchema = z.object({
  title: z.string(),
  termlyOverview: z.object({
    totalLessons: z.number(),
    strandsCovered: z.array(z.string()),
    communityServiceActivities: z.array(z.string()),
    parentalEngagementStrategies: z.array(z.string()),
    crossCurricularIntegration: z.array(z.string()),
  }),
  weeks: z.array(
    z.object({
      weekNumber: z.number(),
      rows: z.array(
        z.object({
          strand: z.string(),
          subStrand: z.string(),
          specificLearningOutcomes: z.array(z.string()),
          keyInquiryQuestions: z.array(z.string()),
          learningExperiences: z.array(z.string()),
          learningResources: z.array(z.string()),
          assessmentMethods: z.array(z.string()),
          reflection: z
            .string()
            .describe(
              "Always an empty string: the teacher fills this in after teaching",
            ),
        }),
      ),
    }),
  ),
});

// Follows the KICD lesson plan format: strand, sub-strand, outcomes, inquiry questions, resources,
// organisation of learning, introduction, lesson development in steps, conclusion, extended activity.
// The teacher's reflection is left out: they write it after teaching.
const LessonPlanSchema = z.object({
  topic: z.string().describe("Short lesson title within the sub-strand"),
  strand: z.string(),
  subStrand: z.string(),
  specificLearningOutcomes: z
    .array(z.string())
    .describe(
      "2-3 measurable outcomes completing 'By the end of the lesson, the learner should be able to:', each starting with an action verb, without that stem",
    ),
  keyInquiryQuestions: z.array(z.string()),
  learningResources: z.array(z.string()),
  organisationOfLearning: z
    .string()
    .describe(
      "Where the lesson happens and how learners are grouped, e.g. 'In class, in groups of five'",
    ),
  coreCompetencies: z.array(
    z.object({
      competency: z.string(),
      howDeveloped: z.string(),
    }),
  ),
  values: z.array(
    z.object({
      value: z.string(),
      howDemonstrated: z.string(),
    }),
  ),
  pertinentIssues: z
    .array(
      z.object({
        issue: z.string(),
        howAddressed: z.string(),
      }),
    )
    .describe("Pertinent and contemporary issues (PCIs) the lesson touches"),
  linksToOtherLearningAreas: z.array(
    z.object({
      learningArea: z.string(),
      link: z.string(),
    }),
  ),
  lessonStructure: z.object({
    introduction: z.object({
      duration: z.number(),
      recap: z.string(),
      connectionToLearnersLives: z.string(),
      learningIntentions: z.string(),
      successCriteria: z.string(),
    }),
    mainActivities: z
      .array(
        z.object({
          activityName: z.string().describe("Short name for this step"),
          duration: z.number(),
          grouping: z.string(),
          learnerActions: z
            .array(z.string())
            .describe("What learners do, e.g. 'Learners discuss…'"),
          teacherActions: z
            .array(z.string())
            .describe("How the teacher guides, e.g. 'Guide learners to…'"),
          integration: z
            .string()
            .describe(
              "At most one or two core competencies, values or PCIs this step develops, and how",
            ),
          formativeAssessment: z.string(),
        }),
      )
      .describe("Lesson development, in steps (Step 1, Step 2, …)"),
    differentiation: z.object({
      learnersNeedingSupport: z.string(),
      averageLearners: z.string(),
      advancedLearners: z.string(),
    }),
    conclusion: z.object({
      duration: z.number(),
      summary: z.string(),
      assessmentOfLearning: z.string(),
      exitTicket: z.string(),
      previewNextLesson: z.string(),
    }),
  }),
  extendedActivity: z
    .string()
    .describe(
      "A short task beyond the lesson, at home or in the community, using things learners have",
    ),
  assessmentRubric: z.object({
    criteria: z.string(),
    exceeding: z.string(),
    meeting: z.string(),
    approaching: z.string(),
    below: z.string(),
  }),
});

const CORE_COMPETENCIES =
  "Communication and collaboration; Critical thinking and problem solving; Imagination and creativity; Citizenship; Digital literacy; Learning to learn; Self-efficacy";

/** The KICD lesson plan rules both lesson plan prompts share. */
function lessonPlanRules(durationMinutes: number) {
  return `FOLLOW THE KICD LESSON PLAN FORMAT:
1. Specific learning outcomes: 2-3, measurable, each starting with an action verb (identify, describe, construct…). Cover knowledge, skills and attitudes. Use the curriculum design's wording where it fits.
2. Organisation of learning: where the lesson takes place and how learners are grouped.
3. Timing adds up to ${durationMinutes} minutes: introduction about ${Math.round(durationMinutes * 0.125)} minutes, lesson development about ${durationMinutes - 2 * Math.round(durationMinutes * 0.125)} minutes in 2-4 steps, conclusion about ${Math.round(durationMinutes * 0.125)} minutes.
4. Lesson development is learner-centred. In each step, learners do the work (discuss, observe, try, present) and the teacher guides. Avoid "Teacher explains". Give each step at most one or two core competencies, values or PCIs in "integration".
5. Core competencies come from this list: ${CORE_COMPETENCIES}. Values come from: love, responsibility, respect, unity, peace, patriotism, social justice, integrity.
6. Name the pertinent and contemporary issues (PCIs) the lesson naturally touches, e.g. environmental conservation, health, safety and security, financial literacy, citizenship, life skills. Add links to other learning areas.
7. Learning resources are things a Kenyan school has or can make: course books, charts, realia, locally available materials. Mention a video or diagram only where it truly helps. Do not invent textbook page numbers.
8. Extended activity: one short task learners do at home or in the community.
9. Differentiation for learners needing support, most learners, and learners ready for more.
10. Rubric on the four CBC levels (exceeding, meeting, approaching, below expectations), describing what a learner does at each level against the outcomes.
11. Do not write the teacher's reflection; the teacher writes it after the lesson.`;
}

const LessonNotesSchema = z.object({
  topic: z.string(),
  learningOutcomes: z
    .array(z.string())
    .describe(
      "The lesson plan's specific learning outcomes, copied as written",
    ),
  conceptOverview: z.object({
    keyDefinitions: z.array(z.string()),
    backgroundContext: z.string(),
    whatLearnersNeedToKnow: z.string(),
  }),
  workedExamples: z.array(
    z.object({
      title: z.string(),
      level: z.enum(["BASIC", "MEDIUM", "ADVANCED"]),
      procedure: z.array(z.string()),
      thinkAloudCommentary: z.string(),
    }),
  ),
  questioningSequences: z.array(
    z.object({
      trigger: z.string(),
      initialQuestion: z.string(),
      expectedAnswer: z.string(),
      followUpIfWrong: z.string(),
      followUpIfCorrect: z.string(),
    }),
  ),
  misconceptions: z.array(
    z.object({
      misconception: z.string(),
      correction: z.string(),
    }),
  ),
  boardSummary: z
    .array(z.string())
    .describe("4-8 short points the teacher can copy onto the chalkboard"),
  references: z
    .array(z.string())
    .describe(
      "Course books or materials to read up from, without invented page numbers",
    ),
});

type SchemeOfWorkContent = z.infer<typeof SchemeOfWorkSchema>;
type LessonPlanContent = z.infer<typeof LessonPlanSchema>;

const CBC_LEVELS = [
  "Exceeding expectations",
  "Meeting expectations",
  "Approaching expectations",
  "Below expectations",
] as const;

const AssessmentSchema = z.object({
  title: z.string(),
  subStrandsCovered: z.array(z.string()),
  sections: z.array(
    z.object({
      sectionTitle: z.string(),
      instructions: z.string(),
      questions: z.array(
        z.object({
          questionNumber: z.number(),
          questionText: z.string(),
          learningOutcome: z
            .string()
            .describe(
              "The specific learning outcome this question tests, as written in the curriculum design",
            ),
          marks: z.number(),
          modelAnswer: z.string(),
          rubric: z
            .string()
            .describe("Scoring rubric details, empty string if none"),
        }),
      ),
    }),
  ),
  markingScheme: z.object({
    totalMarks: z.number(),
    gradingScale: z
      .array(
        z.object({
          level: z.enum(CBC_LEVELS),
          range: z.string().describe("Mark range, e.g. '40-50'"),
          descriptor: z.string(),
        }),
      )
      .describe(
        "Exactly four bands, from Exceeding down to Below expectations",
      ),
  }),
});

// --- Server Actions ---

async function generateSchemeOfWorkImpl(
  parameters: {
    grade: string;
    subject: string;
    term: string;
    weeks: number;
    holidays: number;
    lessonsPerWeek: number;
    durationMinutes: number;
    forceFresh?: boolean;
    /** From the teacher's term dates and timetable, when set: the school year and the exact number of lessons. */
    year?: number;
    totalLessons?: number;
  } | null,
) {
  if (!parameters) throw new TeacherError("Fill in the form and try again.");
  const session = await requireSession();

  // Cache: reuse a verified scheme for the same grade/subject/term. A scheme from
  // another teacher is cloned so it lands in the requester's own library.
  const totalLessons =
    parameters.totalLessons &&
    parameters.totalLessons > 0 &&
    parameters.totalLessons <= 200
      ? Math.round(parameters.totalLessons)
      : null;
  const year =
    parameters.year && parameters.year >= 2024 && parameters.year <= 2100
      ? parameters.year
      : null;

  // Every lesson the term needs. Older schemes were sometimes cut short, so reuse only complete ones.
  const expectedLessons = Math.min(
    200,
    totalLessons ??
      Math.max(1, parameters.weeks - parameters.holidays) *
        parameters.lessonsPerWeek,
  );

  if (!parameters.forceFresh) {
    const candidates = await db.schemeOfWork.findMany({
      where: {
        grade: parameters.grade,
        subject: parameters.subject,
        term: parameters.term,
        NOT: { title: { startsWith: "[Needs Review]" } },
      },
      orderBy: BEST_SCHEME_FIRST,
      take: 10,
    });
    // Only reuse a scheme with the same number of lessons.
    const cachedScheme = candidates.find(
      (c) => schemeLessons(c.content).length === expectedLessons,
    );

    if (cachedScheme && cachedScheme.teacherId === session.userId)
      return cachedScheme;

    if (cachedScheme) {
      const clone = await db.schemeOfWork.create({
        data: {
          title: cachedScheme.title,
          grade: cachedScheme.grade,
          subject: cachedScheme.subject,
          term: cachedScheme.term,
          year,
          content: cachedScheme.content as SchemeOfWorkContent,
          teacherId: session.userId,
          curriculumId: cachedScheme.curriculumId,
        },
      });
      await Promise.all([
        logReuse(session, "SCHEME_OF_WORK"),
        countReuse("SchemeOfWork", cachedScheme.id),
      ]);
      revalidatePath("/dashboard/library");
      return clone;
    }
  }

  // Check the curriculum first so a missing one doesn't use up the teacher's hourly limit.
  const grounding = await termGrounding(
    parameters.grade,
    parameters.subject,
    parameters.term,
    session.tenantId,
  );
  if (!grounding)
    throw new TeacherError(
      missingCurriculum(parameters.grade, parameters.subject),
    );

  await checkGenerationGuards(session, parameters);

  const customRule = await db.generationRule.findUnique({
    where: { contentType: "SCHEME_OF_WORK" },
  });
  const customRuleText = customRule?.customPrompt
    ? `\n\nCUSTOM PLATFORM GUIDELINES (STRICTLY ENFORCE):\n${customRule.customPrompt}\n`
    : "";

  // Weeks with lessons in them: the timetable already leaves out breaks.
  const teachingWeeks = totalLessons
    ? parameters.weeks
    : Math.max(1, parameters.weeks - parameters.holidays);
  let written: Awaited<ReturnType<typeof writeScheme>>;
  try {
    written = await writeScheme({
      grade: parameters.grade,
      subject: parameters.subject,
      term: parameters.term,
      durationMinutes: parameters.durationMinutes,
      teachingWeeks,
      totalLessons: expectedLessons,
      subStrands: grounding.subStrands,
      designText: grounding.source === "design" ? grounding.text : null,
      customRules: customRuleText,
    });
  } catch (e) {
    if (e instanceof Error && e.message === "No sub-strands to plan from")
      throw new TeacherError(
        missingCurriculum(parameters.grade, parameters.subject),
      );
    throw e;
  }
  const object = written.content;
  const usage = {
    inputTokens: written.inputTokens,
    outputTokens: written.outputTokens,
  };

  const scheme = await db.schemeOfWork.create({
    data: {
      title: object.title,
      grade: parameters.grade,
      subject: parameters.subject,
      term: parameters.term,
      year,
      content: object as SchemeOfWorkContent,
      teacherId: session.userId,
      curriculumId: grounding.curriculumId,
    },
  });

  // Log Usage
  await db.generationLog.create({
    data: {
      userId: session.userId,
      tenantId: session.tenantId,
      contentType: "SCHEME_OF_WORK",
      promptTokens: usage.inputTokens ?? 0,
      completionTokens: usage.outputTokens ?? 0,
      totalTokens: (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0),
      model: modelName("write"),
    },
  });

  // Free check that every sub-strand is in the curriculum; flagged for review if not.
  const isAccurate = passesVerification(
    object.weeks.flatMap((w) => w.rows.map((r) => r.subStrand)),
    grounding,
  );
  if (!isAccurate) {
    console.warn(
      "HALLUCINATION DETECTED: Scheme of Work failed verification pass. Tagging for review.",
    );
    // In a production system, we might re-generate, but here we'll just flag the DB record
    await db.schemeOfWork.update({
      where: { id: scheme.id },
      data: { title: `[Needs Review] ${scheme.title}` },
    });
  }

  revalidatePath("/dashboard/library");
  return scheme;
}

/**
 * Marks an auto-flagged scheme as reviewed & published by removing the
 * "[Needs Review]" prefix the hallucination guardrail added to its title.
 */
export async function reviewScheme(schemeId: string) {
  const session = await auth();
  if (!session?.userId) throw new Error("Unauthorized");

  const scheme = await db.schemeOfWork.findFirst({
    where: { id: schemeId, teacherId: session.userId },
    select: { id: true, title: true },
  });
  if (!scheme) throw new Error("Scheme not found");

  const cleanTitle = scheme.title.replace(/^\[Needs Review\]\s*/i, "").trim();
  await db.schemeOfWork.update({
    where: { id: schemeId },
    data: { title: cleanTitle },
  });

  revalidatePath("/dashboard/schemes");
  revalidatePath(`/dashboard/schemes/${schemeId}`);
  return { success: true };
}

/**
 * Deletes a generated asset (and its cascade — a scheme removes its lesson plans
 * and their notes). Ownership-scoped via teacherId.
 */
export async function deleteAsset(
  type: "SCHEMES" | "LESSONS" | "NOTES" | "ASSESSMENTS",
  id: string,
) {
  const session = await auth();
  if (!session?.userId) throw new Error("Unauthorized");

  const where = { id, teacherId: session.userId };
  if (type === "SCHEMES") await db.schemeOfWork.deleteMany({ where });
  else if (type === "LESSONS") await db.lessonPlan.deleteMany({ where });
  else if (type === "NOTES") await db.lessonNote.deleteMany({ where });
  else if (type === "ASSESSMENTS") await db.assessment.deleteMany({ where });
  else throw new Error("Unknown asset type");

  revalidatePath("/dashboard/schemes");
  revalidatePath("/dashboard/lessons");
  revalidatePath("/dashboard/notes");
  revalidatePath("/dashboard/assessments");
  revalidatePath("/dashboard/library");
  return { success: true };
}

async function generateLessonPlanImpl(
  schemeId: string,
  lessonNumber: number,
  topic: string,
) {
  const session = await requireSession();

  const scheme = await db.schemeOfWork.findFirst({
    where: { id: schemeId, teacherId: session.userId },
  });
  if (!scheme) throw new TeacherError("We couldn't find that scheme of work.");

  const filed = filingOf(await getTeacherTerms(session.userId), scheme);
  const week = schemeLessons(scheme.content).find(
    (l) => l.lessonNumber === lessonNumber,
  )?.weekNumber;

  // A teacher using a copy of this scheme may already have this lesson: copy theirs, no AI needed.
  const ready = await db.lessonPlan.findFirst({
    where: {
      lessonNumber,
      teacherId: { not: session.userId },
      scheme: {
        grade: scheme.grade,
        subject: scheme.subject,
        term: scheme.term,
        content: { equals: scheme.content as Prisma.InputJsonValue },
      },
    },
    orderBy: BEST_FIRST,
    select: { id: true },
  });
  if (ready) {
    const copy = await copyLessonPlan(ready.id, session, {
      lessonNumber,
      schemeId,
      grade: scheme.grade,
      subject: scheme.subject,
      ...filed,
      week,
    });
    if (copy) {
      revalidatePath("/dashboard/library");
      return copy;
    }
  }

  await checkGenerationGuards(session, scheme);

  const schemeMap = await getPublishedMap(scheme.grade, scheme.subject);
  const customRule = await db.generationRule.findUnique({
    where: { contentType: "LESSON_PLAN" },
  });
  const customRuleText = customRule?.customPrompt
    ? `\n\nCUSTOM PLATFORM GUIDELINES (STRICTLY ENFORCE):\n${customRule.customPrompt}\n`
    : "";

  const systemPrompt = `You are an expert KICD-trained teacher. Generate a highly detailed Lesson Plan conforming to strict CBC architecture.${customRuleText}

${lessonPlanRules(40)}
12. Expand the scheme's learning experiences for this lesson into the steps.

${schemeRowsFor(scheme.content, lessonNumber)}
${schemeMap ? `\n${MAP_RULES}\n\nCURRICULUM MAP FOR THIS LESSON:\n${lessonGrounding(schemeMap, topic)}\n` : ""}`;

  const { object, usage } = await generateObject({
    model: aiModel("write"),
    schema: LessonPlanSchema,
    system: systemPrompt,
    prompt: `Generate the full expanded Lesson Plan for Lesson ${lessonNumber}: "${topic}".`,
  });

  const lessonPlan = await db.lessonPlan.create({
    data: {
      lessonNumber,
      topic: object.topic,
      objectives: object.specificLearningOutcomes,
      content: object as LessonPlanContent,
      schemeId,
      grade: scheme.grade,
      subject: scheme.subject,
      ...filed,
      week,
      teacherId: session.userId,
    },
  });

  // Log Usage
  await db.generationLog.create({
    data: {
      userId: session.userId,
      tenantId: session.tenantId,
      contentType: "LESSON_PLAN",
      promptTokens: usage.inputTokens ?? 0,
      completionTokens: usage.outputTokens ?? 0,
      totalTokens: (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0),
      model: modelName("write"),
    },
  });

  revalidatePath("/dashboard/library");
  return lessonPlan;
}

/**
 * Quick path: a single lesson plan straight from grade, learning area and topic,
 * without a scheme of work. Grounded on the curriculum design when one is indexed.
 */
async function generateQuickLessonPlanImpl(parameters: {
  grade: string;
  subject: string;
  topic: string;
  durationMinutes: number;
}) {
  const session = await requireSession();

  const topic = parameters.topic.trim().slice(0, 200);
  if (!parameters.grade || !parameters.subject || !topic)
    throw new TeacherError("Choose a grade, learning area and topic.");
  const durationMinutes = [30, 35, 40, 60, 70, 80].includes(
    parameters.durationMinutes,
  )
    ? parameters.durationMinutes
    : 40;

  // Another teacher already has exactly this lesson: copy theirs, no AI needed.
  const ready = await db.lessonPlan.findFirst({
    where: {
      teacherId: { not: session.userId },
      durationMinutes,
      topic: { equals: topic, mode: "insensitive" },
      OR: [
        { grade: parameters.grade, subject: parameters.subject },
        { scheme: { grade: parameters.grade, subject: parameters.subject } },
      ],
    },
    orderBy: BEST_FIRST,
    select: { id: true },
  });
  if (ready) {
    const copy = await copyLessonPlan(ready.id, session, {
      grade: parameters.grade,
      subject: parameters.subject,
      durationMinutes,
      ...(await filingFor(session.userId)),
    });
    if (copy) {
      revalidatePath("/dashboard/library");
      return { id: copy.id, reused: true };
    }
  }

  await checkGenerationGuards(session, parameters);

  const quickMap = await getPublishedMap(parameters.grade, parameters.subject);
  const contextText = quickMap
    ? ""
    : (
        await retrieveContext(
          `${parameters.grade} ${parameters.subject} ${topic}`,
          8,
          {
            grade: parameters.grade,
            subject: parameters.subject,
            tenantId: session.tenantId ?? undefined,
          },
        )
      )
        .map((c) => c.chunkText)
        .join("\n\n");

  const customRule = await db.generationRule.findUnique({
    where: { contentType: "LESSON_PLAN" },
  });
  const customRuleText = customRule?.customPrompt
    ? `\n\nCUSTOM PLATFORM GUIDELINES (STRICTLY ENFORCE):\n${customRule.customPrompt}\n`
    : "";

  const groundingText = quickMap
    ? `${MAP_RULES}\n\nCURRICULUM MAP:\n${lessonGrounding(quickMap, topic)}`
    : contextText
      ? `CURRICULUM DESIGN EXTRACTS (use the strand, sub-strand and learning outcomes exactly as written here):\n${contextText}`
      : "No curriculum design extract is available for this grade and learning area. Use your knowledge of the KICD CBC curriculum design and keep strand and sub-strand names conservative.";

  const systemPrompt = `You are an expert KICD-trained teacher. Generate a highly detailed Lesson Plan conforming to strict CBC architecture.${customRuleText}

INPUT DATA:
- Grade: ${parameters.grade}
- Learning area: ${parameters.subject}
- Topic / sub-strand: ${topic}
- Lesson duration: ${durationMinutes} minutes

${lessonPlanRules(durationMinutes)}

${groundingText}
`;

  const { object, usage } = await generateObject({
    model: aiModel("write"),
    schema: LessonPlanSchema,
    system: systemPrompt,
    prompt: `Generate the full Lesson Plan for "${topic}".`,
  });

  const lessonPlan = await db.lessonPlan.create({
    data: {
      topic: object.topic,
      objectives: object.specificLearningOutcomes,
      content: object as LessonPlanContent,
      grade: parameters.grade,
      subject: parameters.subject,
      durationMinutes,
      ...(await filingFor(session.userId)),
      teacherId: session.userId,
    },
  });

  await db.generationLog.create({
    data: {
      userId: session.userId,
      tenantId: session.tenantId,
      contentType: "LESSON_PLAN",
      promptTokens: usage.inputTokens ?? 0,
      completionTokens: usage.outputTokens ?? 0,
      totalTokens: (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0),
      model: modelName("write"),
    },
  });

  revalidatePath("/dashboard/library");
  revalidatePath("/dashboard");
  return { id: lessonPlan.id };
}

async function generateLessonNotesImpl(lessonPlanId: string) {
  const session = await requireSession();

  const lessonPlan = await db.lessonPlan.findFirst({
    where: { id: lessonPlanId, teacherId: session.userId },
    include: { scheme: { select: { grade: true, subject: true } } },
  });
  if (!lessonPlan) throw new TeacherError("We couldn't find that lesson plan.");

  // Another teacher's notes for the same lesson (same topic and outcomes) fit as they are.
  const grade = lessonPlan.grade ?? lessonPlan.scheme?.grade;
  const subject = lessonPlan.subject ?? lessonPlan.scheme?.subject;
  const readyNotes =
    grade && subject && lessonPlan.objectives.length > 0
      ? await db.lessonNote.findFirst({
          where: {
            teacherId: { not: session.userId },
            lessonPlan: {
              topic: { equals: lessonPlan.topic, mode: "insensitive" },
              objectives: { equals: lessonPlan.objectives },
              OR: [{ grade, subject }, { scheme: { grade, subject } }],
            },
          },
          orderBy: [
            { checkedAt: { sort: "desc", nulls: "last" } },
            { updatedAt: "desc" },
          ],
          select: { notes: true, resources: true },
        })
      : null;
  if (readyNotes) {
    const copy = await db.lessonNote.create({
      data: {
        lessonPlanId,
        notes: readyNotes.notes,
        resources: readyNotes.resources ?? undefined,
        teacherId: session.userId,
      },
    });
    await logReuse(session, "LESSON_NOTES");
    revalidatePath("/dashboard/notes");
    return copy;
  }

  await checkGenerationGuards(session, {
    grade: lessonPlan.grade ?? lessonPlan.scheme?.grade ?? "",
    subject: lessonPlan.subject ?? lessonPlan.scheme?.subject ?? "",
  });

  const customRule = await db.generationRule.findUnique({
    where: { contentType: "LESSON_NOTES" },
  });
  const customRuleText = customRule?.customPrompt
    ? `\n\nCUSTOM PLATFORM GUIDELINES (STRICTLY ENFORCE):\n${customRule.customPrompt}\n`
    : "";

  const systemPrompt = `You are an experienced Kenyan educator crafting granular Lesson Notes for classroom delivery.
The Lesson Notes are the TEACHER'S DETAILED GUIDE for delivering the lesson plan.${customRuleText}

MANDATORY REQUIREMENTS:
1. Expand EVERY single activity from the lesson plan into rich step-by-step procedures.
2. Embed 3 Worked Examples (Basic, Medium, Advanced) containing specific think-aloud commentary.
3. Write deep Questioning Sequences showing the initial question, expected answer, and handling.
4. Curate an exhaustive list of Common Misconceptions.
5. Copy the lesson plan's specific learning outcomes, and make every part of the notes serve them.
6. Write a short board summary in plain English that learners can copy into their books.
7. List references: the kind of approved course book or material to read, without inventing page numbers.

SOURCE LESSON PLAN DATA:
${JSON.stringify(lessonPlan.content)}
`;

  const { object, usage } = await generateObject({
    model: aiModel("write"),
    schema: LessonNotesSchema,
    system: systemPrompt,
    prompt: `Produce the Teacher Lesson Notes mapped exactly to the required format.`,
  });

  const notes = await db.lessonNote.create({
    data: {
      lessonPlanId,
      notes: object.conceptOverview.whatLearnersNeedToKnow,
      resources: object,
      teacherId: session.userId,
    },
  });

  // Log Usage
  await db.generationLog.create({
    data: {
      userId: session.userId,
      tenantId: session.tenantId,
      contentType: "LESSON_NOTES",
      promptTokens: usage.inputTokens ?? 0,
      completionTokens: usage.outputTokens ?? 0,
      totalTokens: (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0),
      model: modelName("write"),
    },
  });

  revalidatePath("/dashboard/notes");
  return notes;
}

async function generateAssessmentImpl(parameters: {
  grade: string;
  subject: string;
  term: string;
  type: string;
  totalMarks: number;
  durationMinutes: number;
}) {
  const session = await requireSession();

  const grounding = await termGrounding(
    parameters.grade,
    parameters.subject,
    parameters.term,
    session.tenantId,
  );
  if (!grounding)
    throw new TeacherError(
      missingCurriculum(parameters.grade, parameters.subject),
    );

  await checkGenerationGuards(session, parameters);

  const customRule = await db.generationRule.findUnique({
    where: { contentType: "ASSESSMENT" },
  });
  const customRuleText = customRule?.customPrompt
    ? `\n\nCUSTOM PLATFORM GUIDELINES (STRICTLY ENFORCE):\n${customRule.customPrompt}\n`
    : "";

  const systemPrompt = `You are an expert assessment designer following KICD CBC guidelines.
Generate a formal Assessment Paper and marking scheme.${customRuleText}

INPUT DATA:
- Grade: ${parameters.grade}
- Learning area: ${parameters.subject}
- Term: ${parameters.term}
- Assessment type: ${parameters.type}
- Total marks: ${parameters.totalMarks}
- Time allowed: ${parameters.durationMinutes} minutes

MANDATORY REQUIREMENTS:
1. Cover the term's learning outcomes from the curriculum below. Tag every question with the specific learning outcome it tests, as written in the design, and list the sub-strands covered.
2. Mix recall, understanding and application questions suited to the grade. Where the learning area calls for it, include a practical or real-life task with a rubric.
3. Write section instructions to learners in simple English.
4. Marks add up to exactly ${parameters.totalMarks}. Give a model answer for every question.
5. Grading scale: exactly four bands from highest to lowest (${CBC_LEVELS.join(", ")}), each with a mark range out of ${parameters.totalMarks} and a short description of what a learner at that level can do.

${groundingBlock(grounding)}
`;

  const { object, usage } = await generateObject({
    model: aiModel("write"),
    schema: AssessmentSchema,
    system: systemPrompt,
    prompt: `Generate the complete assessment paper with marking scheme now.`,
  });

  // File it under the term, beside that term's scheme when the teacher has one.
  const filed = await filingFor(session.userId, parameters.term);
  const scheme = await db.schemeOfWork.findFirst({
    where: {
      teacherId: session.userId,
      grade: parameters.grade,
      subject: parameters.subject,
      term: parameters.term,
      OR: [{ year: filed.year }, { year: null }],
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });

  const assessment = await db.assessment.create({
    data: {
      title: object.title,
      grade: parameters.grade,
      subject: parameters.subject,
      type: parameters.type,
      content: object,
      ...filed,
      schemeId: scheme?.id,
      teacherId: session.userId,
    },
  });

  // Log Usage
  await db.generationLog.create({
    data: {
      userId: session.userId,
      tenantId: session.tenantId,
      contentType: "ASSESSMENT",
      promptTokens: usage.inputTokens ?? 0,
      completionTokens: usage.outputTokens ?? 0,
      totalTokens: (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0),
      model: modelName("write"),
    },
  });

  // Free check that every sub-strand is in the curriculum; flagged for review if not.
  const isAccurate = passesVerification(object.subStrandsCovered, grounding);
  if (!isAccurate) {
    console.warn(
      "HALLUCINATION DETECTED: Assessment failed verification pass.",
    );
    await db.assessment.update({
      where: { id: assessment.id },
      data: { title: `[Needs Review] ${assessment.title}` },
    });
  }

  revalidatePath("/dashboard/assessments");
  return assessment;
}

export async function getAssessments() {
  const session = await auth();
  if (!session?.userId) throw new Error("Unauthorized");

  return db.assessment.findMany({
    where: { teacherId: session.userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteAssessment(id: string) {
  const session = await auth();
  if (!session?.userId) throw new Error("Unauthorized");

  await db.assessment.delete({
    where: { id, teacherId: session.userId },
  });

  revalidatePath("/dashboard/assessments");
}

export async function updateLessonPlan(id: string, content: unknown) {
  const session = await auth();
  if (!session?.userId) throw new Error("Unauthorized");

  if (!content || typeof content !== "object" || Array.isArray(content))
    throw new Error("Invalid lesson plan");

  const planContent = content as Partial<LessonPlanContent>;
  const topic =
    typeof planContent.topic === "string" && planContent.topic.trim()
      ? planContent.topic.trim().slice(0, 300)
      : undefined;
  const objectives = Array.isArray(planContent.specificLearningOutcomes)
    ? planContent.specificLearningOutcomes.filter(
        (o: unknown): o is string => typeof o === "string",
      )
    : undefined;

  await db.lessonPlan.update({
    where: { id, teacherId: session.userId },
    data: { content: planContent as LessonPlanContent, topic, objectives },
  });

  revalidatePath(`/dashboard/lessons/${id}`);
  revalidatePath("/dashboard/library");
  return { id };
}

/** Saves only the teacher's reflection, which also fills the record of work. */
export async function saveLessonReflection(
  id: string,
  reflection: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await auth();
  if (!session?.userId)
    return { success: false, error: "Please sign in again." };

  const lesson = await db.lessonPlan.findFirst({
    where: { id, teacherId: session.userId },
    select: { content: true, schemeId: true },
  });
  if (!lesson)
    return { success: false, error: "That lesson plan couldn't be found." };

  const content = (
    lesson.content && typeof lesson.content === "object" ? lesson.content : {}
  ) as Partial<LessonPlanContent>;
  await db.lessonPlan.update({
    where: { id, teacherId: session.userId },
    data: {
      content: {
        ...content,
        reflection: reflection.trim().slice(0, 2000),
      } as LessonPlanContent,
    },
  });

  revalidatePath(`/dashboard/lessons/${id}`);
  if (lesson.schemeId)
    revalidatePath(`/dashboard/schemes/${lesson.schemeId}/record`);
  return { success: true };
}

export async function getSchemeLessonsStatus(schemeId: string) {
  const session = await auth();
  if (!session?.userId) throw new Error("Unauthorized");

  const scheme = await db.schemeOfWork.findFirst({
    where: { id: schemeId, teacherId: session.userId },
    include: { lessonPlans: { select: { lessonNumber: true, topic: true } } },
  });

  if (!scheme) throw new Error("Scheme not found");

  const content = scheme.content as SchemeOfWorkContent;
  const allLessons: { lessonNumber: number; topic: string; exists: boolean }[] =
    [];

  let lessonCounter = 1;
  content.weeks.forEach((week) => {
    week.rows.forEach((row) => {
      // Assuming each row corresponds to one or more lessons
      // For simplicity, let's say each row is one topic/lesson
      const exists = scheme.lessonPlans.some(
        (lp) => lp.lessonNumber === lessonCounter,
      );
      allLessons.push({
        lessonNumber: lessonCounter,
        topic: row.subStrand,
        exists,
      });
      lessonCounter++;
    });
  });

  return allLessons;
}

/**
 * Lists the lesson plans already generated for a scheme, with whether each
 * already has Lesson Notes. Drives the Notes generation picker in the workstation.
 */
export async function getSchemeLessonPlans(schemeId: string) {
  const session = await auth();
  if (!session?.userId) throw new Error("Unauthorized");

  const plans = await db.lessonPlan.findMany({
    where: { schemeId, teacherId: session.userId },
    orderBy: { lessonNumber: "asc" },
    select: {
      id: true,
      lessonNumber: true,
      topic: true,
      lessonNotes: { select: { id: true }, take: 1 },
    },
  });

  return plans.map((p) => ({
    id: p.id,
    lessonNumber: p.lessonNumber,
    topic: p.topic,
    hasNotes: p.lessonNotes.length > 0,
  }));
}

// ─── Improve: the teacher asks Elimu to change their own document ─────────────

export type ImproveKind = "SCHEME" | "LESSON" | "NOTES";

const IMPROVE_CONTENT_TYPE = {
  SCHEME: "SCHEME_OF_WORK",
  LESSON: "LESSON_PLAN",
  NOTES: "LESSON_NOTES",
} as const;

/** Versions kept per document for undo. */
const KEEP_VERSIONS = 5;

async function rulesFor(contentType: string) {
  const rule = await db.generationRule.findUnique({ where: { contentType } });
  return rule?.customPrompt
    ? `\n\nCUSTOM PLATFORM GUIDELINES (STRICTLY ENFORCE):\n${rule.customPrompt}\n`
    : "";
}

function improveIntro(what: string) {
  return `You are improving a Kenyan teacher's CBC ${what}. Make the change the teacher asks for below and keep everything else as it is, unless the change needs it. Keep the strand, sub-strand and specific learning outcomes exactly as the curriculum gives them. If part of the request is unsafe, off-topic or goes against the curriculum, leave that part out.`;
}

async function saveVersion(
  teacherId: string,
  kind: ImproveKind,
  documentId: string,
  content: unknown,
) {
  await db.documentVersion.create({
    data: {
      teacherId,
      kind,
      documentId,
      content: (content ?? {}) as Prisma.InputJsonValue,
    },
  });
  const old = await db.documentVersion.findMany({
    where: { kind, documentId },
    orderBy: { createdAt: "desc" },
    skip: KEEP_VERSIONS,
    select: { id: true },
  });
  if (old.length)
    await db.documentVersion.deleteMany({
      where: { id: { in: old.map((o) => o.id) } },
    });
}

async function improveImpl(input: {
  kind: ImproveKind;
  id: string;
  instruction: string;
}) {
  const session = await requireSession();
  const instruction = (input.instruction ?? "").trim().slice(0, 500);
  if (instruction.length < 3)
    throw new TeacherError(
      'Tell Elimu what to change, for example "Add a group activity".',
    );
  const contentType = IMPROVE_CONTENT_TYPE[input.kind];
  if (!contentType) throw new TeacherError("We couldn't find that document.");
  const where = { id: input.id, teacherId: session.userId };
  let usage: { inputTokens?: number; outputTokens?: number } = {};

  if (input.kind === "LESSON") {
    const plan = await db.lessonPlan.findFirst({
      where,
      include: { scheme: { select: { grade: true, subject: true } } },
    });
    if (!plan) throw new TeacherError("We couldn't find that lesson plan.");
    const grade = plan.grade ?? plan.scheme?.grade ?? "";
    const subject = plan.subject ?? plan.scheme?.subject ?? "";
    await checkGenerationGuards(session, { grade, subject });

    const map = grade && subject ? await getPublishedMap(grade, subject) : null;
    const subStrand =
      (plan.content as { subStrand?: string } | null)?.subStrand || plan.topic;
    const result = await generateObject({
      model: aiModel("write"),
      schema: LessonPlanSchema,
      system: `${improveIntro("lesson plan")}${await rulesFor(contentType)}

${lessonPlanRules(plan.durationMinutes)}

THE TEACHER'S CURRENT LESSON PLAN:
${JSON.stringify(plan.content)}
${map ? `\n${MAP_RULES}\n\nCURRICULUM MAP FOR THIS LESSON:\n${lessonGrounding(map, subStrand)}\n` : ""}`,
      prompt: `The teacher asked: ${instruction}\n\nWrite the whole lesson plan with this change.`,
    });
    usage = result.usage;
    await saveVersion(session.userId, "LESSON", plan.id, plan.content);
    await db.lessonPlan.update({
      where: { id: plan.id },
      data: {
        content: result.object as LessonPlanContent,
        objectives: result.object.specificLearningOutcomes,
        checkedAt: null,
      },
    });
    revalidatePath(`/dashboard/lessons/${plan.id}`);
  } else if (input.kind === "NOTES") {
    const note = await db.lessonNote.findFirst({
      where,
      include: {
        lessonPlan: {
          select: {
            content: true,
            grade: true,
            subject: true,
            scheme: { select: { grade: true, subject: true } },
          },
        },
      },
    });
    if (!note) throw new TeacherError("We couldn't find those lesson notes.");
    await checkGenerationGuards(session, {
      grade: note.lessonPlan.grade ?? note.lessonPlan.scheme?.grade ?? "",
      subject: note.lessonPlan.subject ?? note.lessonPlan.scheme?.subject ?? "",
    });

    const result = await generateObject({
      model: aiModel("write"),
      schema: LessonNotesSchema,
      system: `${improveIntro("lesson notes")}${await rulesFor(contentType)}

THE LESSON PLAN THESE NOTES ARE FOR:
${JSON.stringify(note.lessonPlan.content)}

THE TEACHER'S CURRENT NOTES:
${JSON.stringify(note.resources)}`,
      prompt: `The teacher asked: ${instruction}\n\nWrite the whole lesson notes with this change.`,
    });
    usage = result.usage;
    await saveVersion(session.userId, "NOTES", note.id, {
      notes: note.notes,
      resources: note.resources,
    });
    await db.lessonNote.update({
      where: { id: note.id },
      data: {
        notes: result.object.conceptOverview.whatLearnersNeedToKnow,
        resources: result.object,
        checkedAt: null,
      },
    });
    revalidatePath(`/dashboard/notes/${note.id}`);
  } else {
    const scheme = await db.schemeOfWork.findFirst({ where });
    if (!scheme)
      throw new TeacherError("We couldn't find that scheme of work.");
    const grounding = await termGrounding(
      scheme.grade,
      scheme.subject,
      scheme.term,
      session.tenantId,
    );
    if (!grounding)
      throw new TeacherError(missingCurriculum(scheme.grade, scheme.subject));
    await checkGenerationGuards(session, scheme);

    const current = scheme.content as WrittenScheme;
    const written = await writeScheme(
      {
        grade: scheme.grade,
        subject: scheme.subject,
        term: scheme.term,
        durationMinutes: lessonMinutesFor(scheme.grade),
        teachingWeeks: Math.max(1, current.weeks?.length ?? 1),
        totalLessons: Math.max(1, schemeLessons(current).length),
        subStrands: grounding.subStrands,
        designText: grounding.source === "design" ? grounding.text : null,
        customRules: await rulesFor(contentType),
        instruction,
      },
      current,
    );
    usage = written;
    await saveVersion(session.userId, "SCHEME", scheme.id, scheme.content);
    await db.schemeOfWork.update({
      where: { id: scheme.id },
      data: {
        content: written.content as Prisma.InputJsonValue,
        checkedAt: null,
      },
    });
    revalidatePath(`/dashboard/schemes/${scheme.id}`);
  }

  await db.generationLog.create({
    data: {
      userId: session.userId,
      tenantId: session.tenantId,
      contentType,
      promptTokens: usage.inputTokens ?? 0,
      completionTokens: usage.outputTokens ?? 0,
      totalTokens: (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0),
      model: modelName("write"),
      instruction,
    },
  });
  return { id: input.id };
}

/** Puts back the version from before Elimu's last change. */
async function undoImproveImpl(input: { kind: ImproveKind; id: string }) {
  const session = await requireSession();
  const version = await db.documentVersion.findFirst({
    where: {
      kind: input.kind,
      documentId: input.id,
      teacherId: session.userId,
    },
    orderBy: { createdAt: "desc" },
  });
  if (!version)
    throw new TeacherError("There's no earlier version to go back to.");
  const where = { id: input.id, teacherId: session.userId };
  const content = version.content as Prisma.JsonObject;

  if (input.kind === "LESSON") {
    const outcomes = content?.specificLearningOutcomes;
    await db.lessonPlan.updateMany({
      where,
      data: {
        content: content as Prisma.InputJsonValue,
        objectives: Array.isArray(outcomes) ? outcomes.map(String) : [],
      },
    });
    revalidatePath(`/dashboard/lessons/${input.id}`);
  } else if (input.kind === "NOTES") {
    await db.lessonNote.updateMany({
      where,
      data: {
        notes: typeof content?.notes === "string" ? content.notes : "",
        resources:
          content?.resources == null
            ? Prisma.JsonNull
            : (content.resources as Prisma.InputJsonValue),
      },
    });
    revalidatePath(`/dashboard/notes/${input.id}`);
  } else {
    await db.schemeOfWork.updateMany({
      where,
      data: { content: content as Prisma.InputJsonValue },
    });
    revalidatePath(`/dashboard/schemes/${input.id}`);
  }
  await db.documentVersion.delete({ where: { id: version.id } });
  return { id: input.id };
}

// ─── Generators (each returns a GenerationResult) ─────────────────────────────

export async function generateSchemeOfWork(
  parameters: Parameters<typeof generateSchemeOfWorkImpl>[0],
) {
  return asResult("scheme of work", () => generateSchemeOfWorkImpl(parameters));
}

export async function generateLessonPlan(
  schemeId: string,
  lessonNumber: number,
  topic: string,
) {
  return asResult("lesson plan", () =>
    generateLessonPlanImpl(schemeId, lessonNumber, topic),
  );
}

export async function generateQuickLessonPlan(
  parameters: Parameters<typeof generateQuickLessonPlanImpl>[0],
) {
  return asResult("quick lesson plan", () =>
    generateQuickLessonPlanImpl(parameters),
  );
}

export async function generateLessonNotes(lessonPlanId: string) {
  return asResult("lesson notes", () => generateLessonNotesImpl(lessonPlanId));
}

export async function generateAssessment(
  parameters: Parameters<typeof generateAssessmentImpl>[0],
) {
  return asResult("assessment", () => generateAssessmentImpl(parameters));
}

/** Changes the teacher's own scheme, lesson plan or notes the way they ask. */
export async function improveDocument(
  input: Parameters<typeof improveImpl>[0],
) {
  return asResult("change", () => improveImpl(input));
}

export async function undoImprove(
  input: Parameters<typeof undoImproveImpl>[0],
) {
  return asResult("undo", () => undoImproveImpl(input));
}
