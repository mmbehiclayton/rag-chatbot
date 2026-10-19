import { convertToModelMessages, streamText } from "ai";
import { aiModel } from "@/lib/ai-models";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const maxDuration = 30;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.userId) return new Response("Unauthorized", { status: 401 });

  const { messages, lessonId } = await req.json();
  if (typeof lessonId !== "string" || !Array.isArray(messages))
    return new Response("Bad request", { status: 400 });

  // Load the lesson server-side (owner-scoped) instead of trusting context sent by the browser.
  const lesson = await db.lessonPlan.findFirst({
    where: { id: lessonId, teacherId: session.userId },
    select: { content: true },
  });
  if (!lesson) return new Response("Not found", { status: 404 });

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
`;

  const result = streamText({
    model: aiModel("chat"),
    system: systemPrompt,
    messages: await convertToModelMessages(messages.slice(-20)),
  });

  return result.toUIMessageStreamResponse();
}
