import { streamText, UIMessage, convertToModelMessages } from "ai";
import { openai } from "@ai-sdk/openai";
import { retrieveContext } from "@/lib/rag";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
    try {
        const { messages }: { messages: any[] } = await req.json();

        const session = await auth();
        if (!session?.userId) return new Response("Unauthorized", { status: 401 });

        const tenantId = session.tenantId;

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

        // Get the latest user message for context retrieval
        const lastMessage = messages[messages.length - 1];
        let contextText = "";

        if (lastMessage && lastMessage.role === "user") {
            const query = typeof lastMessage.content === "string" ? lastMessage.content : "";
            
            if (query) {
                try {
                // Fetch context
                const contextChunks = await retrieveContext(query, 5, { tenantId: tenantId ?? undefined });
                
                if (contextChunks && contextChunks.length > 0) {
                    contextText = "\nRELEVANT CURRICULUM CONTEXT:\n" + 
                      contextChunks.map(c => `[Page ${c.pageNumber}]: ${c.chunkText}`).join("\n\n");
                }
                } catch (ragError) {
                    console.error("RAG retrieval failed:", ragError);
                }
            }
        }

        const systemPrompt = `You are Elimu AI, a professional pedagogical assistant for Kenyan educators.
You answer questions using the provided KICD curriculum context and the following platform guidelines:
${customRuleText}

If the context doesn't contain the answer, rely on your general educational knowledge but always prioritize the curriculum data.
Always structure your responses clearly, following KICD CBC standards where applicable.

${contextText}
`;

        const result = await streamText({
            model: openai("gpt-4o"),
            system: systemPrompt,
            messages: messages, // Pass directly as in copilot route
        });

        if (typeof (result as any).toDataStreamResponse === "function") {
            return (result as any).toDataStreamResponse();
        }
        return (result as any).toTextStreamResponse();
    } catch (error: any) {
        console.error("Critical error in POST /api/chat:", error);
        return new Response(JSON.stringify({ 
            error: "Interaction failed", 
            details: error.message 
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}