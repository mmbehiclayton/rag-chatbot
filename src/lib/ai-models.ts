import {
  defaultSettingsMiddleware,
  type LanguageModelMiddleware,
  wrapLanguageModel,
} from "ai";
import { providerDown } from "@/lib/ai-errors";
import { noteAIFailure, noteAIWorking } from "@/lib/ai-health";
import { anthropic, getAIKey, openai } from "@/lib/ai-keys";

/**
 * Which OpenAI model does which job. Change them in Vercel's environment settings, without a
 * code change: ELIMU_MODEL_WRITE for documents, ELIMU_MODEL_CHAT for Ask Elimu and the copilot.
 */
export type ModelJob = "write" | "chat";

const DEFAULTS: Record<ModelJob, string> = {
  write: "gpt-4o",
  chat: "gpt-4o",
};

export function modelName(job: ModelJob): string {
  const set =
    job === "write"
      ? process.env.ELIMU_MODEL_WRITE
      : (process.env.ELIMU_MODEL_CHAT ?? process.env.ELIMU_MODEL_WRITE);
  return set?.trim() || DEFAULTS[job];
}

/** The Claude model that takes over when OpenAI isn't working. Set ELIMU_MODEL_BACKUP to change it. */
const BACKUP_DEFAULT = "claude-opus-5-5";

export function backupModelName(): string {
  return process.env.ELIMU_MODEL_BACKUP?.trim() || BACKUP_DEFAULT;
}

/** The backup only runs when an Anthropic key is saved on Settings, AI keys, or in the hosting settings. */
export async function hasBackup(): Promise<boolean> {
  return !!(await getAIKey("anthropic"));
}

// Whether this server instance's last AI call went to the backup, for the usage log.
let onBackup = false;

/** The model to record in the usage log for a call that just finished. */
export function modelUsed(job: ModelJob): string {
  return onBackup ? backupModelName() : modelName(job);
}

/** How hard Claude thinks: enough for documents, light for chat answers. */
const BACKUP_EFFORT: Record<ModelJob, "low" | "medium"> = {
  write: "medium",
  chat: "low",
};

/**
 * Records OpenAI outages for staff and clears them once a call works again. While OpenAI is out
 * of credit, rejects the key, limits Elimu or is down, the same request goes to Claude instead, so
 * teachers still get their document. The outage stays recorded until OpenAI works again.
 */
function health(job: ModelJob): LanguageModelMiddleware {
  /** Runs a call on OpenAI, or on Claude when OpenAI isn't working and a backup is set. */
  async function orBackup<T>(
    primary: () => PromiseLike<T>,
    onClaude: (model: ReturnType<typeof anthropic>) => PromiseLike<T>,
  ): Promise<T> {
    try {
      const result = await primary();
      onBackup = false;
      noteAIWorking();
      return result;
    } catch (e) {
      await noteAIFailure(e);
      if (!providerDown(e) || !(await hasBackup())) throw e;
      console.error("[ai] OpenAI failed, using the Claude backup:", e);
      try {
        const result = await onClaude(anthropic(backupModelName()));
        onBackup = true;
        return result;
      } catch (backupError) {
        console.error("[ai] The Claude backup failed too:", backupError);
        throw e;
      }
    }
  }

  // Claude's default length is its maximum; documents need far less, and a cap keeps calls quick.
  const withEffort = <
    P extends { providerOptions?: object; maxOutputTokens?: number },
  >(
    params: P,
  ): P => ({
    ...params,
    maxOutputTokens: params.maxOutputTokens ?? 32000,
    providerOptions: {
      ...params.providerOptions,
      anthropic: { effort: BACKUP_EFFORT[job] },
    },
  });

  return {
    specificationVersion: "v3",
    wrapGenerate: ({ doGenerate, params }) =>
      orBackup(doGenerate, (claude) => claude.doGenerate(withEffort(params))),
    wrapStream: ({ doStream, params }) =>
      orBackup(doStream, (claude) => claude.doStream(withEffort(params))),
  };
}

/**
 * The model for a job. GPT-5 models think before answering, which costs output tokens;
 * "low" is enough for lesson plans and keeps them quick and cheap.
 */
export function aiModel(job: ModelJob) {
  const name = modelName(job);
  const middleware: LanguageModelMiddleware[] = [health(job)];
  if (/^gpt-5/.test(name))
    middleware.push(
      defaultSettingsMiddleware({
        settings: { providerOptions: { openai: { reasoningEffort: "low" } } },
      }),
    );
  return wrapLanguageModel({ model: openai(name), middleware });
}
