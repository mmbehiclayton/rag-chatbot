import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getGradeOptions, getTeachingProfile } from "@/lib/curriculum-options";
import { OnboardingClient } from "./onboarding-client";

export const metadata = { title: "Set up your account · Elimu" };

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const session = await auth();
  if (!session?.userId) redirect("/login");

  // Only one known return target, so this can't be used as an open redirect.
  const returnTo = (await searchParams).from === "profile" ? "/dashboard/profile" : "/dashboard";
  const [profile, grades] = await Promise.all([getTeachingProfile(session.userId), getGradeOptions()]);

  return (
    <OnboardingClient
      grades={grades}
      returnTo={returnTo}
      initial={{
        name: profile?.name ?? "",
        schoolName: profile?.schoolName ?? "",
        gradesTaught: profile?.gradesTaught ?? [],
        subjectsTaught: profile?.subjectsTaught ?? [],
      }}
    />
  );
}
