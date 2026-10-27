import { db, withDbRetry } from "@/lib/db";

/** Cheaper OpenAI writing models staff can try on their own documents before switching everyone. */
export const TRIAL_MODELS = [
  "gpt-4o-mini",
  "gpt-4.1-mini",
  "gpt-5-mini",
  "gpt-4.1",
] as const;

export const trialModelKey = (userId: string) => `trialWriteModel:${userId}`;

/** The model this staff member is trying, or null. Only Elimu staff can have one. */
export async function getTrialModel(
  userId: string,
  role: string | null | undefined,
): Promise<string | null> {
  if (role !== "SUPERADMIN") return null;
  const saved = await withDbRetry(() =>
    db.platformSetting.findUnique({
      where: { key: trialModelKey(userId) },
      select: { value: true },
    }),
  ).catch(() => null);
  return saved && (TRIAL_MODELS as readonly string[]).includes(saved.value)
    ? saved.value
    : null;
}
