import { openai } from "@ai-sdk/openai";
import { streamText, convertToModelMessages } from "ai";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const maxDuration = 30;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.userId) return new Response("Unauthorized", { status: 401 });

  const { messages, lessonId } = await req.json();
  if (typeof lessonId !== "string" || !Array.isArray(messages)) return new Response("Bad request", { status: 400 });

  // Load the lesson server-side (owner-scoped) instead of trusting context sent by the browser.
  const lesson = await db.lessonPlan.findFirst({ where: { id: lessonId, teacherId: session.userId }, select: { content: true } });
  if (!lesson) return new Response("Not found", { status: 404 });
  const lessonContext = lesson.content as any;

  const systemPrompt = `You are Elimu, an assistant for a Kenyan teacher using the CBC (Competency-Based Curriculum).
Your goal is to help the teacher refine, adjust, or brainstorm for the following lesson:

LESSON TOPIC: ${lessonContext?.topic}
STRAND: ${lessonContext?.strand}
SUB-STRAND: ${lessonContext?.subStrand}
LEARNING INTENTIONS: ${lessonContext?.lessonStructure?.introduction?.learningIntentions}

CURRENT LESSON STRUCTURE:
${JSON.stringify(lessonContext?.lessonStructure)}

GUIDELINES:
1. Always suggest variations that are practical for a classroom with potentially limited resources.
2. Focus on "Active Learning" and "Learner-Centered" pedagogy.
3. If asked for activity changes, ensure they still fit within the specified timing.
4. Keep core CBC values and competencies at the heart of your suggestions.
5. Provide specific dialogue examples if the teacher asks "What should I say when...".
6. Be encouraging and professional.
`;

  const result = streamText({
    model: openai("gpt-4o"),
    system: systemPrompt,
    messages: await convertToModelMessages(messages.slice(-20)),
  });

  return result.toUIMessageStreamResponse();
}
