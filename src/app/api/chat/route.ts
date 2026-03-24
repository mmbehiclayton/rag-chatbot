import { streamText, UIMessage, convertToModelMessages } from "ai";
import { openai } from "@ai-sdk/openai";  

export async function POST(req: Request) {
    try {
    const { messages }: { messages: UIMessage[] }   = await req.json();

    const result = await streamText({
        model: openai("gpt-4.1-mini"),
        messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
    } catch (error) {
        console.error("Error in POST /api/chat:", error);
        return new Response(JSON.stringify({ error: "Internal Server Error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}