import { redirect } from "next/navigation";
import { ChatInterface } from "@/components/dashboard/chat-interface";
import { getChatSession, getChatSessions } from "@/lib/actions/chat";
import { auth } from "@/lib/auth";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const session = await auth();
  if (!session?.userId) redirect("/login");

  const { c } = await searchParams;
  const [sessions, active] = await Promise.all([
    getChatSessions(),
    c ? getChatSession(c) : null,
  ]);

  return (
    <ChatInterface
      key={active?.id ?? "new"}
      sessions={sessions}
      activeId={active?.id ?? null}
      initialMessages={(active?.messages ?? []).map((m) => ({
        id: m.id,
        role: m.role === "assistant" ? "assistant" : "user",
        parts: [{ type: "text", text: m.content }],
      }))}
    />
  );
}
