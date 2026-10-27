# Elimu UI audit: features, menus and documents

2026-10-27. Checked against the code on `deploy/vps` (after `87d2cb0`), the KICD/TSC
document formats and common usability standards (Nielsen's heuristics, Material
navigation guidance, WCAG 2.2 AA). Each finding has a fix and a size: S (under an
hour), M (a day or so), L (several days).

## What is already at standard

- **Lesson plan** follows the KICD format: strand and sub-strand, specific learning
  outcomes with the "By the end of the lesson…" stem, key inquiry questions, resources,
  organisation of learning, introduction / lesson development in steps / conclusion,
  extended activity, differentiation, core competencies, values and PCIs, a four-level
  CBC rubric, and the teacher's reflection after the lesson. The printout has the TSC
  header (date, time, roll with boys/girls) and a signature line.
- **Scheme of work** has the KICD columns (week, lesson, strand, sub-strand, outcomes,
  learning experiences, inquiry questions, resources, assessment, reflection), real week
  dates from the term calendar, and a **record of work** with teacher, HoD and head
  teacher signatures.
- **Lesson notes** go beyond most sellers: worked examples by level, questioning
  sequences, misconceptions, board summary.
- **Assessments** map every question to a learning outcome and print the marking
  scheme on its own page.
- Every document is a draft until the teacher marks it checked; the draft mark leaves
  the printout only then.
- Old routes (`/create`, `/library`, `/workstation`, `/notifications`) redirect.

## 1. Menus and navigation

| # | Finding | Fix | Size |
|---|---|---|---|
| 1.1 | On a phone the same links appear in three places: the ☰ menu, the "More" list on the Profile page, and (until `87d2cb0`) Tools on Home. | Profile keeps only account things (name, school, plan, term dates, invite, help, log out). The ☰ menu is the one place for everything else. | S |
| 1.2 | The bottom bar spends four of five slots on document types (Schemes, Lessons, Notes, Tests). Teachers think in classes ("my Grade 7 English"), and the class page already shows all four documents for that class. Notes and Tests are opened far less than This week or My classes. | Option A (recommended): **Home · Classes · ＋ Create · Documents · This week**, where Documents is one list with type tabs (Schemes / Lessons / Notes / Tests) and the class filter it already has. Option B: keep the bar as it is. See "Decision needed". | M |
| 1.3 | Term set-up is spread out: term dates and timetable are under Profile → Term, the week view is "This week" under More, and Home has an "Add your term dates" card. Coverage and This week both depend on it. | Put "Term dates and timetable" as a link at the top of This week (and keep the Home card). Profile links there instead of owning it. | S |
| 1.4 | Three AI entry points with different names: **Ask Elimu** (chat page), the **lesson helper** (chat on a lesson plan) and **Improve** (rewrite a part). | Keep two ideas: *Improve* (changes this document) and *Ask Elimu* (questions). Rename the lesson helper "Ask Elimu about this lesson". | S |
| 1.5 | Ask Elimu and Staffroom use near-identical icons (`MessageSquare` / `MessagesSquare`). Teachers may expect a person and get the AI, or the reverse. | Ask Elimu gets `Sparkles`; Staffroom keeps `MessagesSquare`. | S |
| 1.6 | For staff, four "curriculum" pages sound alike: Curriculum designs, Curriculum maps, Curriculum structure, and the Knowledge base whose heading is also "Curriculum Designs". | Knowledge base heading → "Design PDFs"; keep the rest. Teachers only ever see Curriculum designs. | S |
| 1.7 | Title case is mixed ("Curriculum Designs" on the teacher page and staff Home, "Curriculum designs" in the menu). | Sentence case everywhere. | S |
| 1.8 | AI keys page and card still talk about "Vercel's settings". | "the server settings". | S |

## 2. Document pages (how teachers work with a document)

