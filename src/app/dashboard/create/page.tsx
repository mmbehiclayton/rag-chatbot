import Link from "next/link";
import { BookOpen, ChevronRight, ClipboardList, FileText, NotebookPen } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";

const OTHER_TOOLS = [
  {
    href: "/dashboard/create/scheme",
    icon: BookOpen,
    title: "Scheme of work",
    description: "Plan a whole term, week by week, then turn it into lessons.",
  },
  {
    href: "/dashboard/notes",
    icon: NotebookPen,
    title: "Lesson notes",
    description: "Detailed teaching notes for a lesson plan you already have.",
  },
  {
    href: "/dashboard/create/assessment",
    icon: ClipboardList,
    title: "Assessment",
    description: "An end-of-term assessment with a marking scheme.",
  },
];

export default function CreatePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Create" description="What would you like to prepare?" />

      <Link
        href="/dashboard/create/lesson"
        className="group flex items-center gap-4 rounded-xl border border-primary/30 bg-accent p-5 transition-colors hover:border-primary"
      >
        <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <FileText className="size-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold text-foreground">Lesson plan for tomorrow</span>
          <span className="mt-0.5 block text-sm text-muted-foreground">Pick a grade and topic. Ready in about 30 seconds.</span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-accent-foreground" />
      </Link>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">More tools</h2>
        <ul className="divide-y rounded-xl border bg-card">
          {OTHER_TOOLS.map((tool) => (
            <li key={tool.href}>
              <Link href={tool.href} className="flex min-h-16 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60">
                <tool.icon className="size-5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{tool.title}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{tool.description}</span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
