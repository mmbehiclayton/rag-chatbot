"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { retrieveContext } from "@/lib/rag";
import { getPublishedMap, lessonGrounding, mapToPrompt, subStrandsForTerm, allSubStrands } from "@/lib/curriculum-map";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

// ─── Shared Guards ────────────────────────────────────────────────────────────

async function checkGenerationGuards(session: { userId: string; tenantId?: string | null }) {
  // 1. Rate limit: 20 generations per user per hour
  const headerStore = await headers();
  const ip = headerStore.get("x-forwarded-for") || "127.0.0.1";
  const rateLimitKey = `gen_${session.userId}_${ip}`;
  const windowMs = 60 * 60 * 1000; // 1 hour

  await db.rateLimit.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(() => {});

  const limit = await db.rateLimit.upsert({
    where: { key: rateLimitKey },
    create: { key: rateLimitKey, expiresAt: new Date(Date.now() + windowMs), points: 1 },
    update: { points: { increment: 1 } },
  });

  if (limit.points > 20 && limit.expiresAt > new Date()) {
    throw new Error("Rate limit exceeded: maximum 20 generations per hour. Please wait before generating again.");
  }

  // 2. Token quota: check tenant monthly usage
  if (session.tenantId) {
    const tenant = await db.tenant.findUnique({ where: { id: session.tenantId } });
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
        throw new Error(
          `Monthly token quota exceeded (${usedTokens.toLocaleString()} / ${tenant.tokenQuota.toLocaleString()} tokens used). Contact your administrator to increase the quota.`
        );
      }
    }
  }
}

// ─── Curriculum grounding ─────────────────────────────────────────────────────

type Grounding = { source: "map" | "design"; text: string; curriculumId: string | null };

const MAP_RULES = `The CURRICULUM MAP below was entered and checked by practising teachers. Use only its strands, sub-strands and specific learning outcomes, with names and outcomes exactly as written, in the order given.`;

/**
 * What generation is grounded on, in order of trust: the checked curriculum map for the
 * class, then extracts from an uploaded curriculum design. Null when neither exists.
 */
async function termGrounding(grade: string, subject: string, term: string, tenantId: string | null | undefined): Promise<Grounding | null> {
  const map = await getPublishedMap(grade, subject);
  if (map) {
    const forTerm = subStrandsForTerm(map, term);
    return { source: "map", text: mapToPrompt(forTerm.length ? forTerm : allSubStrands(map)), curriculumId: null };
  }

  const doc = await db.curriculumDocument.findFirst({
    where: { gradeLevel: grade, subject, status: "completed", OR: [{ tenantId: tenantId ?? null }, { tenantId: null }] },
    select: { id: true },
  });
  if (!doc) return null;
  const chunks = await retrieveContext(`Curriculum for ${grade} ${subject} ${term}`, 12, { grade, subject, tenantId: tenantId ?? undefined });
  return { source: "design", text: chunks.map((c) => c.chunkText).join("\n\n"), curriculumId: doc.id };
}

function groundingBlock(g: Grounding) {
  return g.source === "map" ? `${MAP_RULES}\n\nCURRICULUM MAP:\n${g.text}` : `CURRICULUM CONTEXT (extracts from the KICD curriculum design):\n${g.text}`;
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
    crossCurricularIntegration: z.array(z.string())
  }),
  weeks: z.array(z.object({
    weekNumber: z.number(),
    rows: z.array(z.object({
      strand: z.string(),
      subStrand: z.string(),
      specificLearningOutcomes: z.array(z.string()),
      keyInquiryQuestions: z.array(z.string()),
      learningExperiences: z.array(z.string()),
      learningResources: z.array(z.string()),
      assessmentMethods: z.array(z.string()),
      reflection: z.string().describe("Teacher's post-lesson reflection, empty string if none")
    }))
  }))
});

