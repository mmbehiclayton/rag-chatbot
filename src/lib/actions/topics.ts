"use server";

import { auth } from "@/lib/auth";
import { normName } from "@/lib/coverage";
import { getPublishedMap, subStrandsWithTerms } from "@/lib/curriculum-map";
import { db, withDbRetry } from "@/lib/db";
import { pickTerm, todayInKenya } from "@/lib/term-pack";
import { getTeacherTerms } from "@/lib/term-pack-data";

export type TopicOption = {
  /** "1.2" */
  number: string;
  strand: string;
  name: string;
  termNumber: number;
};

export type TopicOptions = {
  subStrands: TopicOption[];
  /** The sub-strand to start on: the first one this term not yet covered or planned. */
  suggested: string | null;
};

/** Sub-strands from the checked curriculum design for a class, with the one to teach next picked out. */
export async function getTopicOptions(input: {
  grade: string;
  subject: string;
}): Promise<TopicOptions | null> {
  const session = await auth();
  if (!session?.userId || !input.grade || !input.subject) return null;
  const { grade, subject } = input;
  const teacherId = session.userId;
  const today = todayInKenya();
  const year = Number(today.slice(0, 4));

  const [map, terms, covered, planned] = await Promise.all([
    getPublishedMap(grade, subject),
    getTeacherTerms(teacherId),
    withDbRetry(() =>
      db.syllabusCoverage.findMany({
        where: { teacherId, year, grade, subject, status: "COVERED" },
        select: { subStrand: true },
      }),
    ),
    withDbRetry(() =>
      db.lessonPlan.findMany({
        where: { teacherId, grade, subject, year },
        select: { topic: true },
      }),
    ),
  ]);
  if (!map) return null;

  const subStrands = subStrandsWithTerms(map).map((s) => ({
    number: s.number,
    strand: s.strand,
    name: s.name,
    termNumber: s.termNumber,
  }));
  const done = new Set(covered.map((c) => normName(c.subStrand)));
  const plannedTopics = planned.map((p) => normName(p.topic));
  const isDone = (s: TopicOption) => {
    const n = normName(s.name);
    return done.has(n) || plannedTopics.some((t) => t.includes(n));
  };

  const term =
    pickTerm(
      terms.filter((t) => t.closesOn >= today),
      today,
    )?.term ?? null;
  const thisTerm = subStrands.filter((s) => !term || s.termNumber === term);
  const next =
    thisTerm.find((s) => !isDone(s)) ??
    subStrands.find((s) => !isDone(s)) ??
    thisTerm[0] ??
    subStrands[0];

  return { subStrands, suggested: next?.name ?? null };
}
