import {
  BookOpen,
  CalendarDays,
  Check,
  ClipboardCheck,
  FileText,
  NotebookPen,
  Printer,
  ShieldCheck,
  Smartphone,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { PublicHeader } from "@/components/shared/public-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { allowances } from "@/lib/allowance";
import { auth } from "@/lib/auth";
import { MAP_STATUS } from "@/lib/curriculum-map";
import { db, withDbRetry } from "@/lib/db";
import { downloadPrices } from "@/lib/downloads";
import { plansOn, termPrice } from "@/lib/plans";

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

const DOCUMENTS = [
  {
    icon: BookOpen,
    title: "Scheme of work",
    body: "The whole term, week by week, fitted to your term dates, half-term and the lessons a week for each learning area.",
  },
  {
    icon: FileText,
    title: "Lesson plans",
    body: "A plan for every lesson in your scheme, a week at a time, or one quick plan for tomorrow morning.",
  },
  {
    icon: NotebookPen,
    title: "Lesson notes",
    body: "Worked examples, questions to ask the class and the mistakes learners usually make.",
  },
  {
    icon: ClipboardCheck,
    title: "Assessments",
    body: "Tests and quizzes with a marking guide, practical tasks with a rubric, and observation checklists.",
  },
];

/** How Elimu compares with a scheme bought from a shop or a WhatsApp group. */
const COMPARE = [
  {
    topic: "Your term dates",
    bought: "Written for a standard term. You redo it when your dates differ.",
    elimu:
      "Built on your own term dates, half-term, holidays and lessons a week.",
  },
  {
    topic: "Lesson plans",
    bought: "Usually sold separately, and the same for every school.",
    elimu: "A plan for every lesson in your scheme, a week at a time.",
  },
  {
    topic: "Making changes",
    bought: "Cross out and rewrite by hand.",
    elimu:
      "Edit any line, or ask Elimu to redo one part, like the introduction. Undo if you don't like it.",
  },
  {
    topic: "Notes and papers",
    bought: "Another purchase.",
    elimu:
      "Lesson notes and assessments with a marking guide, from the same scheme.",
  },
];

const STEPS = [
  {
    title: "Add your classes",
    body: "Choose the grades and learning areas you teach. Each class gets its own page.",
  },
  {
    title: "Plan the term",
    body: "Enter the term dates and Elimu drafts the scheme of work from the curriculum design.",
  },
  {
    title: "Prepare each week",
    body: "Turn the scheme into lesson plans, check them, then print or save as PDF.",
  },
];

/** A short example so teachers see the kind of draft they get before signing up. */
const SAMPLE = {
  heading: "Grade 7 · Integrated Science",
  minutes: "40 minutes",
  rows: [
    { label: "Strand", value: "Mixtures, Elements and Compounds" },
    { label: "Sub-strand", value: "Mixtures" },
    {
      label: "Outcomes",
      value:
        "Say what a mixture is, separate sand from water, and name ways mixtures are separated at home.",
    },
    {
      label: "Inquiry question",
      value: "How do we separate mixtures at home?",
    },
    {
      label: "Resources",
      value: "Sand, water, a jug, two clear bottles cut in half.",
    },
  ],
  steps: [
    {
      part: "Introduction",
      min: 5,
      text: "Learners say what they see when sand is stirred into water.",
    },
    {
      part: "Development",
      min: 25,
      text: "In groups, learners pour off the water slowly and record what is left.",
    },
    {
      part: "Conclusion",
      min: 10,
      text: "Groups share results and list mixtures they separate at home.",
    },
  ],
};

/** Grades with checked curriculum maps, and how many learning areas each has. */
async function readyGrades() {
  const maps = await withDbRetry(() =>
    db.curriculumMap.findMany({
      where: { status: MAP_STATUS.PUBLISHED },
      select: { grade: true },
    }),
  ).catch(() => []);
  const counts = new Map<string, number>();
  for (const m of maps) counts.set(m.grade, (counts.get(m.grade) ?? 0) + 1);
  return [...counts]
    .map(([grade, areas]) => ({ grade, areas }))
    .sort((a, b) => a.grade.localeCompare(b.grade, "en", { numeric: true }));
}

export default async function Home() {
  const [session, paying, price, limits, ready, prices] = await Promise.all([
    auth(),
    plansOn(),
    termPrice(),
    allowances(),
    readyGrades(),
    downloadPrices(),
  ]);
  const cheapest = Math.min(...Object.values(prices));
  const signedIn = !!session?.userId;
  const shillings = `KES ${price.toLocaleString("en-KE")}`;

  const faq = [
    {
      q: "Where does the content come from?",
      a: "Elimu drafts each document from the KICD curriculum design for your grade and learning area. It is a first draft: read it and adjust it for your learners before you teach.",
    },
    {
      q: "Which classes are covered?",
      a: "We are starting with Junior School, Grades 7 to 9. If the design for a learning area isn't checked yet, Elimu tells you so you can read the draft more carefully.",
    },
    {
      q: "What if I don't like a draft?",
      a: 'Change any line yourself, or tell Elimu what to change, for example "use materials a rural school has". You can change just one part of a lesson plan, and every change can be undone.',
    },
    {
      q: "Does it work on my phone?",
      a: "Yes. Elimu is built for Android phones and is light on data. Print from your phone or at a cyber, or save as PDF.",
    },
    {
      q: "How much does it cost?",
      a: paying
        ? `Making documents and reading them in Elimu is free, and your first download is free. After that you pay once for each document you download, from KES ${cheapest} for a lesson plan to KES ${prices.scheme} for a scheme of work, or get a term pass for ${shillings} that opens every download for the term. Pay by M-Pesa.`
        : "It is free during the pilot, for every class. Later, making documents will stay free and you will pay to download them, per document or with a term pass. You don't need a card or M-Pesa to create an account.",
    },
  ];

  return (
    <div className="min-h-dvh bg-background">
      <PublicHeader signedIn={signedIn} wide />

      <main>
        {/* Hero: the promise on the left, a real-looking draft on the right */}
        <section className="mx-auto grid max-w-5xl gap-10 px-4 py-12 sm:py-16 lg:grid-cols-2 lg:items-center">
          <div className="space-y-6">
            <Badge variant="secondary">For Junior School · Grades 7 to 9</Badge>
            <h1 className="text-2xl font-semibold leading-tight">
              Plan the whole term in one evening
            </h1>
            <p className="text-lg text-muted-foreground">
              Elimu writes the first draft of your scheme of work, lesson plans,
              notes and assessments from the KICD curriculum design, fitted to
              your term dates. You check it, print it, and get back to teaching.
            </p>
            {signedIn ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button size="lg" render={<Link href="/dashboard" />}>
                  Go to my dashboard
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  render={<Link href="/dashboard/create/lesson" />}
                >
                  Create a lesson plan
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button size="lg" render={<Link href="/register" />}>
                  Create free account
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  render={<Link href="/login" />}
                >
                  I already have an account
                </Button>
              </div>
            )}
            <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              {[
                "Free to start, no card needed",
                "Works on any Android phone",
                "Print or save as PDF",
                paying
                  ? `Term pass ${shillings}, by M-Pesa`
                  : "Free during the pilot",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check className="size-4 shrink-0 text-success" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <article
            aria-label="An example lesson plan draft"
            className="rounded-xl border bg-card p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-2 border-b pb-3">
              <div>
                <h2 className="font-semibold">{SAMPLE.heading}</h2>
                <p className="text-sm text-muted-foreground">
                  Lesson plan · {SAMPLE.minutes}
                </p>
              </div>
              <Badge variant="secondary">Example draft</Badge>
            </div>
            <dl className="space-y-2 py-3 text-sm">
              {SAMPLE.rows.map((r) => (
                <div key={r.label} className="grid gap-0.5 sm:grid-cols-3">
                  <dt className="text-muted-foreground">{r.label}</dt>
                  <dd className="sm:col-span-2">{r.value}</dd>
                </div>
              ))}
            </dl>
            <ol className="space-y-2 border-t pt-3 text-sm">
              {SAMPLE.steps.map((s) => (
                <li key={s.part} className="flex gap-3">
                  <span className="w-14 shrink-0 text-xs font-medium text-primary">
                    {s.min} min
                  </span>
                  <span>
                    <span className="font-medium">{s.part}:</span> {s.text}
                  </span>
                </li>
              ))}
            </ol>
          </article>
        </section>

        <section className="border-y bg-card">
          <div className="mx-auto max-w-5xl px-4 py-12">
            <h2 className="text-xl font-semibold">
              Everything you are asked for, from one scheme
            </h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Every term you write a scheme for each class, then a plan for
              every lesson, and they must be ready when they are checked. Elimu
              writes the first draft of each one.
            </p>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {DOCUMENTS.map((d) => (
                <li
                  key={d.title}
                  className="space-y-2 rounded-xl border bg-background p-4"
                >
                  <span className="flex size-10 items-center justify-center rounded-md bg-primary/10">
                    <d.icon className="size-5 text-primary" aria-hidden />
                  </span>
                  <h3 className="font-medium">{d.title}</h3>
                  <p className="text-sm text-muted-foreground">{d.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-12">
          <h2 className="text-xl font-semibold">
            Why not just buy a ready-made scheme?
          </h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            A bought scheme is written once for everyone. Elimu drafts yours for
            your classes and your term.
          </p>
          <div className="mt-6 divide-y rounded-xl border bg-card">
            <div className="hidden grid-cols-[10rem_1fr_1fr] gap-4 px-4 py-3 text-sm font-medium sm:grid">
              <span />
              <span className="text-muted-foreground">A bought scheme</span>
              <span className="text-primary">Elimu</span>
            </div>
            {COMPARE.map((c) => (
              <div
                key={c.topic}
                className="grid gap-2 p-4 text-sm sm:grid-cols-[10rem_1fr_1fr] sm:gap-4"
              >
                <span className="font-medium">{c.topic}</span>
                <span className="flex gap-2 text-muted-foreground">
                  <X
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                    aria-label="A bought scheme"
                  />
                  {c.bought}
                </span>
                <span className="flex gap-2">
                  <Check
                    className="mt-0.5 size-4 shrink-0 text-success"
                    aria-label="Elimu"
                  />
                  {c.elimu}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y bg-card">
          <div className="mx-auto grid max-w-5xl gap-8 px-4 py-12 lg:grid-cols-2">
            <div className="space-y-3">
              <h2 className="text-xl font-semibold">
                Built from the designs, checked twice
              </h2>
              <p className="text-muted-foreground">
                The strands, sub-strands and learning outcomes for each learning
                area are typed in from the KICD design, then checked by a second
                curator before Elimu uses them. Where a design isn't checked
                yet, Elimu tells you.
              </p>
              {ready.length > 0 && (
                <ul className="flex flex-wrap gap-2 pt-1">
                  {ready.map((r) => (
                    <li key={r.grade}>
                      <Badge variant="secondary">
                        {r.grade}: {r.areas} learning{" "}
                        {r.areas === 1 ? "area" : "areas"} ready
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
              <Button
                variant="outline"
                size="lg"
                render={<Link href="/designs" />}
              >
                Read the curriculum designs, free
              </Button>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  icon: CalendarDays,
                  title: "Fits your term",
                  body: "Half-term and public holidays are left out, so the weeks match your calendar.",
                },
                {
                  icon: Sparkles,
                  title: "Change one part",
                  body: "Ask for a new introduction or simpler language without losing the rest.",
                },
                {
                  icon: Smartphone,
                  title: "Light on data",
                  body: "Made for Android phones on bundles, not for big screens.",
                },
                {
                  icon: Printer,
                  title: "Ready to hand in",
                  body: "Print at a cyber or save as PDF when it is time to hand it in.",
                },
              ].map((f) => (
                <li key={f.title} className="space-y-1">
                  <f.icon className="size-5 text-primary" aria-hidden />
                  <h3 className="font-medium">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-12">
          <h2 className="text-xl font-semibold">How it works</h2>
          <ol className="mt-6 grid gap-6 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="space-y-2">
                <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {i + 1}
                </span>
                <h3 className="font-medium">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-y bg-card">
          <div className="mx-auto max-w-5xl px-4 py-12">
            <h2 className="text-xl font-semibold">Pricing</h2>
            {paying ? (
              <>
                <p className="mt-2 max-w-2xl text-muted-foreground">
                  Make documents and read them free, for any class. Pay only for
                  what you download.
                </p>
                <ul className="mt-6 grid gap-4 sm:grid-cols-3">
                  <li className="space-y-3 rounded-xl border bg-background p-5">
                    <h3 className="font-semibold">Free</h3>
                    <p className="text-2xl font-semibold">KES 0</p>
                    <ul className="space-y-2 text-sm">
                      {[
                        "Make documents for any class",
                        `Up to ${limits.free} documents a month`,
                        "Your first download free",
                      ].map((t) => (
                        <li key={t} className="flex gap-2">
                          <Check
                            className="mt-0.5 size-4 shrink-0 text-success"
                            aria-hidden
                          />
                          {t}
                        </li>
                      ))}
                    </ul>
                  </li>
                  <li className="space-y-3 rounded-xl border bg-background p-5">
                    <h3 className="font-semibold">Per download</h3>
                    <p className="text-2xl font-semibold">
                      <span className="text-sm font-normal text-muted-foreground">
                        from
                      </span>{" "}
                      KES {cheapest}
                    </p>
                    <ul className="space-y-2 text-sm">
                      {[
                        `Lesson plan KES ${prices.lesson}, assessment KES ${prices.assessment}`,
                        `Scheme of work KES ${prices.scheme}`,
                        "Pay once, download and print as often as you like",
                      ].map((t) => (
                        <li key={t} className="flex gap-2">
                          <Check
                            className="mt-0.5 size-4 shrink-0 text-success"
                            aria-hidden
                          />
                          {t}
                        </li>
                      ))}
                    </ul>
                  </li>
                  <li className="space-y-3 rounded-xl border-2 border-primary bg-background p-5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold">Term pass</h3>
                      <Badge>All classes</Badge>
                    </div>
                    <p className="text-2xl font-semibold">
                      {shillings}{" "}
                      <span className="text-sm font-normal text-muted-foreground">
                        a term
                      </span>
                    </p>
                    <ul className="space-y-2 text-sm">
                      {[
                        "Every download, all your classes",
                        `Up to ${limits.paid} documents a month`,
                        "Pay by M-Pesa, no card needed",
                      ].map((t) => (
                        <li key={t} className="flex gap-2">
                          <Check
                            className="mt-0.5 size-4 shrink-0 text-success"
                            aria-hidden
                          />
                          {t}
                        </li>
                      ))}
                    </ul>
                  </li>
                </ul>
              </>
            ) : (
              <p className="mt-2 max-w-2xl text-muted-foreground">
                Elimu is free for every class during the pilot. Later, making
                documents will stay free and you will pay to download them, per
                document or with a term pass.
              </p>
            )}
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-12">
          <h2 className="text-xl font-semibold">Questions teachers ask</h2>
          <div className="mt-6 divide-y rounded-xl border bg-card">
            {faq.map((f) => (
              <details key={f.q} className="group px-4">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 font-medium">
                  {f.q}
                  <span
                    className="text-muted-foreground group-open:hidden"
                    aria-hidden
                  >
                    +
                  </span>
                  <span
                    className="hidden text-muted-foreground group-open:inline"
                    aria-hidden
                  >
                    −
                  </span>
                </summary>
                <p className="pb-4 text-sm text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {!signedIn && (
          <section className="bg-primary text-primary-foreground">
            <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-12 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold">
                  Get this term's planning done tonight
                </h2>
                <p className="flex items-center gap-2 text-sm opacity-90">
                  <ShieldCheck className="size-4 shrink-0" aria-hidden />
                  Free account. Your documents stay in your account.
                </p>
              </div>
              <Button
                size="lg"
                variant="secondary"
                render={<Link href="/register" />}
              >
                Create free account
              </Button>
            </div>
          </section>
        )}
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 text-sm text-muted-foreground">
          <nav
            aria-label="Footer"
            className="flex flex-wrap gap-x-4 gap-y-1 font-medium text-foreground"
          >
            <Link
              href="/designs"
              className="flex min-h-11 items-center hover:underline"
            >
              Curriculum designs
            </Link>
            {signedIn ? (
              <Link
                href="/dashboard"
                className="flex min-h-11 items-center hover:underline"
              >
                My dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/register"
                  className="flex min-h-11 items-center hover:underline"
                >
                  Create account
                </Link>
                <Link
                  href="/login"
                  className="flex min-h-11 items-center hover:underline"
                >
                  Sign in
                </Link>
              </>
            )}
            {SUPPORT_EMAIL && (
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=Elimu%20help`}
                className="flex min-h-11 items-center hover:underline"
              >
                Get help
              </a>
            )}
          </nav>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            <span>© {new Date().getFullYear()} Elimu</span>
            <span>
              Drafts are based on KICD curriculum designs. Always review before
              you teach.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
