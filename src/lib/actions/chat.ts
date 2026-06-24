"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getChatSessions() {
  const session = await auth();
  if (!session?.userId) throw new Error("Unauthorized");

  return db.chatSession.findMany({
    where: { userId: session.userId },
    orderBy: { updatedAt: "desc" },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
}

export async function getChatSession(sessionId: string) {
  const session = await auth();
  if (!session?.userId) throw new Error("Unauthorized");

  return db.chatSession.findFirst({
    where: { id: sessionId, userId: session.userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
}

export async function createChatSession(title?: string) {
  const session = await auth();
  if (!session?.userId) throw new Error("Unauthorized");

  const chatSession = await db.chatSession.create({
    data: {
      userId: session.userId,
      title: title ?? "New Conversation",
    },
    include: { messages: true },
  });

  revalidatePath("/dashboard/chat");
  return chatSession;
}

export async function appendChatMessage(
  sessionId: string,
  role: "user" | "assistant",
  content: string
) {
  const session = await auth();
  if (!session?.userId) throw new Error("Unauthorized");

  // Verify ownership
  const chatSession = await db.chatSession.findFirst({
    where: { id: sessionId, userId: session.userId },
  });
  if (!chatSession) throw new Error("Session not found");

  const message = await db.chatMessage.create({
    data: { sessionId, role, content },
  });

  // Auto-title the session from the first user message
  if (role === "user" && chatSession.title === "New Conversation") {
    const title = content.slice(0, 60) + (content.length > 60 ? "…" : "");
    await db.chatSession.update({
      where: { id: sessionId },
      data: { title, updatedAt: new Date() },
    });
  } else {
    await db.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });
  }

  return message;
}

export async function deleteChatSession(sessionId: string) {
  const session = await auth();
  if (!session?.userId) throw new Error("Unauthorized");

  await db.chatSession.delete({
    where: { id: sessionId, userId: session.userId },
  });

  revalidatePath("/dashboard/chat");
}

export async function renameChatSession(sessionId: string, title: string) {
  const session = await auth();
  if (!session?.userId) throw new Error("Unauthorized");

  await db.chatSession.update({
    where: { id: sessionId, userId: session.userId },
    data: { title: title.trim().slice(0, 80) },
  });

  revalidatePath("/dashboard/chat");
}
