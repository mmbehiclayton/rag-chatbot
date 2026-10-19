import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getGradeOptions, getTeachingProfile } from "@/lib/curriculum-options";
import { db, withDbRetry } from "@/lib/db";
import { OnboardingClient } from "./onboarding-client";

export const metadata = { title: "Set up your account · Elimu" };

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const session = await auth();
  if (!session?.userId) redirect("/login");

  // Only one known return target, so this can't be used as an open redirect.
  const returnTo =
    (await searchParams).from === "profile"
      ? "/dashboard/profile"
      : "/dashboard";
  const [profile, grades, tenant] = await Promise.all([
    getTeachingProfile(session.userId),
    getGradeOptions(),
    withDbRetry(() =>
      db.tenant.findFirst({
        where: { users: { some: { id: session.userId } } },
        select: { name: true, type: true },
      }),
    ).catch(() => null),
  ]);

  return (
    <OnboardingClient
      grades={grades}
      returnTo={returnTo}
      initial={{
        name: profile?.name ?? "",
        // Teachers who joined through their school's link start with the school's name filled in.
        schoolName:
          profile?.schoolName ?? (tenant?.type === "SCHOOL" ? tenant.name : ""),
        gradesTaught: profile?.gradesTaught ?? [],
        subjectsTaught: profile?.subjectsTaught ?? [],
      }}
    />
  );
}
