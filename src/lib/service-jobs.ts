import { randomUUID } from "node:crypto";

/**
 * Generation takes a while, so EduPro starts it and checks back. Jobs are kept in memory on
 * this server for an hour. If Elimu restarts mid-job, EduPro sees the job as gone and tells the
 * teacher to try again; nothing is half-saved because documents are written at the end.
 */

export type JobResult =
  | { ok: true; id: string; reused?: boolean }
  | { ok: false; error: string; limit?: unknown };

type Job = {
  id: string;
  userId: string;
  type: "schemes" | "lessons" | "notes" | "assessments";
  status: "running" | "done";
  result?: JobResult;
  startedAt: number;
};

const TTL_MS = 60 * 60 * 1000;
const MAX_RUNNING_PER_TEACHER = 2;

const g = globalThis as unknown as { __serviceJobs?: Map<string, Job> };
if (!g.__serviceJobs) g.__serviceJobs = new Map<string, Job>();
const jobs = g.__serviceJobs;

function sweep() {
  const cutoff = Date.now() - TTL_MS;
  for (const [id, job] of jobs) if (job.startedAt < cutoff) jobs.delete(id);
}

export function runningFor(userId: string) {
  sweep();
  let n = 0;
  for (const job of jobs.values())
    if (job.userId === userId && job.status === "running") n++;
  return n;
}

export function canStart(userId: string) {
  return runningFor(userId) < MAX_RUNNING_PER_TEACHER;
}

export function createJob(userId: string, type: Job["type"]): string {
  const id = randomUUID();
  jobs.set(id, { id, userId, type, status: "running", startedAt: Date.now() });
  return id;
}

export function finishJob(id: string, result: JobResult) {
  const job = jobs.get(id);
  if (job) {
    job.status = "done";
    job.result = result;
  }
}

/** Only the teacher who started a job can read it. */
export function readJob(id: string, userId: string) {
  sweep();
  const job = jobs.get(id);
  if (!job || job.userId !== userId) return null;
  return { id: job.id, type: job.type, status: job.status, result: job.result };
}
