import { ArrowLeft, BookOpen, Pencil } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LinkList } from "@/components/shared/link-list";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { classHref, classSummary, getTeacherClasses } from "@/lib/classes";

function decode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** One grade: the learning areas the teacher teaches in it, each with what they have prepared. */
export default async function GradePage({
  params,
}: {
  params: Promise<{ grade: string }>;
}) {
  const session = await auth();
  if (!session?.userId) redirect("/login");

  const grade = decode((await params).grade);
  const classes = (await getTeacherClasses(session.userId)).filter(
    (c) => c.grade === grade,
  );
  if (classes.length === 0) redirect("/dashboard/classes");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/dashboard/classes"
        className="inline-flex min-h-10 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden /> My classes
      </Link>

      <PageHeader
        title={grade}
        description="Your learning areas in this grade. Open one for its schemes, lesson plans and assessments."
        action={
          <Button
            variant="outline"
            render={<Link href="/onboarding?from=profile" />}
          >
            <Pencil /> Change classes
          </Button>
        }
      />

      <LinkList
        items={classes.map((c) => ({
          href: classHref(c.grade, c.subject),
          title: c.subject,
          meta: classSummary(c),
          icon: BookOpen,
        }))}
      />
    </div>
  );
}
