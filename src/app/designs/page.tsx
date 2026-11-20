import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { PublicHeader, SignUpPrompt } from "@/components/shared/public-header";
import { getDesignIndex, publicDesignHref, slug } from "@/lib/public-designs";

export const metadata: Metadata = {
  title: "CBC Curriculum Designs by grade: strands and sub-strands | Elimu",
  description:
    "Strands and sub-strands of the KICD curriculum designs for each grade and learning area, checked by teachers. Free to read on your phone, then plan your lessons with Elimu.",
  alternates: { canonical: "/designs" },
};

/** Public list of curriculum designs by section and grade, for teachers arriving from search. */
export default async function PublicDesignsPage() {
  await connection();
  const index = await getDesignIndex();
  const ready = index
    .flatMap((l) => l.grades)
    .flatMap((g) => g.subjects)
    .filter((s) => s.ready).length;

  return (
    <div className="min-h-dvh bg-background">
      <PublicHeader />
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
        <div className="max-w-2xl space-y-2">
          <h1 className="text-2xl font-semibold">CBC curriculum designs</h1>
          <p className="text-muted-foreground">
            The strands and sub-strands of each KICD design, checked by two
            teachers. {ready} learning areas are ready so far. Open one to see
            how the year is laid out.
          </p>
        </div>

        {index.length > 1 && (
          <nav
            aria-label="Sections"
            className="flex gap-2 overflow-x-auto pb-1"
          >
            {index.map((l) => (
              <a
                key={l.level}
                href={`#${slug(l.level)}`}
                className="inline-flex min-h-11 shrink-0 items-center rounded-md border bg-card px-3 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                {l.level}
              </a>
            ))}
          </nav>
        )}

        {index.map((l) => (
          <section
            key={l.level}
            id={slug(l.level)}
            className="scroll-mt-4 space-y-4"
          >
            <h2 className="text-xl font-semibold">{l.level}</h2>
            {l.grades.map((g) => (
              <div key={g.name} className="space-y-2">
                <h3 className="font-semibold">{g.name}</h3>
                <ul className="divide-y rounded-xl border bg-card">
                  {g.subjects.map((s) => (
                    <li key={s.name}>
                      {s.ready ? (
                        <Link
                          href={publicDesignHref(g.name, s.name)}
                          className="flex min-h-12 items-center gap-3 px-4 py-2 hover:bg-muted/60"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium">
                              {g.name} {s.name}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {s.subStrands} sub-strands
                            </span>
                          </span>
                          <ChevronRight
                            className="size-4 shrink-0 text-muted-foreground"
                            aria-hidden
                          />
                        </Link>
                      ) : (
                        <div className="flex min-h-12 flex-col justify-center px-4 py-2">
                          <span className="text-sm text-muted-foreground">
                            {g.name} {s.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Coming soon
                          </span>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ))}

        <SignUpPrompt
          title="Turn a design into your term's documents"
          body="Elimu drafts your scheme of work and lesson plans from the design, fitted to your term dates and timetable. Free to start."
        />
      </div>
    </div>
  );
}
