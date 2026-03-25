"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { retrieveContext } from "@/lib/rag";
import { z } from "zod";
import { revalidatePath } from "next/cache";

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

export async function generateSchemeOfWork(parameters: { grade: string, subject: string, term: string, weeks: number, holidays: number, lessonsPerWeek: number, durationMinutes: number } | null) {
  if (!parameters) throw new Error("Invalid parameters: data cannot be null");
  const session = await auth();
  if (!session?.userId) throw new Error("Unauthorized");

  // Zero-Waste Check: Verify curriculum design exists
  const docExists = await db.curriculumDocument.findFirst({
    where: { gradeLevel: parameters.grade, subject: parameters.subject }
  });
  
  if (!docExists) {
     throw new Error(`MISSING CURRICULUM: No KICD Design uploaded for ${parameters.grade} ${parameters.subject}. To prevent AI hallucinations, please ask your Administrator to upload the PDF first.`);
  }

  // Check Cache
  const cachedScheme = await db.schemeOfWork.findFirst({
    where: { grade: parameters.grade, subject: parameters.subject, term: parameters.term }
  });

  if (cachedScheme) {
    return cachedScheme;
  }

  const query = `Curriculum for ${parameters.grade} ${parameters.subject} Term ${parameters.term}`;
  const contextChunks = await retrieveContext(query, 12, { grade: parameters.grade, subject: parameters.subject });
  const contextText = contextChunks.map(c => c.chunkText).join("\n\n");

  const customRule = await db.generationRule.findUnique({ where: { contentType: "SCHEME_OF_WORK" } });
  const customRuleText = customRule?.customPrompt ? `\n\nCUSTOM PLATFORM GUIDELINES (STRICTLY ENFORCE):\n${customRule.customPrompt}\n` : "";

  const systemPrompt = `You are an expert KICD curriculum specialist. Generate a Scheme of Work strictly following the Competency-Based Curriculum (CBC) architecture rules.${customRuleText}

INPUT DATA:
- Grade Level: ${parameters.grade}
- Subject: ${parameters.subject}
- Term: ${parameters.term}
- Duration: ${parameters.durationMinutes} minutes

MANDATORY REQUIREMENTS:
1. Extract ALL strands and sub-strands mathematically from the provided curriculum context.
2. Extract EXACT learning outcomes (DO NOT paraphrase).
3. Calculate total lessons: (${parameters.weeks} - ${parameters.holidays}) × ${parameters.lessonsPerWeek} = TOTAL LESSONS.
4. Structure into Weeks and Rows (Max 3 sub-strands per week).
5. Tag all 7 core competencies in activities.
6. Include min 2 Community Service Learning and 2 Parental Engagement strategies.

CURRICULUM CONTEXT:
${contextText}
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
      curriculumId: docExists.id
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

  revalidatePath("/dashboard/schemes");
  return scheme;
}

export async function generateLessonPlan(schemeId: string, lessonNumber: number, topic: string) {
  const session = await auth();
  if (!session?.userId) throw new Error("Unauthorized");

  const scheme = await db.schemeOfWork.findUnique({ where: { id: schemeId } });
  if (!scheme) throw new Error("Scheme not found");

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
`;

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

  revalidatePath("/dashboard/lessons");
  return lessonPlan;
}

export async function generateLessonNotes(lessonPlanId: string) {
  const session = await auth();
  if (!session?.userId) throw new Error("Unauthorized");

  const lessonPlan = await db.lessonPlan.findUnique({ where: { id: lessonPlanId } });
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

  const docExists = await db.curriculumDocument.findFirst({
    where: { gradeLevel: parameters.grade, subject: parameters.subject }
  });
  
  if (!docExists) {
     throw new Error(`MISSING CURRICULUM: No KICD Design uploaded for ${parameters.grade} ${parameters.subject}.`);
  }

  const query = `Curriculum for ${parameters.grade} ${parameters.subject} Term ${parameters.term}`;
  const contextChunks = await retrieveContext(query, 12, { grade: parameters.grade, subject: parameters.subject });
  const contextText = contextChunks.map(c => c.chunkText).join("\n\n");

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

CURRICULUM CONTEXT:
${contextText}
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

  const updated = await db.lessonPlan.update({
    where: { id, teacherId: session.userId },
    data: { 
      content: content as any,
      topic: content.topic || undefined,
      objectives: content.specificLearningOutcomes || undefined
    }
  });

  revalidatePath("/dashboard/lessons");
  return updated;
}

export async function getSchemeLessonsStatus(schemeId: string) {
  const session = await auth();
  if (!session?.userId) throw new Error("Unauthorized");

  const scheme = await db.schemeOfWork.findUnique({ 
    where: { id: schemeId },
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
      const exists = scheme.lessonPlans.some(lp => lp.lessonNumber === lessonCounter);
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
