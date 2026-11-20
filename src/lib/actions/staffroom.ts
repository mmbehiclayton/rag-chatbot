"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { overLimit } from "@/lib/rate-limit";
import {
  GENERAL_ROOM,
  LINK_PATTERN,
  MESSAGE_MAX,
  MESSAGES_PER_MINUTE,
  NEW_ACCOUNT_DAYS,
  ROOM_PAGE,
  type StaffroomMessageView,
} from "@/lib/staffroom";

type Result = { success: true } | { success: false; error: string };

const DAY = 24 * 60 * 60 * 1000;

async function validRoom(room: string) {
  if (room === GENERAL_ROOM) return true;
  return !!(await db.learningArea.findUnique({
    where: { name: room },
    select: { id: true },
  }));
}

/**
 * Messages in a room, oldest first. With `after`, only messages newer than that time, so the
 * open page fetches a few bytes every few seconds instead of the whole room.
 */
export async function roomMessages(input: {
  room: string;
  after?: string;
}): Promise<StaffroomMessageView[]> {
  const session = await auth();
  if (!session?.userId) return [];
  const after = input.after ? new Date(input.after) : null;
  const rows = await db.staffroomMessage.findMany({
    where: {
      room: input.room,
      removedAt: null,
      ...(after && !Number.isNaN(after.getTime())
        ? { createdAt: { gt: after } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: ROOM_PAGE,
    select: {
      id: true,
      body: true,
      createdAt: true,
      userId: true,
      user: { select: { name: true, role: true } },
    },
  });
  return rows.reverse().map((m) => ({
    id: m.id,
    body: m.body,
    createdAt: m.createdAt.toISOString(),
    author: m.user.name?.trim() || "A teacher",
    authorId: m.userId,
    isStaff: m.user.role === "SUPERADMIN",
    mine: m.userId === session.userId,
  }));
}

export async function sendMessage(input: {
  room: string;
  body: string;
}): Promise<Result> {
  const session = await auth();
  if (!session?.userId)
    return { success: false, error: "Sign in again to post." };
  const body = (input.body ?? "").trim();
  if (!body) return { success: false, error: "Write a message first." };
  if (body.length > MESSAGE_MAX)
    return {
      success: false,
      error: `Keep messages under ${MESSAGE_MAX} characters.`,
    };
  if (!(await validRoom(input.room)))
    return { success: false, error: "That room doesn't exist." };

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { createdAt: true, chatMutedUntil: true, role: true },
  });
  if (!user) return { success: false, error: "Sign in again to post." };
  if (user.chatMutedUntil && user.chatMutedUntil > new Date())
    return {
      success: false,
      error: `Elimu staff have paused your posting until ${user.chatMutedUntil.toLocaleDateString("en-KE", { day: "numeric", month: "long", timeZone: "Africa/Nairobi" })}.`,
    };
  const isStaff = user.role === "SUPERADMIN";
  if (
    !isStaff &&
    Date.now() - user.createdAt.getTime() < NEW_ACCOUNT_DAYS * DAY &&
    LINK_PATTERN.test(body)
  )
    return {
      success: false,
      error: `New accounts can share links after ${NEW_ACCOUNT_DAYS} days. Remove the link and try again.`,
    };
  if (
    !isStaff &&
    (await overLimit(
      `staffroom:${session.userId}`,
      MESSAGES_PER_MINUTE,
      60_000,
    ))
  )
    return {
      success: false,
      error: "You're posting very fast. Wait a minute and try again.",
    };

  await db.staffroomMessage.create({
    data: { room: input.room, userId: session.userId, body },
  });
  return { success: true };
}

export async function reportMessage(id: string): Promise<Result> {
  const session = await auth();
  if (!session?.userId)
    return { success: false, error: "Sign in again to report." };
  const message = await db.staffroomMessage.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!message)
    return { success: false, error: "That message is already gone." };
  if (message.userId === session.userId)
    return { success: false, error: "You can't report your own message." };
  await db.staffroomReport.upsert({
    where: {
      messageId_reporterId: { messageId: id, reporterId: session.userId },
    },
    create: { messageId: id, reporterId: session.userId },
    update: {},
  });
  revalidatePath("/dashboard/staffroom");
  return { success: true };
}

async function staffOnly() {
  const session = await auth();
  return session?.userId && session.role === "SUPERADMIN" ? session : null;
}

/** Staff remove a message: it disappears for everyone and its reports are closed. */
export async function removeMessage(id: string): Promise<Result> {
  if (!(await staffOnly()))
    return { success: false, error: "Only Elimu staff can do this." };
  const now = new Date();
  await db.$transaction([
    db.staffroomMessage.update({ where: { id }, data: { removedAt: now } }),
    db.staffroomReport.updateMany({
      where: { messageId: id, resolvedAt: null },
      data: { resolvedAt: now },
    }),
  ]);
  revalidatePath("/dashboard/staffroom");
  return { success: true };
}

/** Staff look at a reported message and leave it up. */
export async function keepMessage(id: string): Promise<Result> {
  if (!(await staffOnly()))
    return { success: false, error: "Only Elimu staff can do this." };
  await db.staffroomReport.updateMany({
    where: { messageId: id, resolvedAt: null },
    data: { resolvedAt: new Date() },
  });
  revalidatePath("/dashboard/staffroom");
  return { success: true };
}

/** Staff stop a teacher posting for some days (0 lets them post again). */
export async function muteTeacher(input: {
  userId: string;
  days: number;
}): Promise<Result> {
  const staff = await staffOnly();
  if (!staff) return { success: false, error: "Only Elimu staff can do this." };
  if (input.userId === staff.userId)
    return { success: false, error: "You can't pause yourself." };
  const days = Math.max(0, Math.min(365, Math.round(input.days)));
  await db.user.update({
    where: { id: input.userId },
    data: { chatMutedUntil: days ? new Date(Date.now() + days * DAY) : null },
  });
  revalidatePath("/dashboard/staffroom");
  return { success: true };
}
