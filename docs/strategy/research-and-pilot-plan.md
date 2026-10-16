# Elimu: teacher research and pilot plan

October 2026. This is desk research, mostly from Kenyan news sites, vendor sites and a few studies. Phase 0 checks it with real teachers before we build.

## 1. What teachers actually struggle with

The problems are ranked by evidence and by whether teachers already spend money or time on them.

| # | Pain | Evidence | Do teachers already pay? |
|---|------|----------|--------------------------|
| 1 | **Professional documents every term.** Schemes of work, lesson plans, records of work, lesson notes and progress records, for every learning area they teach. | TSC TPAD expects these as evidence and they count at promotion interviews. TSC quality assurance officers do unannounced spot checks of TPAD records and syllabus coverage. Teachers say QASO visits are mostly document checks. | **Yes.** Schemes sell at KES 50–100 per file (Teachers Arena, Mwalimu Arena, Kenyaplex) and subscriptions at KES 499 a month or KES 1,799 a year (Mwalimu Resources Pro). Files arrive by WhatsApp after an M-Pesa payment. |
| 2 | **Assessment and record keeping under CBE.** Rubrics, school-based assessments (SBA), learner progress reports. | Studies find about half of teachers struggle to design rubrics. Term-end reports take a long time to compile from paper records. The KNEC CBA portal slows down near deadlines and has a KES 500 late penalty on KJSEA projects. | Partly. Schools pay for tools such as the CBC App. |
| 3 | **Teaching outside their training (junior school).** | JSS is short of more than 72,000 teachers. Some teachers carry up to 12 subjects, and 35% of junior schools have no STEM teacher. Many recently hired interns are early in their careers. | No direct spending, but this is where lesson notes and "explain this topic to me" help most. |
| 4 | **Curriculum change.** Rationalised designs, new Grade 10 (2026) and Grade 11 (2027) designs, CBC renamed to CBE. | Vendors' files are often out of date. Some grades are missing (a Grade 5 and JSS gap was reported). | It drives repeat purchases every term. |
| 5 | **TPAD itself.** Appraisal, lesson observation forms, evidence uploads. TPAD 3 is reportedly rolling out. | Promotion depends on it. | Not yet. |

**What the vendors get wrong (our opening):** a bought scheme is a static file. It doesn't fit the teacher's term dates, the lessons per week on their timetable, half-term, their school name, or the latest rationalised design. Teachers then edit by hand or submit something that doesn't match their class. Nobody connects scheme → lesson plans → record of work. That chain is exactly what a head teacher or QASO checks.

## 2. The 20% that solves 80%

**Pilot feature: the Term Pack.**

> "Your professional documents for the term, correct to your timetable, in ten minutes."

For each class the teacher has (grade + learning area):

1. **Scheme of work**, built from the teacher's real term dates, lessons per week and breaks.
2. **Lesson plans** for each week, created one week at a time.
3. **Record of work** that fills itself. The teacher taps "Taught" (or "Not taught, carry over") after each lesson, and the record of work, with dates, is ready for the head teacher's signature.
4. **Print and PDF** in the layout heads and QASOs expect.

Why this one:
- It is compulsory, checked and linked to promotion, so teachers need it, not just want it.
- Teachers already pay for a worse version, so willingness to pay is proven.
- Tapping "Taught" gives a reason to open Elimu every school day. That builds the habit, which a once-a-term download never does.
- The TPAD evidence (pain 5) and head teacher sign-off create the bridge to schools later.
- Elimu already generates schemes and lesson plans. The record of work, timetable-aware scheduling and a class-based layout are the missing pieces.

