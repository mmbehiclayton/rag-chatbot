import { type NextRequest, NextResponse } from "next/server";
import {
  assessmentKind,
  type ChecklistContent,
  type PracticalContent,
  RUBRIC_LEVELS,
} from "@/lib/assessment-kinds";
import {
  COGNITIVE_LEVELS,
  percent,
  type SpecTable,
  specTable,
} from "@/lib/assessment-specs";
import { auth } from "@/lib/auth";
import { classHref, classLessonWhere } from "@/lib/classes";
import { db } from "@/lib/db";
import {
  cleanTitle,
  DOC_LABELS,
  type DocContext,
  type DocKind,
  docFields,
  docName,
  teacherContext,
} from "@/lib/documents";
import { downloadAccess, exportQuery, parseDocRef } from "@/lib/downloads";
import { DOCX_TYPE, htmlToDocx } from "@/lib/export-docx";
import { filingLabel, filingOf } from "@/lib/filing";
import { licenceFor, stampHTML } from "@/lib/licence";
import { siteUrl } from "@/lib/site-url";
import {
  formatDay,
  formatRange,
  streamLabel,
  termLabel,
} from "@/lib/term-pack";
import { getSchemeSchedule, getTeacherTerms } from "@/lib/term-pack-data";

// Returns a print-ready HTML document for a scheme, lesson plan, or assessment.
// Usage: GET /api/export?type=scheme&id=<id>, and &format=docx for a Word file.
// A term file: GET /api/export?type=term&grade=Grade 7&subject=English&term=Term 2 2026
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.userId)
    return new NextResponse("Unauthorized", { status: 401 });

  const { searchParams } = req.nextUrl;
  const type = searchParams.get("type"); // scheme | lesson | assessment | notes | record | term
  const id = searchParams.get("id");
  const grade = searchParams.get("grade");
  const subject = searchParams.get("subject");

  if (!type) return new NextResponse("Missing params", { status: 400 });

  let html = "";

  try {
    if (type === "term") {
      const term = searchParams.get("term");
      if (!grade || !subject || !term)
        return new NextResponse("Missing params", { status: 400 });
      const file = await buildTermFileHTML(
        session.userId,
        grade,
        subject,
        term,
      );
      if (!file) return new NextResponse("Not found", { status: 404 });
      const locked = await lockedRedirect(session.userId, searchParams);
      if (locked) return locked;
      const licence = await licenceFor(
        session.userId,
        { type, title: htmlTitle(file) },
        "print",
      );
      return new NextResponse(withBar(stampHTML(file, licence), searchParams), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (!id) return new NextResponse("Missing params", { status: 400 });

    if (type === "scheme") {
      const scheme = await db.schemeOfWork.findFirst({
        where: { id, teacherId: session.userId },
        include: TEACHER_INCLUDE,
      });
      if (!scheme) return new NextResponse("Not found", { status: 404 });
      const schedule = await getSchemeSchedule(scheme);
      const weekDates = new Map(
        schedule.weeks.map((w) => [w.number, formatRange(w.from, w.to)]),
      );
      html = buildSchemeHTML(scheme, weekDates);
    } else if (type === "record") {
      const scheme = await db.schemeOfWork.findFirst({
        where: { id, teacherId: session.userId },
        include: TEACHER_INCLUDE,
      });
      if (!scheme) return new NextResponse("Not found", { status: 404 });
      html = buildRecordHTML(
        scheme,
        await getSchemeSchedule(
          scheme,
          searchParams.get("stream") ?? undefined,
        ),
      );
    } else if (type === "lesson") {
      const lesson = await db.lessonPlan.findFirst({
        where: { id, teacherId: session.userId },
        include: LESSON_EXPORT_INCLUDE,
      });
      if (!lesson) return new NextResponse("Not found", { status: 404 });
      html = buildLessonHTML(lesson);
    } else if (type === "assessment") {
      const assessment = await db.assessment.findFirst({
        where: { id, teacherId: session.userId },
        include: TEACHER_INCLUDE,
      });
      if (!assessment) return new NextResponse("Not found", { status: 404 });
      html = buildAssessmentHTML(assessment);
    } else if (type === "notes") {
      const note = await db.lessonNote.findFirst({
        where: { id, teacherId: session.userId },
        include: {
          lessonPlan: {
            select: {
              topic: true,
              grade: true,
              subject: true,
              content: true,
              term: true,
              year: true,
              scheme: {
                select: { grade: true, subject: true, term: true, year: true },
              },
            },
          },
          ...TEACHER_INCLUDE,
        },
      });
      if (!note) return new NextResponse("Not found", { status: 404 });
      html = buildNotesHTML(note);
    } else {
      return new NextResponse("Invalid type", { status: 400 });
    }

    const locked = await lockedRedirect(session.userId, searchParams);
    if (locked) return locked;

    const docx = searchParams.get("format") === "docx";
    const licence = await licenceFor(
      session.userId,
      { type, id, title: htmlTitle(html) },
      docx ? "docx" : "print",
    );
    html = stampHTML(html, licence);

    if (docx) {
      const { title, data } = await htmlToDocx(
        html,
        html.includes("A4 landscape"),
        licence,
      );
      // Windows and phones refuse some characters in file names.
      const name = title.replace(/[\\/:*?"<>|]+/g, "").trim() || "Elimu";
      return new NextResponse(data, {
        headers: {
          "Content-Type": DOCX_TYPE,
          "Content-Disposition": `attachment; filename="elimu.docx"; filename*=UTF-8''${encodeURIComponent(name)}.docx`,
        },
      });
    }

    return new NextResponse(withBar(html, searchParams), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Export failed";
    return new NextResponse(message, { status: 500 });
  }
}

/** Sends the teacher to the download page when this document still needs paying for, else null. */
async function lockedRedirect(userId: string, params: URLSearchParams) {
  const ref = parseDocRef(params);
  if (!ref || (await downloadAccess(userId, ref)).open) return null;
  return NextResponse.redirect(
    new URL(`/dashboard/download?${exportQuery(params)}`, siteUrl()),
    303,
  );
}

const baseCSS = `
  * { box-sizing: border-box; }
  html { height: auto; }
  body {
    font-family: Georgia, serif; color: #111; margin: 0;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  h1 { font-size: 21px; font-weight: bold; border-bottom: 3px solid #111; padding-bottom: 8px; margin: 0 0 4px; }
  h2 { font-size: 16px; font-weight: bold; margin-top: 22px; margin-bottom: 8px; }
  h3 { font-size: 14px; font-weight: bold; margin-top: 16px; margin-bottom: 4px; }
  .center { text-align: center; }
  .meta { display: flex; flex-wrap: wrap; gap: 20px; margin: 10px 0 6px; font-size: 13px; color: #555; }
  .meta.center { justify-content: center; }
  .meta span { font-weight: bold; color: #111; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 12px; }
  thead { display: table-header-group; }     /* repeat header on every printed page */
  th { background: #f0f0f0; font-weight: bold; text-align: left; padding: 8px; border: 1px solid #bbb; }
  td { padding: 7px 8px; border: 1px solid #ccc; vertical-align: top; }
  ul { margin: 4px 0 4px 16px; padding: 0; }
  li { margin: 3px 0; }
  .section { margin-bottom: 20px; }
  .badge { display: inline-block; background: #f3f4f6; color: #111; border: 1px solid #d1d5db; border-radius: 4px; padding: 2px 7px; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: .04em; margin: 2px 3px 2px 0; }
  .print-bar { position: sticky; top: 0; z-index: 50; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 12px; background: #fff; border-bottom: 1px solid #d1d5db; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  .print-bar a, .print-bar button { display: inline-flex; align-items: center; min-height: 44px; padding: 0 14px; border-radius: 6px; font: inherit; font-size: 14px; font-weight: 600; text-decoration: none; cursor: pointer; white-space: nowrap; }
  .bar-back { color: #111; padding-left: 4px !important; }
  .bar-actions { display: flex; gap: 8px; }
  .bar-btn { background: #fff; color: #111; border: 1px solid #d1d5db; }
  .bar-main { background: #076fed; color: #fff; border: 1px solid #076fed; }
  .page-break { page-break-before: always; break-before: page; }
  .doc-detail { font-size: 15px; margin: 8px 0 0; }
  .draft { text-align: right; font-size: 11px; margin: 0 0 6px; }
  .draft span { border: 1px solid #111; padding: 2px 8px; }
  table.head th { width: 18%; text-align: left; }
  table.head td { width: 32%; height: 26px; }

  /* Scheme of work — proportional, page-fitting landscape grid (monochrome, print-friendly) */
  table.scheme { table-layout: fixed; font-size: 9px; margin-top: 8px; }
  table.scheme th { padding: 7px 6px; font-size: 8.5px; text-transform: uppercase; letter-spacing: .03em; text-align: center; }
  table.scheme td { padding: 7px 6px; word-wrap: break-word; overflow-wrap: anywhere; line-height: 1.5; }
  table.scheme ul { margin: 0 0 0 12px; }
  table.scheme li { margin: 2.5px 0; }
  table.scheme td.wk { text-align: center; font-weight: bold; background: #f3f4f6; }
  table.scheme td.b { font-weight: bold; }
  table.scheme td.sub { font-style: italic; }
  table.scheme td .out { margin: 2.5px 0; }       /* learning outcomes keep their a) b) c) lettering, no bullet */
  table.scheme td.kiq div { font-style: italic; margin: 3px 0; }
  table.scheme td.assess div { font-weight: bold; margin: 3px 0; }
  table.scheme td.assess div::before { content: "\\2713  "; }

  @media print { .print-bar { display: none; } }
`;

/** The document's title, as the page gives it, for the download log. */
function htmlTitle(html: string) {
  return (html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

// Marks where the bar goes on screen (withBar); the Word file drops it.
const printScript = `<button class="print-btn" onclick="window.print()">Print / Save PDF</button>`;

/** The document's own page in Elimu, where the print view's Back goes. */
function docPagePath(params: URLSearchParams) {
  const id = encodeURIComponent(params.get("id") ?? "");
  switch (params.get("type")) {
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
      return classHref(params.get("grade") ?? "", params.get("subject") ?? "");
    default:
      return "/dashboard";
  }
}

/**
 * Swaps the print button for a bar across the top: back to the document in Elimu, the Word file,
 * and Print. Back returns to the page the teacher came from when there is one, so their place is
 * kept. Hidden when printing.
 */
function withBar(html: string, params: URLSearchParams) {
  const word = new URLSearchParams(exportQuery(params));
  word.set("format", "docx");
  const bar = `<nav class="print-bar" aria-label="Document"><a class="bar-back" href="${esc(docPagePath(params))}" onclick="if(history.length>1&&document.referrer.indexOf(location.origin)===0){history.back();return false}">&larr; Back</a><span class="bar-actions">${params.get("type") === "term" ? "" : `<a class="bar-btn" href="/api/export?${esc(word.toString())}">Word</a>`}<button class="bar-btn bar-main" onclick="window.print()">Print / Save PDF</button></span></nav>`;
  return html.replace(printScript, bar);
}

// Renders the body inside a fixed-size "paper" sheet so the on-screen preview
// matches the printed output exactly, with consistent edge margins on both.
function wrap(title: string, body: string, landscape = false) {
  const W = landscape ? "297mm" : "210mm";
  const H = landscape ? "210mm" : "297mm";
  const PAD = landscape ? "12mm" : "16mm";
  const SIZE = landscape ? "A4 landscape" : "A4 portrait";
  const paper = `
    body { background: #525659; padding: 28px 0; }
    .page { background: #fff; width: ${W}; min-height: ${H}; margin: 0 auto; padding: ${PAD}; box-shadow: 0 6px 28px rgba(0,0,0,.35); }
    @media print {
      body { background: #fff; padding: 0; }
      .page { width: auto; min-height: 0; margin: 0; padding: 0; box-shadow: none; }
      @page { size: ${SIZE}; margin: ${PAD}; }
    }
  `;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title><style>${baseCSS}${paper}</style></head><body>${printScript}<div class="page">${body}</div></body></html>`;
}

/**
 * The same header on every printed document: the document type, its title,
 * then School, Teacher, Grade, Learning area, Term and Year from the profile.
 * `extra` cells are already-escaped HTML, for the document's own fields.
 */
/** Marks a document the teacher hasn't checked yet, above its header. */
function draftMark(doc: { checkedAt?: Date | null }) {
  return doc.checkedAt
    ? ""
    : `<p class="draft"><span>Draft – check before use</span></p>`;
}

function docHead(
  kind: DocKind,
  ctx: DocContext,
  detail?: string | null,
  extra: Array<[string, string]> = [],
) {
  const cells = [
    ...docFields(ctx).map((f): [string, string] => [f.label, esc(f.value)]),
    ...extra,
  ];
  const rows: string[] = [];
  for (let i = 0; i < cells.length; i += 2) {
    const [a, b] = [cells[i], cells[i + 1]];
    rows.push(
      `<tr><th>${a[0]}</th><td>${a[1]}</td>${b ? `<th>${b[0]}</th><td>${b[1]}</td>` : "<th></th><td></td>"}</tr>`,
    );
  }
  const title = cleanTitle(detail);
  return `
    <div class="center"><h1>${DOC_LABELS[kind]}</h1>${title ? `<p class="doc-detail">${esc(title)}</p>` : ""}</div>
    <table class="head">${rows.join("")}</table>`;
}

function arr(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  return [];
}

function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

type SchemeWeekRow = Record<string, unknown>;

type SchemeContent = {
  weeks?: Array<{
    weekNumber?: number;
    rows?: SchemeWeekRow[];
  }>;
};

type SchemeExport = {
  title?: string | null;
  grade?: string | null;
  subject?: string | null;
  term?: string | null;
  year?: number | null;
  content?: unknown;
  teacher?: TeacherInfo;
  checkedAt?: Date | null;
};

function schemeBody(scheme: SchemeExport, weekDates?: Map<number, string>) {
  const c = (scheme.content ?? {}) as SchemeContent;
  const weeks = Array.isArray(c.weeks) ? c.weeks : [];

  // Flatten week -> rows. The week number is shown on the first row only (no
  // rowspan) so the table paginates cleanly across printed pages.
  const weekRows = weeks
    .map((week) => {
      const rows = Array.isArray(week.rows) ? week.rows : [];
      return rows
        .map((row, ri) => {
          const rowData = row as Record<string, unknown>;
          return `
      <tr>
        <td class="wk">${ri === 0 ? `Wk ${esc(week.weekNumber)}${weekDates?.get(week.weekNumber ?? 0) ? `<br><small>${esc(weekDates.get(week.weekNumber ?? 0))}</small>` : ""}` : ""}</td>
        <td class="center">${ri + 1}</td>
        <td class="b">${esc(rowData.strand)}</td>
        <td class="sub">${esc(rowData.subStrand)}</td>
        <td>${arr(rowData.specificLearningOutcomes)
          .map((o) => `<div class="out">${esc(o)}</div>`)
          .join("")}</td>
        <td><ul>${arr(rowData.learningExperiences)
          .map((e) => `<li>${esc(e)}</li>`)
          .join("")}</ul></td>
        <td class="kiq">${arr(rowData.keyInquiryQuestions)
          .map((q) => `<div>Q: ${esc(q)}</div>`)
          .join("")}</td>
        <td>${arr(rowData.learningResources)
          .map((r) => `<span class="badge">${esc(r)}</span>`)
          .join("")}</td>
        <td class="assess">${arr(rowData.assessmentMethods)
          .map((a) => `<div>${esc(a)}</div>`)
          .join("")}</td>
        <td></td>
      </tr>
    `;
        })
        .join("");
    })
    .join("");

  const body = `
    ${draftMark(scheme)}${docHead(
      "scheme",
      {
        ...teacherContext(scheme.teacher),
        grade: scheme.grade,
        subject: scheme.subject,
        term: scheme.term,
        year: scheme.year,
      },
      scheme.title,
    )}
    <table class="scheme">
      <colgroup>
        <col style="width:4%"><col style="width:4%"><col style="width:7%"><col style="width:7%"><col style="width:19%">
        <col style="width:18%"><col style="width:12%"><col style="width:10%"><col style="width:11%"><col style="width:8%">
      </colgroup>
      <thead><tr>
        <th>Week</th><th>Lesson</th><th>Strand</th><th>Sub-strand</th>
        <th>Specific learning outcomes</th>
        <th>Learning experiences</th>
        <th>Key inquiry questions</th>
        <th>Learning resources</th>
        <th>Assessment</th>
        <th>Reflection / remarks</th>
      </tr></thead>
      <tbody>${weekRows}</tbody>
    </table>
  `;
  return body;
}

type RecordScheme = {
  teacher?: TeacherInfo;
  checkedAt?: Date | null;
  grade: string;
  subject?: string;
  term?: string;
};

type Schedule = Awaited<ReturnType<typeof getSchemeSchedule>>;

function recordName(scheme: RecordScheme, schedule: Schedule) {
  return {
    cls: streamLabel(scheme.grade, schedule.stream),
    term: schedule.term ? termLabel(schedule.term) : scheme.term,
  };
}

function buildRecordHTML(scheme: RecordScheme, schedule: Schedule) {
  const { cls, term } = recordName(scheme, schedule);
  return wrap(
    docName("record", { grade: cls, subject: scheme.subject }, term),
    recordBody(scheme, schedule),
  );
}

function recordBody(scheme: RecordScheme, schedule: Schedule) {
  const taught = schedule.slots.filter(
    (s) => s.status === "TAUGHT" && s.lessonNumber,
  );
  const { cls, term } = recordName(scheme, schedule);
  const rows = taught
    .map(
      (s) => `
      <tr>
        <td class="center">${esc(s.week)}</td>
        <td>${esc(formatDay(s.date))}</td>
        <td class="center">${esc(s.lessonNumber)}</td>
        <td><b>${esc(s.lesson?.strand)}</b><br>${esc(s.lesson?.subStrand)}</td>
        <td>${arr(s.lesson?.outcomes)
          .map((o) => `<div>${esc(o)}</div>`)
          .join("")}</td>
        <td>${esc(s.remarks ?? s.plan?.reflection)}</td>
        <td></td>
      </tr>`,
    )
    .join("");
  const sign = (role: string) =>
    `<div class="sign"><div class="line"></div><div>${role}: name, signature and date</div></div>`;
  const body = `
    <style>
      table.record { table-layout: fixed; font-size: 11px; }
      table.record td div { margin: 2px 0; }
      .signs { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-top: 40px; font-size: 12px; page-break-inside: avoid; }
      .sign .line { border-bottom: 1px solid #111; height: 36px; margin-bottom: 6px; }
    </style>
    ${docHead("record", {
      ...teacherContext(scheme.teacher),
      grade: cls,
      subject: scheme.subject,
      term,
    })}
    <table class="record">
      <colgroup>
        <col style="width:6%"><col style="width:11%"><col style="width:7%"><col style="width:22%">
        <col style="width:28%"><col style="width:18%"><col style="width:8%">
      </colgroup>
      <thead><tr>
        <th>Week</th><th>Date</th><th>Lesson</th><th>Strand / sub-strand</th><th>Work covered</th><th>Reflection</th><th>Sign</th>
      </tr></thead>
      <tbody>${rows || `<tr><td colspan="7" class="center">No lessons marked as taught yet.</td></tr>`}</tbody>
    </table>
    <div class="signs">${sign("Teacher")}${sign("Head of department")}${sign("Head teacher")}</div>
  `;
  return body;
}

function buildSchemeHTML(
  scheme: SchemeExport,
  weekDates?: Map<number, string>,
) {
  return wrap(
    docName(
      "scheme",
      scheme,
      [scheme.term, scheme.year].filter(Boolean).join(" "),
    ),
    schemeBody(scheme, weekDates),
    /* landscape */ true,
  );
}

type LessonActivity = {
  activityName?: string;
  duration?: number | string;
  grouping?: string;
  teacherActions?: unknown[];
  learnerActions?: unknown[];
  integration?: string;
  formativeAssessment?: string;
};

type Pair = Record<string, string | undefined>;

type LessonContent = {
  strand?: string;
  subStrand?: string;
  specificLearningOutcomes?: unknown[];
  keyInquiryQuestions?: unknown[];
  learningResources?: unknown[];
  organisationOfLearning?: string;
  coreCompetencies?: Pair[];
  values?: Pair[];
  pertinentIssues?: Pair[];
  linksToOtherLearningAreas?: Pair[];
  lessonStructure?: {
    introduction?: {
      duration?: number | string;
      recap?: string;
      connectionToLearnersLives?: string;
      learningIntentions?: string;
      successCriteria?: string;
    };
    mainActivities?: LessonActivity[];
    conclusion?: {
      duration?: number | string;
      summary?: string;
      assessmentOfLearning?: string;
      exitTicket?: string;
      homework?: string;
    };
    differentiation?: {
      learnersNeedingSupport?: string;
      averageLearners?: string;
      advancedLearners?: string;
    };
  };
  extendedActivity?: string;
  reflection?: string;
  assessmentRubric?: {
    criteria?: string;
    exceeding?: string;
    meeting?: string;
    approaching?: string;
    below?: string;
  };
};

type LessonExport = {
  topic?: string | null;
  content?: unknown;
  lessonNumber?: number | null;
  durationMinutes?: number | null;
  schemeId?: string | null;
  grade?: string | null;
  subject?: string | null;
  term?: string | null;
  year?: number | null;
  week?: number | null;
  scheme?: {
    grade?: string | null;
    subject?: string | null;
    term?: string | null;
    year?: number | null;
  } | null;
  teacher?: TeacherInfo;
  checkedAt?: Date | null;
};

/** The teacher's name and school, for document headers. */
const TEACHER_INCLUDE = {
  teacher: {
    select: {
      name: true,
      schoolName: true,
      tenant: { select: { name: true } },
    },
  },
} as const;

type TeacherInfo = {
  name?: string | null;
  schoolName?: string | null;
  tenant?: { name?: string | null } | null;
} | null;

/** What every exported lesson plan needs for its header. */
const LESSON_EXPORT_INCLUDE = {
  scheme: {
    select: { grade: true, subject: true, term: true, year: true },
  },
  ...TEACHER_INCLUDE,
} as const;

/** A lesson plan in the KICD order, with blanks for what the teacher fills in by hand. */
function lessonBody(lesson: LessonExport) {
  const c = (lesson.content ?? {}) as LessonContent;
  const intro = c.lessonStructure?.introduction;
  const steps = Array.isArray(c.lessonStructure?.mainActivities)
    ? c.lessonStructure.mainActivities
    : [];
  const conc = c.lessonStructure?.conclusion;
  const diff = c.lessonStructure?.differentiation;
  const rubric = c.assessmentRubric;
  const extended = c.extendedActivity || conc?.homework;
  const grade = lesson.grade ?? lesson.scheme?.grade ?? "";
  const subject = lesson.subject ?? lesson.scheme?.subject ?? "";
  const numbered = !!(lesson.schemeId && lesson.lessonNumber);

  const list = (items: unknown, tag = "ul") => {
    const li = arr(items)
      .filter((x) => x.trim())
      .map((x) => `<li>${esc(x)}</li>`)
      .join("");
    return li ? `<${tag}>${li}</${tag}>` : "";
  };
  const para = (label: string, value?: string) =>
    value ? `<p><strong>${label}:</strong> ${esc(value)}</p>` : "";
  const pairs = (title: string, items: unknown, name: string, how: string) => {
    const rows = (Array.isArray(items) ? (items as Pair[]) : [])
      .filter((x) => x?.[name] || x?.[how])
      .map((x) => `<li><strong>${esc(x[name])}:</strong> ${esc(x[how])}</li>`)
      .join("");
    return rows ? `<h3>${title}</h3><ul>${rows}</ul>` : "";
  };
  const section = (title: string, inner: string) =>
    inner.trim() ? `<div class="section"><h2>${title}</h2>${inner}</div>` : "";
  const mins = (v: unknown) => (v ? ` (${esc(v)} min)` : "");
  const outcomes = list(c.specificLearningOutcomes, "ol");
  const blank = `<div class="blank"></div>`;

  const stepRows = steps
    .map(
      (a, i) => `
    <tr>
      <td><strong>Step ${i + 1}</strong>${a.activityName ? `<br>${esc(a.activityName)}` : ""}${a.grouping ? `<br><em>${esc(a.grouping)}</em>` : ""}</td>
      <td class="center">${esc(a.duration)}</td>
      <td>${list(a.learnerActions, "ol")}</td>
      <td>${list(a.teacherActions, "ol")}${a.formativeAssessment ? `<p><strong>Check:</strong> ${esc(a.formativeAssessment)}</p>` : ""}</td>
      <td>${esc(a.integration)}</td>
    </tr>`,
    )
    .join("");

  return `
    <style>
      .blank { border-bottom: 1px solid #999; height: 26px; }
      .signline { margin-top: 28px; font-size: 12px; }
    </style>
    ${draftMark(lesson)}${docHead(
      "lesson",
      {
        ...teacherContext(lesson.teacher),
        grade,
        subject,
        term: lesson.term ?? lesson.scheme?.term,
        year: lesson.year ?? lesson.scheme?.year,
      },
      lesson.topic,
      [
        ["Date", ""],
        [
          "Time",
          lesson.durationMinutes
            ? `${esc(lesson.durationMinutes)} minutes`
            : "",
        ],
        ["Roll", "Boys ___ Girls ___ Total ___"],
        [
          "Lesson",
          numbered
            ? `${lesson.week ? `Week ${esc(lesson.week)}, ` : ""}lesson ${esc(lesson.lessonNumber)}`
            : "",
        ],
      ],
    )}

    <div class="section">
      ${para("Strand", c.strand)}
      ${para("Sub-strand", c.subStrand)}
    </div>

    ${section(
      "Specific learning outcomes",
      outcomes
        ? `<p>By the end of the lesson, the learner should be able to:</p>${outcomes}`
        : "",
    )}
    ${section("Key inquiry question(s)", list(c.keyInquiryQuestions))}
    ${section("Learning resources", list(c.learningResources))}
    ${section(
      "Organisation of learning",
      c.organisationOfLearning ? `<p>${esc(c.organisationOfLearning)}</p>` : "",
    )}

    ${section(
      `Introduction${mins(intro?.duration)}`,
      para("Recap", intro?.recap) +
        para("Link to learners' lives", intro?.connectionToLearnersLives) +
        para("Learning intentions", intro?.learningIntentions) +
        para("Success criteria", intro?.successCriteria),
    )}

    ${section(
      "Lesson development",
      stepRows
        ? `<table>
        <thead><tr><th style="width:16%">Step</th><th style="width:6%">Min</th><th>Learner activities</th><th>Teacher</th><th style="width:20%">Competencies, values and PCIs</th></tr></thead>
        <tbody>${stepRows}</tbody>
      </table>`
        : "",
    )}

    ${section(
      `Conclusion${mins(conc?.duration)}`,
      para("Summary", conc?.summary) +
        para("Assessment", conc?.assessmentOfLearning) +
        para("Exit ticket", conc?.exitTicket),
    )}

    ${section("Extended activity", extended ? `<p>${esc(extended)}</p>` : "")}

    ${section(
      "Differentiation",
      diff
        ? `<table>
        <tr><th>Learners needing support</th><th>Most learners</th><th>Learners ready for more</th></tr>
        <tr>
          <td>${esc(diff.learnersNeedingSupport)}</td>
          <td>${esc(diff.averageLearners)}</td>
          <td>${esc(diff.advancedLearners)}</td>
        </tr>
      </table>`
        : "",
    )}

    ${section(
      "Core competencies, values and issues",
      pairs(
        "Core competencies",
        c.coreCompetencies,
        "competency",
        "howDeveloped",
      ) +
        pairs("Values", c.values, "value", "howDemonstrated") +
        pairs(
          "Pertinent and contemporary issues",
          c.pertinentIssues,
          "issue",
          "howAddressed",
        ) +
        pairs(
          "Links to other learning areas",
          c.linksToOtherLearningAreas,
          "learningArea",
          "link",
        ),
    )}

    ${section(
      "Assessment rubric",
      rubric
        ? `${rubric.criteria ? `<p>${esc(rubric.criteria)}</p>` : ""}<table>
        <tr><th>Exceeding expectations</th><th>Meeting expectations</th><th>Approaching expectations</th><th>Below expectations</th></tr>
        <tr><td>${esc(rubric.exceeding)}</td><td>${esc(rubric.meeting)}</td><td>${esc(rubric.approaching)}</td><td>${esc(rubric.below)}</td></tr>
      </table>`
        : "",
    )}

    <div class="section">
      <h2>Reflection</h2>
      ${c.reflection ? `<p>${esc(c.reflection)}</p>` : blank + blank + blank}
      <div class="signline">Teacher's signature: ____________________ &nbsp; Date: ____________</div>
    </div>
  `;
}

function buildLessonHTML(lesson: LessonExport) {
  const cls = {
    grade: lesson.grade ?? lesson.scheme?.grade,
    subject: lesson.subject ?? lesson.scheme?.subject,
  };
  const detail =
    lesson.schemeId && lesson.lessonNumber
      ? `${cleanTitle(lesson.topic)}, lesson ${lesson.lessonNumber}`
      : lesson.topic;
  return wrap(docName("lesson", cls, detail), lessonBody(lesson));
}

type AssessmentQuestion = {
  questionNumber?: string | number;
  questionText?: string;
  learningOutcome?: string;
  level?: string;
  marks?: number | string;
  modelAnswer?: string;
  rubric?: string;
};

type AssessmentSection = {
  sectionTitle?: string;
  instructions?: string;
  questions?: AssessmentQuestion[];
};

type AssessmentContent = {
  subStrandsCovered?: unknown[];
  sections?: AssessmentSection[];
  markingScheme?: {
    gradingScale?: Array<{
      level?: string;
      range?: string;
      descriptor?: string;
    }>;
    totalMarks?: number | string;
  };
};

type AssessmentExport = {
  title?: string | null;
  grade?: string | null;
  subject?: string | null;
  type?: string | null;
  term?: string | null;
  year?: number | null;
  content?: unknown;
  teacher?: TeacherInfo;
  checkedAt?: Date | null;
};

/** The learners' paper first, then the teacher's marking scheme on a new page. */
function assessmentBody(assessment: AssessmentExport) {
  const kind = assessmentKind(assessment.content);
  if (kind === "practical") return practicalBody(assessment);
  if (kind === "checklist") return checklistBody(assessment);
  const c = (assessment.content ?? {}) as AssessmentContent;
  const sections = Array.isArray(c.sections) ? c.sections : [];
  const questionsOf = (section: AssessmentSection) =>
    Array.isArray(section.questions) ? section.questions : [];
  const title = cleanTitle(assessment.title);
  const sectionName = (section: AssessmentSection, si: number) =>
    `Section ${si + 1}${section.sectionTitle ? `: ${esc(section.sectionTitle)}` : ""}`;
  const specs = specTable(sections);

  const paper = sections
    .map((section, si) => {
      const rows = questionsOf(section)
        .map(
          (q, qi) => `
      <tr>
        <td class="center" style="width:30px">${esc(q.questionNumber ?? qi + 1)}</td>
        <td>${esc(q.questionText)}</td>
        <td class="center" style="width:60px">${q.marks != null ? `(${esc(q.marks)})` : ""}</td>
      </tr>`,
        )
        .join("");
      return `
      <div class="section">
        <h2>${sectionName(section, si)}</h2>
        ${section.instructions ? `<p><em>${esc(section.instructions)}</em></p>` : ""}
        <table class="paper"><tbody>${rows}</tbody></table>
      </div>`;
    })
    .join("");

  const marking = sections
    .map((section, si) => {
      const rows = questionsOf(section)
        .map(
          (q, qi) => `
      <tr>
        <td class="center">${esc(q.questionNumber ?? qi + 1)}</td>
        <td>${esc(q.modelAnswer)}${q.rubric ? `<br><small>${esc(q.rubric)}</small>` : ""}</td>
        <td>${esc(q.learningOutcome)}</td>
        ${specs.hasLevels ? `<td>${esc(q.level)}</td>` : ""}
        <td class="center">${esc(q.marks)}</td>
      </tr>`,
        )
        .join("");
      return `
      <h3>${sectionName(section, si)}</h3>
      <table>
        <thead><tr><th style="width:30px">#</th><th>Answer</th><th style="width:30%">Outcome tested</th>${specs.hasLevels ? `<th style="width:15%">Level</th>` : ""}<th style="width:50px">Marks</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
    })
    .join("");

  const scale = Array.isArray(c.markingScheme?.gradingScale)
    ? c.markingScheme.gradingScale
    : [];
  const scaleRows = scale
    .map(
      (g) =>
        `<tr><td>${esc(g.level)}</td><td class="center">${esc(g.range)}</td><td>${esc(g.descriptor)}</td></tr>`,
    )
    .join("");
  const covered = arr(c.subStrandsCovered).filter((x) => x.trim());

  return `
    <style>
      table.paper td { border: none; border-bottom: 1px solid #eee; }
    </style>
    ${draftMark(assessment)}${docHead(
      "assessment",
      {
        ...teacherContext(assessment.teacher),
        grade: assessment.grade,
        subject: assessment.subject,
        term: assessment.term,
        year: assessment.year,
      },
      title,
      [
        ["Type", esc(assessment.type)],
        ["Total marks", esc(c.markingScheme?.totalMarks)],
      ],
    )}
    <table class="head">
      <tr><th>Learner's name</th><td></td><th>Admission no.</th><td></td></tr>
      <tr><th>Stream</th><td></td><th>Date</th><td></td></tr>
    </table>
    ${paper}

    <div class="page-break"></div>
    <div class="center"><h1>Marking scheme</h1><p class="doc-detail">${esc(title)}</p></div>
    ${covered.length ? `<div class="section"><h2>Sub-strands covered</h2><ul>${covered.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}
    <div class="section">${marking}</div>
    ${
      scaleRows
        ? `<div class="section">
      <h2>Grading</h2>
      <table><thead><tr><th>Level</th><th>Marks</th><th>What the learner can do</th></tr></thead><tbody>${scaleRows}</tbody></table>
      <p><small>Check the mark ranges against your school's grading policy.</small></p>
    </div>`
        : ""
    }
    ${specs.rows.length ? specsPage(title, specs) : ""}
  `;
}

/** One page after the marking scheme: marks per learning outcome and cognitive level. */
function specsPage(title: string | null, specs: SpecTable) {
  const levels = specs.hasLevels ? COGNITIVE_LEVELS : [];
  const cell = (marks: number) =>
    `<td class="center">${marks ? marks : ""}</td>`;
  const rows = specs.rows
    .map(
      (r) => `
      <tr>
        <td>${esc(r.outcome)}</td>
        <td class="center">${esc(r.questions.join(", "))}</td>
        ${levels.map((_, i) => cell(r.byLevel[i])).join("")}
        <td class="center"><strong>${r.marks}</strong></td>
        <td class="center">${percent(r.marks, specs.total)}</td>
      </tr>`,
    )
    .join("");
  const levelHeads = levels.map((l) => `<th class="center">${l}</th>`).join("");
  const cols = [levels.length ? 33 : 65, 12, ...levels.map(() => 10), 8, 7]
    .map((w) => `<col style="width: ${w}%">`)
    .join("");
  return `
    <div class="page-break"></div>
    <div class="center"><h1>Table of specifications</h1><p class="doc-detail">${esc(title)}</p></div>
    <table>
      <colgroup>${cols}</colgroup>
      <thead><tr><th>Learning outcome</th><th class="center">Questions</th>${levelHeads}<th class="center">Marks</th><th class="center">%</th></tr></thead>
      <tbody>${rows}
        <tr>
          <th>Total</th><th></th>
          ${levels.map((_, i) => `<th class="center">${specs.byLevel[i]}</th>`).join("")}
          <th class="center">${specs.total}</th><th class="center">100%</th>
        </tr>
        ${
          levels.length
            ? `<tr><th>Share of marks</th><th></th>${levels.map((_, i) => `<th class="center">${percent(specs.byLevel[i], specs.total)}</th>`).join("")}<th></th><th></th></tr>`
            : ""
        }
      </tbody>
    </table>
    <p><small>Marks per learning outcome${levels.length ? " and per level (Knowledge, Comprehension, Application, Higher order)" : ""}. Check that the spread suits your class before you give the paper.</small></p>
  `;
}

/** The header for a task or checklist: no total marks, but the sub-strand it covers. */
function taskHead(assessment: AssessmentExport, covered: string[]) {
  return `${draftMark(assessment)}${docHead(
    "assessment",
    {
      ...teacherContext(assessment.teacher),
      grade: assessment.grade,
      subject: assessment.subject,
      term: assessment.term,
      year: assessment.year,
    },
    cleanTitle(assessment.title),
    [
      ["Type", esc(assessment.type)],
      ["Sub-strand", esc(covered.join(", "))],
    ],
  )}`;
}

/** The learners' task sheet, then the teacher's rubric on a new page. */
function practicalBody(assessment: AssessmentExport) {
  const c = (assessment.content ?? {}) as PracticalContent;
  const title = cleanTitle(assessment.title);
  const rubric = (Array.isArray(c.rubric) ? c.rubric : []).filter(
    (r) => r?.criterion,
  );
  const steps = arr(c.steps).filter((x) => x.trim());
  const materials = arr(c.materials).filter((x) => x.trim());
  const rows = rubric
    .map(
      (r, i) => `
      <tr>
        <td><strong>${i + 1}. ${esc(r.criterion)}</strong>${r.learningOutcome ? `<br><small>${esc(r.learningOutcome)}</small>` : ""}</td>
        ${RUBRIC_LEVELS.map((l) => `<td>${esc(r[l.key])}</td>`).join("")}
        <td></td>
      </tr>`,
    )
    .join("");
  const cols = [22, 17, 17, 17, 17, 10]
    .map((w) => `<col style="width: ${w}%">`)
    .join("");

  return `
    ${taskHead(assessment, arr(c.subStrandsCovered))}
    <table class="head">
      <tr><th>Learner's name</th><td></td><th>Admission no.</th><td></td></tr>
      <tr><th>Stream</th><td></td><th>Date</th><td></td></tr>
    </table>
    ${c.task ? `<div class="section"><h2>Your task</h2><p>${esc(c.task)}</p></div>` : ""}
    ${materials.length ? `<div class="section"><h2>You will need</h2><ul>${materials.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}
    ${steps.length ? `<div class="section"><h2>Steps</h2><ol>${steps.map((x) => `<li>${esc(x)}</li>`).join("")}</ol></div>` : ""}

    <div class="page-break"></div>
    <div class="center"><h1>Rubric</h1><p class="doc-detail">${esc(title)}</p></div>
    ${
      rows
        ? `<table>
      <colgroup>${cols}</colgroup>
      <thead><tr><th>Criterion</th>${RUBRIC_LEVELS.map((l) => `<th class="center">${l.short} (${l.score})</th>`).join("")}<th class="center">Score</th></tr></thead>
      <tbody>${rows}
        <tr><th>Total</th><th></th><th></th><th></th><th></th><th class="center">/ ${rubric.length * 4}</th></tr>
      </tbody>
    </table>
    <p><small>${RUBRIC_LEVELS.map((l) => `${l.short} (${l.score}): ${l.label}`).join(" · ")}. Score each criterion, then add up.</small></p>`
        : ""
    }
    ${c.teacherNotes ? `<div class="section"><h2>Notes for the teacher</h2><p>${esc(c.teacherNotes)}</p></div>` : ""}
  `;
}

/** Learners on the class list down the side, one column per thing to look for. Landscape. */
function checklistBody(assessment: AssessmentExport) {
  const c = (assessment.content ?? {}) as ChecklistContent;
  const items = (Array.isArray(c.items) ? c.items : []).filter(
    (i) => i?.indicator,
  );
  const share = Math.max(5, Math.floor(54 / Math.max(items.length, 1)));
  const cols = [4, 20, ...items.map(() => share), 8, 14]
    .map((w) => `<col style="width: ${w}%">`)
    .join("");
  const blank = `<td>&nbsp;</td>`;
  const rows = Array.from(
    { length: 40 },
    (_, i) =>
      `<tr><td class="center">${i + 1}</td>${blank}${items.map(() => blank).join("")}${blank}${blank}</tr>`,
  ).join("");

  return `
    <style>
      table.tick th { font-size: 10px; vertical-align: bottom; }
      table.tick td { height: 20px; padding: 3px 6px; }
    </style>
    ${taskHead(assessment, arr(c.subStrandsCovered))}
    ${c.activity ? `<p><strong>Activity:</strong> ${esc(c.activity)}</p>` : ""}
    <p><small>Tick &#10003; when the learner shows it; leave it blank if not yet. Overall: EE, ME, AE or BE.</small></p>
    <table class="tick">
      <colgroup>${cols}</colgroup>
      <thead><tr><th class="center">No.</th><th>Learner's name</th>${items.map((it, i) => `<th>${i + 1}. ${esc(it.indicator)}</th>`).join("")}<th class="center">Overall</th><th>Remarks</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${
      items.some((it) => it.learningOutcome)
        ? `<div class="section"><h2>What each column tests</h2><ol>${items.map((it) => `<li>${esc(it.indicator)}${it.learningOutcome ? ` – ${esc(it.learningOutcome)}` : ""}</li>`).join("")}</ol></div>`
        : ""
    }
  `;
}

function buildAssessmentHTML(assessment: AssessmentExport) {
  return wrap(
    docName("assessment", assessment, assessment.title),
    assessmentBody(assessment),
    assessmentKind(assessment.content) === "checklist",
  );
}

type NotesExport = {
  resources?: unknown;
  notes?: string | null;
  lessonPlan?: {
    topic?: string | null;
    grade?: string | null;
    subject?: string | null;
    content?: unknown;
    term?: string | null;
    year?: number | null;
    scheme?: {
      grade?: string | null;
      subject?: string | null;
      term?: string | null;
      year?: number | null;
    } | null;
  };
  teacher?: TeacherInfo;
  checkedAt?: Date | null;
};

function buildNotesHTML(note: NotesExport) {
  const plan = note.lessonPlan ?? {};
  return wrap(
    docName(
      "notes",
      {
        grade: plan.grade ?? plan.scheme?.grade,
        subject: plan.subject ?? plan.scheme?.subject,
      },
      plan.topic,
    ),
    notesBody(note),
  );
}

function notesBody(note: NotesExport) {
  const c = (note.resources ?? {}) as Record<string, unknown>;
  const plan = note.lessonPlan ?? {};
  const overview = (c.conceptOverview ?? {}) as Record<string, unknown>;
  const planContent = (plan.content ?? {}) as Record<string, unknown>;
  const cls = {
    grade: plan.grade ?? plan.scheme?.grade,
    subject: plan.subject ?? plan.scheme?.subject,
  };
  const outcomes = arr(c.learningOutcomes).length
    ? c.learningOutcomes
    : planContent.specificLearningOutcomes;
  const list = (items: unknown) =>
    `<ul>${arr(items)
      .map((i) => `<li>${esc(i)}</li>`)
      .join("")}</ul>`;

  const examples = (Array.isArray(c.workedExamples) ? c.workedExamples : [])
    .map((ex, i) => {
      const example = ex as Record<string, unknown>;
      return `
    <h3>${esc(example.title || `Example ${i + 1}`)} <span class="badge">${esc(example.level ?? "")}</span></h3>
    <ol>${arr(example.procedure)
      .map((step) => `<li>${esc(step)}</li>`)
      .join("")}</ol>
    ${example.thinkAloudCommentary ? `<p><em>Think aloud: ${esc(example.thinkAloudCommentary)}</em></p>` : ""}
  `;
    })
    .join("");

  const questions = (
    Array.isArray(c.questioningSequences) ? c.questioningSequences : []
  )
    .map((q) => {
      const question = q as Record<string, unknown>;
      return `
    <tr>
      <td><strong>${esc(question.initialQuestion)}</strong>${question.trigger ? `<br><small>${esc(question.trigger)}</small>` : ""}</td>
      <td>${esc(question.expectedAnswer)}</td>
      <td>${esc(question.followUpIfWrong)}</td>
      <td>${esc(question.followUpIfCorrect)}</td>
    </tr>
  `;
    })
    .join("");

  const misconceptions = (
    Array.isArray(c.misconceptions) ? c.misconceptions : []
  )
    .map((m) => {
      const misconception = m as Record<string, unknown>;
      return `
    <tr><td>${esc(misconception.misconception)}</td><td>${esc(misconception.correction)}</td></tr>
  `;
    })
    .join("");

  const body = `
    ${draftMark(note)}${docHead(
      "notes",
      {
        ...teacherContext(note.teacher),
        ...cls,
        term: plan.term ?? plan.scheme?.term,
        year: plan.year ?? plan.scheme?.year,
      },
      plan.topic,
    )}
    <div class="section">
      ${planContent.strand ? `<p><strong>Strand:</strong> ${esc(planContent.strand)}</p>` : ""}
      ${planContent.subStrand ? `<p><strong>Sub-strand:</strong> ${esc(planContent.subStrand)}</p>` : ""}
      ${
        arr(outcomes).length
          ? `<p><strong>Specific learning outcomes:</strong> by the end of the lesson, the learner should be able to:</p><ol>${arr(
              outcomes,
            )
              .map((o) => `<li>${esc(o)}</li>`)
              .join("")}</ol>`
          : ""
      }
    </div>
    <div class="section">
      <h2>Concept overview</h2>
      <p>${esc(overview.whatLearnersNeedToKnow ?? note.notes ?? "")}</p>
      ${overview.backgroundContext ? `<p>${esc(overview.backgroundContext)}</p>` : ""}
      ${arr(overview.keyDefinitions).length ? `<h3>Key definitions</h3>${list(overview.keyDefinitions)}` : ""}
    </div>
    ${examples ? `<div class="section"><h2>Worked examples</h2>${examples}</div>` : ""}
    ${questions ? `<div class="section"><h2>Questioning</h2><table><thead><tr><th>Question</th><th>Expected answer</th><th>If incorrect</th><th>If correct</th></tr></thead><tbody>${questions}</tbody></table></div>` : ""}
    ${misconceptions ? `<div class="section"><h2>Common misconceptions</h2><table><thead><tr><th>Misconception</th><th>Correction</th></tr></thead><tbody>${misconceptions}</tbody></table></div>` : ""}
    ${arr(c.boardSummary).length ? `<div class="section"><h2>Board summary</h2>${list(c.boardSummary)}</div>` : ""}
    ${arr(c.references).length ? `<div class="section"><h2>References</h2>${list(c.references)}</div>` : ""}
  `;
  return body;
}

type Sheet = { body: string; wide?: boolean };

/** Several documents in one printout, each on its own sheet; schemes print landscape. */
function wrapSheets(title: string, sheets: Sheet[]) {
  const paper = `
    body { background: #525659; padding: 28px 0; }
    .page { background: #fff; width: 210mm; min-height: 297mm; margin: 0 auto 28px; padding: 16mm; box-shadow: 0 6px 28px rgba(0,0,0,.35); }
    .page.wide { width: 297mm; min-height: 210mm; padding: 12mm; }
    @page { size: A4 portrait; margin: 16mm; }
    @page wide { size: A4 landscape; margin: 12mm; }
    @media print {
      body { background: #fff; padding: 0; }
      .page { width: auto; min-height: 0; margin: 0; padding: 0; box-shadow: none; break-after: page; }
      .page:last-child { break-after: auto; }
      .page.wide { page: wide; }
    }
  `;
  const pages = sheets
    .map((s) => `<div class="page${s.wide ? " wide" : ""}">${s.body}</div>`)
    .join("");
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title><style>${baseCSS}${paper}</style></head><body>${printScript}${pages}</body></html>`;
}

const FILING_SCHEME = {
  select: {
    grade: true,
    subject: true,
    term: true,
    year: true,
    createdAt: true,
  },
} as const;

/**
 * Everything a teacher prepared for one class in one term, for when the head teacher asks:
 * the scheme of work, the record of work, then the lesson plans, notes and assessments.
 * Documents are picked the same way the class page files them. Null when there is nothing.
 */
async function buildTermFileHTML(
  teacherId: string,
  grade: string,
  subject: string,
  label: string,
) {
  const [schemes, lessons, notes, assessments, terms] = await Promise.all([
    db.schemeOfWork.findMany({
      where: { teacherId, grade, subject },
      include: TEACHER_INCLUDE,
      orderBy: { createdAt: "asc" },
      take: 50,
    }),
    db.lessonPlan.findMany({
      where: classLessonWhere(teacherId, grade, subject),
      include: { scheme: FILING_SCHEME, ...TEACHER_INCLUDE },
      orderBy: { createdAt: "asc" },
      take: 500,
    }),
    db.lessonNote.findMany({
      where: {
        teacherId,
        lessonPlan: classLessonWhere(teacherId, grade, subject),
      },
      include: {
        lessonPlan: {
          select: {
            topic: true,
            grade: true,
            subject: true,
            content: true,
            term: true,
            year: true,
            createdAt: true,
            scheme: FILING_SCHEME,
          },
        },
        ...TEACHER_INCLUDE,
      },
      orderBy: { updatedAt: "desc" },
      take: 500,
    }),
    db.assessment.findMany({
      where: { teacherId, grade, subject },
      include: TEACHER_INCLUDE,
      orderBy: { createdAt: "asc" },
      take: 200,
    }),
    getTeacherTerms(teacherId),
  ]);

  const inTerm = (doc: Parameters<typeof filingOf>[1]) =>
    filingLabel(filingOf(terms, doc)) === label;
  const termSchemes = schemes.filter(inTerm);
  const schemeOrder = new Map(termSchemes.map((s, i) => [s.id, i]));
  // The scheme's plans in teaching order, then the quick lesson plans by date.
  const termLessons = lessons.filter(inTerm).sort((a, b) => {
    const sa = a.schemeId ? (schemeOrder.get(a.schemeId) ?? 0) : Infinity;
    const sb = b.schemeId ? (schemeOrder.get(b.schemeId) ?? 0) : Infinity;
    if (sa !== sb) return sa - sb;
    if (a.schemeId && b.schemeId) return a.lessonNumber - b.lessonNumber;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
  // The latest notes for each lesson plan, in the same order as the plans.
  const planOrder = new Map(termLessons.map((l, i) => [l.id, i]));
  const seen = new Set<string>();
  const termNotes = notes
    .filter((n) => {
      if (!planOrder.has(n.lessonPlanId) || seen.has(n.lessonPlanId))
        return false;
      seen.add(n.lessonPlanId);
      return true;
    })
    .sort(
      (a, b) =>
        (planOrder.get(a.lessonPlanId) ?? 0) -
        (planOrder.get(b.lessonPlanId) ?? 0),
    );
  const termAssessments = assessments.filter(inTerm);

  if (
    !termSchemes.length &&
    !termLessons.length &&
    !termNotes.length &&
    !termAssessments.length
  )
    return null;

  // A record of work for each stream that has the scheme on its timetable.
  const schemeSheets: Sheet[] = [];
  const recordSheets: Sheet[] = [];
  for (const scheme of termSchemes) {
    const first = await getSchemeSchedule(scheme);
    schemeSheets.push({
      body: schemeBody(
        scheme,
        new Map(first.weeks.map((w) => [w.number, formatRange(w.from, w.to)])),
      ),
      wide: true,
    });
    if (!first.term) continue;
    const schedules = [first];
    for (const stream of first.streams.slice(1))
      schedules.push(await getSchemeSchedule(scheme, stream));
    for (const schedule of schedules)
      recordSheets.push({ body: recordBody(scheme, schedule) });
  }

  const teacher =
    termSchemes[0]?.teacher ??
    termLessons[0]?.teacher ??
    termAssessments[0]?.teacher ??
    termNotes[0]?.teacher;
  const [termName, year] = [
    label.replace(/\s+\d{4}$/, ""),
    label.match(/\d{4}$/)?.[0],
  ];
  const checked = (docs: { checkedAt: Date | null }[]) =>
    docs.filter((d) => d.checkedAt).length;
  const parts: Array<[string, number, number | null]> = [
    [DOC_LABELS.scheme, termSchemes.length, checked(termSchemes)],
    [DOC_LABELS.record, recordSheets.length, null],
    ["Lesson plans", termLessons.length, checked(termLessons)],
    [DOC_LABELS.notes, termNotes.length, checked(termNotes)],
    ["Assessments", termAssessments.length, checked(termAssessments)],
  ];
  const contents = parts
    .map(
      ([name, n, done]) =>
        `<tr><td>${esc(name)}</td><td class="center">${n || "None"}</td><td class="center">${n && done !== null ? `${done} of ${n}` : ""}</td></tr>`,
    )
    .join("");
  const sign = (role: string) => `<tr><th>${role}</th><td></td><td></td></tr>`;
  const cover = `
    ${docHead("term", { ...teacherContext(teacher), grade, subject, term: termName, year })}
    <h2>Contents</h2>
    <table>
      <thead><tr><th>Document</th><th style="width:20%">Number</th><th style="width:30%">Checked by the teacher</th></tr></thead>
      <tbody>${contents}</tbody>
    </table>
    <p><small>Elimu drafts these documents. Ones the teacher has not marked as checked say "Draft – check before use".</small></p>
    ${termSchemes.length && !recordSheets.length ? "<p><small>The record of work is missing because the term dates or timetable for this class are not set in Elimu.</small></p>" : ""}
    <h2>Checked by</h2>
    <table>
      <thead><tr><th>Role</th><th>Name and signature</th><th style="width:25%">Date</th></tr></thead>
      <tbody>${sign("Head of department")}${sign("Head teacher")}</tbody>
    </table>
  `;

  return wrapSheets(docName("term", { grade, subject }, label), [
    { body: cover },
    ...schemeSheets,
    ...recordSheets,
    ...termLessons.map((l) => ({ body: lessonBody(l) })),
    ...termNotes.map((n) => ({ body: notesBody(n) })),
    ...termAssessments.map((a) => ({
      body: assessmentBody(a),
      wide: assessmentKind(a.content) === "checklist",
    })),
  ]);
}
