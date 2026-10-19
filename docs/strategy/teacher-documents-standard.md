# Teacher documents standard

What a Kenyan JSS teacher's professional documents must contain, how Elimu's current output compares, and how the teacher portal should organise them.

Written 19 October 2026. Most sources are secondary (teacher blogs, news reports, a Ministry training deck shared on SlideShare). Before we lock any format, check it against the official KICD lesson plan and scheme templates and the KNEC School Based Assessment guidelines. Where sources disagree, this document says so.

---

## 1. Which documents teachers must keep

TSC's checklist of professional documents (TSC/QAS/TPAD/CT-D/01/REV.1) lists what a curriculum support officer or head teacher may ask to see:

| Document | What Elimu does today |
| --- | --- |
| Personal timetable | Timetable page (admin-led) |
| Curriculum designs | Curriculum Designs pages |
| Schemes of work (approved by the head of department) | Generated |
| Lesson plans, kept up to date | Generated |
| Lesson notes | Generated |
| Record of work covered, checked weekly | Record page per scheme |
| Learners' progress records | Not yet |
| Assessment results and analysis | Assessments are generated, but results aren't recorded |
| IEPs for learners with special needs | Not yet |

Teachers are appraised on these every term through TPAD (tpad2.tsc.go.ke). Teachers care about documents that are complete, look like the ones their HoD expects, and can be found fast when someone asks.

---

## 2. Scheme of work

### Header
School · Teacher · Grade · Learning area · Term · Year. Many schools add "Lessons per week" and "Reference books".

### Columns (one row per lesson)
1. Week
2. Lesson (number within the week)
3. Strand
4. Sub-strand
5. Specific learning outcomes ("By the end of the lesson, the learner should be able to…")
6. Learning experiences (learner-centred: "Learners are guided to…")
7. Key inquiry question(s)
8. Learning resources (with textbook page numbers where possible)
9. Assessment (method, e.g. oral questions, observation, written exercise)
10. Reflection (left blank, filled by the teacher after teaching)

### Rules
- Strand, sub-strand, outcomes and inquiry questions come **word for word** from the KICD design. Teachers and HoDs check this first.
- Lesson count per sub-strand follows the design's suggested lessons.
- Breaks (half term, opening and closing weeks, exams) show as rows such as "Half-term break" so week numbers match the school calendar.

### Elimu today vs. the standard
| Item | Status |
| --- | --- |
| Week, strand, sub-strand, outcomes, inquiry questions, experiences, resources, assessment, reflection | ✅ in `SchemeOfWorkSchema` |
| **Lesson number per row** | ❌ missing (rows grouped by week only) |
| Header: school, teacher, year | ⚠️ school and teacher only in the export; year is on the model but not shown consistently |
| Reflection left blank for the teacher | ⚠️ the AI sometimes fills it; it should always be empty |
| Breaks as rows | ⚠️ holidays are input, but not shown consistently |
| Termly overview (community service, parental engagement) | Extra; useful, keep it as an appendix, not part of the table |

---

## 3. Lesson plan

This follows the KICD format shown in the Ministry training deck and teacher guides.

### Header
School · Grade · Learning area · Date · Time · Roll (boys/girls/total) · Lesson number (e.g. "Lesson 3 of 5" in the sub-strand).

### Body, in this order
1. **Strand** and **Sub-strand**
2. **Specific learning outcomes.** 2–3, measurable, with action verbs (identify, describe, construct…). Starts "By the end of the lesson, the learner should be able to:". Usually one knowledge, one skill and one attitude outcome.
3. **Key inquiry question(s)**
4. **Learning resources**
5. **Organisation of learning.** Where it happens and how learners are grouped (e.g. "In groups of five in class").
6. **Introduction** (about 5 minutes). Link to the previous lesson and learners' lives.
7. **Lesson development** (about 25–30 minutes), in Steps 1, 2, 3. Each step is learner-centred ("Learners discuss…", not "Teacher explains…"). Each step names at most one or two of: **core competencies**, **values**, **pertinent and contemporary issues (PCIs)**, and links to other learning areas.
8. **Conclusion** (about 5 minutes). Summary and a quick check of the outcomes.
9. **Extended activity.** Work beyond the classroom (home, community).
10. **Reflection on the lesson / self-evaluation.** Filled by the teacher **after** teaching: what worked, which learners need help, what to change. Never pre-filled.

For a 40-minute JSS lesson, guides suggest roughly 5 / 30 / 5 minutes. One example uses 6 / 28 / 6.

### Assessment in the lesson plan
Assessment is against the outcomes, using the four CBC levels: Exceeding (EE), Meeting (ME), Approaching (AE) and Below (BE) expectations.

