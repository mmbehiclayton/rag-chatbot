import { redirect } from "next/navigation";
import { Wallet } from "lucide-react";
import { auth } from "@/lib/auth";
import { db, withDbRetry } from "@/lib/db";
import { getTimetableView } from "@/lib/term-pack-data";
import { SUGGESTED_TERMS, pickTerm, termLabel, todayInKenya } from "@/lib/term-pack";
import { PRICE_LIMITS, plansOn, termPrice } from "@/lib/plans";
import { PaymentReview } from "@/components/pilot/payment-review";
import { PriceForm } from "@/components/pilot/price-form";
import { TestModeToggle } from "@/components/pilot/test-mode-toggle";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const DAY = 86_400_000;
const WEEK = 7 * DAY;

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : null);
const PASS_STATUS: Record<string, { label: string; variant: "success" | "warning" | "destructive" }> = {
  ACTIVE: { label: "Paid", variant: "success" },
  PENDING: { label: "Not finished", variant: "warning" },
  REJECTED: { label: "Rejected", variant: "destructive" },
};
const METHOD: Record<string, string> = { PAYSTACK: "Paystack", MPESA_CODE: "M-Pesa code" };
const kes = (n: number) => `KES ${n.toLocaleString("en-KE")}`;

const shortDate = (d: Date) => d.toLocaleDateString("en-KE", { timeZone: "Africa/Nairobi", day: "numeric", month: "short" });

/** One pilot measure, with the go-to-scale target beside it where the pilot plan sets one. */
function Measure({ label, value, detail, target }: { label: string; value: number | null; detail: string; target?: number }) {
  const met = target !== undefined && value !== null ? value >= target : null;
  return (
    <div className="space-y-1 rounded-xl border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold">{value === null ? "–" : `${value}%`}</p>
      <p className="text-xs text-muted-foreground">{detail}</p>
      {target !== undefined && (
        <p className={cn("text-xs font-medium", met === null ? "text-muted-foreground" : met ? "text-success" : "text-warning")}>
          Target {target}%{met === null ? "" : met ? ", met" : ", not yet"}
        </p>
      )}
    </div>
  );
}

