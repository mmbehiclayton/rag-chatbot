import { type AIProblem, aiProblem } from "@/lib/ai-errors";
import { db } from "@/lib/db";
import { sendAIOutageEmail } from "@/lib/email";

const KEY = "ai_outage";
const EMAIL_EVERY_MS = 6 * 60 * 60 * 1000;

/** Problems only staff can fix. Rate limits and odd replies clear by themselves. */
type Outage = { problem: "credit" | "key"; since: string; emailedAt?: string };

const STAFF_TEXT: Record<Outage["problem"], string> = {
  credit:
    "The OpenAI account is out of credit. Add credit in OpenAI billing (platform.openai.com, Settings, Billing).",
  key: "OpenAI rejected Elimu's API key. Save a working key on Settings, AI keys.",
};

export function outageText(problem: Outage["problem"]) {
  return STAFF_TEXT[problem];
}

function parse(value: string | undefined): Outage | null {
  if (!value) return null;
  try {
    const o = JSON.parse(value) as Outage;
    return o.problem === "credit" || o.problem === "key" ? o : null;
  } catch {
    return null;
  }
}

/** The current OpenAI outage, if there is one. */
export async function getAIOutage(): Promise<
  (Outage & { sinceDate: Date }) | null
> {
  const row = await db.platformSetting
    .findUnique({ where: { key: KEY } })
    .catch(() => null);
  const o = parse(row?.value);
  return o ? { ...o, sinceDate: new Date(o.since) } : null;
}

// Whether this server instance has seen the outage cleared, so a working call costs no query.
let clearedHere = false;

/** Records an OpenAI failure that staff must fix, and emails superadmins at most every 6 hours. */
export async function noteAIFailure(e: unknown) {
  const problem: AIProblem = aiProblem(e);
  if (problem !== "credit" && problem !== "key") return;
  clearedHere = false;
  try {
    const now = new Date();
    const prev = await getAIOutage();
    const emailDue =
      !prev?.emailedAt ||
      now.getTime() - new Date(prev.emailedAt).getTime() > EMAIL_EVERY_MS;
    const next: Outage = {
      problem,
      since: prev?.problem === problem ? prev.since : now.toISOString(),
      emailedAt: emailDue ? now.toISOString() : prev?.emailedAt,
    };
    await db.platformSetting.upsert({
      where: { key: KEY },
      create: { key: KEY, value: JSON.stringify(next) },
      update: { value: JSON.stringify(next) },
    });
    if (emailDue) {
      const staff = await db.user.findMany({
        where: { role: "SUPERADMIN" },
        select: { email: true },
      });
      await sendAIOutageEmail(
        staff.map((s) => s.email).filter(Boolean),
        STAFF_TEXT[problem],
      );
    }
  } catch (err) {
    console.error("[ai-health] couldn't record the outage:", err);
  }
}

/** Clears a recorded outage after a call works. */
export function noteAIWorking() {
  if (clearedHere) return;
  db.platformSetting
    .deleteMany({ where: { key: KEY } })
    .then(() => {
      clearedHere = true;
    })
    .catch(() => {});
}
