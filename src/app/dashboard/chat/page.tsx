import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getChatSessions } from "@/lib/actions/chat";
import { ChatInterface } from "@/components/dashboard/chat-interface";

export default async function RAGChatBot() {
  const session = await auth();
  if (!session?.userId) redirect("/login");

  const sessions = await getChatSessions();

  return <ChatInterface initialSessions={sessions} />;
}
