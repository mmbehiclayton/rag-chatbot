import { ArrowLeft, Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import {
  PublicHeader,
  SignUpPrompt,
  WhatsAppShare,
} from "@/components/shared/public-header";
import { Badge } from "@/components/ui/badge";
import { getPublicDesign, publicDesignHref } from "@/lib/public-designs";
import { siteUrl } from "@/lib/site-url";

type Props = { params: Promise<{ grade: string; subject: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { grade, subject } = await params;
  const design = await getPublicDesign(grade, subject);
  if (!design) return { title: "Curriculum design not found | Elimu" };
  const name = `${design.grade} ${design.subject}`;
  return {
    title: `${name} curriculum design: strands and sub-strands | Elimu`,
    description: `The strands, sub-strands and suggested lessons in the KICD ${name} curriculum design, checked by teachers. Plan your ${name} lessons and scheme of work with Elimu.`,
    alternates: { canonical: publicDesignHref(design.grade, design.subject) },
  };
}

/** Public outline of one design: strand and sub-strand names and lesson counts only. */
export default async function PublicDesignPage({ params }: Props) {
  await connection();
  const { grade, subject } = await params;
  const design = await getPublicDesign(grade, subject);
  if (!design) notFound();

  const name = `${design.grade} ${design.subject}`;
  const subStrands = design.strands.flatMap((s) => s.subStrands);
  const lessons = subStrands.reduce((n, u) => n + u.lessons, 0);

  return (
    <div className="min-h-dvh bg-background">
      <PublicHeader />
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <Link
          href="/designs"
          className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden /> All designs
        </Link>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{design.level}</p>
          <h1 className="text-2xl font-semibold">{name} curriculum design</h1>
          <p className="text-muted-foreground">
            The strands and sub-strands in the KICD design, in teaching order,
            with the suggested number of lessons for each. Checked by two
            teachers.
          </p>
        </div>

        <dl className="grid grid-cols-3 gap-3 rounded-xl border bg-card p-4 text-center">
          <div>
            <dt className="text-xs text-muted-foreground">Strands</dt>
            <dd className="text-lg font-semibold">{design.strands.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Sub-strands</dt>
            <dd className="text-lg font-semibold">{subStrands.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Lessons a week</dt>
            <dd className="text-lg font-semibold">
              {design.lessonsPerWeek ?? "–"}
            </dd>
          </div>
        </dl>

        {design.strands.map((strand, si) => (
          <section key={strand.name} className="space-y-2">
            <h2 className="text-base font-semibold">
              {si + 1}.0 {strand.name}
            </h2>
            <ol className="divide-y rounded-xl border bg-card">
              {strand.subStrands.map((sub, ui) => (
                <li
                  key={sub.name}
                  className="flex min-h-12 items-center gap-3 px-4 py-2"
                >
                  <span className="min-w-0 flex-1 text-sm">
                    {si + 1}.{ui + 1} {sub.name}
                  </span>
                  {sub.term && <Badge variant="info">Term {sub.term}</Badge>}
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {sub.lessons} lesson{sub.lessons === 1 ? "" : "s"}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        ))}

        <p className="flex gap-2 text-sm text-muted-foreground">
          <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
          {lessons} suggested lessons in all. Sign in to read the learning
          outcomes, key inquiry questions and learning experiences for each
          sub-strand.
        </p>

        <WhatsAppShare
          url={`${siteUrl()}${publicDesignHref(design.grade, design.subject)}`}
          text={`${name} curriculum design: strands and sub-strands`}
        />

        <SignUpPrompt
          title={`Plan your ${name} lessons`}
          body={`Elimu drafts your ${name} scheme of work from this design, fitted to your term dates and timetable, then a lesson plan for any sub-strand in one tap. Free to start.`}
        />
      </div>
    </div>
  );
}
