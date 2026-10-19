import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { designHref } from "@/lib/classes";
import { getGradeOptions, getTeachingProfile } from "@/lib/curriculum-options";
import { db, withDbRetry } from "@/lib/db";
import { designFromPath } from "@/lib/public-designs";
import { OnboardingClient } from "./onboarding-client";

export const metadata = { title: "Set up your account · Elimu" };

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const session = await auth();
  if (!session?.userId) redirect("/login");

  const fromProfile = (await searchParams).from === "profile";
  const [profile, grades, tenant, user] = await Promise.all([
    getTeachingProfile(session.userId),
    getGradeOptions(),
    withDbRetry(() =>
      db.tenant.findFirst({
        where: { users: { some: { id: session.userId } } },
        select: { name: true, type: true },
      }),
    ).catch(() => null),
    withDbRetry(() =>
      db.user.findUnique({
        where: { id: session.userId },
        select: { signupPath: true },
      }),
    ).catch(() => null),
  ]);

  // A teacher who signed up after reading a public design carries on from that design:
  // its grade and learning area are picked for them, and they finish on its page.
  const fresh = !fromProfile && !profile?.gradesTaught?.length;
  const design = fresh
    ? await designFromPath(user?.signupPath).catch(() => null)
    : null;

  // Only known return targets, so this can't be used as an open redirect.
  const returnTo = fromProfile
    ? "/dashboard/profile"
    : design
      ? `${designHref(design.grade, design.subject)}?welcome=1`
      : "/dashboard";

  return (
    <OnboardingClient
      grades={grades}
      returnTo={returnTo}
      picked={design ? `${design.grade} ${design.subject}` : undefined}
      initial={{
        name: profile?.name ?? "",
        // Teachers who joined through their school's link start with the school's name filled in.
        schoolName:
          profile?.schoolName ?? (tenant?.type === "SCHOOL" ? tenant.name : ""),
        gradesTaught: design ? [design.grade] : (profile?.gradesTaught ?? []),
        subjectsTaught: design
          ? [design.subject]
          : (profile?.subjectsTaught ?? []),
      }}
    />
  );
}
