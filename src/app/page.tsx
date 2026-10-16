import Link from "next/link";
import { BookOpen, CalendarRange, ClipboardCheck, MessageSquare, NotebookPen, Smartphone } from "lucide-react";
import { auth } from "@/lib/auth";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";

const STEPS = [
  { title: "Tell us what you teach", body: "Choose your grades and learning areas once. Elimu remembers them." },
  { title: "Pick a topic", body: "Choose a strand or sub-strand for tomorrow, or plan a whole term." },
  { title: "Review, edit and print", body: "Check the plan, change anything you like, then export it as a PDF." },
];

const FEATURES = [
  { icon: BookOpen, title: "Lesson plans", body: "Learning outcomes, activities, differentiation and assessment in the CBC format." },
  { icon: CalendarRange, title: "Schemes of work", body: "A full term planned week by week, then turned into lesson plans." },
  { icon: NotebookPen, title: "Lesson notes", body: "Worked examples, questions to ask and common misconceptions." },
  { icon: ClipboardCheck, title: "Assessments", body: "Opener, mid-term and end-of-term papers with a marking guide." },
  { icon: MessageSquare, title: "Ask Elimu", body: "Questions about the curriculum, answered from KICD curriculum designs." },
  { icon: Smartphone, title: "Built for your phone", body: "Light pages that work on mobile data, wherever you teach." },
];

export default async function Home() {
  const session = await auth();
  const signedIn = !!session?.userId;

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Logo />
          {signedIn ? (
            <Button render={<Link href="/dashboard" />}>Open Elimu</Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" render={<Link href="/login" />}>
                Sign in
              </Button>
              <Button className="hidden sm:inline-flex" render={<Link href="/register" />}>
                Create free account
              </Button>
            </div>
          )}
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-5xl px-4 py-12 sm:py-20">
          <div className="max-w-2xl space-y-5">
            <h1 className="text-2xl font-semibold leading-tight">Empowering Kenya's educators with AI</h1>
            <p className="text-lg text-muted-foreground">
              Create KICD-aligned schemes of work, lesson plans and assessments in minutes, so you can spend more time with your learners.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button size="lg" render={<Link href={signedIn ? "/dashboard/create/lesson" : "/register"} />}>
                {signedIn ? "Create a lesson plan" : "Create free account"}
              </Button>
              {!signedIn && (
                <Button size="lg" variant="outline" render={<Link href="/login" />}>
                  I already have an account
                </Button>
              )}
            </div>
          </div>
        </section>

        <section className="border-y bg-card">
          <div className="mx-auto max-w-5xl px-4 py-12">
            <h2 className="text-xl font-semibold">How it works</h2>
            <ol className="mt-6 grid gap-6 sm:grid-cols-3">
              {STEPS.map((s, i) => (
                <li key={s.title} className="space-y-2">
                  <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{i + 1}</span>
                  <h3 className="font-medium">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-12">
          <h2 className="text-xl font-semibold">Everything you plan, in one place</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <li key={f.title} className="space-y-2 rounded-xl border bg-card p-5">
                <f.icon className="size-5 text-primary" aria-hidden />
                <h3 className="font-medium">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.body}</p>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-muted-foreground">
            Elimu writes a first draft. Always read it and adjust it for your class before you teach.
          </p>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-muted-foreground">© {new Date().getFullYear()} Elimu</div>
      </footer>
    </div>
  );
}