const LessonPlanSchema = z.object({
  topic: z.string(),
  strand: z.string(),
  subStrand: z.string(),
  specificLearningOutcomes: z.array(z.string()),
  keyInquiryQuestions: z.array(z.string()),
  learningResources: z.array(z.string()),
  coreCompetencies: z.array(z.object({
    competency: z.string(),
    howDeveloped: z.string()
  })),
  values: z.array(z.object({
    value: z.string(),
    howDemonstrated: z.string()
  })),
  lessonStructure: z.object({
    introduction: z.object({
      duration: z.number(),
      recap: z.string(),
      connectionToLearnersLives: z.string(),
      learningIntentions: z.string(),
      successCriteria: z.string()
    }),
    mainActivities: z.array(z.object({
      activityName: z.string(),
      duration: z.number(),
      grouping: z.string(),
      teacherActions: z.array(z.string()),
      learnerActions: z.array(z.string()),
      formativeAssessment: z.string()
    })),
    differentiation: z.object({
      learnersNeedingSupport: z.string(),
      averageLearners: z.string(),
      advancedLearners: z.string()
    }),
    conclusion: z.object({
      duration: z.number(),
      summary: z.string(),
      assessmentOfLearning: z.string(),
      exitTicket: z.string(),
      previewNextLesson: z.string(),
      homework: z.string()
    })
  }),
  assessmentRubric: z.object({
    criteria: z.string(),
    exceeding: z.string(),
    meeting: z.string(),
    approaching: z.string(),
    below: z.string()
  }),
  multimediaSuggestions: z.array(z.object({
    type: z.enum(["IMAGE", "VIDEO", "DIAGRAM", "EXPERIMENT"]),
    description: z.string(),
    purpose: z.string(),
    suggestedSource: z.string().describe("Empty array if no specific source")
  })).describe("List 3-5 multimedia suggestions, or an empty array if none")
});

const LessonNotesSchema = z.object({
  topic: z.string(),
  conceptOverview: z.object({
    keyDefinitions: z.array(z.string()),
    backgroundContext: z.string(),
    whatLearnersNeedToKnow: z.string()
  }),
  workedExamples: z.array(z.object({
    title: z.string(),
    level: z.enum(["BASIC", "MEDIUM", "ADVANCED"]),
    procedure: z.array(z.string()),
    thinkAloudCommentary: z.string()
  })),
  questioningSequences: z.array(z.object({
    trigger: z.string(),
    initialQuestion: z.string(),
    expectedAnswer: z.string(),
    followUpIfWrong: z.string(),
    followUpIfCorrect: z.string()
  })),
  misconceptions: z.array(z.object({
    misconception: z.string(),
    correction: z.string()
  }))
});

const AssessmentSchema = z.object({
  title: z.string(),
  sections: z.array(z.object({
    sectionTitle: z.string(),
    instructions: z.string(),
    questions: z.array(z.object({
      questionNumber: z.number(),
      questionText: z.string(),
      marks: z.number(),
      modelAnswer: z.string(),
      rubric: z.string().describe("Scoring rubric details, empty string if none")
    }))
  })),
  markingScheme: z.object({
    totalMarks: z.number(),
    gradingScale: z.array(z.object({
      range: z.string(),
      descriptor: z.string()
    }))
  })
});

// --- Server Actions ---

