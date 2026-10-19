import { APICallError, NoObjectGeneratedError, RetryError } from "ai";

/** What went wrong with an OpenAI call, in terms we can act on. */
export type AIProblem = "credit" | "key" | "busy" | "too-long" | "other";

/** Every error in the chain: a retry's attempts, and each error's cause. */
function errorsIn(e: unknown, seen = new Set<unknown>()): unknown[] {
  if (!e || seen.has(e)) return [];
  seen.add(e);
  const out: unknown[] = [e];
  if (RetryError.isInstance(e)) {
    for (const inner of [...e.errors].reverse())
      out.push(...errorsIn(inner, seen));
  }
  if (e instanceof Error && e.cause) out.push(...errorsIn(e.cause, seen));
  return out;
}

/** Stream errors can arrive as plain objects, so read them as text too. */
function safeJson(value: unknown) {
  try {
    return typeof value === "string" ? value : JSON.stringify(value);
  } catch {
    return String(value);
  }
}

const CREDIT = /insufficient_quota|no credits|credit balance|quota|billing/i;

/** Sorts an AI failure into credit, key, busy, too long or other. */
export function aiProblem(e: unknown): AIProblem {
  for (const err of errorsIn(e)) {
    if (NoObjectGeneratedError.isInstance(err) && err.finishReason === "length")
      return "too-long";
    const text = `${err instanceof Error ? err.message : safeJson(err)} ${
      APICallError.isInstance(err) ? (err.responseBody ?? "") : ""
    }`;
    const status = APICallError.isInstance(err) ? err.statusCode : undefined;
    if (status === 402 || CREDIT.test(text)) return "credit";
    if (status === 401 || status === 403 || /api key/i.test(text)) return "key";
    if (status === 429 || /rate limit/i.test(text)) return "busy";
  }
  return "other";
}

/**
 * Whether a failure means the provider itself isn't working (credit, key, limits, its servers
 * or the connection), so the same request is worth sending to the backup.
 */
export function providerDown(e: unknown): boolean {
  const problem = aiProblem(e);
  if (problem === "credit" || problem === "key" || problem === "busy")
    return true;
  return errorsIn(e).some(
    (err) =>
      APICallError.isInstance(err) &&
      (err.statusCode === undefined || err.statusCode >= 500),
  );
}

/**
 * Turns an AI call failure into a message a teacher can act on, and logs the real cause.
 * The OpenAI key, billing and rate limit problems are named in the log so they are easy to find.
 */
export function explainAIError(label: string, e: unknown): string {
  const cause = RetryError.isInstance(e) ? e.lastError : e;
  console.error(`[ai] ${label} failed:`, cause);

  switch (aiProblem(e)) {
    case "credit":
      console.error(
        "[ai] The OpenAI account is out of credit. Add credit in OpenAI billing.",
      );
      return "Elimu can't write anything right now. We're fixing it. Please try again later.";
    case "key":
      console.error(
        "[ai] OpenAI rejected the API key. Check OPENAI_API_KEY in this environment.",
      );
      return "Elimu can't write anything right now. We're fixing it. Please try again later.";
    case "busy":
      return "Elimu is busy right now. Wait a minute and try again.";
    case "too-long":
      return "This was too long to write in one go. Try fewer weeks or fewer lessons per week.";
  }
  if (NoObjectGeneratedError.isInstance(cause))
    return "Elimu couldn't finish writing this. Please try again.";
  return "Something went wrong while writing this. Please try again in a minute.";
}

/** The same failure explained for Elimu staff, who can fix the account. */
export function explainAIErrorForStaff(e: unknown): string {
  switch (aiProblem(e)) {
    case "credit":
      return "The OpenAI account is out of credit. Add credit in OpenAI billing, then press Try again.";
    case "key":
      return "OpenAI rejected the API key. Check OPENAI_API_KEY in Vercel, then press Try again.";
    case "busy":
      return "OpenAI is limiting requests right now. Wait a few minutes, then press Try again.";
  }
  const cause = RetryError.isInstance(e) ? e.lastError : e;
  return cause instanceof Error
    ? cause.message
    : "Unknown error while reading the design.";
}
