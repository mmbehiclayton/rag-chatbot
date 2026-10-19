import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Info } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DraftFromDesign } from "@/components/curriculum/draft-from-design";
import { MapEditor } from "@/components/curriculum/map-editor";
import { MapStatusBadge } from "@/components/curriculum/map-status-badge";
import { auth } from "@/lib/auth";
import { getCurator, MAP_STATUS } from "@/lib/curriculum-map";
import { getGradeOptions } from "@/lib/curriculum-options";
import { db, withDbRetry } from "@/lib/db";
import { findDesign } from "@/lib/map-drafting";

// Drafting a map from a curriculum design reads the whole design with AI.
export const maxDuration = 300;

function decode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default async function CurriculumMapPage({
  params,
}: {
  params: Promise<{ grade: string; subject: string }>;
}) {
  const session = await auth();
  const curator = await getCurator(session.userId);
  if (!curator) redirect("/dashboard");

  const raw = await params;
  const grade = decode(raw.grade);
  const subject = decode(raw.subject);
  const grades = await getGradeOptions();
  const gradeOption = grades.find((g) => g.name === grade);
  if (!gradeOption?.learningAreas.includes(subject)) notFound();

  const map = await withDbRetry(() =>
    db.curriculumMap.findUnique({
      where: { grade_subject: { grade, subject } },
      select: {
        status: true,
        sourceNote: true,
        lessonsPerWeek: true,
        reviewComment: true,
        editedById: true,
        updatedAt: true,
        publishedAt: true,
        editedBy: { select: { name: true, email: true } },
        checkedBy: { select: { name: true, email: true } },
        strands: {
          orderBy: { order: "asc" },
          select: {
            name: true,
            subStrands: {
              orderBy: { order: "asc" },
              select: {
                name: true,
                lessons: true,
                term: true,
                outcomes: true,
                inquiryQuestions: true,
                learningExperiences: true,
              },
            },
          },
        },
      },
    }),
  );

  const status = map?.status ?? MAP_STATUS.DRAFT;
  const design =
    status === MAP_STATUS.DRAFT ? await findDesign(grade, subject) : null;
  const canCheck =
    status === MAP_STATUS.IN_REVIEW && map?.editedById !== curator.id;
  const canPublish =
    curator.role === "SUPERADMIN" && status !== MAP_STATUS.PUBLISHED;
  const person = (
    u: { name: string | null; email: string } | null | undefined,
  ) => u?.name || u?.email || "a curator";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-3">
        <Link
          href={`/dashboard/curriculum?level=${encodeURIComponent(gradeOption.level)}`}
          className="inline-flex min-h-10 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Curriculum maps
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold sm:text-2xl">
            {grade} · {subject}
          </h1>
          {map && <MapStatusBadge status={status} />}
        </div>
        {map && (
          <p className="text-sm text-muted-foreground">
            Last edited by {person(map.editedBy)}{" "}
            {formatDistanceToNow(map.updatedAt, { addSuffix: true })}
            {map.publishedAt && map.checkedBy
              ? `. Checked by ${person(map.checkedBy)}.`
              : "."}
          </p>
        )}
        {status === MAP_STATUS.DRAFT && map?.reviewComment && (
          <p className="flex gap-2 rounded-xl border bg-card p-3 text-sm">
            <Info className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
            <span>
              <span className="font-medium">Sent back: </span>
              {map.reviewComment}
            </span>
          </p>
        )}
        {status === MAP_STATUS.IN_REVIEW && !canCheck && (
          <p className="flex gap-2 rounded-xl border bg-card p-3 text-sm">
            <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
            <span>
              You made the last changes, so another curator needs to check this
              map
              {canPublish
                ? ", or you can publish it now without a check."
                : "."}
            </span>
          </p>
        )}
      </div>

      {design && (
        <DraftFromDesign
          grade={grade}
          subject={subject}
          designTitle={design.title}
          hasStrands={(map?.strands.length ?? 0) > 0}
        />
      )}

      <MapEditor
        key={map?.updatedAt.toISOString() ?? "new"}
        grade={grade}
        subject={subject}
        status={status}
        canCheck={canCheck}
        canPublish={canPublish}
        initial={{
          sourceNote: map?.sourceNote ?? "",
          lessonsPerWeek: map?.lessonsPerWeek ?? null,
          strands: map?.strands ?? [],
        }}
      />
    </div>
  );
}