export async function generateSchemeOfWork(parameters: { grade: string, subject: string, term: string, weeks: number, holidays: number, lessonsPerWeek: number, durationMinutes: number, forceFresh?: boolean } | null) {
  if (!parameters) throw new Error("Invalid parameters: data cannot be null");
  const session = await auth();
  if (!session?.userId) throw new Error("Unauthorized");

  // Cache: reuse a verified scheme for the same grade/subject/term. A scheme from
  // another teacher is cloned so it lands in the requester's own library.
  if (!parameters.forceFresh) {
    const cachedScheme = await db.schemeOfWork.findFirst({
      where: {
        grade: parameters.grade,
        subject: parameters.subject,
        term: parameters.term,
        NOT: { title: { startsWith: "[Needs Review]" } },
      },
      orderBy: { createdAt: "desc" },
    });

    if (cachedScheme && cachedScheme.teacherId === session.userId) return cachedScheme;

    if (cachedScheme) {
      const clone = await db.schemeOfWork.create({
        data: {
          title: cachedScheme.title,
          grade: cachedScheme.grade,
          subject: cachedScheme.subject,
          term: cachedScheme.term,
          content: cachedScheme.content as any,
          teacherId: session.userId,
          curriculumId: cachedScheme.curriculumId,
        },
      });
      await db.generationLog.create({
        data: {
          userId: session.userId,
          tenantId: session.tenantId,
          contentType: "SCHEME_OF_WORK",
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          model: "cache",
        },
      });
      revalidatePath("/dashboard/library");
      return clone;
    }
  }

  // Check the curriculum first so a missing one doesn't use up the teacher's hourly limit.
  const grounding = await termGrounding(parameters.grade, parameters.subject, parameters.term, session.tenantId);
  if (!grounding) throw new Error(missingCurriculum(parameters.grade, parameters.subject));
  const contextText = grounding.text;

  await checkGenerationGuards(session);

  const customRule = await db.generationRule.findUnique({ where: { contentType: "SCHEME_OF_WORK" } });
  const customRuleText = customRule?.customPrompt ? `\n\nCUSTOM PLATFORM GUIDELINES (STRICTLY ENFORCE):\n${customRule.customPrompt}\n` : "";

  const systemPrompt = `You are an expert KICD curriculum specialist. Generate a Scheme of Work strictly following the Competency-Based Curriculum (CBC) architecture rules.${customRuleText}

INPUT DATA:
- Grade Level: ${parameters.grade}
- Subject: ${parameters.subject}
- Term: ${parameters.term}
- Duration: ${parameters.durationMinutes} minutes

MANDATORY REQUIREMENTS:
1. Cover the strands and sub-strands from the curriculum provided below${grounding.source === "map" ? ", sharing the lessons out in proportion to each sub-strand's suggested lessons" : ""}.
2. Use the EXACT specific learning outcomes (DO NOT paraphrase).
3. Calculate total lessons: (${parameters.weeks} - ${parameters.holidays}) × ${parameters.lessonsPerWeek} = TOTAL LESSONS.
4. Structure into Weeks and Rows (Max 3 sub-strands per week).
5. Tag all 7 core competencies in activities.
6. Include min 2 Community Service Learning and 2 Parental Engagement strategies.

${groundingBlock(grounding)}
`;

  const { object, usage } = await generateObject({
    model: openai("gpt-4o"),
    schema: SchemeOfWorkSchema,
    system: systemPrompt,
    prompt: `Generate the complete Scheme of Work now mapped exactly to the detailed Zod schema format.`,
  });

  const scheme = await db.schemeOfWork.create({
    data: {
      title: object.title,
      grade: parameters.grade,
      subject: parameters.subject,
      term: parameters.term,
      content: object as any,
      teacherId: session.userId,
      curriculumId: grounding.curriculumId
    }
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
      model: "gpt-4o"
    }
  });

  // [NEW] Hallucination Guardrail: Deep Verification Pass
  const isAccurate = await verifyPedagogicalAccuracy(JSON.stringify(object), contextText);
  if (!isAccurate) {
    console.warn("HALLUCINATION DETECTED: Scheme of Work failed verification pass. Tagging for review.");
    // In a production system, we might re-generate, but here we'll just flag the DB record
    await db.schemeOfWork.update({
      where: { id: scheme.id },
      data: { title: `[Needs Review] ${scheme.title}` }
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
export async function deleteAsset(type: "SCHEMES" | "LESSONS" | "NOTES" | "ASSESSMENTS", id: string) {
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

export async function generateLessonPlan(schemeId: string, lessonNumber: number, topic: string) {
  const session = await auth();
  if (!session?.userId) throw new Error("Unauthorized");

  await checkGenerationGuards(session);

  const scheme = await db.schemeOfWork.findFirst({ where: { id: schemeId, teacherId: session.userId } });
  if (!scheme) throw new Error("Scheme not found");

  const schemeMap = await getPublishedMap(scheme.grade, scheme.subject);
  const customRule = await db.generationRule.findUnique({ where: { contentType: "LESSON_PLAN" } });
  const customRuleText = customRule?.customPrompt ? `\n\nCUSTOM PLATFORM GUIDELINES (STRICTLY ENFORCE):\n${customRule.customPrompt}\n` : "";

  const systemPrompt = `You are an expert KICD-trained teacher. Generate a highly detailed Lesson Plan conforming to strict CBC architecture.${customRuleText}

MANDATORY REQUIREMENTS:
1. Follow the 3-part lesson structure (10-15% Intro, 70-80% Main, 10-15% Conclusion).
2. Expand scheme activities into step-by-step detailed activities with specific dialogue.
3. Include differentiation for 3 levels (Support/Average/Advanced).
4. Create a 4-level CBC assessment rubric with observable behaviors.
5. Provide 3-5 Multimedia Suggestions (YouTube concepts, diagrams to draw, or specific images) to enhance the 40-minute block.

SCHEME CONTENT TO EXTRACT FROM:
${JSON.stringify(scheme.content)}
${schemeMap ? `\n${MAP_RULES}\n\nCURRICULUM MAP FOR THIS LESSON:\n${lessonGrounding(schemeMap, topic)}\n` : ""}`;

  const { object, usage } = await generateObject({
    model: openai("gpt-4o"),
    schema: LessonPlanSchema,
    system: systemPrompt,
    prompt: `Generate the full expanded Lesson Plan for Lesson ${lessonNumber}: "${topic}".`,
  });

  const lessonPlan = await db.lessonPlan.create({
    data: {
      lessonNumber,
      topic: object.topic,
      objectives: object.specificLearningOutcomes,
      content: object as any,
      schemeId,
      grade: scheme.grade,
      subject: scheme.subject,
      teacherId: session.userId
    }
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
      model: "gpt-4o"
    }
  });

  revalidatePath("/dashboard/library");
  return lessonPlan;
}

/**
 * Quick path: a single lesson plan straight from grade, learning area and topic,
 * without a scheme of work. Grounded on the curriculum design when one is indexed.
 */
export async function generateQuickLessonPlan(parameters: { grade: string; subject: string; topic: string; durationMinutes: number }) {
  const session = await auth();
  if (!session?.userId) throw new Error("Unauthorized");

  const topic = parameters.topic.trim().slice(0, 200);
  if (!parameters.grade || !parameters.subject || !topic) throw new Error("Choose a grade, learning area and topic.");
  const durationMinutes = [30, 35, 40, 60, 70, 80].includes(parameters.durationMinutes) ? parameters.durationMinutes : 40;

  await checkGenerationGuards(session);

  const quickMap = await getPublishedMap(parameters.grade, parameters.subject);
  const contextText = quickMap
    ? ""
    : (
        await retrieveContext(`${parameters.grade} ${parameters.subject} ${topic}`, 8, {
          grade: parameters.grade,
          subject: parameters.subject,
          tenantId: session.tenantId ?? undefined,
        })
      )
        .map((c) => c.chunkText)
        .join("\n\n");

  const customRule = await db.generationRule.findUnique({ where: { contentType: "LESSON_PLAN" } });
  const customRuleText = customRule?.customPrompt ? `\n\nCUSTOM PLATFORM GUIDELINES (STRICTLY ENFORCE):\n${customRule.customPrompt}\n` : "";

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

MANDATORY REQUIREMENTS:
1. Follow the 3-part lesson structure (10-15% Intro, 70-80% Main, 10-15% Conclusion); durations must add up to ${durationMinutes} minutes.
2. Write step-by-step activities with specific teacher and learner actions, using locally available Kenyan resources.
3. Include differentiation for 3 levels (Support/Average/Advanced).
4. Create a 4-level CBC assessment rubric with observable behaviours.
5. Provide 3-5 Multimedia Suggestions.

${groundingText}
`;

  const { object, usage } = await generateObject({
    model: openai("gpt-4o"),
    schema: LessonPlanSchema,
    system: systemPrompt,
    prompt: `Generate the full Lesson Plan for "${topic}".`,
  });

  const lessonPlan = await db.lessonPlan.create({
    data: {
      topic: object.topic,
      objectives: object.specificLearningOutcomes,
      content: object as any,
      grade: parameters.grade,
      subject: parameters.subject,
      durationMinutes,
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
      model: "gpt-4o",
    },
  });

  revalidatePath("/dashboard/library");
  revalidatePath("/dashboard");
  return { id: lessonPlan.id };
}

export async function generateLessonNotes(lessonPlanId: string) {
  const session = await auth();
  if (!session?.userId) throw new Error("Unauthorized");

  await checkGenerationGuards(session);

  const lessonPlan = await db.lessonPlan.findFirst({ where: { id: lessonPlanId, teacherId: session.userId } });
  if (!lessonPlan) throw new Error("Lesson Plan not found");

  const customRule = await db.generationRule.findUnique({ where: { contentType: "LESSON_NOTES" } });
  const customRuleText = customRule?.customPrompt ? `\n\nCUSTOM PLATFORM GUIDELINES (STRICTLY ENFORCE):\n${customRule.customPrompt}\n` : "";

  const systemPrompt = `You are an experienced Kenyan educator crafting granular Lesson Notes for classroom delivery.
The Lesson Notes are the TEACHER'S DETAILED GUIDE for delivering the lesson plan.${customRuleText}

MANDATORY REQUIREMENTS:
1. Expand EVERY single activity from the lesson plan into rich step-by-step procedures.
2. Embed 3 Worked Examples (Basic, Medium, Advanced) containing specific think-aloud commentary.
3. Write deep Questioning Sequences showing the initial question, expected answer, and handling.
4. Curate an exhaustive list of Common Misconceptions.

SOURCE LESSON PLAN DATA:
${JSON.stringify(lessonPlan.content)}
`;

  const { object, usage } = await generateObject({
    model: openai("gpt-4o"),
    schema: LessonNotesSchema,
    system: systemPrompt,
    prompt: `Produce the Teacher Lesson Notes mapped exactly to the required format.`,
  });

  const notes = await db.lessonNote.create({
    data: {
      lessonPlanId,
      notes: object.conceptOverview.whatLearnersNeedToKnow,
      resources: object,
      teacherId: session.userId
    }
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
      model: "gpt-4o"
    }
  });

  revalidatePath("/dashboard/notes");
  return notes;
}

export async function generateAssessment(parameters: { grade: string, subject: string, term: string, type: string, totalMarks: number, durationMinutes: number }) {
  const session = await auth();
  if (!session?.userId) throw new Error("Unauthorized");

  const grounding = await termGrounding(parameters.grade, parameters.subject, parameters.term, session.tenantId);
  if (!grounding) throw new Error(missingCurriculum(parameters.grade, parameters.subject));
  const contextText = grounding.text;

  await checkGenerationGuards(session);

  const customRule = await db.generationRule.findUnique({ where: { contentType: "ASSESSMENT" } });
  const customRuleText = customRule?.customPrompt ? `\n\nCUSTOM PLATFORM GUIDELINES (STRICTLY ENFORCE):\n${customRule.customPrompt}\n` : "";

  const systemPrompt = `You are an expert assessment designer following KICD CBC guidelines.
Generate a formal Assessment Paper and marking scheme.${customRuleText}

INPUT DATA:
- Grade Level: ${parameters.grade}
- Subject: ${parameters.subject}
- Assessment Type: ${parameters.type}
- Total Marks: ${parameters.totalMarks}
- Duration: ${parameters.durationMinutes} minutes

MANDATORY REQUIREMENTS:
1. Cover ALL specified learning outcomes.
2. Follow Bloom's taxonomy distribution.
3. Provide a Detailed Marking Scheme.

${groundingBlock(grounding)}
`;

  const { object, usage } = await generateObject({
    model: openai("gpt-4o"),
    schema: AssessmentSchema,
    system: systemPrompt,
    prompt: `Generate the complete assessment paper with marking scheme now.`,
  });

  const assessment = await db.assessment.create({
    data: {
      title: object.title,
      grade: parameters.grade,
      subject: parameters.subject,
      type: parameters.type,
      content: object,
      teacherId: session.userId
    }
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
      model: "gpt-4o"
    }
  });

  // [NEW] Hallucination Guardrail
  const isAccurate = await verifyPedagogicalAccuracy(JSON.stringify(object), contextText);
  if (!isAccurate) {
    console.warn("HALLUCINATION DETECTED: Assessment failed verification pass.");
    await db.assessment.update({
      where: { id: assessment.id },
      data: { title: `[Needs Review] ${assessment.title}` }
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
    orderBy: { createdAt: "desc" }
  });
}

export async function deleteAssessment(id: string) {
  const session = await auth();
  if (!session?.userId) throw new Error("Unauthorized");

  await db.assessment.delete({
    where: { id, teacherId: session.userId }
  });

  revalidatePath("/dashboard/assessments");
}

export async function updateLessonPlan(id: string, content: any) {
  const session = await auth();
  if (!session?.userId) throw new Error("Unauthorized");

  if (!content || typeof content !== "object" || Array.isArray(content)) throw new Error("Invalid lesson plan");
  const topic = typeof content.topic === "string" && content.topic.trim() ? content.topic.trim().slice(0, 300) : undefined;
  const objectives = Array.isArray(content.specificLearningOutcomes) ? content.specificLearningOutcomes.filter((o: unknown) => typeof o === "string") : undefined;

  await db.lessonPlan.update({
    where: { id, teacherId: session.userId },
    data: { content: content as any, topic, objectives }
  });

  revalidatePath(`/dashboard/lessons/${id}`);
  revalidatePath("/dashboard/library");
  return { id };
}

export async function getSchemeLessonsStatus(schemeId: string) {
  const session = await auth();
  if (!session?.userId) throw new Error("Unauthorized");

  const scheme = await db.schemeOfWork.findFirst({
    where: { id: schemeId, teacherId: session.userId },
    include: { lessonPlans: { select: { lessonNumber: true, topic: true } } }
  });

  if (!scheme) throw new Error("Scheme not found");

  const content = scheme.content as any;
  const allLessons: { lessonNumber: number; topic: string; exists: boolean }[] = [];

  let lessonCounter = 1;
  content.weeks.forEach((week: any) => {
    week.rows.forEach((row: any) => {
      // Assuming each row corresponds to one or more lessons
      // For simplicity, let's say each row is one topic/lesson
      const exists = scheme.lessonPlans.some((lp: any) => lp.lessonNumber === lessonCounter);
      allLessons.push({
        lessonNumber: lessonCounter,
        topic: row.subStrand,
        exists
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

/**
 * [PHASE 4] Hallucination Guardrail
 * Cross-references generated content against RAG context to ensure 100% pedagogical accuracy.
 */
async function verifyPedagogicalAccuracy(generatedContent: string, contextChunks: string) {
  const { object } = await generateObject({
    model: openai("gpt-4o"), // Use the most capable model for verification
    schema: z.object({
      isAccurate: z.boolean(),
      conflicts: z.array(z.string()),
      confidenceScore: z.number().min(0).max(100)
    }),
    system: "You are a KICD Auditor. Compare the GENERATED CONTENT against the OFFICIAL CURRICULUM CONTEXT. Identify if any strands, sub-strands, or learning outcomes in the generated content do NOT exist in the official context (Hallucinations).",
    prompt: `
      OFFICIAL CONTEXT:
      ${contextChunks}

      GENERATED CONTENT:
      ${generatedContent}

      Return accuracy status and list any specific hallucinations.
    `
  });

  return object.isAccurate && object.confidenceScore > 85;
}
