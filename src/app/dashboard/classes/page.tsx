import Link from "next/link";
import { redirect } from "next/navigation";
import { GraduationCap, Pencil } from "lucide-react";
import { auth } from "@/lib/auth";
import { classHref, classSummary, getTeacherClasses } from "@/lib/classes";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { LinkList } from "@/components/shared/link-list";
import { Button } from "@/components/ui/button";

export default async function ClassesPage() {
  const session = await auth();
  if (!session?.userId) redirect("/login");

  const classes = await getTeacherClasses(session.userId);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="My classes"
        description="Schemes, lesson plans and assessments for each class you teach."
        action={
          <Button variant="outline" render={<Link href="/onboarding?from=profile" />}>
            <Pencil /> Change classes
          </Button>
        }
      />

      {classes.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Add the classes you teach"
          description="Choose your grades and learning areas. Elimu will set up a page for each class."
          action={<Button render={<Link href="/onboarding?from=profile" />}>Add classes</Button>}
        />
      ) : (
        <LinkList
          items={classes.map((c) => ({
            href: classHref(c.grade, c.subject),
            title: `${c.grade} · ${c.subject}`,
            meta: classSummary(c),
            icon: GraduationCap,
          }))}
        />
      )}

      <p className="text-sm text-muted-foreground">
        Looking for something else?{" "}
        <Link href="/dashboard/library" className="font-medium text-primary hover:underline">
          See all your documents
        </Link>
      </p>
    </div>
  );
}
