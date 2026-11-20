import { Briefcase, Plus, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { JobDelete, JobReview } from "@/components/staffroom/job-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { db, withDbRetry } from "@/lib/db";
import { JOB_KINDS, JOB_STATUS, type JobKind } from "@/lib/staffroom";

const JOB_SELECT = {
  id: true,
  title: true,
  school: true,
  county: true,
  kind: true,
  learningAreas: true,
  details: true,
  howToApply: true,
  closesOn: true,
  status: true,
  reviewNote: true,
  createdAt: true,
  postedById: true,
} as const;

type Job = {
  id: string;
  title: string;
  school: string;
  county: string;
  kind: string;
  learningAreas: string | null;
  details: string;
  howToApply: string;
  closesOn: Date | null;
  status: string;
  reviewNote: string | null;
  createdAt: Date;
  postedById: string;
};

const day = (d: Date) =>
  d.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  });

function JobCard({ job, children }: { job: Job; children?: React.ReactNode }) {
  return (
    <li className="space-y-3 rounded-xl border bg-card p-4">
      <div className="space-y-1">
        <h3 className="text-base font-semibold">{job.title}</h3>
        <p className="text-sm text-muted-foreground">
          {job.school} · {job.county}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Badge variant="secondary">
            {JOB_KINDS[job.kind as JobKind] ?? job.kind}
          </Badge>
          {job.learningAreas && (
            <Badge variant="outline">{job.learningAreas}</Badge>
          )}
          {job.closesOn && (
            <Badge variant="warning">Closes {day(job.closesOn)}</Badge>
          )}
        </div>
      </div>
      <p className="whitespace-pre-wrap break-words text-sm">{job.details}</p>
      <div className="rounded-md bg-muted p-3 text-sm">
        <p className="font-medium">How to apply</p>
        <p className="whitespace-pre-wrap break-words">{job.howToApply}</p>
      </div>
      <p className="text-xs text-muted-foreground">
        Shared {day(job.createdAt)}
      </p>
      {children}
    </li>
  );
}

export default async function JobsPage() {
  const session = await auth();
  if (!session?.userId) redirect("/login");
  const isStaff = session.role === "SUPERADMIN";
  const now = new Date();

  const [open, mine, pending] = await Promise.all([
    withDbRetry(() =>
      db.jobPost.findMany({
        where: {
          status: JOB_STATUS.APPROVED,
          OR: [{ closesOn: null }, { closesOn: { gte: now } }],
        },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: JOB_SELECT,
      }),
    ),
    withDbRetry(() =>
      db.jobPost.findMany({
        where: { postedById: session.userId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: JOB_SELECT,
      }),
    ),
    isStaff
      ? withDbRetry(() =>
          db.jobPost.findMany({
            where: { status: JOB_STATUS.PENDING },
            orderBy: { createdAt: "asc" },
            take: 30,
            select: JOB_SELECT,
          }),
        )
      : [],
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Jobs"
        description="Teaching jobs shared by teachers and checked by Elimu staff."
        action={
          <Button render={<Link href="/dashboard/jobs/new" />}>
            <Plus /> Post a job
          </Button>
        }
      />

      <div className="flex gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
        <ShieldAlert className="mt-0.5 size-5 shrink-0 text-warning" />
        <p>
          Never pay anyone to get a job. TSC does not charge for recruitment. If
          someone asks for money, don't pay, and tell Elimu staff.
        </p>
      </div>

      {pending.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-base font-semibold">
            Waiting for your check · {pending.length}
          </h2>
          <ul className="space-y-3">
            {pending.map((job) => (
              <JobCard key={job.id} job={job}>
                <JobReview id={job.id} />
              </JobCard>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Open jobs</h2>
        {open.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No jobs yet"
            description="When teachers share jobs and Elimu staff check them, they will show here."
          />
        ) : (
          <ul className="space-y-3">
            {open.map((job) => (
              <JobCard key={job.id} job={job}>
                {(isStaff || job.postedById === session.userId) && (
                  <JobDelete id={job.id} />
                )}
              </JobCard>
            ))}
          </ul>
        )}
      </section>

      {mine.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-base font-semibold">Jobs you shared</h2>
          <ul className="divide-y rounded-xl border bg-card">
            {mine.map((job) => (
              <li
                key={job.id}
                className="flex flex-wrap items-center justify-between gap-2 p-4"
              >
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium">{job.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {job.school} · {day(job.createdAt)}
                  </p>
                  {job.status === JOB_STATUS.REJECTED && job.reviewNote && (
                    <p className="text-xs text-destructive">
                      Not posted: {job.reviewNote}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {job.status === JOB_STATUS.APPROVED && (
                    <Badge variant="success">On the feed</Badge>
                  )}
                  {job.status === JOB_STATUS.PENDING && (
                    <Badge variant="info">Being checked</Badge>
                  )}
                  {job.status === JOB_STATUS.REJECTED && (
                    <Badge variant="destructive">Not posted</Badge>
                  )}
                  <JobDelete id={job.id} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
