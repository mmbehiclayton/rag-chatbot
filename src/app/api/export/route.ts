import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// Returns a print-ready HTML document for a scheme, lesson plan, or assessment.
// Usage: GET /api/export?type=scheme&id=<id>
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.userId) return new NextResponse("Unauthorized", { status: 401 });

  const { searchParams } = req.nextUrl;
  const type = searchParams.get("type"); // scheme | lesson | assessment
  const id = searchParams.get("id");
  const grade = searchParams.get("grade");
  const subject = searchParams.get("subject");

  if (!type) return new NextResponse("Missing params", { status: 400 });

  let html = "";

  try {
    // Combined export: every record for a learning area (grade + subject), no id.
    if (!id && grade && subject) {
      if (type === "scheme") {
        const items = await db.schemeOfWork.findMany({
          where: { teacherId: session.userId, grade, subject },
          orderBy: { term: "asc" },
        });
        if (!items.length) return new NextResponse("Not found", { status: 404 });
        html = buildCombinedHTML("scheme", items, grade, subject);
      } else if (type === "lesson") {
        const items = await db.lessonPlan.findMany({
          where: { teacherId: session.userId, scheme: { grade, subject } },
          orderBy: { lessonNumber: "asc" },
        });
        if (!items.length) return new NextResponse("Not found", { status: 404 });
        html = buildCombinedHTML("lesson", items, grade, subject);
      } else if (type === "assessment") {
        const items = await db.assessment.findMany({
          where: { teacherId: session.userId, grade, subject },
          orderBy: { updatedAt: "asc" },
        });
        if (!items.length) return new NextResponse("Not found", { status: 404 });
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
      html = buildSchemeHTML(scheme);
    } else if (type === "lesson") {
      const lesson = await db.lessonPlan.findFirst({
        where: { id, teacherId: session.userId },
      });
      if (!lesson) return new NextResponse("Not found", { status: 404 });
      html = buildLessonHTML(lesson);
    } else if (type === "assessment") {
      const assessment = await db.assessment.findFirst({
        where: { id, teacherId: session.userId },
      });
      if (!assessment) return new NextResponse("Not found", { status: 404 });
      html = buildAssessmentHTML(assessment);
    } else {
      return new NextResponse("Invalid type", { status: 400 });
    }

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (e: any) {
    return new NextResponse(e.message, { status: 500 });
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
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><style>${baseCSS}${paper}</style></head><body>${printScript}<div class="page">${body}</div></body></html>`;
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

function schemeBody(scheme: any) {
  const c = scheme.content as any;
  const weeks = Array.isArray(c?.weeks) ? c.weeks : [];

  // Flatten week -> rows. The week number is shown on the first row only (no
  // rowspan) so the table paginates cleanly across printed pages.
  const weekRows = weeks
    .map((week: any) => {
      const rows = Array.isArray(week.rows) ? week.rows : [];
      return rows
        .map(
          (row: any, ri: number) => `
      <tr>
        <td class="wk">${ri === 0 ? `Wk ${esc(week.weekNumber)}` : ""}</td>
        <td class="b">${esc(row.strand)}</td>
        <td class="sub">${esc(row.subStrand)}</td>
        <td>${arr(row.specificLearningOutcomes).map((o) => `<div class="out">${esc(o)}</div>`).join("")}</td>
        <td class="kiq">${arr(row.keyInquiryQuestions).map((q) => `<div>Q: ${esc(q)}</div>`).join("")}</td>
        <td><ul>${arr(row.learningExperiences).map((e) => `<li>${esc(e)}</li>`).join("")}</ul></td>
        <td>${arr(row.learningResources).map((r) => `<span class="badge">${esc(r)}</span>`).join("")}</td>
        <td class="assess">${arr(row.assessmentMethods).map((a) => `<div>${esc(a)}</div>`).join("")}</td>
        <td></td>
      </tr>
    `,
        )
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

function buildSchemeHTML(scheme: any) {
  return wrap(scheme.title, schemeBody(scheme), /* landscape */ true);
}

function lessonBody(lesson: any) {
  const c = lesson.content as any;
  const intro = c?.lessonStructure?.introduction;
  const main = Array.isArray(c?.lessonStructure?.mainActivities) ? c.lessonStructure.mainActivities : [];
  const conc = c?.lessonStructure?.conclusion;
  const diff = c?.lessonStructure?.differentiation;

  const mainRows = main.map((a: any) => `
    <tr>
      <td><strong>${a.activityName}</strong></td>
      <td>${a.duration ?? ""} min</td>
      <td>${a.grouping ?? ""}</td>
      <td><ul>${arr(a.teacherActions).map(t => `<li>${t}</li>`).join("")}</ul></td>
      <td><ul>${arr(a.learnerActions).map(l => `<li>${l}</li>`).join("")}</ul></td>
    </tr>
  `).join("");

  const body = `
    <h1>${lesson.topic}</h1>
    <div class="meta">
      <div>Strand: <span>${c?.strand ?? ""}</span></div>
      <div>Sub-Strand: <span>${c?.subStrand ?? ""}</span></div>
    </div>

    <div class="section">
      <h2>Learning Outcomes</h2>
      <ul>${arr(c?.specificLearningOutcomes).map(o => `<li>${o}</li>`).join("")}</ul>
    </div>

    <div class="section">
      <h2>Introduction (${intro?.duration ?? ""}min)</h2>
      <p><strong>Recap:</strong> ${intro?.recap ?? ""}</p>
      <p><strong>Learning Intention:</strong> ${intro?.learningIntentions ?? ""}</p>
      <p><strong>Success Criteria:</strong> ${intro?.successCriteria ?? ""}</p>
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
          <td>${diff?.learnersNeedingSupport ?? ""}</td>
          <td>${diff?.averageLearners ?? ""}</td>
          <td>${diff?.advancedLearners ?? ""}</td>
        </tr>
      </table>
    </div>

    <div class="section">
      <h2>Conclusion (${conc?.duration ?? ""}min)</h2>
      <p><strong>Summary:</strong> ${conc?.summary ?? ""}</p>
      <p><strong>Exit Ticket:</strong> ${conc?.exitTicket ?? ""}</p>
      <p><strong>Homework:</strong> ${conc?.homework ?? ""}</p>
    </div>
  `;
  return body;
}

function buildLessonHTML(lesson: any) {
  return wrap(lesson.topic, lessonBody(lesson));
}

function assessmentBody(assessment: any) {
  const c = assessment.content as any;
  const sections = Array.isArray(c?.sections) ? c.sections : [];

  const sectionsHTML = sections.map((section: any, si: number) => {
    const questions = Array.isArray(section.questions) ? section.questions : [];
    const qRows = questions.map((q: any) => `
      <tr>
        <td style="width:30px;text-align:center">${q.questionNumber}</td>
        <td>${q.questionText ?? ""}</td>
        <td style="width:50px;text-align:center">${q.marks}</td>
      </tr>
      <tr style="background:#fafafa">
        <td></td>
        <td colspan="2"><em>Answer: ${q.modelAnswer ?? ""}</em>${q.rubric ? `<br><small>Rubric: ${q.rubric}</small>` : ""}</td>
      </tr>
    `).join("");

    return `
      <div class="section">
        <h2>Section ${si + 1}: ${section.sectionTitle}</h2>
        <p><em>${section.instructions}</em></p>
        <table>
          <thead><tr><th>#</th><th>Question</th><th>Marks</th></tr></thead>
          <tbody>${qRows}</tbody>
        </table>
      </div>
    `;
  }).join("");

  const gradingScale = Array.isArray(c?.markingScheme?.gradingScale) ? c.markingScheme.gradingScale : [];
  const scaleHTML = gradingScale.map((g: any) => `<tr><td>${g.range}</td><td>${g.descriptor}</td></tr>`).join("");

  const body = `
    <h1>${assessment.title}</h1>
    <div class="meta">
      <div>Grade: <span>${assessment.grade}</span></div>
      <div>Subject: <span>${assessment.subject}</span></div>
      <div>Type: <span>${assessment.type}</span></div>
      <div>Total Marks: <span>${c?.markingScheme?.totalMarks ?? ""}</span></div>
    </div>
    ${sectionsHTML}
    ${gradingScale.length > 0 ? `
      <h2>Grading Scale</h2>
      <table><thead><tr><th>Mark Range</th><th>Descriptor</th></tr></thead><tbody>${scaleHTML}</tbody></table>
    ` : ""}
  `;
  return body;
}

function buildAssessmentHTML(assessment: any) {
  return wrap(assessment.title, assessmentBody(assessment));
}

// Combines every record of a learning area (grade + subject) into one document,
// each starting on its own page.
function buildCombinedHTML(
  kind: "scheme" | "lesson" | "assessment",
  items: any[],
  grade: string,
  subject: string,
) {
  const landscape = kind === "scheme";
  const label = kind === "scheme" ? "Schemes of Work" : kind === "lesson" ? "Lesson Plans" : "Assessments";
  const bodyFn = kind === "scheme" ? schemeBody : kind === "lesson" ? lessonBody : assessmentBody;
  const title = `${label} — ${grade} ${subject}`;
  const cover = `<div class="cover"><h1>${esc(title)}</h1><p>${items.length} ${label.toLowerCase()}</p></div>`;
  const inner = cover + items.map((it) => `<div class="page-break"></div>${bodyFn(it)}`).join("");
  return wrap(title, inner, landscape);
}
