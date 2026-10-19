import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type UIMessage,
} from "ai";
import { explainAIError } from "@/lib/ai-errors";
import { auth } from "@/lib/auth";
import { detectClass, pageLabel } from "@/lib/chat-grounding";
import {
  allSubStrands,
  findSubStrand,
  getPublishedMap,
  lessonGrounding,
  mapToPrompt,
} from "@/lib/curriculum-map";
import { getGradeOptions, getTeachingProfile } from "@/lib/curriculum-options";
import { db } from "@/lib/db";
import { retrieveContext } from "@/lib/rag";

// Below this, a chunk from an unfiltered search is usually about something else.
const MIN_SIMILARITY = 0.4;

// Older clients may still send plain `content` alongside the v6 `parts`.
type ChatMessage = UIMessage & { content?: string | null };

// AI SDK v6 UI messages carry their text in `parts`, not `content`.
function extractText(message: ChatMessage | null | undefined): string {
  if (!message) return "";
  if (typeof message.content === "string") return message.content;
  if (Array.isArray(message.parts)) {
    return message.parts
      .flatMap((part) => (part.type === "text" ? [part.text] : []))
      .join(" ")
      .trim();
  }
  return "";
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.userId) return new Response("Unauthorized", { status: 401 });

    const {
      messages,
      sessionId,
      trigger,
    }: { messages: ChatMessage[]; sessionId?: string; trigger?: string } =
      await req.json();
    if (!Array.isArray(messages) || messages.length === 0)
      return new Response("Bad request", { status: 400 });

    const tenantId = session.tenantId;

    // Messages are saved here, against the session id the client sends with each request,
    // so a new conversation's first exchange is never lost.
    const chatSession = sessionId
      ? await db.chatSession.findFirst({
          where: { id: sessionId, userId: session.userId },
          select: { id: true, title: true },
        })
      : null;

    const lastMessage = messages[messages.length - 1];
    const query = lastMessage?.role === "user" ? extractText(lastMessage) : "";

    if (chatSession && query && trigger !== "regenerate-message") {
      await db.chatMessage.create({
        data: { sessionId: chatSession.id, role: "user", content: query },
      });
      await db.chatSession.update({
        where: { id: chatSession.id },
        data:
          chatSession.title === "New Conversation"
            ? { title: query.slice(0, 60) + (query.length > 60 ? "…" : "") }
            : { updatedAt: new Date() },
      });
    }

    // Fetch Global Chat Rules with a safe fallback
    let customRuleText = "";
    try {
      const chatRule = await db.generationRule.findUnique({
        where: { contentType: "GLOBAL_CHAT" },
      });
      if (chatRule?.customPrompt) {
        customRuleText = `\n\nGUIDELINES:\n${chatRule.customPrompt}\n`;
      }
    } catch (dbError) {
      console.error("Failed to fetch chat rules:", dbError);
    }

    // The grades the teacher teaches, so general questions are answered for their classes.
    const profile = await getTeachingProfile(session.userId).catch(() => null);
    const myGrades = profile?.gradesTaught ?? [];
    const classNote = myGrades.length
      ? `
The teacher teaches ${myGrades.join(", ")}. Unless they name another class, answer for these grades (for example, use the assessment levels used at that level).
`
      : "";

    let contextText = "";
    let sources: { id: string; title: string }[] = [];
    if (query) {
      try {
        // When the question names a class ("Grade 5 Science"), answer from that class only.
        const asked = detectClass(query, await getGradeOptions());
        const map = asked
          ? await getPublishedMap(asked.grade, asked.subject)
          : null;

        if (map && asked) {
          const sub =
            findSubStrand(map, query) ??
            allSubStrands(map).find((s) =>
              query.toLowerCase().includes(s.name.toLowerCase()),
            );
          contextText =
            `\nCURRICULUM MAP FOR ${asked.grade.toUpperCase()} ${asked.subject.toUpperCase()} (entered and checked by teachers; quote names and outcomes exactly):\n` +
            (sub
              ? lessonGrounding(map, sub.name)
              : mapToPrompt(allSubStrands(map)));
          sources = [
            {
              id: `map-${map.id}`,
              title: `${asked.grade} ${asked.subject} curriculum map`,
            },
          ];
        } else {
          const found = await retrieveContext(query, 5, {
            tenantId: tenantId ?? undefined,
            ...(asked
              ? { grade: asked.grade, subject: asked.subject }
              : { grades: myGrades }),
          });
          // Without a class filter, keep only close matches so another grade's design isn't quoted.
          const chunks = asked
            ? found
            : found.filter((c) => c.similarity >= MIN_SIMILARITY);
          if (chunks.length > 0) {
            contextText =
              "\nRELEVANT CURRICULUM CONTEXT:\n" +
              chunks.map((c) => c.chunkText).join("\n\n");
            const docIds = [...new Set(chunks.map((c) => c.curriculumId))];
            const docs = await db.curriculumDocument.findMany({
              where: { id: { in: docIds } },
              select: { id: true, title: true },
            });
            sources = docs.map((d) => ({
              id: d.id,
              title: `${d.title}${pageLabel(chunks.filter((c) => c.curriculumId === d.id).map((c) => c.pageNumber))}`,
            }));
          } else if (asked) {
            contextText = `\nNOTE: Elimu does not have the curriculum design for ${asked.grade} ${asked.subject} yet. Say so in one sentence, then give general guidance and say it should be checked against the KICD design.`;
          }
        }
      } catch (ragError) {
        console.error("RAG retrieval failed:", ragError);
      }
    }

    const systemPrompt = `You are Elimu, an assistant for Kenyan teachers using the CBC curriculum.
You answer questions using the provided KICD curriculum context and the following platform guidelines:
${customRuleText}

If the context doesn't contain the answer, say so briefly, then rely on your general educational knowledge.
Keep answers clear and practical for a Kenyan classroom. Use short paragraphs and lists. Use Kenyan English.
Start with the answer itself, not "Certainly" or "Great question".
${classNote}
${contextText}
`;

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        for (const s of sources) {
          writer.write({
            type: "source-document",
            sourceId: s.id,
            mediaType: "application/pdf",
            title: s.title,
          });
        }
        const result = streamText({
          model: openai("gpt-4o"),
          system: systemPrompt,
          messages: await convertToModelMessages(messages.slice(-20)),
          onFinish: async ({ text }) => {
            if (chatSession && text) {
              await db.chatMessage
                .create({
                  data: {
                    sessionId: chatSession.id,
                    role: "assistant",
                    content: text,
                  },
                })
                .catch((e) => console.error("Failed to save reply:", e));
            }
          },
        });
        writer.merge(
          result.toUIMessageStream({
            onError: (e) => explainAIError("chat", e),
          }),
        );
      },
      onError: (e) => explainAIError("chat", e),
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error: unknown) {
    console.error("Critical error in POST /api/chat:", error);
    return new Response(JSON.stringify({ error: "Interaction failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