| # | Finding | Fix | Size |
|---|---|---|---|
| 2.1 | Each document type has a different action bar: lesson plan = Edit, Improve, Download, Present, Notes; scheme = Download, Improve, Record of work; notes = Download, Improve; assessment = Download, Scheme. On a phone five outline buttons wrap into two or three rows. | One pattern for all four: **one main button** (lesson: Present; scheme: Record of work; notes and assessment: Download), then **Edit**, **Improve**, and a **⋯ More** menu (Download/Print, Make a copy, Delete). Same order everywhere. | M |
| 2.2 | **Teachers cannot delete a document.** `deleteAssessment` exists but nothing calls it; there is nothing for schemes, lessons or notes. This breaks "user control and freedom" and fills lists with failed tries. | Delete in the ⋯ menu with a confirm dialog (and keep it soft: 30 days in a bin, or a clear "can't be undone"). | M |
| 2.3 | Only lesson plans can be edited by hand. Schemes, notes and assessments can only be changed through Improve (AI), so fixing one word costs a generation. | Hand editing for all four. Schemes: edit a row in place. Assessments: edit a question, its marks and answer. Notes: edit each section. | L |
| 2.4 | Download is a print page (save as PDF). Many teachers and HoDs want a **Word file** to adjust and print at the cyber; competitors sell .docx. | Add "Download Word (.docx)" next to PDF for all four documents. | M |
| 2.5 | No "Make a copy" for another stream or another year. Teachers with 7 East and 7 West redo the same work. | ⋯ → Make a copy, choosing class/stream and term. | M |

## 3. Document standards: gaps that matter for the market

| # | Finding | Fix | Size |
|---|---|---|---|
| 3.1 | **Assessments are only written tests**, and only Opener / Mid-term / End of term. CBC assessment at school level is mostly formative and practical: observation checklists, rating scales, project and practical tasks with rubrics, oral questions, portfolios; Junior School also has KNEC school-based assessment tasks. | Add assessment kinds: Written test (current), Quiz (short, for one sub-strand), Practical / project task with rubric, Observation checklist. Same outcome mapping. | L |
| 3.2 | No **table of specifications**. Exams in Kenyan schools are expected to show how questions spread across outcomes and levels. Elimu already stores the outcome per question. | Add a cognitive level per question (knowledge, comprehension, application, higher order) and print a one-page table of specifications with the marking scheme. | M |
| 3.3 | Nothing after the test: no way to enter learners' levels or marks, so no progress record or report. This is the next document HoDs ask for after schemes and lesson plans. | Later phase: a simple class list, enter a level (EE/ME/AE/BE) per learner per outcome, print the progress record. Needs class lists, so plan it separately. | L |
| 3.4 | Scheme printout has "Reflection" but many school templates call that column "Remarks". | Head it "Reflection / Remarks". | S |
| 3.5 | Lesson notes cannot be made without a lesson plan first. Fine for the flow, but "Lesson notes" on Home's Make something goes to a picker that is empty for new teachers. | When a teacher has no lesson plans, the picker offers "Make the lesson plan first" with the plan form pre-filled. | S |

## 4. Interaction and accessibility checks

| # | Finding | Fix | Size |
|---|---|---|---|
| 4.1 | Generation can take a minute or two. Progress is shown, but a teacher who leaves the page loses track. | Already saved on the server; add a "Your scheme is ready" notice on Home when the teacher comes back. | M |
| 4.2 | Touch targets, labels and colour tokens follow AGENTS.md on the pages checked. No issue found. | Keep the rules; check new pages with a 360px screenshot before shipping. | – |

## Decision needed

**Bottom bar (1.2).** Option A puts Classes, a Create button and This week on the bar and
merges the four document lists into one "Documents" page with tabs. It matches how
teachers plan and how mainstream apps lay out a phone bar, and it removes the biggest
overlap in the app. Option B leaves it as it is and only does the smaller fixes.

## Suggested order

1. Quick fixes: 1.1, 1.3–1.8, 3.4, 3.5 (one commit).
2. Document pages: 2.1 and 2.2 together, then 2.4 (Word), then 2.5.
3. Bottom bar (1.2) once decided.
4. Assessments: 3.2, then 3.1.
5. Hand editing (2.3) and the progress record (3.3) as their own phases.
