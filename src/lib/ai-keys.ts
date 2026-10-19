import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/secrets";

/**
 * Elimu's AI keys. Staff save them on Settings, AI keys; they are stored locked in
 * PlatformSetting. A saved key wins over the one in the hosting settings (OPENAI_API_KEY,
 * ANTHROPIC_API_KEY), which stays as the fallback.
 */
export type AIProvider = "openai" | "anthropic";

export const AI_PROVIDERS: AIProvider[] = ["openai", "anthropic"];

export const SETTING_KEY: Record<AIProvider, string> = {
  openai: "ai_key_openai",
  anthropic: "ai_key_anthropic",
};

export const ENV_NAME: Record<AIProvider, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
};

/** What is stored in PlatformSetting.value. */
export type SavedKey = { cipher: string; last4: string };

export type KeySource = "saved" | "hosting" | "none";

type Resolved = {
  key: string | null;
  source: KeySource;
  /** A key is saved but can't be read, e.g. JWT_SECRET_KEY changed. */
  unreadable: boolean;
  updatedAt: Date | null;
};

const last4 = (key: string) => key.slice(-4);

const CACHE_MS = 60_000;
const cache = new Map<AIProvider, { at: number; value: Resolved }>();

/** Drops the cached keys on this server, so a key saved just now is used at once. */
export function forgetAIKeys() {
  cache.clear();
}

async function resolve(provider: AIProvider): Promise<Resolved> {
  const hit = cache.get(provider);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;

  const env = process.env[ENV_NAME[provider]]?.trim() || null;
  const fromEnv = (unreadable: boolean): Resolved => ({
    key: env,
    source: env ? "hosting" : "none",
    unreadable,
    updatedAt: null,
  });

  let value: Resolved;
  try {
    const row = await db.platformSetting.findUnique({
      where: { key: SETTING_KEY[provider] },
    });
    const saved = row ? (JSON.parse(row.value) as SavedKey) : null;
    const key = saved ? decryptSecret(saved.cipher) : null;
    value =
      row && key
        ? { key, source: "saved", unreadable: false, updatedAt: row.updatedAt }
        : fromEnv(!!saved);
  } catch (e) {
    // The database is busy: use the hosting key for now and look again soon.
    console.error("[ai-keys] couldn't read the saved key:", e);
    value = fromEnv(false);
    cache.set(provider, { at: Date.now() - CACHE_MS + 5_000, value });
    return value;
  }
  cache.set(provider, { at: Date.now(), value });
  return value;
}

/** The key to use now, or null when none is set. */
export async function getAIKey(provider: AIProvider): Promise<string | null> {
  return (await resolve(provider)).key;
}

/** What staff see on the AI keys page. Never the key itself, only its last 4 characters. */
export async function keyStatus(provider: AIProvider) {
  const r = await resolve(provider);
  const env = process.env[ENV_NAME[provider]]?.trim();
  return {
    provider,
    source: r.source,
    last4: r.key ? last4(r.key) : null,
    updatedAt: r.updatedAt,
    unreadable: r.unreadable,
    hostingLast4: env ? last4(env) : null,
  };
}

/** Puts the current key on each request, so a newly saved key needs no new release. */
function keyedFetch(provider: AIProvider): typeof fetch {
  return async (input, init) => {
    const key = await getAIKey(provider);
    const headers = new Headers(init?.headers);
    if (key) {
      if (provider === "openai") headers.set("authorization", `Bearer ${key}`);
      else headers.set("x-api-key", key);
    }
    return fetch(input, { ...init, headers });
  };
}

// The real key is added by keyedFetch; this only stops the libraries asking for one up front.
const PLACEHOLDER = "added-per-request";

export const openai = createOpenAI({
  apiKey: PLACEHOLDER,
  fetch: keyedFetch("openai"),
});

export const anthropic = createAnthropic({
  apiKey: PLACEHOLDER,
  fetch: keyedFetch("anthropic"),
});

const BASE_URL: Record<AIProvider, string> = {
  openai: process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1",
  anthropic:
    process.env.ANTHROPIC_BASE_URL?.trim() || "https://api.anthropic.com/v1",
};

/**
 * Checks a key by listing models, which costs nothing.
 * "ok", "rejected" (wrong or cancelled key) or "unreachable" (couldn't ask).
 */
export async function checkKey(
  provider: AIProvider,
  key: string,
): Promise<"ok" | "rejected" | "unreachable"> {
  const headers: Record<string, string> =
    provider === "openai"
      ? { authorization: `Bearer ${key}` }
      : { "x-api-key": key, "anthropic-version": "2023-06-01" };
  try {
    const res = await fetch(`${BASE_URL[provider].replace(/\/$/, "")}/models`, {
      headers,
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok) return "ok";
    if (res.status === 401 || res.status === 403) return "rejected";
    return "unreachable";
  } catch {
    return "unreachable";
  }
}
