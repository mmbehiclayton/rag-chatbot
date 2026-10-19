import { openai } from "@ai-sdk/openai";
import {
  defaultSettingsMiddleware,
  type LanguageModelMiddleware,
  wrapLanguageModel,
} from "ai";
import { noteAIFailure, noteAIWorking } from "@/lib/ai-health";

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

/** Records OpenAI outages for staff, and clears them once a call works again. */
const health: LanguageModelMiddleware = {
  specificationVersion: "v3",
  wrapGenerate: async ({ doGenerate }) => {
    try {
      const result = await doGenerate();
      noteAIWorking();
      return result;
    } catch (e) {
      await noteAIFailure(e);
      throw e;
    }
  },
  wrapStream: async ({ doStream }) => {
    try {
      const result = await doStream();
      noteAIWorking();
      return result;
    } catch (e) {
      await noteAIFailure(e);
      throw e;
    }
  },
};

/**
 * The model for a job. GPT-5 models think before answering, which costs output tokens;
 * "low" is enough for lesson plans and keeps them quick and cheap.
 */
export function aiModel(job: ModelJob) {
  const name = modelName(job);
  const middleware: LanguageModelMiddleware[] = [health];
  if (/^gpt-5/.test(name))
    middleware.push(
      defaultSettingsMiddleware({
        settings: { providerOptions: { openai: { reasoningEffort: "low" } } },
      }),
    );
  return wrapLanguageModel({ model: openai(name), middleware });
}
