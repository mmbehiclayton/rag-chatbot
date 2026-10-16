import Link from "next/link";
import { BookOpen, Check, ClipboardCheck, FileText, NotebookPen } from "lucide-react";
import { auth } from "@/lib/auth";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";

const DOCUMENTS = [
  { icon: BookOpen, title: "Scheme of work", body: "The whole term, week by week, fitted to the weeks you actually have." },
  { icon: FileText, title: "Lesson plans", body: "Made from your scheme, a week at a time, or one quick plan for tomorrow." },
  { icon: NotebookPen, title: "Lesson notes", body: "Worked examples, questions to ask and common mistakes learners make." },
  { icon: ClipboardCheck, title: "Assessments", body: "Opener, mid-term and end-of-term papers with a marking guide." },
];

const STEPS = [
  { title: "Add your classes", body: "Choose the grades and learning areas you teach. Each class gets its own page." },
  { title: "Plan the term", body: "Enter the term dates and Elimu drafts the scheme of work from the curriculum design." },
  { title: "Prepare each week", body: "Turn the scheme into lesson plans, edit anything you like, then print or save as PDF." },
];

const FAQ = [
  {
    q: "Where does the content come from?",
    a: "Elimu drafts each document from the KICD curriculum designs for your grade and learning area. It is a first draft: read it and adjust it for your learners before you teach.",
  },
  {
    q: "Which classes are covered?",
    a: "We are starting with Junior School, Grades 7 to 9. If a curriculum design isn't in Elimu yet, we tell you so you can check the content carefully.",
  },
  {
    q: "Does it work on my phone?",
    a: "Yes. Elimu is built for Android phones and light on mobile data. You can print from a phone or a cyber.",
  },
  {
    q: "How much does it cost?",
    a: "It is free to start. You don't need a card or M-Pesa to create an account.",
  },
];

export default async function Home() {
  const session = await auth();
  const signedIn = !!session?.userId;
  const primary = signedIn ? { href: "/dashboard", label: "Open Elimu" } : { href: "/register", label: "Create free account" };

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Logo />
          {signedIn ? (
            <Button render={<Link href="/dashboard" />}>Open Elimu</Button>
          ) : (
            <Button variant="ghost" render={<Link href="/login" />}>
              Sign in
            </Button>
          )}
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
          <div className="max-w-2xl space-y-5">
            <h1 className="text-2xl font-semibold leading-tight">Your term's schemes and lesson plans, ready in an evening</h1>
            <p className="text-lg text-muted-foreground">
              Elimu drafts your scheme of work, lesson plans, notes and assessments from the KICD curriculum designs. You review them, print
              them, and get back to teaching.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button size="lg" render={<Link href={primary.href} />}>
                {primary.label}
              </Button>
              {!signedIn && (
                <Button size="lg" variant="outline" render={<Link href="/login" />}>
                  I already have an account
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground">Free to start. Made for Junior School teachers, Grades 7 to 9.</p>
          </div>
        </section>

        <section className="border-y bg-card">
          <div className="mx-auto max-w-4xl px-4 py-12">
            <h2 className="text-xl font-semibold">Less time writing, more time teaching</h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Every term you write a scheme for each class, then a plan for every lesson, and they must be ready when they are checked.
              Elimu writes the first draft of each one.
            </p>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {DOCUMENTS.map((d) => (
                <li key={d.title} className="flex gap-3 rounded-xl border bg-background p-4">
                  <d.icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                  <div>
                    <h3 className="font-medium">{d.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{d.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-12">
          <h2 className="text-xl font-semibold">How it works</h2>
          <ol className="mt-6 grid gap-6 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="space-y-2">
                <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {i + 1}
                </span>
                <h3 className="font-medium">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-y bg-card">
          <div className="mx-auto max-w-4xl px-4 py-12">
            <h2 className="text-xl font-semibold">Questions teachers ask</h2>
            <div className="mt-6 divide-y rounded-xl border bg-background">
              {FAQ.map((f) => (
                <details key={f.q} className="group px-4">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 font-medium">
                    {f.q}
                    <span className="text-muted-foreground group-open:hidden" aria-hidden>
                      +
                    </span>
                    <span className="hidden text-muted-foreground group-open:inline" aria-hidden>
                      −
                    </span>
                  </summary>
                  <p className="pb-4 text-sm text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-12">
          <div className="space-y-4 rounded-xl border bg-card p-6">
            <h2 className="text-xl font-semibold">Start with one class</h2>
            <ul className="space-y-2 text-sm">
              {["Free account, no card needed", "Your documents stay in your account", "Print or save every document as PDF"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check className="size-4 shrink-0 text-primary" aria-hidden /> {t}
                </li>
              ))}
            </ul>
            <Button size="lg" render={<Link href={primary.href} />}>
              {primary.label}
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-4xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} Elimu</span>
          <span>Drafts are based on KICD curriculum designs. Always review before you teach.</span>
        </div>
      </footer>
    </div>
  );
}
