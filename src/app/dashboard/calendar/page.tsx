import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { CalendarForm } from "@/components/term-pack/calendar-form";
import { getAcademicCalendar } from "@/lib/academic-calendar";
import { auth } from "@/lib/auth";
import { pickTerm, todayInKenya } from "@/lib/term-pack";

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.userId) redirect("/login");
  if (session.role !== "SUPERADMIN") redirect("/dashboard");

  const years = await getAcademicCalendar();
  const today = todayInKenya();
  // Open on the year of the term in progress or next to open.
  const current = pickTerm(
    years.flatMap((y) => y.terms.map((t) => ({ ...t, year: y.year }))),
    today,
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="School calendar"
        description="Term dates, half-term breaks and public holidays for every teacher. Teachers start from these and can change a term for their own school."
      />
      <CalendarForm
        key={years.map((y) => `${y.year}${y.saved}`).join()}
        years={years}
        initialYear={current?.year ?? Number(today.slice(0, 4))}
      />
    </div>
  );
}
