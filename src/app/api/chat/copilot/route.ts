import { convertToModelMessages, streamText } from "ai";
import { aiModel, modelUsed } from "@/lib/ai-models";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  CHAT_HISTORY,
  CHAT_MAX_OUTPUT,
  CHAT_PER_DAY,
  overLimit,
} from "@/lib/rate-limit";

export const maxDuration = 30;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.userId)
    return new Response("Your session has ended. Please sign in again.", {
      status: 401,
    });

  const { messages, lessonId } = await req.json();
  if (typeof lessonId !== "string" || !Array.isArray(messages))
    return new Response("Bad request", { status: 400 });

  // Load the lesson server-side (owner-scoped) instead of trusting context sent by the browser.
  const lesson = await db.lessonPlan.findFirst({
    where: { id: lessonId, teacherId: session.userId },
    select: { content: true },
  });
  if (!lesson) return new Response("Not found", { status: 404 });

  // Shares Ask Elimu's daily limit.
  if (
    session.role !== "SUPERADMIN" &&
    (await overLimit(
      `chat_${session.userId}`,
      CHAT_PER_DAY,
      24 * 60 * 60 * 1000,
    ))
  )
    return new Response(
      `You've asked Elimu ${CHAT_PER_DAY} questions today, which is the daily limit. You can ask more tomorrow.`,
      { status: 429 },
    );

  const lessonContext = (lesson.content ?? {}) as Record<string, unknown>;
  const lessonTopic =
    typeof lessonContext.topic === "string" ? lessonContext.topic : "";
  const lessonStrand =
    typeof lessonContext.strand === "string" ? lessonContext.strand : "";
  const lessonSubStrand =
    typeof lessonContext.subStrand === "string" ? lessonContext.subStrand : "";
  const lessonStructure = lessonContext.lessonStructure as
    | { introduction?: { learningIntentions?: unknown } }
    | null
    | undefined;
  const learningIntentions = String(
    lessonStructure?.introduction?.learningIntentions ?? "",
  );
  const structureText = lessonStructure ? JSON.stringify(lessonStructure) : "";

  const systemPrompt = `You are Elimu, an assistant for a Kenyan teacher using the CBC (Competency-Based Curriculum).
Your goal is to help the teacher refine, adjust, or brainstorm for the following lesson:

LESSON TOPIC: ${lessonTopic}
STRAND: ${lessonStrand}
SUB-STRAND: ${lessonSubStrand}
LEARNING INTENTIONS: ${learningIntentions}

CURRENT LESSON STRUCTURE:
${structureText}

GUIDELINES:
1. Always suggest variations that are practical for a classroom with potentially limited resources.
2. Focus on "Active Learning" and "Learner-Centered" pedagogy.
3. If asked for activity changes, ensure they still fit within the specified timing.
4. Keep core CBC values and competencies at the heart of your suggestions.
5. Provide specific dialogue examples if the teacher asks "What should I say when...".
6. Be encouraging and professional.
7. Keep each answer under about 400 words unless the teacher asks for something longer.
`;

  const result = streamText({
    model: aiModel("chat"),
    system: systemPrompt,
    messages: await convertToModelMessages(messages.slice(-CHAT_HISTORY)),
    maxOutputTokens: CHAT_MAX_OUTPUT,
    onFinish: async ({ totalUsage }) => {
      await db.generationLog
        .create({
          data: {
            userId: session.userId,
            tenantId: session.tenantId,
            contentType: "CHAT",
            promptTokens: totalUsage.inputTokens ?? 0,
            completionTokens: totalUsage.outputTokens ?? 0,
            totalTokens:
              (totalUsage.inputTokens ?? 0) + (totalUsage.outputTokens ?? 0),
            model: modelUsed("chat"),
          },
        })
        .catch((e) => console.error("Failed to log copilot usage:", e));
    },
  });

  return result.toUIMessageStreamResponse();
}
