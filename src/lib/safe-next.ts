/** Pages a teacher can be sent back to after signing in. Anything else goes to Home. */
const ALLOWED = ["/dashboard", "/designs", "/invite/", "/onboarding"];

/**
 * The page to return to after signing in, from a `next` value in the URL or a form.
 * Only paths on this site that start with a known section, so it can't be used as an open redirect.
 */
export function safeNext(next: unknown, fallback = "/dashboard") {
  if (typeof next !== "string" || next.length > 500) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\"))
    return fallback;
  return ALLOWED.some(
    (p) =>
      next === p ||
      next.startsWith(p.endsWith("/") ? p : `${p}/`) ||
      next.startsWith(`${p}?`),
  )
    ? next
    : fallback;
}

/** "/login?next=…" for a page the visitor needs to sign in to see. */
export function loginHref(path: string) {
  const next = safeNext(path, "");
  return next && next !== "/dashboard"
    ? `/login?${new URLSearchParams({ next })}`
    : "/login";
}