**Deliberately not in the pilot:** assessments, chat and copilot (they stay but aren't promoted), the jobs marketplace, profiles, reviews, following and the community chat room.

## 3. Fixing "features scattered anyhowly"

Today the app is organised by document type: schemes, lessons, notes and assessments each live in a separate list. Teachers think in classes ("my Grade 7 Integrated Science"). Proposed structure:

- **Today:** today's lessons from the timetable, each with its plan and a Taught button.
- **My classes:** one card per grade + learning area. Inside: Scheme, Lesson plans, Record of work, and later Assessments, all in one place.
- **Ask Elimu:** kept, but secondary.
- **Me:** profile, timetable, term dates, plan and payments.

"Create" stops being a destination. Each class has a clear next step instead ("Create the Week 3 lesson plans").

## 4. The knowledge base (our engine)

**The situation:** the KICD website lists curriculum designs per grade, but the footer says "All Rights Reserved" and there is no open licence. We should not scrape or republish the designs. Many vendors do, which is a risk for them and a chance for us to be the trustworthy option.

**Recommended approach, in this order:**

1. **Get a Kenyan IP lawyer's opinion.** Topics: Copyright Act section 25 (works of Government); using designs as reference to produce original teaching documents; and KICD Act section 27, which says using unapproved materials is an offence. Budget a few days. This decides everything below.
2. **Build a structured curriculum map, not a PDF library.** For each learning area: strands, sub-strands, specific learning outcomes, key inquiry questions, suggested lesson counts. Practising teachers curate it (paid per learning area, reviewed by a second teacher) from designs they legally hold. Generation draws on this map. It never quotes long passages and never serves the PDF. It is also cheaper and more accurate than chunked PDF retrieval.
3. **Talk to KICD early.** KICD has a paid evaluation route for digital platforms and content, ending in a listing in the Orange Book on the Kenya Education Cloud. Being listed is a trust signal no vendor has, and it opens the door to the schools channel. Start the conversation in Phase 0 because it is slow.
4. **Let teachers' edits improve the map.** When many teachers change the same scheme row, a curator reviews it. Reviewed plans become better examples for generation.
5. **Show coverage honestly.** A grade + learning area is "available" only when its map is curated and checked. Otherwise the app says so.

**Pilot coverage, following Pareto:** junior school, Grades 7–9, core learning areas only. That is roughly 25 maps, not 300. JSS has the worst shortage, the most out-of-field teaching and many young, phone-first teachers.
- **Alternative:** Grade 11 (new in January 2027). No vendor has good material yet, but the designs are new and the knowledge base risk is higher.

## 5. Money (validate in the pilot, build after)

| Plan | Price (to test) | What it gives |
|------|-----------------|---------------|
| Free | KES 0 | 1 class, full term pack. Enough to see the value and show the head teacher. |
| Term pass | KES 300–500 per term | All classes, all documents, print and export |
| Year | KES 1,000–1,500 | Three terms, paid once |

- **Price anchor:** teachers pay KES 50–100 per scheme file and have 5–9 learning areas, so they spend KES 400–900 per term on schemes alone.
- **Payment:** M-Pesa only. During the pilot, a manual Paybill and activation code, as competitors do. M-Pesa STK push (Daraja) after the pilot proves people pay.
- **Billing period:** sell by term, not by month. Teachers think in terms.

**Schools (after teachers are hooked):** a head teacher view shows which teachers have current schemes, records of work and syllabus coverage, which is what QASO checks. Schools pay per teacher per term. Do not build this until 30% or more of pilot teachers say their head has asked to see their Elimu documents.

## 6. Later ideas, in a deliberate order

1. **Assessments and rubrics**, once the Term Pack is loved: SBA tasks, rubrics and progress reports per class.
2. **TPAD evidence helper:** export the term's documents as TPAD evidence.
3. **Teacher profile:** a verified CV (TSC number, subjects, schools, documents created).
4. **Jobs board:** BOM, private school and intern vacancies matched to the profile. This needs employers, so it is a separate business with its own pilot.
5. **Reviews and follows:** only after profiles exist.
6. **Community chat room:** last, and moderated subject circles rather than one national room. It needs moderation staff, and exam-leak sharing in teacher WhatsApp groups has already led to arrests. An unmoderated national room is a legal risk for Elimu.

## 7. Phases

Each phase ships on its own and has a clear goal.

**Phase 0: Validate (2–3 weeks, little code)**
- 20 phone interviews with JSS teachers in 3 counties, including one rural and one arid county. Plus a WhatsApp survey through teacher groups.
- Collect 10 real schemes and records of work that heads accepted, to copy the exact layout.
- Lawyer's opinion. First conversation with KICD.
- **Exit test:** at least 12 of 20 teachers say the Term Pack would replace what they buy now, and at least 8 say they would pay KES 300 or more per term.
- Run a trademark search on "Elimu". Elimu Planner, elimukenya.co.ke and others already exist.

**Phase 1: Simplify what exists (1–2 weeks)**
- Public pages: one landing page about the Term Pack (hero, the problem, how it works, price, questions, footer), plus sign in, create account and reset password. Remove everything else.
- Theme: Brand colours as flat colours only, no gradients:
  - Elimu Green `#27AE60`, with a darker green `#1E8449` for text on white.
  - Deep Blue `#2C3E50` for text.
  - Light Gray `#ECF0F1` and white for backgrounds.
  - Amber `#F39C12` and red `#E74C3C` for status only.
- Font: **DM Sans**, one variable font file. It is on the Brand.md shortlist, clear on small Android screens, warm without being playful, and has even-width numbers for tables. It replaces the three Poppins files and costs less data. Poppins stays only in the logo wordmark, as an image.
- Navigation: Today, My classes, Ask Elimu, Me.

**Phase 2: Curriculum map for the pilot (3–4 weeks, runs alongside Phase 3)**
- An admin tool to enter and review strands, sub-strands, outcomes and lesson counts per learning area.
- Teacher curators fill the roughly 25 JSS maps, and each is checked by a second teacher.
- Generation switches from PDF chunks to the map.

**Phase 3: The Term Pack (4 weeks)**
- Setup per teacher: term dates (pre-filled from the MoE calendar), breaks, and a simple timetable (lessons per week per class).
- A scheme scheduled onto real weeks and dates.
- Lesson plans per week. A "Taught" or "Carry over" tap fills the record of work.
- Print and PDF that match the layouts collected in Phase 0. Space for the head teacher's signature.

**Phase 4: Pilot (one school term, January–April 2027)**
- 100 JSS teachers in about 15 schools across 3 counties.
- Manual M-Pesa payment, from Week 3 onwards.
- Measures:
  - share who finish a Term Pack in the first session;
  - weekly active teachers;
  - share of lessons marked taught;
  - share who pay;
  - share whose head teacher accepted the documents;
  - how many teachers each one invites.
- **Go to scale if:** at least 60% are still active in Week 8, at least 25% pay, and heads accept the documents.

**Phase 5: Scale the engine**
- M-Pesa STK push.
- More grades by Pareto (upper primary next, then senior school).
- Referral rewards, such as a free term for 3 colleagues who join.

**Phase 6 onwards:** in the order in section 6, each with its own small pilot.

## Sources

- TPAD evidence uploads: https://arena.co.ke/teachers-to-start-uploading-scanned-evidence-in-tsc-tpad-requirement/
- TPAD lesson observation changes: https://arena.co.ke/tsc-makes-some-changes-in-teacher-tpad-lesson-observation/
- TPAD 3 (unconfirmed): https://teacher.co.ke/tsc-set-to-roll-out-tpad-3-and-new-tmis-amidst-sweeping-staffing-changes/ and https://cbcedukenya.com/blog/tpad-3-2026-every-change-teachers-must-know
- TSC spot checks: https://educationnews.co.ke/anxiety-grips-teachers-as-tsc-launches-nationwide-spot-checks/
- QASO document checks: https://ir-library.ku.ac.ke/handle/123456789/12191
- KNEC SBA portal strain: https://arena.co.ke/knec-extends-deadline-for-grade-4-and-5-sba-score-uploads-amid-technical-challenges/ and https://streamlinefeed.co.ke/news/knec-extends-sba-upload-deadline-june-18-portal-strain
- KJSEA late penalty: https://arena.co.ke/knec-put-schools-to-notice-over-kjsea-projects-uploading-task/
- Rubric difficulty: https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2026.1697725/pdf and https://rsisinternational.org/journals/ijriss/articles/implementation-of-competency-based-assessment-in-kenya-extent-of-utilization-of-competency-based-assessment-tools-and-types/
- Paper records burden: https://www.globalpartnership.org/blog/transforming-learning-assessment-cbc-app-kenya
- JSS shortage and out-of-field teaching: https://nation.africa/kenya/blogs-opinion/editorials/fix-jss-teachers-crisis-5633894 and https://eastleighvoice.co.ke/education/181455/kenya-faces-cbc-crisis-as-teacher-shortage-surpasses-100000-ahead-of-2026-rollout
- TSC shortfall figures: https://nation.africa/kenya/news/education/tsc-shocker-on-teacher-shortage-crisis-as-gap-hits-98-000--4995392 and https://mwananchi.co.tz/kenya/news/education/junior-schools-under-staffed-by-72-422-teachers-says-tsc--5096818
- Vendor prices: https://mwalimuarena.co.ke/, https://teachersarena.co.ke/, https://www.kenyaplex.com/tutorials/, https://mwalimuresources.co.ke/, https://kcserevision.com/download-schemes-of-work-2026/
- Competitors: https://elimuplanner.co.ke/, https://cbcapp.co.ke/, https://solve.mit.edu/solutions/60847, https://apps.apple.com/app/id6756706838
- KICD designs and copyright notice: https://kicd.ac.ke/cbc-materials/curriculum-designs/
- KICD platform and content approval: https://kicd.ac.ke/wp-content/uploads/2017/10/StandardsforEducationalMobilePlatforms.pdf, https://kicd.ac.ke/wp-content/uploads/2017/10/StandardsforOERsguidelinesforUGC.pdf, https://kec.ac.ke/, https://allafrica.com/stories/202610070107.html
- Copyright Act: https://www.wipo.int/wipolex/en/text/506082
- Rationalisation and senior school: https://peopledaily.digital/news/ministry-moves-to-reduce-workload-for-cbc-learners and https://educationnews.co.ke/?p=459780
- Exam-leak arrests in a WhatsApp group: https://www.kenyans.co.ke/news/12-teachers-arrested-over-whatsapp-messages
- Teacher Telegram channel: https://tlmtr.io/en/channels/1308215418-teachersupdates/posts
- Mobile data costs: https://peopledaily.digital/business/why-mobile-internet-use-in-kenya-remains-subdued
