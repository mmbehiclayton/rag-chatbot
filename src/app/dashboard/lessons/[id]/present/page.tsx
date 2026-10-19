import { notFound, redirect } from "next/navigation";
import { asArray } from "@/components/document/doc-parts";
import {
  LessonPresent,
  type Slide,
} from "@/components/document/lesson-present";
import type {
  LessonActivity,
  LessonContent,
} from "@/components/document/lesson-types";
import { auth } from "@/lib/auth";
import { db, withDbRetry } from "@/lib/db";

const strings = (v: unknown) =>
  asArray(v).filter(
    (x): x is string => typeof x === "string" && x.trim() !== "",
  );

export default async function PresentLessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.userId) redirect("/login");

  const { id } = await params;
  const lesson = await withDbRetry(() =>
    db.lessonPlan.findFirst({
      where: { id, teacherId: session.userId },
      select: { id: true, topic: true, content: true },
    }),
  );
  if (!lesson) notFound();

  const c = (lesson.content ?? {}) as LessonContent;
  const s = c.lessonStructure ?? {};
  // Learner-facing slides only: no teacher notes or rubrics on the projector.
  const slides: Slide[] = [
    {
      heading: c.topic || lesson.topic,
      lead: s.introduction?.learningIntentions,
      points: strings(c.specificLearningOutcomes),
    },
    {
      heading: "Let's remember",
      lead: s.introduction?.recap,
      points: strings([s.introduction?.connectionToLearnersLives]),
    },
    ...(strings(c.keyInquiryQuestions).length
      ? [{ heading: "Think about it", points: strings(c.keyInquiryQuestions) }]
      : []),
    ...asArray<LessonActivity>(s.mainActivities).map((a, n) => ({
      heading: a.activityName || `Activity ${n + 1}`,
      lead: a.grouping,
      points: strings(a.learnerActions),
    })),
    {
      heading: "What we learnt",
      lead: s.conclusion?.summary,
      points: strings([
        s.conclusion?.exitTicket && `Exit ticket: ${s.conclusion.exitTicket}`,
        s.conclusion?.homework && `Homework: ${s.conclusion.homework}`,
      ]),
    },
  ];

  return <LessonPresent lessonId={lesson.id} slides={slides} />;
}
