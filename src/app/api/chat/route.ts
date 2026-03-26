import { streamText, UIMessage, convertToModelMessages } from "ai";
import { openai } from "@ai-sdk/openai";
import { retrieveContext } from "@/lib/rag";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
    try {
        const { messages }: { messages: UIMessage[] } = await req.json();

        const { tenantId, userId } = await auth();
        if (!userId) return new Response("Unauthorized", { status: 401 });

        // Fetch Global Chat Rules
        const chatRule = await db.generationRule.findUnique({ where: { contentType: "GLOBAL_CHAT" } });
        const customRuleText = chatRule?.customPrompt ? `\n\n${chatRule.customPrompt}\n` : "";

        // Get the latest user message
        const lastMessage = messages[messages.length - 1];
        let contextText = "";

        if (lastMessage && lastMessage.role === "user") {
            const query = typeof (lastMessage as any).content === "string" ? (lastMessage as any).content : "";
            
            if (query) {
                // Fetch the top 5 most semantically similar curriculum chunks for this tenant (or global)
                const contextChunks = await retrieveContext(query, 5, { tenantId: tenantId ?? undefined });
                
                if (contextChunks.length > 0) {
                    contextText = "Here is some relevant context from the KICD Curriculum:\n" + 
                      contextChunks.map(c => `--- \n${c.chunkText}`).join("\n\n");
                }
            }
        }

        const systemPrompt = `You are Elimu AI, an AI assistant for Kenyan teachers. ${customRuleText}
You answer questions using the provided KICD curriculum context. 
If the context doesn't contain the answer, rely on your general educational knowledge but prioritize the curriculum data.
Always structure your responses clearly, following KICD CBC standards where applicable.

Context:
${contextText}
`;

        // We use gpt-4o for high-quality structured generation as requested by the user and to support strict outputs
        const result = await streamText({
            model: openai("gpt-4o"),
            system: systemPrompt,
            messages: await convertToModelMessages(messages),
        });

        // Handle possible method existence depending on SDK version
        if (typeof (result as any).toDataStreamResponse === "function") {
            return (result as any).toDataStreamResponse();
        }
        return (result as any).toTextStreamResponse();
    } catch (error) {
        console.error("Error in POST /api/chat:", error);
        return new Response(JSON.stringify({ error: "Internal Server Error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}