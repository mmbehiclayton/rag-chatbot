import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  type ClassRef,
  coversClass,
  freePlanMessage,
  getAccess,
  plansOn,
} from "@/lib/plans";
import {
  formatDay,
  formatRange,
  streamLabel,
  termLabel,
} from "@/lib/term-pack";
import { getSchemeSchedule } from "@/lib/term-pack-data";

// Returns a print-ready HTML document for a scheme, lesson plan, or assessment.
// Usage: GET /api/export?type=scheme&id=<id>
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.userId)
    return new NextResponse("Unauthorized", { status: 401 });

  const { searchParams } = req.nextUrl;
  const type = searchParams.get("type"); // scheme | lesson | assessment | notes | record
  const id = searchParams.get("id");
  const grade = searchParams.get("grade");
  const subject = searchParams.get("subject");

  if (!type) return new NextResponse("Missing params", { status: 400 });

  let html = "";
  // The class the document belongs to, checked against the teacher's plan before it is sent.
  let cls: ClassRef | null = null;

  try {
    // Combined export: every record for a learning area (grade + subject), no id.
    if (!id && grade && subject) {
      cls = { grade, subject };
      if (type === "scheme") {
        const items = await db.schemeOfWork.findMany({
          where: { teacherId: session.userId, grade, subject },
          orderBy: { term: "asc" },
        });
        if (!items.length)
          return new NextResponse("Not found", { status: 404 });
        html = buildCombinedHTML("scheme", items, grade, subject);
      } else if (type === "lesson") {
        const items = await db.lessonPlan.findMany({
          where: {
            teacherId: session.userId,
            OR: [{ grade, subject }, { scheme: { grade, subject } }],
          },
          orderBy: { lessonNumber: "asc" },
        });
        if (!items.length)
          return new NextResponse("Not found", { status: 404 });
        html = buildCombinedHTML("lesson", items, grade, subject);
      } else if (type === "assessment") {
        const items = await db.assessment.findMany({
          where: { teacherId: session.userId, grade, subject },
          orderBy: { updatedAt: "asc" },
        });
        if (!items.length)
          return new NextResponse("Not found", { status: 404 });
        html = buildCombinedHTML("assessment", items, grade, subject);
      } else {
        return new NextResponse("Invalid type", { status: 400 });
      }
      return new NextResponse(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (!id) return new NextResponse("Missing params", { status: 400 });

    if (type === "scheme") {
      const scheme = await db.schemeOfWork.findFirst({
        where: { id, teacherId: session.userId },
      });
      if (!scheme) return new NextResponse("Not found", { status: 404 });
      cls = scheme;
      const schedule = await getSchemeSchedule(scheme);
      const weekDates = new Map(
        schedule.weeks.map((w) => [w.number, formatRange(w.from, w.to)]),
      );
      html = buildSchemeHTML(scheme, weekDates);
    } else if (type === "record") {
      const scheme = await db.schemeOfWork.findFirst({
        where: { id, teacherId: session.userId },
        include: {
          teacher: {
            select: {
              name: true,
              schoolName: true,
              tenant: { select: { name: true } },
            },
          },
        },
      });
      if (!scheme) return new NextResponse("Not found", { status: 404 });
      cls = scheme;
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
        include: { scheme: { select: { grade: true, subject: true } } },
      });
      if (!lesson) return new NextResponse("Not found", { status: 404 });
      cls = {
        grade: lesson.grade ?? lesson.scheme?.grade ?? "",
        subject: lesson.subject ?? lesson.scheme?.subject ?? "",
      };
      html = buildLessonHTML(lesson);
    } else if (type === "assessment") {
      const assessment = await db.assessment.findFirst({
        where: { id, teacherId: session.userId },
      });
      if (!assessment) return new NextResponse("Not found", { status: 404 });
      cls = assessment;
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
              scheme: { select: { grade: true, subject: true } },
            },
          },
        },
      });
      if (!note) return new NextResponse("Not found", { status: 404 });
      cls = {
        grade: note.lessonPlan?.grade ?? note.lessonPlan?.scheme?.grade ?? "",
        subject:
          note.lessonPlan?.subject ?? note.lessonPlan?.scheme?.subject ?? "",
      };
      html = buildNotesHTML(note);
    } else {
      return new NextResponse("Invalid type", { status: 400 });
    }

    if (cls && (await plansOn())) {
      const access = await getAccess(session.userId);
      if (!coversClass(access, cls)) {
        return new NextResponse(
          wrap(
            "Term pass needed",
            `<h1>Term pass needed</h1><p>${esc(freePlanMessage(access))}</p>`,
          ),
          {
            status: 402,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          },
        );
      }
    }

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Export failed";
    return new NextResponse(message, { status: 500 });
  }
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
  .print-btn { position: fixed; top: 16px; right: 16px; background: #111; color: #fff; border: none; padding: 10px 18px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: bold; z-index: 50; box-shadow: 0 2px 8px rgba(0,0,0,.3); }
  .page-break { page-break-before: always; break-before: page; }
  .cover { text-align: center; padding: 30mm 0; }
  .cover h1 { border: none; font-size: 26px; }
  .cover p { color: #555; font-size: 14px; margin-top: 6px; }

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

  @media print { .print-btn { display: none; } }
`;

const printScript = `<button class="print-btn" onclick="window.print()">Print / Save PDF</button>`;

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
  content?: unknown;
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
        <td class="b">${esc(rowData.strand)}</td>
        <td class="sub">${esc(rowData.subStrand)}</td>
        <td>${arr(rowData.specificLearningOutcomes)
          .map((o) => `<div class="out">${esc(o)}</div>`)
          .join("")}</td>
        <td class="kiq">${arr(rowData.keyInquiryQuestions)
          .map((q) => `<div>Q: ${esc(q)}</div>`)
          .join("")}</td>
        <td><ul>${arr(rowData.learningExperiences)
          .map((e) => `<li>${esc(e)}</li>`)
          .join("")}</ul></td>
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
    <div class="center"><h1>${esc(scheme.title)}</h1></div>
    <div class="meta center">
      <div>Grade: <span>${esc(scheme.grade)}</span></div>
      <div>Subject: <span>${esc(scheme.subject)}</span></div>
      <div>Term: <span>${esc(scheme.term)}</span></div>
    </div>
    <table class="scheme">
      <colgroup>
        <col style="width:4%"><col style="width:7%"><col style="width:7%"><col style="width:21%">
        <col style="width:13%"><col style="width:20%"><col style="width:10%"><col style="width:11%"><col style="width:7%">
      </colgroup>
      <thead><tr>
        <th>Week</th><th>Strand</th><th>Sub-Strand</th>
        <th>Specific Learning Outcomes</th>
        <th>Key Inquiry Questions</th>
        <th>Learning Experiences</th>
        <th>Learning Resources</th>
        <th>Assessment Methods</th>
        <th>Reflection</th>
      </tr></thead>
      <tbody>${weekRows}</tbody>
    </table>
  `;
  return body;
}

type RecordScheme = {
  teacher?: {
    schoolName?: string | null;
    tenant?: { name?: string | null } | null;
    name?: string | null;
  } | null;
  grade: string;
  subject?: string;
  term?: string;
};

function buildRecordHTML(
  scheme: RecordScheme,
  schedule: Awaited<ReturnType<typeof getSchemeSchedule>>,
) {
  const taught = schedule.slots.filter(
    (s) => s.status === "TAUGHT" && s.lessonNumber,
  );
  const school =
    scheme.teacher?.schoolName || scheme.teacher?.tenant?.name || "";
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
        <td>${esc(s.remarks)}</td>
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
    <div class="center"><h1>Record of work</h1></div>
    <div class="meta center">
      ${school ? `<div>School: <span>${esc(school)}</span></div>` : ""}
      <div>Teacher: <span>${esc(scheme.teacher?.name)}</span></div>
      <div>Grade: <span>${esc(streamLabel(scheme.grade, schedule.stream))}</span></div>
      <div>Learning area: <span>${esc(scheme.subject)}</span></div>
      <div>Term: <span>${esc(schedule.term ? termLabel(schedule.term) : scheme.term)}</span></div>
    </div>
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
  return wrap(
    `Record of work · ${streamLabel(scheme.grade, schedule.stream)} ${scheme.subject}`,
    body,
  );
}

function buildSchemeHTML(
  scheme: SchemeExport,
  weekDates?: Map<number, string>,
) {
  return wrap(
    scheme.title ?? "Scheme of work",
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
};

type LessonContent = {
  strand?: string;
  subStrand?: string;
  specificLearningOutcomes?: unknown[];
  lessonStructure?: {
    introduction?: {
      duration?: number | string;
      recap?: string;
      learningIntentions?: string;
      successCriteria?: string;
    };
    mainActivities?: LessonActivity[];
    conclusion?: {
      duration?: number | string;
      summary?: string;
      exitTicket?: string;
      homework?: string;
    };
    differentiation?: {
      learnersNeedingSupport?: string;
      averageLearners?: string;
      advancedLearners?: string;
    };
  };
};

type LessonExport = {
  topic?: string | null;
  content?: unknown;
};

function lessonBody(lesson: LessonExport) {
  const c = (lesson.content ?? {}) as LessonContent;
  const intro = c.lessonStructure?.introduction;
  const main = Array.isArray(c.lessonStructure?.mainActivities)
    ? c.lessonStructure.mainActivities
    : [];
  const conc = c.lessonStructure?.conclusion;
  const diff = c.lessonStructure?.differentiation;

  const mainRows = main
    .map(
      (a) => `
    <tr>
      <td><strong>${esc(a.activityName)}</strong></td>
      <td>${esc(a.duration)} min</td>
      <td>${esc(a.grouping)}</td>
      <td><ul>${arr(a.teacherActions)
        .map((t) => `<li>${esc(t)}</li>`)
        .join("")}</ul></td>
      <td><ul>${arr(a.learnerActions)
        .map((l) => `<li>${esc(l)}</li>`)
        .join("")}</ul></td>
    </tr>
  `,
    )
    .join("");

  const body = `
    <h1>${esc(lesson.topic)}</h1>
    <div class="meta">
      <div>Strand: <span>${esc(c?.strand)}</span></div>
      <div>Sub-Strand: <span>${esc(c?.subStrand)}</span></div>
    </div>

    <div class="section">
      <h2>Learning Outcomes</h2>
      <ul>${arr(c?.specificLearningOutcomes)
        .map((o) => `<li>${esc(o)}</li>`)
        .join("")}</ul>
    </div>

    <div class="section">
      <h2>Introduction (${esc(intro?.duration)}min)</h2>
      <p><strong>Recap:</strong> ${esc(intro?.recap)}</p>
      <p><strong>Learning Intention:</strong> ${esc(intro?.learningIntentions)}</p>
      <p><strong>Success Criteria:</strong> ${esc(intro?.successCriteria)}</p>
    </div>

    <div class="section">
      <h2>Main Activities</h2>
      <table>
        <thead><tr><th>Activity</th><th>Time</th><th>Grouping</th><th>Teacher Actions</th><th>Learner Actions</th></tr></thead>
        <tbody>${mainRows}</tbody>
      </table>
    </div>

    <div class="section">
      <h2>Differentiation</h2>
      <table>
        <tr><th>Learners Needing Support</th><th>Average Learners</th><th>Advanced Learners</th></tr>
        <tr>
          <td>${esc(diff?.learnersNeedingSupport)}</td>
          <td>${esc(diff?.averageLearners)}</td>
          <td>${esc(diff?.advancedLearners)}</td>
        </tr>
      </table>
    </div>

    <div class="section">
      <h2>Conclusion (${esc(conc?.duration)}min)</h2>
      <p><strong>Summary:</strong> ${esc(conc?.summary)}</p>
      <p><strong>Exit Ticket:</strong> ${esc(conc?.exitTicket)}</p>
      <p><strong>Homework:</strong> ${esc(conc?.homework)}</p>
    </div>
  `;
  return body;
}

function buildLessonHTML(lesson: LessonExport) {
  return wrap(lesson.topic ?? "Lesson plan", lessonBody(lesson));
}

type AssessmentQuestion = {
  questionNumber?: string | number;
  questionText?: string;
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
  sections?: AssessmentSection[];
  markingScheme?: {
    gradingScale?: Array<{ range?: string; descriptor?: string }>;
    totalMarks?: number | string;
  };
};

type AssessmentExport = {
  title?: string | null;
  grade?: string | null;
  subject?: string | null;
  type?: string | null;
  content?: unknown;
};

function assessmentBody(assessment: AssessmentExport) {
  const c = (assessment.content ?? {}) as AssessmentContent;
  const sections = Array.isArray(c.sections) ? c.sections : [];

  const sectionsHTML = sections
    .map((section, si) => {
      const questions = Array.isArray(section.questions)
        ? section.questions
        : [];
      const qRows = questions
        .map(
          (q) => `
      <tr>
        <td style="width:30px;text-align:center">${esc(q.questionNumber)}</td>
        <td>${esc(q.questionText)}</td>
        <td style="width:50px;text-align:center">${esc(q.marks)}</td>
      </tr>
      <tr style="background:#fafafa">
        <td></td>
        <td colspan="2"><em>Answer: ${esc(q.modelAnswer)}</em>${q.rubric ? `<br><small>Rubric: ${esc(q.rubric)}</small>` : ""}</td>
      </tr>
    `,
        )
        .join("");

      return `
      <div class="section">
        <h2>Section ${si + 1}: ${esc(section.sectionTitle)}</h2>
        <p><em>${esc(section.instructions)}</em></p>
        <table>
          <thead><tr><th>#</th><th>Question</th><th>Marks</th></tr></thead>
          <tbody>${qRows}</tbody>
        </table>
      </div>
    `;
    })
    .join("");

  const gradingScale = Array.isArray(c.markingScheme?.gradingScale)
    ? c.markingScheme.gradingScale
    : [];
  const scaleHTML = gradingScale
    .map(
      (g) => `<tr><td>${esc(g.range)}</td><td>${esc(g.descriptor)}</td></tr>`,
    )
    .join("");

  const body = `
    <h1>${esc(assessment.title)}</h1>
    <div class="meta">
      <div>Grade: <span>${esc(assessment.grade)}</span></div>
      <div>Subject: <span>${esc(assessment.subject)}</span></div>
      <div>Type: <span>${esc(assessment.type)}</span></div>
      <div>Total Marks: <span>${esc(c?.markingScheme?.totalMarks)}</span></div>
    </div>
    ${sectionsHTML}
    ${
      gradingScale.length > 0
        ? `
      <h2>Grading Scale</h2>
      <table><thead><tr><th>Mark Range</th><th>Descriptor</th></tr></thead><tbody>${scaleHTML}</tbody></table>
    `
        : ""
    }
  `;
  return body;
}

type NotesExport = {
  resources?: unknown;
  notes?: string | null;
  lessonPlan?: {
    topic?: string | null;
    grade?: string | null;
    subject?: string | null;
    scheme?: { grade?: string | null; subject?: string | null } | null;
  };
};

function buildNotesHTML(note: NotesExport) {
  const c = (note.resources ?? {}) as Record<string, unknown>;
  const plan = note.lessonPlan ?? {};
  const overview = (c.conceptOverview ?? {}) as Record<string, unknown>;
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
    <h1>${esc(plan.topic ?? "Lesson notes")}</h1>
    <div class="meta">
      <div>Grade: <span>${esc(plan.grade ?? plan.scheme?.grade ?? "")}</span></div>
      <div>Learning area: <span>${esc(plan.subject ?? plan.scheme?.subject ?? "")}</span></div>
      <div><span>Lesson notes</span></div>
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
  `;
  return wrap(`${plan.topic ?? "Lesson"} – Notes`, body);
}

function buildAssessmentHTML(assessment: AssessmentExport) {
  return wrap(assessment.title ?? "Assessment", assessmentBody(assessment));
}

// Combines every record of a learning area (grade + subject) into one document,
// each starting on its own page.
function buildCombinedHTML(
  kind: "scheme" | "lesson" | "assessment",
  items: Array<SchemeExport | LessonExport | AssessmentExport>,
  grade: string,
  subject: string,
) {
  const landscape = kind === "scheme";
  const label =
    kind === "scheme"
      ? "Schemes of Work"
      : kind === "lesson"
        ? "Lesson Plans"
        : "Assessments";
  const bodyFn =
    kind === "scheme"
      ? schemeBody
      : kind === "lesson"
        ? lessonBody
        : assessmentBody;
  const title = `${label} — ${grade} ${subject}`;
  const cover = `<div class="cover"><h1>${esc(title)}</h1><p>${items.length} ${label.toLowerCase()}</p></div>`;
  const inner =
    cover +
    items.map((it) => `<div class="page-break"></div>${bodyFn(it)}`).join("");
  return wrap(title, inner, landscape);
}
