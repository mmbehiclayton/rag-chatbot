/** The class a teacher last picked on a document page, shared by all four. */
export const CLASS_COOKIE = "elimu-class";

/** "Grade 7|Mathematics" */
export function classKey(c: { grade: string; subject: string }) {
  return `${c.grade}|${c.subject}`;
}

/**
 * The class to show: the one in the link, else the remembered one, if the teacher teaches it.
 * "all" (or nothing) shows every class.
 */
export function pickClass<T extends { grade: string; subject: string }>(
  classes: T[],
  fromLink: string | undefined,
  fromCookie: string | undefined,
): T | null {
  const wanted = fromLink ?? fromCookie;
  if (!wanted || wanted === "all") return null;
  return classes.find((c) => classKey(c) === wanted) ?? null;
}
