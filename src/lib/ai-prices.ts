/**
 * List prices in US dollars per million tokens, [input, output], for estimating what Elimu spends.
 * Check them against the OpenAI and Anthropic pricing pages now and then. ELIMU_USD_KES sets the
 * exchange rate.
 */
const PRICES: Record<string, [number, number]> = {
  "gpt-4o": [2.5, 10],
  "gpt-4o-mini": [0.15, 0.6],
  "gpt-4.1": [2, 8],
  "gpt-4.1-mini": [0.4, 1.6],
  "gpt-5": [1.25, 10],
  "gpt-5-mini": [0.25, 2],
  "claude-opus-5-5": [4, 20],
  "claude-sonnet-5-5": [2, 10],
  "claude-haiku-5-5": [0.1, 0.5],
};

/** Reused documents cost nothing; an unknown model is priced like gpt-4o so it isn't missed. */
export function costUsd(model: string, input: number, output: number) {
  if (model === "cache") return 0;
  const [i, o] = PRICES[model] ?? PRICES["gpt-4o"];
  return (input * i + output * o) / 1_000_000;
}

export function usdToKes() {
  const rate = Number(process.env.ELIMU_USD_KES);
  return rate > 0 ? rate : 129;
}

export const kes = (usd: number) =>
  `KES ${Math.round(usd * usdToKes()).toLocaleString("en-KE")}`;
