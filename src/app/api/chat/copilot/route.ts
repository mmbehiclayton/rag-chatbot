import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { auth } from "@/lib/auth";

export const maxDuration = 30;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.userId) return new Response("Unauthorized", { status: 401 });

  const { messages, lessonContext } = await req.json();

  const systemPrompt = `You are a Pedagogical Co-pilot for a Kenyan teacher using the CBC (Competency-Based Curriculum).
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

  const result = await streamText({
    model: openai("gpt-4o"),
    system: systemPrompt,
    messages,
  });

  if (typeof (result as any).toDataStreamResponse === "function") {
    return (result as any).toDataStreamResponse();
  }
  return (result as any).toTextStreamResponse();
}
