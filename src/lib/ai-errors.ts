import { APICallError, NoObjectGeneratedError, RetryError } from "ai";

/**
 * Turns an AI call failure into a message a teacher can act on, and logs the real cause.
 * The OpenAI key, billing and rate limit problems are named in the log so they are easy to find.
 */
export function explainAIError(label: string, e: unknown): string {
  const cause = RetryError.isInstance(e) ? e.lastError : e;
  console.error(`[ai] ${label} failed:`, cause);

  if (NoObjectGeneratedError.isInstance(cause)) {
    return cause.finishReason === "length"
      ? "This was too long to write in one go. Try fewer weeks or fewer lessons per week."
      : "Elimu couldn't finish writing this. Please try again.";
  }
  if (APICallError.isInstance(cause)) {
    if (cause.statusCode === 401 || cause.statusCode === 403) {
      console.error("[ai] OpenAI rejected the API key. Check OPENAI_API_KEY in this environment.");
      return "Elimu's writing service isn't working right now. We've been alerted. Please try again later.";
    }
    if (cause.statusCode === 429) {
      if (/quota|billing/i.test(cause.responseBody ?? cause.message)) {
        console.error("[ai] OpenAI quota or billing limit reached for this API key.");
        return "Elimu's writing service isn't working right now. We've been alerted. Please try again later.";
      }
      return "Elimu is busy right now. Wait a minute and try again.";
    }
  }
  return "Something went wrong while writing this. Please try again in a minute.";
}
