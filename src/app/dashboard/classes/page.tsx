import { GraduationCap, Pencil } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/shared/empty-state";
import { LinkList } from "@/components/shared/link-list";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import {
  getTeacherClasses,
  gradeHref,
  gradeSummary,
  groupByGrade,
} from "@/lib/classes";

export default async function ClassesPage() {
  const session = await auth();
  if (!session?.userId) redirect("/login");

  const classes = await getTeacherClasses(session.userId);
  const grades = groupByGrade(classes);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="My classes"
        description="Choose a grade to see your learning areas and what you have prepared for each."
        action={
          <Button
            variant="outline"
            render={<Link href="/onboarding?from=profile" />}
          >
            <Pencil /> Change classes
          </Button>
        }
      />

      {classes.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Add the classes you teach"
          description="Choose your grades and learning areas. Elimu will set up a page for each class."
          action={
            <Button render={<Link href="/onboarding?from=profile" />}>
              Add classes
            </Button>
          }
        />
      ) : (
        <LinkList
          items={grades.map((g) => ({
            href: gradeHref(g.grade),
            title: g.grade,
            meta: gradeSummary(g.classes),
            icon: GraduationCap,
          }))}
        />
      )}

      <p className="text-sm text-muted-foreground">
        Looking for something else?{" "}
        <Link
          href="/dashboard/library"
          className="font-medium text-primary hover:underline"
        >
          See all your documents
        </Link>
      </p>
    </div>
  );
}
