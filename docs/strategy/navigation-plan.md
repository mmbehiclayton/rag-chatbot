# Navigation plan: organise Elimu by the documents teachers keep

Status: approved and built, October 2026. Phases A to D are in. Two things differ from the plan below:
- The term chip on the document pages is left out for now. Each row already shows its term, and a document's term is worked out from the teacher's term dates, so it can't yet be filtered in the database query.
- Home links to Syllabus coverage under "Tools" instead of showing a coverage bar per class, to keep Home quick to load on mobile data.

## 1. The problem

Today a teacher can reach the same work from four or five places, and the names don't match the words teachers use.

| Where a lesson plan can be found or made | How the teacher gets there |
|---|---|
| My classes → Grade 7 → Maths → Lesson plans | Bottom bar, then three taps |
| Library → Lessons tab | Not on the bottom bar. Reached only from links |
| Create → Lesson plan | From Today, or the buttons on a class page |
| Scheme of work → a row → Plan this lesson | Inside a scheme |
| Syllabus coverage → sub-strand → Plan a lesson on this | Inside coverage |

The bottom bar has six items (Today, Classes, Designs, Coverage, Ask, Profile), and none of them is called "Lesson plans" or "Schemes of work". Those are the two words every Kenyan teacher already knows, because TSC checks them. "Classes", "Designs" and "Coverage" each need a small explanation before a new teacher understands them.

The user's proposal: name the menu after the documents (Schemes of work, Lesson plans, Lesson notes, Assessments). This plan tests that against research and turns it into steps.

## 2. What the research says

### 2.1 Teachers already think in document types

