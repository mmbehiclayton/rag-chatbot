import { streamText, convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { openai } from "@ai-sdk/openai";
import { retrieveContext } from "@/lib/rag";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// AI SDK v6 UI messages carry their text in `parts`, not `content`.
function extractText(message: any): string {
    if (!message) return "";
    if (typeof message.content === "string") return message.content;
    if (Array.isArray(message.parts)) {
        return message.parts
            .filter((p: any) => p?.type === "text" && typeof p.text === "string")
            .map((p: any) => p.text)
            .join(" ")
            .trim();
    }
    return "";
}

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.userId) return new Response("Unauthorized", { status: 401 });

        const { messages, sessionId, trigger }: { messages: any[]; sessionId?: string; trigger?: string } = await req.json();
        if (!Array.isArray(messages) || messages.length === 0) return new Response("Bad request", { status: 400 });

        const tenantId = session.tenantId;

        // Messages are saved here, against the session id the client sends with each request,
        // so a new conversation's first exchange is never lost.
        const chatSession = sessionId
            ? await db.chatSession.findFirst({ where: { id: sessionId, userId: session.userId }, select: { id: true, title: true } })
            : null;

        const lastMessage = messages[messages.length - 1];
        const query = lastMessage?.role === "user" ? extractText(lastMessage) : "";

        if (chatSession && query && trigger !== "regenerate-message") {
            await db.chatMessage.create({ data: { sessionId: chatSession.id, role: "user", content: query } });
            await db.chatSession.update({
                where: { id: chatSession.id },
                data: chatSession.title === "New Conversation" ? { title: query.slice(0, 60) + (query.length > 60 ? "…" : "") } : { updatedAt: new Date() },
            });
        }

        // Fetch Global Chat Rules with a safe fallback
        let customRuleText = "";
        try {
            const chatRule = await db.generationRule.findUnique({ where: { contentType: "GLOBAL_CHAT" } });
            if (chatRule?.customPrompt) {
                customRuleText = `\n\nGUIDELINES:\n${chatRule.customPrompt}\n`;
            }
        } catch (dbError) {
            console.error("Failed to fetch chat rules:", dbError);
        }

        let contextText = "";
        let sources: { id: string; title: string }[] = [];
        if (query) {
            try {
                const contextChunks = await retrieveContext(query, 5, { tenantId: tenantId ?? undefined });
                if (contextChunks && contextChunks.length > 0) {
                    contextText = "\nRELEVANT CURRICULUM CONTEXT:\n" +
                        contextChunks.map(c => `[Page ${c.pageNumber}]: ${c.chunkText}`).join("\n\n");

                    const docIds = [...new Set(contextChunks.map((c) => c.curriculumId))];
                    const docs = await db.curriculumDocument.findMany({ where: { id: { in: docIds } }, select: { id: true, title: true } });
                    sources = docs.map((d) => {
                        const pages = [...new Set(contextChunks.filter((c) => c.curriculumId === d.id).map((c) => c.pageNumber))].sort((a, b) => a - b);
                        return { id: d.id, title: `${d.title}${pages.length ? ` (p. ${pages.join(", ")})` : ""}` };
                    });
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

${contextText}
`;

        const stream = createUIMessageStream({
            execute: async ({ writer }) => {
                for (const s of sources) {
                    writer.write({ type: "source-document", sourceId: s.id, mediaType: "application/pdf", title: s.title });
                }
                const result = streamText({
                    model: openai("gpt-4o"),
                    system: systemPrompt,
                    messages: await convertToModelMessages(messages.slice(-20)),
                    onFinish: async ({ text }) => {
                        if (chatSession && text) {
                            await db.chatMessage.create({ data: { sessionId: chatSession.id, role: "assistant", content: text } }).catch((e) => console.error("Failed to save reply:", e));
                        }
                    },
                });
                writer.merge(result.toUIMessageStream());
            },
            onError: () => "Elimu could not answer just now. Please try again.",
        });

        return createUIMessageStreamResponse({ stream });
    } catch (error: any) {
        console.error("Critical error in POST /api/chat:", error);
        return new Response(JSON.stringify({ error: "Interaction failed" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
