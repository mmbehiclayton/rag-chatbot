"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getChatSessions() {
  const session = await auth();
  if (!session?.userId) throw new Error("Unauthorized");

  // List only: messages load for the open conversation (getChatSession).
  return db.chatSession.findMany({
    where: { userId: session.userId },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: { id: true, title: true, updatedAt: true },
  });
}

export async function getChatSession(sessionId: string) {
  const session = await auth();
  if (!session?.userId) throw new Error("Unauthorized");

  return db.chatSession.findFirst({
    where: { id: sessionId, userId: session.userId },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 200 } },
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
    select: { id: true, title: true, updatedAt: true },
  });

  return chatSession;
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
