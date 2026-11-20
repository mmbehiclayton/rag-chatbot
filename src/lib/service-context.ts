import { AsyncLocalStorage } from "node:async_hooks";

/**
 * "Act as this teacher" for calls that come from EduPro's server instead of a browser.
 *
 * Elimu's own actions read the signed-in teacher from the session cookie. A service call has no
 * cookie, so the route wraps the action in `runAsTeacher`, and `verifySession` answers with that
 * teacher. Nothing outside the wrapped call sees it, and the id was already checked against the
 * service key and the stored link before this is used.
 */
const store = new AsyncLocalStorage<{ userId: string }>();

export function runAsTeacher<T>(
  userId: string,
  fn: () => Promise<T>,
): Promise<T> {
  return store.run({ userId }, fn);
}

export function actingTeacherId(): string | null {
  return store.getStore()?.userId ?? null;
}
