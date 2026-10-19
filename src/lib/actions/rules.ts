"use server";

import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function updateGenerationRule(
  contentType: string,
  customPrompt: string,
) {
  const session = await auth();
  if (session?.role !== "SUPERADMIN")
    throw new Error("Unauthorized: Superadmin access required");

  const rule = await db.generationRule.upsert({
    where: { contentType },
    update: { customPrompt },
    create: { contentType, customPrompt },
  });

  revalidatePath("/dashboard/rules");
  return rule;
}

export async function getGenerationRules() {
  const session = await auth();
  if (session?.role !== "SUPERADMIN") throw new Error("Unauthorized");

  return db.generationRule.findMany();
}

/** Teachers' recent "Improve" requests for one kind of work, newest first. */
async function recentRequests(contentType: string, take = 80) {
  const logs = await db.generationLog.findMany({
    where: { contentType, instruction: { not: null } },
    orderBy: { createdAt: "desc" },
    take,
    select: { instruction: true },
  });
  return logs.map((l) => l.instruction ?? "").filter(Boolean);
}

/**
 * Drafts a better rule from the current rule and what teachers keep asking Elimu to change.
 * Nothing is saved: staff read the draft, edit it and save it themselves.
 */
export async function suggestRule(
  contentType: string,
  currentRule: string,
): Promise<{ ok: true; rule: string } | { ok: false; error: string }> {
  const session = await auth();
  if (session?.role !== "SUPERADMIN")
    return { ok: false, error: "Only Elimu staff can change rules." };

  const requests = await recentRequests(contentType);
  if (requests.length < 3)
    return {
      ok: false,
      error: "Teachers haven't asked for enough changes yet to learn from.",
    };

  try {
    const { object } = await generateObject({
      model: openai("gpt-4o"),
      schema: z.object({ rule: z.string() }),
      system: `You help Elimu staff keep the instructions for an AI that writes CBC teaching documents for Kenyan junior school teachers. Teachers keep asking the AI to change its work. Find the requests that come up again and again and are good teaching practice, and turn them into short, clear instructions added to the current rule. Keep every instruction in the current rule unless a request shows it is wrong. Leave out one-off requests, requests about a single topic, and anything that goes against the KICD curriculum. Write plain numbered instructions in Kenyan English, no more than about 15 in all.`,
      prompt: `CURRENT RULE:\n${currentRule.trim() || "(none yet)"}\n\nWHAT TEACHERS ASKED THE AI TO CHANGE (newest first):\n${requests.map((r) => `- ${r}`).join("\n")}`,
    });
    return { ok: true, rule: object.rule.trim() };
  } catch (error) {
    console.error("suggestRule failed", error);
    return { ok: false, error: "Elimu couldn't draft a rule. Try again." };
  }
}