### Elimu today vs. the standard
| Item | Status |
| --- | --- |
| Strand, sub-strand, outcomes, inquiry questions, resources | ✅ |
| Core competencies, values | ✅ listed for the whole lesson; the standard ties them to steps |
| **Header (school, date, time, roll, lesson X of Y)** | ❌ |
| **Organisation of learning** | ❌ |
| Introduction / development / conclusion with timings | ✅ (introduction, `mainActivities`, conclusion) |
| Learner-centred steps | ⚠️ the schema has both `teacherActions` and `learnerActions`; fine, but the step should be named "Step 1…" and learner actions should lead |
| **PCIs** | ❌ |
| **Links to other learning areas** | ❌ |
| **Extended activity** | ⚠️ we have `homework`; rename it and make it a top-level section |
| **Reflection (blank, for after teaching)** | ❌ and there's nowhere to save it |
| Rubric on EE/ME/AE/BE | ✅ four levels, but not tied to each outcome |
| Differentiation (support / average / advanced) | Extra; good practice, keep it |
| "Topic" field | ⚠️ 8-4-4 term; show it as the lesson title, but lead with strand and sub-strand |
| Multimedia suggestions | Extra; merge into learning resources |

---

## 4. Lesson notes

There's no official KICD format for lesson notes. TSC asks that they exist and match the lesson plan. Teachers use them as their own subject-matter preparation. A good set of notes, from the teacher guides we reviewed:

- Header: grade, learning area, strand, sub-strand, the lesson plan it belongs to
- The outcomes being taught (copied from the plan)
- Content summary: key terms with simple definitions, the main ideas in order
- Worked examples (especially for Mathematics and Sciences)
- Questions to ask in class, with expected answers
- Common learner mistakes and how to correct them
- Board summary: a short version the teacher can copy onto the chalkboard
- References (textbook and page)

### Elimu today
`LessonNotesSchema` covers definitions, background, worked examples, questioning and misconceptions. It's strong on content. Gaps:
- No header or link to the outcomes. Notes are stored as a plain string on `LessonNote.notes`, so they can't be structured or exported consistently.
- No board summary.
- No references.

---

## 5. Assessment

### How CBC assessment works
- Assessment is per **learning outcome**, rated on four levels: EE, ME, AE, BE.
- KNEC breaks these into 8 points: EE1 = 8, EE2 = 7, ME1 = 6, ME2 = 5, AE1 = 4, AE2 = 3, BE1 = 2, BE2 = 1. Reports for KJSEA use these. News reports note that ratings are per outcome and shouldn't be averaged into one mark. Sources disagree on how schools should combine them; KNEC has warned schools against unofficial analyses.
- **Formative** (during teaching): observation, oral questions, checklists, rating scales, rubrics, portfolios, projects, written and practical tasks.
- **School Based Assessment (SBA)** for JSS Grades 7–8 is set with KNEC tools and scores are uploaded to the KNEC CBA portal (cba.knec.ac.ke). Reports say SBA counts towards KJSEA; the weight reported varies (20% is most quoted). Treat this as unconfirmed.

### What a teacher-made assessment should contain
- Header: school, grade, learning area, strand/sub-strand covered, type (end of sub-strand, mid-term, end of term), time allowed, total marks
- Instructions to learners
- Items, each tagged with the **outcome it tests** and its marks
- For practical or project tasks: a rubric with EE/ME/AE/BE descriptors per outcome
- Marking guide with model answers
- How marks convert to EE/ME/AE/BE

### Elimu today
| Item | Status |
| --- | --- |
| Sections, instructions, questions, marks, model answers | ✅ |
| Marking scheme with total marks | ✅ |
| **Outcome per question** | ❌ |
| **EE/ME/AE/BE bands** | ⚠️ `gradingScale` is free text ranges; should be the four levels (and optionally the 8 points) |
| **Assessment type** beyond written tests (observation checklist, rubric, project) | ⚠️ the model has `type`, but only written papers are generated |
| Recording learners' results | ❌ (later) |

---

## 6. One consistent document layout

Every document Elimu produces (screen, PDF and Word export) should share:

1. **The same header block**: School · Teacher · Grade · Learning area · Term · Year, plus the document's own fields (date and lesson number for a plan; strands covered for an assessment). Taken from the teacher's profile so they never retype it.
2. **The same naming**: `{Grade} {Learning area} – {Document} – {detail}`, e.g.
   - "Grade 7 English – Scheme of work – Term 1 2026"
   - "Grade 7 English – Lesson plan – 2.1 Listening and speaking, lesson 3 of 5"
   - "Grade 7 English – Lesson notes – 2.1 Listening and speaking, lesson 3"
   - "Grade 7 English – Assessment – End of Term 1"
3. **The same section titles** as KICD uses, in KICD's order, so a head teacher recognises it at a glance.
4. **A "Draft – check before use" mark** until the teacher marks the document as checked.
5. **Blank spaces for what the teacher writes by hand**: reflection, roll, signature, HoD's approval.

---

## 7. How the portal should organise documents

### The problem
Today the same documents can be reached three ways (My classes, Library tabs, Create), and each shows them differently. Lesson plans may or may not belong to a scheme. Notes hang off lessons and are hard to find on their own. Teachers think "my Grade 7 English, this term, week 4", not "the Lessons tab".

