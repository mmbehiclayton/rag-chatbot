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
- **Covered, without extra work**: a sub-strand is covered when every lesson for it in the teacher's schemes this year is marked **Taught** on the record of work. When only some lessons are taught, it is in progress. Sub-strands are matched by name, ignoring numbering and punctuation.
- **Covered, marked by the teacher**: the teacher can mark any sub-strand Not started, In progress or Covered.
  - This mark wins over the record of work, for teachers who don't use Elimu's schemes for every lesson.
  - "Use my record of work" removes the mark.
- **Progress** is the covered share of the design's suggested lessons. A 12-lesson sub-strand counts six times a 2-lesson one. It is shown per class and stream, per term, and across all the teacher's classes.
- **On track**: from the teacher's term dates, falling back to the Ministry calendar, Elimu works out how far through each term's teaching days today is.
  - That gives the share of the syllabus the class should have covered by now.
  - Ten points either side of it is "On track". Below that is "Behind", above it is "Ahead".

## Data

`SyllabusCoverage` holds only the teacher's own marks:

| Field | Notes |
| --- | --- |
| `teacherId`, `year` | The coverage is for one teacher and one school year. |
| `grade`, `subject`, `stream` | The class. `stream` is empty for a grade taught as one class. |
| `strand`, `subStrand` | Names, not ids. Saving a map recreates its strands, so ids change. |
| `status` | One of `NOT_STARTED`, `IN_PROGRESS` or `COVERED`. |

- Each row is unique on `teacherId, year, grade, subject, stream, strand, subStrand`, and indexed on `teacherId, year`.
- Everything else is worked out when the page loads.
- A new year starts empty, without any clean-up job.

## Scale

- The overview runs a fixed number of queries however many classes a teacher has:
  - classes
  - checked maps
  - this year's schemes
  - marks
  - timetable
  - term dates
  - Taught records for those schemes
- Every query is filtered by teacher and indexed.
- The biggest read is the content of the teacher's schemes for the year, about 10–30 schemes. If that grows heavy, store each scheme's sub-strand list when the scheme is saved and read that instead.
- School-wide coverage for heads of department can use the same functions over the school's teachers later, in one query per table rather than per teacher.

## Later

- A coverage report for the head of department across a school's teachers.
- A coverage page in the term file PDF.
- Optionally: when a sub-strand is marked covered, offer to log the lessons on the record of work.