- TSC requires every teacher to keep the syllabus or curriculum design, **schemes of work, lesson plans, records of work, lesson notes**, learner progress records and attendance registers, and to show them on demand. Under TPAD the appraiser checks them about once a month, and the head teacher signs the checklist each term. They are also asked for at promotion interviews. ([Education News Hub: TPAD checklist](https://educationnewshub.co.ke/tsc-tpad-new-checklist-of-professional-documents-to-be-maintained-by-teachers/), [Kenyans.co.ke: TPAD 2](https://www.kenyans.co.ke/news/53752-tpad-2-system-tsc-teachers-all-you-need-know), [Education News: TPAD scorecard](https://educationnews.co.ke/tpad-the-ruthless-tsc-scorecard-where/), [Education News: tools for new teachers](https://educationnews.co.ke/?p=42536))
- The sites Kenyan teachers already pay for (Teachers Arena, KenyaPlex, Mwalimu Arena) sell files organised **by document type first**, then grade and learning area. This is recorded in our own earlier research, `research-and-pilot-plan.md` §3.
- So "Schemes of work" and "Lesson plans" are **the user's language**, not ours. A core usability principle is to label things in the words users use. Card sorting is the usual way to check this, and it often shows that labels which make sense to the team don't to users. ([Lyssna: card sorting guide](https://www.lyssna.com/en/guides/card-sorting), [GitLab handbook: mental modeling](https://handbook.gitlab.com/handbook/product/ux/ux-research/mental-modeling/))

### 2.2 A phone bottom bar holds three to five items

- Material 3, the Android design system our teachers' phones use, says a navigation bar is for **two to five** top destinations. Above five, it should become something else. Labels should be short and must not wrap or be cut off. ([SAP Fiori for Android: M3 navigation bar](https://www.sap.com/design-system/fiori-design-android/v26-4/components/m3-standard-components/navigation-bar/usage), [Compose NavigationBarItem](https://kotlinlang.org/api/compose-multiplatform/material3/androidx.compose.material3/-navigation-bar-item.html))
- We are at six now. Adding four document types without removing anything would make nine.
- Hiding things behind a "hamburger" menu costs a lot. NN/g found hidden navigation was discovered about 20% less often than visible navigation, and that people were slower using it. ([Smart Insights summary of the NN/g study](https://www.smartinsights.com/digital-marketing-strategy/are-hamburger-menus-hidden-navigation-good-for-ux/), [uxdesign.cc: mobile nav patterns](https://uxdesign.cc/some-common-mobile-nav-patterns-when-to-use-them-9b2bff9fcb0e))
- **What this means for us:** the four documents teachers use every week go on the bar. Things used now and then get a clear, labelled place one tap away.

### 2.3 Non-technical users recognise, they don't remember

- Novice and low-literacy users read word by word, skip big blocks of text, and repeat patterns they already know. Most of their difficulty comes from **mental models that don't match** the interface. ([Medhi Thies, UI design for low-literate and novice users, Microsoft Research](https://www.microsoft.com/en-us/research/?p=167992), [Making Sense: farmer app case study](https://makingsense.com/blog/post/inclusive-design-app-case-study-for-farmers-in-emerging-markets), [Aston University study](https://publications.aston.ac.uk/id/eprint/47850))
- **What this means for us:** one familiar word per tab, an icon and a label always together, and a flat structure where a document is never more than two taps from the bar. Don't make teachers remember that a lesson plan lives "inside a class".

### 2.4 How other planners do it

- Planboard (Chalk) is built around subjects or classes placed on a timetable, with day and week views. ([eSchool News](https://www.eschoolnews.com/2017/10/09/app-week-digital-planning-board/), [Neil Squire review](https://www.neilsquire.ca/planboard-a-free-lesson-planner/))
- That suits a teacher who plans in the app every day. Our teachers mostly come to Elimu to **produce a document** for the TPAD file. So class is the right **filter**, and document type is the right **destination**.

### 2.5 Reconciling this with our earlier decision

`research-and-pilot-plan.md` §3 chose class-first navigation to fix "features scattered anyhowly". The scattering was real, but the cause was **too many places for the same thing**, not the choice of axis. The fix that keeps the benefit of both:

- **The destination is the document type** (what the teacher came for, in their words).
- **Class and term are a remembered filter** on every document page (so Grade 7 Maths stays selected as they move between Schemes, Lesson plans and Notes).
- **The class file stays** as the one page that gathers everything for one class, for the TPAD folder and the "Download term file" button. It is no longer a bottom-bar item.

## 3. Recommended structure

### 3.1 Bottom bar on a phone (five items)

| # | Label on bar | Full name (sidebar and page title) | Route | Icon |
|---|---|---|---|---|
| 1 | Home | Home | `/dashboard` | `Home` |
| 2 | Schemes | Schemes of work | `/dashboard/schemes` | `CalendarRange` |
| 3 | Lessons | Lesson plans | `/dashboard/lessons` | `NotebookPen` |
| 4 | Notes | Lesson notes | `/dashboard/notes` | `FileText` |
| 5 | Assessments | Assessments | `/dashboard/assessments` | `ClipboardCheck` |

- "Assessments" is the longest label. At 360px wide, each item gets about 72px, and `text-xs` fits about 11 characters. Test it on a real 360px phone. If it is cut off, use "Tests" on the bar only and keep "Assessments" everywhere else.
- The document icons must match the ones already used on the Create page and the class page, so the same picture always means the same document.

### 3.2 Moving the other items off the bar

| Today | New home | Why |
|---|---|---|
| Today | **Home** (renamed) | "Home" is what Android users expect for the first tab |
| My classes | A **"My classes"** section on Home, plus a class chip on each document page | The class becomes a filter. The class file page stays |
| Curriculum Designs | A **"Curriculum designs"** link on Home and at the top of Schemes of work | Teachers open a design when they plan a scheme |
| Syllabus coverage | A **coverage card** on Home (progress per class), and on each class file | It's a progress view, checked weekly, not daily |
| Ask Elimu | A labelled **"Ask"** button in the top bar (icon and text), and a card on Home | Always one tap away without using a bar slot |
| Profile | The **avatar** in the top bar (already there), which opens Profile | Android convention. The avatar menu's top item says "Profile" |
| Library | **Removed.** Its four tabs become the four bar items | It duplicated the bar |

On a laptop, the sidebar shows the five items, then a "More" group with **Curriculum designs, Syllabus coverage, Ask Elimu, This week (timetable), Profile**, then the admin groups as now.

### 3.3 What a document page looks like (the same for all four)

```
┌─────────────────────────────────┐
│ Lesson plans          [Ask] (CM)│  top bar: title, Ask, avatar
├─────────────────────────────────┤
│ [Grade 7 Maths ▾]   [Term 3 ▾]  │  remembered class + term filter
│ [+ New lesson plan            ] │  one main button, full width
│ 🔍 Search lesson plans          │
│ ─────────────────────────────── │
│ This week                       │
│  Fractions: adding · Lesson 4   │  rows: title, class, date, status
│  Draft · review before use      │
│ Earlier                         │
│  …                              │
├─────────────────────────────────┤
│ Home Schemes Lessons Notes Asses│  bottom bar
└─────────────────────────────────┘
```

- **The class chip** lists "All my classes" and each class the teacher teaches (from Profile). The choice is remembered in a cookie, so it stays the same across the four pages and the next visit. "All my classes" is the default for a teacher with one class, and also when nothing is chosen yet.
- **The term chip** is the same term switcher the class page uses.
- **The main button** goes straight to the right create form, with the class filled in: `/dashboard/create/lesson`, `/create/scheme`, `/create/assessment`. For Notes it opens "Choose a lesson plan", because a note is made from a plan.
- **The empty state** says what the document is in one line and offers the one button, e.g. "No lesson plans for Grade 7 Maths yet. Make one from your scheme of work or start fresh."
- **Each row** links to the document. A row in Lesson plans shows "Notes ready" when the plan has notes, linking across. A scheme row shows "12 of 40 lessons planned".

### 3.4 Home

Home becomes the only "dashboard", in this order:

1. "Habari, {first name}" and **Next lesson** from the timetable, if set ("Grade 7 Maths, 10:20 · Plan it").
2. **Make something**: four large buttons, Scheme of work · Lesson plan · Lesson notes · Assessment. This is the old Create page, folded in.
3. **My classes**: one card per class, with its coverage bar. Tapping a card opens the class file.
4. **Continue**: the last five documents of any type.
5. **Tools**: Ask Elimu, Curriculum designs, This week.

`/dashboard/create` stays as a route for old links, and redirects to Home's "Make something" (`/dashboard#make`).

### 3.5 Words

Use the same name everywhere: on the bar, in page titles, on buttons and in toasts.

| Use | Don't use |
|---|---|
| Scheme of work / Schemes of work | Scheme, SoW, Plan of work |
| Lesson plan / Lesson plans | Lesson, Plan |
| Lesson notes | Notes pack, Teaching notes |
| Assessment | Exam, Test (except the short bar label, if needed) |
| Learning area | Subject |
| Class (e.g. "Grade 7 Maths") | Stream/subject combo, Workspace |
| Record of work | Log, Tracker |

## 4. Route and redirect map

| Route | Now | After |
|---|---|---|
| `/dashboard` | Today | Home (section 3.4) |
| `/dashboard/schemes` | Redirect → library | **List page** |
| `/dashboard/lessons` | Redirect → library | **List page** |
| `/dashboard/notes` | "Choose a lesson plan" | **List page**. The picker moves to `/dashboard/notes/new` |
| `/dashboard/assessments` | Redirect → library | **List page** |
| `/dashboard/library?type=x` | Tabbed list | Redirect → `/dashboard/{x}` (keeps `q` and `page`) |
| `/dashboard/create` | Create hub | Redirect → `/dashboard#make` |
| `/dashboard/classes/...` | Bar item | Kept as the class file. Linked from Home and the class chip ("Open class file") |
| `/dashboard/designs`, `/coverage`, `/chat`, `/timetable`, `/profile` | Bar items or links | Unchanged URLs. Reached from Home, the top bar, and the sidebar "More" group |
| `/dashboard/workstation` | Redirect → create | Redirect → Home |

No URL a teacher may have saved stops working.

## 5. Implementation phases

Each phase can be shipped and merged on its own. None needs a database change.

### Phase A: four document pages (the core change)
- `src/app/dashboard/library/page.tsx`: move `TYPES`, `loadRows` and the row list into `src/components/documents/document-list.tsx` (server component) and `src/lib/documents.ts`. Add a `grade`/`subject` filter to `loadRows`.
- New `src/components/documents/class-filter.tsx`: the class chip, with a cookie `elimu-class`, and the term chip reused from the class page.
- `src/app/dashboard/{schemes,lessons,notes,assessments}/page.tsx`: replace the redirects with `PageHeader`, the filters, the main button and `DocumentList type=…`. Move the notes picker to `notes/new/page.tsx`.
- `library/page.tsx` becomes a redirect.
- Add `loading.tsx` skeletons for the four pages.

### Phase B: the bar and the sidebar
- `src/components/layout/nav-config.ts`: change `PRIMARY_NAV` to the five items in section 3.1. Add `MORE_NAV` (Curriculum designs, Syllabus coverage, Ask Elimu, This week, Profile) and the page titles.
- `src/components/layout/bottom-nav.tsx`: five items. Check the label width at 360px.
- `src/components/layout/app-sidebar.tsx`: add the "More" group.
- `src/app/dashboard/layout.tsx` (top bar): add an "Ask" button with icon and text, `aria-label="Ask Elimu"`, at least 44px.

### Phase C: Home
- `src/app/dashboard/page.tsx` and `teacher-overview.tsx`: build the sections in 3.4. Reuse the Create page's cards and `getCoverage` for the class cards.
- `create/page.tsx`: redirect to `/dashboard#make`. Update every `href="/dashboard/create"` (grep) to point at the specific form.

### Phase D: links and words
- Grep for `library?type=` and point every link at the new pages.
- Do the word pass from section 3.5 across teacher pages, toasts and empty states.
- Update `docs/strategy/research-and-pilot-plan.md` §3 to point here.

Rough size: A is the largest (about a day). B, C and D are smaller.

## 6. How we'll know it works

**Before building (cheap, this week):**
- A **five-minute tree test** with 5–8 pilot teachers on WhatsApp. Send a picture of the new bar and ask: "Where would you tap to (1) find last week's Grade 8 Science lesson plan, (2) make notes for that lesson, (3) see how much of the Maths syllabus you've covered, (4) ask a question about a strand?" Count first-tap success. Aim for 80% or more on 1–2, and accept lower on 3–4.
- **A label check:** show the five bar labels alone and ask what each one holds.

**After shipping, in the pilot:**
- Watch two teachers on their own phones do the four tasks above. Note any hesitation over three seconds.
- Track first taps from Home (to see which make buttons are used) and how often the class chip is changed, using the existing usage logs only. Don't add new tracking.
- **Success means:** fewer "where is my…" questions in the pilot WhatsApp group, and teachers producing a full set (scheme, plans, notes) for one class in a term.

**Risks:**
- Coverage and Designs become less visible. Home's class cards and the link on Schemes must carry them. Check that coverage use doesn't drop after the change.
- The bar labels are tight at 360px. Test before merging.
- Teachers with many classes may find "All my classes" lists long. Group the list rows by class when no class is chosen.

## 7. Decision needed

Approve the five-item bar (**Home · Schemes · Lessons · Notes · Assessments**), with Ask in the top bar, Profile behind the avatar, and Coverage and Designs on Home and in the sidebar. Once approved, build Phase A first.