export default async function PilotPage() {
  const session = await auth();
  if (!session?.userId) redirect("/login");
  if (session.role !== "SUPERADMIN") redirect("/dashboard");

  const now = Date.now();
  const since = new Date(now - 8 * WEEK);
  const current = pickTerm(SUGGESTED_TERMS, todayInKenya()) ?? SUGGESTED_TERMS.at(-1)!;

  const [price, paying] = await Promise.all([termPrice(), plansOn()]);
  const [teachers, firstSchemes, gens, records, passes, pending, reviews, payments, received, receivedThisTerm] = await withDbRetry(() =>
    Promise.all([
      db.user.findMany({
        where: { role: "TEACHER" },
        select: {
          id: true,
          createdAt: true,
          invitedById: true,
          _count: { select: { terms: true, timetableSlots: true } },
        },
      }),
      db.schemeOfWork.groupBy({ by: ["teacherId"], _min: { createdAt: true } }),
      db.generationLog.findMany({ where: { createdAt: { gte: since } }, select: { userId: true, createdAt: true } }),
      db.lessonRecord.findMany({ where: { updatedAt: { gte: since } }, select: { teacherId: true, updatedAt: true } }),
      db.termPass.findMany({ where: { status: "ACTIVE", year: current.year, term: current.term }, select: { teacherId: true } }),
      db.termPass.findMany({
        where: { status: "PENDING", method: "MPESA_CODE" },
        orderBy: { createdAt: "asc" },
        select: { id: true, reference: true, phone: true, amount: true, year: true, term: true, createdAt: true, teacher: { select: { name: true, email: true } } },
      }),
      db.headReview.groupBy({ by: ["answer"], _count: true }),
      db.termPass.findMany({
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true, method: true, reference: true, amount: true, status: true, year: true, term: true, createdAt: true,
          teacher: { select: { name: true, email: true } },
        },
      }),
      db.termPass.aggregate({ where: { status: "ACTIVE" }, _sum: { amount: true }, _count: true }),
      db.termPass.aggregate({ where: { status: "ACTIVE", year: current.year, term: current.term }, _sum: { amount: true }, _count: true }),
    ])
  );

  const total = teachers.length;
  const joined = new Map(teachers.map((t) => [t.id, t.createdAt.getTime()]));

  // First session: a scheme within a day of joining, and the term set up so it lands on real dates.
  const firstScheme = new Map(firstSchemes.map((s) => [s.teacherId, s._min.createdAt?.getTime() ?? Infinity]));
  const quickScheme = teachers.filter((t) => (firstScheme.get(t.id) ?? Infinity) - t.createdAt.getTime() <= DAY).length;
  const setUp = teachers.filter((t) => t._count.terms > 0 && t._count.timetableSlots > 0).length;

  // Weekly active: made something or marked a lesson that week, out of teachers who had joined by then.
  const activity = [...gens.map((g) => ({ id: g.userId, at: g.createdAt.getTime() })), ...records.map((r) => ({ id: r.teacherId, at: r.updatedAt.getTime() }))];
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const end = now - i * WEEK;
    const start = end - WEEK;
    const active = new Set(activity.filter((a) => a.at > start && a.at <= end && joined.has(a.id)).map((a) => a.id));
    const eligible = teachers.filter((t) => t.createdAt.getTime() <= end).length;
    return { start: new Date(start + DAY), active: active.size, eligible };
  }).reverse();
  const thisWeek = weeks.at(-1)!;

  // Still active after 8 weeks: of teachers who joined 7+ weeks ago, who was active in the last 7 days.
  const veterans = teachers.filter((t) => now - t.createdAt.getTime() >= 7 * WEEK);
  const recent = new Set(activity.filter((a) => a.at > now - WEEK).map((a) => a.id));
  const retained = veterans.filter((t) => recent.has(t.id)).length;

  // Lessons marked: of timetabled lessons already due this term, how many the teacher marked taught or carried over.
  const views = await Promise.all(teachers.filter((t) => t._count.timetableSlots > 0).map((t) => getTimetableView(t.id).catch(() => null)));
  let marked = 0;
  let due = 0;
  for (const v of views)
    for (const p of v?.progress ?? []) {
      marked += p.taught + p.carried;
      due += p.taught + p.carried + p.unmarked;
    }

  const paid = new Set(passes.map((p) => p.teacherId)).size;
  const answers = Object.fromEntries(reviews.map((r) => [r.answer, r._count])) as Record<string, number>;
  const accepted = answers.ACCEPTED ?? 0;
  const changes = answers.CHANGES ?? 0;
  const invited = teachers.filter((t) => t.invitedById).length;
  const inviters = new Set(teachers.map((t) => t.invitedById).filter(Boolean)).size;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader title="Pilot" description="How teachers are using Elimu, against the go-to-scale targets in the pilot plan." />

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold">Test mode</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {paying
              ? "Payments are on. New teachers get a 14-day trial, then one free class, and a term pass opens every class."
              : "Test mode is on. Every teacher can use every class, and nobody is asked to pay."}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <TestModeToggle on={!paying} />
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold">Term pass price</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Applies to every new payment straight away. Teachers who already paid keep their pass, and a payment already started keeps the price it opened with.
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <PriceForm price={price} min={PRICE_LIMITS.min} max={PRICE_LIMITS.max} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Payments to check ({pending.length})</h2>
        {pending.length === 0 ? (
          <EmptyState icon={Wallet} title="Nothing to check" description="M-Pesa codes teachers send show here." />
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {pending.map((p) => (
              <li key={p.id} className="space-y-3 p-4 sm:flex sm:items-center sm:justify-between sm:gap-4 sm:space-y-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {p.reference} · KES {p.amount}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {p.teacher.name || p.teacher.email} · {p.phone ?? "no phone given"} · {termLabel(p)} · sent {shortDate(p.createdAt)}
                  </p>
                </div>
                <PaymentReview id={p.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold">Payments</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Every term pass, newest first. Paystack payments are confirmed with Paystack before a pass opens. M-Pesa codes need checking above.
          </p>
        </div>
        <dl className="grid grid-cols-2 divide-x rounded-xl border bg-card">
          <div className="p-4">
            <dt className="text-xs text-muted-foreground">{termLabel(current)}</dt>
            <dd className="text-lg font-semibold">{kes(receivedThisTerm._sum.amount ?? 0)}</dd>
            <dd className="text-xs text-muted-foreground">{receivedThisTerm._count} passes paid</dd>
          </div>
          <div className="p-4">
            <dt className="text-xs text-muted-foreground">All time</dt>
            <dd className="text-lg font-semibold">{kes(received._sum.amount ?? 0)}</dd>
            <dd className="text-xs text-muted-foreground">{received._count} passes paid</dd>
          </div>
        </dl>
        {payments.length === 0 ? (
          <EmptyState icon={Wallet} title="No payments yet" description="Term passes teachers buy show here." />
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {payments.map((p) => (
              <li key={p.id} className="flex items-start gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.teacher.name || p.teacher.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {kes(p.amount)} · {METHOD[p.method] ?? p.method} · {termLabel(p)} · {shortDate(p.createdAt)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">Ref {p.reference}</p>
                </div>
                <Badge variant={PASS_STATUS[p.status]?.variant ?? "secondary"}>{PASS_STATUS[p.status]?.label ?? p.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Measures · {total} teachers</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Measure
            label="Still active after 8 weeks"
            value={pct(retained, veterans.length)}
            detail={`${retained} of ${veterans.length} who joined 7+ weeks ago were active in the last 7 days`}
            target={60}
          />
          <Measure
            label={`Paid for ${termLabel(current)}`}
            value={pct(paid, total)}
            detail={`${paid} of ${total} teachers have an active term pass`}
            target={25}
          />
          <Measure
            label="Head teacher accepted"
            value={pct(accepted, accepted + changes)}
            detail={`${accepted} accepted, ${changes} asked for changes, ${answers.NOT_YET ?? 0} not yet`}
          />
          <Measure label="Scheme on day one" value={pct(quickScheme, total)} detail={`${quickScheme} made a scheme within a day of joining`} />
          <Measure label="Term and timetable set" value={pct(setUp, total)} detail={`${setUp} added term dates and a timetable`} />
          <Measure label="Due lessons marked" value={pct(marked, due)} detail={`${marked} of ${due} timetabled lessons so far this term`} />
          <Measure label="Active this week" value={pct(thisWeek.active, thisWeek.eligible)} detail={`${thisWeek.active} of ${thisWeek.eligible} teachers`} />
          <Measure
            label="Joined from an invite"
            value={pct(invited, total)}
            detail={`${invited} invited by ${inviters} ${inviters === 1 ? "teacher" : "teachers"}, ${total ? (invited / total).toFixed(2) : "0"} per teacher`}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Weekly active teachers</h2>
        <ol className="divide-y rounded-xl border bg-card">
          {weeks.map((w) => {
            const share = pct(w.active, w.eligible) ?? 0;
            return (
              <li key={w.start.toISOString()} className="grid grid-cols-[5rem_1fr_6rem] items-center gap-3 px-4 py-2.5 text-sm">
                <span className="text-muted-foreground">{shortDate(w.start)}</span>
                <span className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
                  <span className="block h-full bg-primary" style={{ width: `${share}%` }} />
                </span>
                <span className="text-right">
                  {w.active}/{w.eligible} · {share}%
                </span>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
