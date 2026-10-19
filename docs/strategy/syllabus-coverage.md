# Syllabus coverage

Each teacher sees how much of each class's curriculum design they have covered this school year, by term, and across all their classes. Heads of department ask for this every term.

## What we found

- **The KICD rationalised designs (2024)** list strands, sub-strands, specific learning outcomes and suggested lessons for each sub-strand. Most of them do not say which term a sub-strand belongs to. Teachers and commercial schemes split the year into three terms themselves. Sources:
  - The KICD design PDFs, e.g. [Mathematics Grade 7](https://kicd.ac.ke/wp-content/uploads/2024/06/Mathematics-Grade-7-Design-Formated-April-2024.pdf).
  - [cbcedukenya.com: old vs revised designs](https://cbcedukenya.com/blog/old-vs-revised-kicd-curriculum-designs-2024-changes).
- **The rationalisation cut JSS to 9 learning areas and about 35 lessons a week.** These are secondhand reports:
  - [The Star, 31 Dec 2023](https://www.the-star.co.ke/news/2023-12-31-cbc-subjects-slashed-as-kicd-implements-reform-proposals)
  - [People Daily](https://peopledaily.digital/news/ministry-moves-to-reduce-workload-for-cbc-learners/amp)
- **There is no official Ministry template for syllabus coverage.** Schools track coverage through the record of work. HODs and QASOs ask for coverage per class per term, usually as a percentage or as "topics covered / not covered". Source: [Education News](https://educationnews.co.ke/why-kenyas-teacher-education-needs-total-overhaul/).
- **Streams of one grade move at their own pace.** Grade 7 East can be ahead of Grade 7 West in the same learning area.


## How Elimu measures it

- **The syllabus**: the checked curriculum map for the grade and learning area (`CurriculumMap`).
  - The sub-strands are split into terms by `subStrandsWithTerms`. A curator's term tag wins. Untagged sub-strands are split evenly by suggested lessons, in design order. This is the same split the design page and scheme generation use.
  - If no checked map exists yet, the sub-strands in the teacher's own schemes stand in, and the page says so.
- **Lessons of a sub-strand**: each sub-strand has a checklist of lessons. There are as many as the design suggests, or more if the teacher's scheme plans more.
- **A lesson is done** when either:
  - it is marked **Taught** on the record of work. Lesson *k* of a sub-strand is the *k*-th scheme lesson for it. These are ticked automatically, carry the record's date, and can't be unticked on the coverage page; or
  - the teacher ticks it on the coverage page, with the date it was taught.
  - When a sub-strand sits in more than one of the teacher's schemes (a term redone), only the scheme with the most lessons taught counts, so lessons aren't counted twice. Sub-strands are matched by name, ignoring numbering and punctuation.
- **Status of a sub-strand**:
  - **Covered** when the teacher ticks "The whole sub-strand is covered" and saves (dated), or when every lesson is done (dated by the last lesson).
  - **In progress** once any lesson is done.
  - **Not started** otherwise.
- **Check and submit**: on a phone the teacher opens a strand, then a sub-strand, ticks its lessons, picks the date and taps Save. Nothing changes until Save, so a stray tap costs nothing.
- **Progress** is the share of the design's suggested lessons done. A covered sub-strand counts in full; one in progress counts the share of its lessons done. A 12-lesson sub-strand counts six times a 2-lesson one. It is shown per strand, per learning area and stream, per term, per class, and across all the teacher's classes.
- **On track**: from the teacher's term dates, falling back to the Ministry calendar, Elimu works out how far through each term's teaching days today is.
  - That gives the share of the syllabus the class should have covered by now.
  - Ten points either side of it is "On track". Below that is "Behind", above it is "Ahead".

## Data

Two tables hold what the teacher enters. Everything else is worked out when the page loads.

`CoverageLesson`: one row per lesson the teacher ticks on the coverage page.

| Field | Notes |
| --- | --- |
| `teacherId`, `year` | One teacher, one school year. |
| `grade`, `subject`, `stream` | The class. `stream` is empty for a grade taught as one class. |
| `strand`, `subStrand` | Names, not ids. Saving a map recreates its strands, so ids change. |
| `lesson` | 1, 2, 3… within the sub-strand. |
| `taughtOn` | The date the teacher gave. |

`SyllabusCoverage`: one row per sub-strand the teacher has confirmed as covered.

| Field | Notes |
| --- | --- |
| The same class and sub-strand fields | |
| `status` | `COVERED`. Rows saved before lesson ticks may say `IN_PROGRESS` or `NOT_STARTED`; they still count. |
| `coveredOn` | The date the teacher confirmed it. Re-saving keeps the first date. |

- `CoverageLesson` is unique on the class, sub-strand and `lesson`, and indexed on `teacherId, year` and `teacherId, taughtOn`.
- `SyllabusCoverage` is unique on the class and sub-strand, and indexed on `teacherId, year`.
- One save is one transaction: unticked lessons are deleted, new ones added (a lesson already ticked keeps its date), and the covered row added or removed.
- A new year starts empty, without any clean-up job.

## How it fits with the rest of Elimu

| Module | Today | Later |
| --- | --- | --- |
| **Record of work** (`LessonRecord`, Today page "Mark taught", `markLesson`) | Read only. Lessons marked Taught tick themselves on the coverage page with their date. | — |
| **Curriculum maps** (`CurriculumMap`, curator) | The syllabus: strands, sub-strands, suggested lessons, the term split. | A curator's term tags sharpen the per-term figures. |
| **Schemes of work** | Map record-of-work lessons to sub-strands (lesson *k*). Stand in for the syllabus when no map is checked. | Store each scheme's sub-strand list on save, so coverage doesn't parse scheme JSON. |
| **Lesson plans** (Create) | "Plan a lesson on this" opens the lesson planner with the sub-strand as the topic. | Marking a plan as taught ticks the next lesson of its sub-strand. |
| **Timetable and term dates** | Streams, and the expected position for "On track". | — |
| **Today page** | — | A short nudge when a class falls behind. |
| **Term file PDF** | — | A coverage page per class: sub-strands with their covered dates. |
| **Heads of department** | — | School report from the same functions, one query per table over the school's teachers. Indexed on `teacherId, year` already. |

**Why ticks don't write to the record of work.** A record of work row needs a scheme, a timetable slot and a date, and the term scheduler moves lessons that aren't marked. Writing rows from the coverage page would clash with the scheduler and double-count lessons. So the two stay separate: the record of work feeds coverage, never the other way round. Later, when a teacher ticks a lesson that matches an unmarked scheme lesson, Elimu could offer to mark it on the record of work too.

## Scale

- The overview runs a fixed number of queries however many classes a teacher has:
  - classes
  - checked maps
  - this year's schemes
  - covered marks
  - lesson ticks
  - timetable
  - term dates
  - Taught records for those schemes
- Every query is filtered by teacher and indexed.
- The biggest read is the content of the teacher's schemes for the year, about 10–30 schemes. If that grows heavy, store each scheme's sub-strand list when the scheme is saved and read that instead.
- Lesson ticks are small: a JSS teacher with 6 classes and about 200 lessons each is about 1,200 rows a year.