### The structure teachers already use
```
My classes
└── Grade 7
    └── English
        └── Term 1 2026  (term switcher: Term 1 / 2 / 3)
            ├── Scheme of work            (one per term)
            ├── Weeks 1–12
            │   └── Week 4
            │       ├── Lesson 1 – plan · notes · record ✓
            │       ├── Lesson 2 – plan · notes
            │       └── …
            ├── Assessments              (end of sub-strand, mid-term, end of term)
            └── Record of work           (from the scheme)
```

### Proposals
1. **The class page is home for every document.** Grade → learning area → term. Every scheme, plan, note and assessment is filed under one class and term. Quick lesson plans made without a scheme go under "Other lesson plans" for that class.
2. **The scheme drives the weeks.** Each scheme row (week, lesson) shows whether a plan, notes and a record exist, with one tap to make the missing one. This turns the scheme into the teacher's to-do list for the term.
3. **The Library becomes search.** Keep it as one list with filters (class, term, type) and a search box, for "find that document from last term". It stops being the main way in.
4. **Every document links to its neighbours.** A lesson plan links to its scheme row, its notes and its record. Notes link back to their plan. An assessment lists the sub-strands it covers.
5. **Term and year on every document**, so last year's work stays separate and can be reused ("Copy last year's scheme").
6. **Download a term's file.** One button on the class page exports the scheme, plans, notes and record for a term as one PDF, for when the head teacher asks.

### Data changes this needs
- `LessonPlan`: `term`, `year`, `week`, `lessonInWeek`, `reflection` (text, filled after teaching). Some exist already (`grade`, `subject`, `lessonNumber`).
- `Assessment`: `term`, `year`, `schemeId?`, and the outcomes it covers.
- `LessonNote`: keep the link to the plan; store structured JSON content instead of a string (old string notes still display).
- Content JSON changes (new lesson plan sections, lesson column in the scheme, outcome tags on questions) need no database change.

---

## 8. Recommended order of work

Each phase ships on its own.

1. **Lesson plan to the KICD format.** Add organisation of learning, PCIs, links to other learning areas, extended activity and a blank reflection to the schema, prompt and viewer; name development steps "Step 1, 2, 3"; tie competencies and values to steps; header from the profile. Old plans still display. *No database change.*
2. **Scheme, notes and assessment content.** Lesson column per scheme row, blank reflection, breaks as rows; board summary and references in notes; outcome per question and EE/ME/AE/BE bands in assessments. *No database change.*
3. **One header and naming across screen and export.** A shared document header component, used by every viewer and by `/api/export`.
4. **Portal organisation.** Term on documents, the class → term → scheme → week view, the Library as search, links between documents. *Needs a database change; the user runs `prisma db push` before merge.*
5. **Teacher reflection and record of work.** Save the post-lesson reflection on the plan and feed it into the record of work.
6. **Term file export.** One PDF per class and term.

Later: learners' progress records, assessment results with EE/ME/AE/BE per outcome, and SBA preparation.

---

## Sources

- KICD lesson plan format (teacher guide): https://cbcedukenya.com/blog/how-to-write-cbc-lesson-plan-kicd-format-2026-kenya-teachers
- Ministry training deck on professional documents: https://www.slideshare.net/slideshow/professional-documents-for-the-current-cbc-curriculum-in-kenya-pdf/286513693
- Grade 7 schemes of work: https://cbcedukenya.com/blog/cbc-grade-7-schemes-of-work-2026
- Sample CBC scheme of work: https://schoolsnetkenya.com/sample-competency-based-curriculum-scheme-of-work/
- TSC checklist of professional documents: https://www.tsc.go.ke/index.php/downloads-b/category/39-performance-management-pc-and-tpad?download=817:checklist-of-professional-documents-to-be-maintained-by-teachers
- TPAD checklist summary: https://educationnewshub.co.ke/latest-tpad-teachers-checklist-of-tsc-professional-documents/
- KNEC CBA training manual: https://www.knec.ac.ke/wp-content/uploads/2021/06/CBA-Age-Based-Regular-Training-Manual.pdf
- KNEC grading explained: https://nairobileo.co.ke/news/article/24644/knec-explains-cbc-grading-system-amid-confusion-after-kjsea-results
- KNEC warning on unofficial KJSEA analysis: https://www.citizen.digital/article/knec-warns-against-fake-kjsea-analysis-by-schools-n374472
- SBA and KJSEA reporting: https://educationnews.co.ke/?p=519881 and https://educationnews.co.ke/?p=448924
- SBA verification deadline: https://eastleighvoice.co.ke/education/374921/knec-sets-july-30-deadline-for-school-based-assessment-verification-ahead-of-2026-kpsea-kjsea-exams
- CBC assessment levels overview: https://openeducat.org/gradebook/k12/kenya/cbc-assessment/
