import { streamText, UIMessage, convertToModelMessages } from "ai";
import { openai } from "@ai-sdk/openai";
import { retrieveContext } from "@/lib/rag";

export async function POST(req: Request) {
    try {
        const { messages }: { messages: UIMessage[] } = await req.json();

        // Get the latest user message
        const lastMessage = messages[messages.length - 1];
        let contextText = "";

        if (lastMessage && lastMessage.role === "user") {
            const query = typeof (lastMessage as any).content === "string" ? (lastMessage as any).content : "";
            
            if (query) {
                // Fetch the top 5 most semantically similar curriculum chunks
                const contextChunks = await retrieveContext(query, 5);
                
                if (contextChunks.length > 0) {
                    contextText = "Here is some relevant context from the KICD Curriculum:\n" + 
                      contextChunks.map(c => `--- \n${c.chunkText}`).join("\n\n");
                }
            }
        }

        const systemPrompt = `You are Mwalimu RAG, an AI assistant for Kenyan teachers. 
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