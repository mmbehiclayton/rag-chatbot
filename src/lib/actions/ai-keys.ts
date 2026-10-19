"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  type AIProvider,
  checkKey,
  forgetAIKeys,
  getAIKey,
  type SavedKey,
  SETTING_KEY,
} from "@/lib/ai-keys";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encryptSecret } from "@/lib/secrets";

type Result =
  | { success: true; message: string }
  | { success: false; error: string };

const NAME: Record<AIProvider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
};

const Provider = z.enum(["openai", "anthropic"]);

async function staffOnly() {
  const session = await auth();
  return session?.userId && session.role === "SUPERADMIN" ? session : null;
}

function refresh() {
  forgetAIKeys();
  revalidatePath("/dashboard/ai-keys");
  revalidatePath("/", "layout");
}

/** Checks the key with the provider first, so a mistyped key never replaces a working one. */
export async function saveAIKey(input: {
  provider: AIProvider;
  key: string;
}): Promise<Result> {
  const session = await staffOnly();
  if (!session)
    return { success: false, error: "Only Elimu staff can do this." };
  const provider = Provider.safeParse(input.provider);
  if (!provider.success)
    return { success: false, error: "Pick OpenAI or Anthropic." };
  const p = provider.data;
  const key = input.key.trim();

  const looksRight =
    p === "openai"
      ? key.startsWith("sk-") && !key.startsWith("sk-ant-")
      : key.startsWith("sk-ant-");
  if (!looksRight || key.length < 20 || /\s/.test(key))
    return {
      success: false,
      error:
        p === "openai"
          ? 'An OpenAI key starts with "sk-". Copy it again from platform.openai.com, API keys.'
          : 'An Anthropic key starts with "sk-ant-". Copy it again from console.anthropic.com, API keys.',
    };

  const check = await checkKey(p, key);
  if (check === "rejected")
    return {
      success: false,
      error: `${NAME[p]} says this key is wrong or cancelled. Nothing was changed.`,
    };
  if (check === "unreachable")
    return {
      success: false,
      error: `We couldn't reach ${NAME[p]} to check the key. Nothing was changed. Try again in a minute.`,
    };

  const value: SavedKey = { cipher: encryptSecret(key), last4: key.slice(-4) };
  await db.platformSetting.upsert({
    where: { key: SETTING_KEY[p] },
    create: {
      key: SETTING_KEY[p],
      value: JSON.stringify(value),
      updatedById: session.userId,
    },
    update: { value: JSON.stringify(value), updatedById: session.userId },
  });
  refresh();
  return {
    success: true,
    message: `${NAME[p]} key saved. Elimu uses it from now on.`,
  };
}

/** Removes the saved key. Elimu goes back to the key in the hosting settings, if there is one. */
export async function removeAIKey(input: {
  provider: AIProvider;
}): Promise<Result> {
  const session = await staffOnly();
  if (!session)
    return { success: false, error: "Only Elimu staff can do this." };
  const provider = Provider.safeParse(input.provider);
  if (!provider.success)
    return { success: false, error: "Pick OpenAI or Anthropic." };
  await db.platformSetting.deleteMany({
    where: { key: SETTING_KEY[provider.data] },
  });
  refresh();
  return {
    success: true,
    message: `Saved ${NAME[provider.data]} key removed.`,
  };
}

/** Asks the provider whether the key in use now still works. Free: it only lists models. */
export async function testAIKey(input: {
  provider: AIProvider;
}): Promise<Result> {
  const session = await staffOnly();
  if (!session)
    return { success: false, error: "Only Elimu staff can do this." };
  const provider = Provider.safeParse(input.provider);
  if (!provider.success)
    return { success: false, error: "Pick OpenAI or Anthropic." };
  const p = provider.data;
  forgetAIKeys();
  const key = await getAIKey(p);
  if (!key) return { success: false, error: `No ${NAME[p]} key is set.` };
  const check = await checkKey(p, key);
  if (check === "ok")
    return {
      success: true,
      message: `The ${NAME[p]} key works. If documents still fail, check the account's credit.`,
    };
  return {
    success: false,
    error:
      check === "rejected"
        ? `${NAME[p]} says this key is wrong or cancelled. Save a new one.`
        : `We couldn't reach ${NAME[p]}. Try again in a minute.`,
  };
}
