import { classHref } from "@/lib/classes";
import { db, withDbRetry } from "@/lib/db";
import { DOC_LABELS, type DocKind, docName } from "@/lib/documents";
import { type Access, getAccess, plansOn } from "@/lib/plans";

/**
 * Paying at download. Making a document and reading it on screen is free (within the monthly
 * allowance). Downloading or printing it needs one of:
 * - a term pass, which opens every download for the term;
 * - the teacher's one free download, which they choose to use on any document;
 * - paying for that document once. After that it downloads as often as they like, as PDF or
 *   Word, edits included.
 * Prices are per kind of document, set by Elimu staff on the Pilot page.
 */
export const DOWNLOAD_PRICES_KEY = "downloadPrices";
export const DOWNLOAD_PRICE_DEFAULTS: Record<DocKind, number> = {
  scheme: 50,
  record: 30,
  term: 100,
  assessment: 20,
  lesson: 10,
  notes: 10,
};
export const DOWNLOAD_PRICE_LIMITS = { min: 5, max: 1000 };
export const DOWNLOAD_KINDS = Object.keys(DOWNLOAD_PRICE_DEFAULTS) as DocKind[];

export async function downloadPrices(): Promise<Record<DocKind, number>> {
  const saved = await withDbRetry(() =>
    db.platformSetting.findUnique({
      where: { key: DOWNLOAD_PRICES_KEY },
      select: { value: true },
    }),
  ).catch(() => null);
  let parsed: Partial<Record<DocKind, unknown>> = {};
  try {
    parsed = saved ? JSON.parse(saved.value) : {};
  } catch {}
  return Object.fromEntries(
    DOWNLOAD_KINDS.map((kind) => {
      const n = Number(parsed[kind]);
      return [
        kind,
        Number.isInteger(n) && n > 0 ? n : DOWNLOAD_PRICE_DEFAULTS[kind],
      ];
    }),
  ) as Record<DocKind, number>;
}

/** Which document a download is for: an id, or for a term file its class and term. */
export type DocRef = {
  type: DocKind;
  id?: string;
  grade?: string;
  subject?: string;
  term?: string;
};

// The /api/export query parameters worth keeping when sending a teacher back to their download.
const EXPORT_PARAMS = [
  "type",
  "id",
  "grade",
  "subject",
  "term",
  "stream",
  "format",
];

type Params = URLSearchParams | Record<string, string | string[] | undefined>;
const param = (p: Params, key: string) => {
  const v = p instanceof URLSearchParams ? p.get(key) : p[key];
  return (Array.isArray(v) ? v[0] : v) || undefined;
};

export function parseDocRef(p: Params): DocRef | null {
  const type = param(p, "type");
  if (!type || !Object.hasOwn(DOC_LABELS, type)) return null;
  const ref: DocRef = { type: type as DocKind };
  if (ref.type === "term") {
    ref.grade = param(p, "grade");
    ref.subject = param(p, "subject");
    ref.term = param(p, "term");
    return ref.grade && ref.subject && ref.term ? ref : null;
  }
  ref.id = param(p, "id");
  return ref.id ? ref : null;
}

export function docKey(ref: DocRef) {
  return ref.type === "term"
    ? `term:${ref.grade}|${ref.subject}|${ref.term}`
    : `${ref.type}:${ref.id}`;
}

/** The query string for /api/export (and the download page), keeping only what the export reads. */
export function exportQuery(p: Params) {
  const q = new URLSearchParams();
  for (const key of EXPORT_PARAMS) {
    const v = param(p, key);
    if (v) q.set(key, v);
  }
  return q.toString();
}

/** The document's own page in Elimu, where Back goes from its download and print views. */
export function docPagePath(p: Params) {
  const id = encodeURIComponent(param(p, "id") ?? "");
  switch (param(p, "type")) {
    case "scheme":
      return `/dashboard/schemes/${id}`;
    case "record":
      return `/dashboard/schemes/${id}/record`;
    case "lesson":
      return `/dashboard/lessons/${id}`;
    case "notes":
      return `/dashboard/notes/${id}`;
    case "assessment":
      return `/dashboard/assessments/${id}`;
    case "term":
      return classHref(param(p, "grade") ?? "", param(p, "subject") ?? "");
    default:
      return "/dashboard";
  }
}

/** The teacher's own document and a name for it, or null when it isn't theirs. */
export async function findDoc(
  userId: string,
  ref: DocRef,
): Promise<{ title: string } | null> {
  const where = { id: ref.id, teacherId: userId };
  switch (ref.type) {
    case "term":
      return { title: docName("term", ref, ref.term) };
    case "scheme":
    case "record": {
      const s = await withDbRetry(() =>
        db.schemeOfWork.findFirst({
          where,
          select: { grade: true, subject: true, title: true },
        }),
      );
      return s && { title: docName(ref.type, s, s.title) };
    }
    case "lesson": {
      const l = await withDbRetry(() =>
        db.lessonPlan.findFirst({
          where,
          select: { grade: true, subject: true, topic: true },
        }),
      );
      return l && { title: docName("lesson", l, l.topic) };
    }
    case "assessment": {
      const a = await withDbRetry(() =>
        db.assessment.findFirst({
          where,
          select: { grade: true, subject: true, title: true },
        }),
      );
      return a && { title: docName("assessment", a, a.title) };
    }
    case "notes": {
      const n = await withDbRetry(() =>
        db.lessonNote.findFirst({
          where,
          select: {
            lessonPlan: { select: { grade: true, subject: true, topic: true } },
          },
        }),
      );
      return n && { title: docName("notes", n.lessonPlan, n.lessonPlan.topic) };
    }
  }
}

/** True once the teacher has used their one free download. */
export async function freeDownloadUsed(userId: string) {
  const n = await withDbRetry(() =>
    db.documentUnlock.count({
      where: { teacherId: userId, method: "FREE", status: "ACTIVE" },
    }),
  );
  return n > 0;
}

/** Whether this teacher may download this document now, and if not, what it would cost. */
export async function downloadAccess(
  userId: string,
  ref: DocRef,
  access?: Access,
): Promise<
  | { open: true; unlocked?: boolean }
  | { open: false; price: number; freeLeft: boolean; access: Access }
> {
  if (!(await plansOn())) return { open: true };
  const a = access ?? (await getAccess(userId));
  if (a.kind !== "free") return { open: true };
  const [unlock, used, prices] = await Promise.all([
    withDbRetry(() =>
      db.documentUnlock.findUnique({
        where: { teacherId_docKey: { teacherId: userId, docKey: docKey(ref) } },
        select: { status: true },
      }),
    ),
    freeDownloadUsed(userId),
    downloadPrices(),
  ]);
  if (unlock?.status === "ACTIVE") return { open: true, unlocked: true };
  return { open: false, price: prices[ref.type], freeLeft: !used, access: a };
}

/**
 * A word for the download button so the teacher knows before tapping: "Free" (their free
 * download is unused), the price, "Paid" (bought already), or null when downloads are open
 * anyway (a term pass, test mode). Never throws; a lookup that fails just leaves the button plain.
 */
export async function downloadNote(
  userId: string,
  exportHref: string,
): Promise<string | null> {
  const ref = parseDocRef(
    new URLSearchParams(exportHref.slice(exportHref.indexOf("?") + 1)),
  );
  if (!ref) return null;
  try {
    const state = await downloadAccess(userId, ref);
    if (state.open) return state.unlocked ? "Paid" : null;
    return state.freeLeft ? "Free" : `KES ${state.price}`;
  } catch {
    return null;
  }
}
