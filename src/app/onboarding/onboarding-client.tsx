"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ChoiceChips } from "@/components/shared/choice-chips";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { completeOnboarding } from "@/lib/actions/teacher";
import type { GradeOption } from "@/lib/curriculum-options";

type Profile = {
  name: string;
  schoolName: string;
  gradesTaught: string[];
  subjectsTaught: string[];
};

const STEPS = [
  {
    title: "Welcome to Elimu",
    description:
      "Tell us a little about yourself. It takes less than a minute.",
  },
  {
    title: "Which grades do you teach?",
    description: "Choose all that apply. You can change this later.",
  },
  {
    title: "Which learning areas do you teach?",
    description: "We will use these to fill in your forms for you.",
  },
];

export function OnboardingClient({
  grades,
  initial,
  returnTo = "/dashboard",
  picked,
}: {
  grades: GradeOption[];
  initial: Profile;
  returnTo?: string;
  /** The design the teacher was reading before signing up, already picked for them. */
  picked?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<Profile>(initial);
  const [isPending, startTransition] = useTransition();

  // Only offer learning areas taught in the chosen grades, in curriculum order.
  const subjectOptions = [
    ...new Set(
      grades
        .filter((g) => profile.gradesTaught.includes(g.name))
        .flatMap((g) => g.learningAreas),
    ),
  ];
  const levels = [...new Set(grades.map((g) => g.level))];

  const canContinue =
    step === 0
      ? profile.name.trim().length > 0
      : step === 1
        ? profile.gradesTaught.length > 0
        : profile.subjectsTaught.some((s) => subjectOptions.includes(s));

  const next = () => {
    if (step < STEPS.length - 1) return setStep(step + 1);
    startTransition(async () => {
      const result = await completeOnboarding({
        ...profile,
        subjectsTaught: profile.subjectsTaught.filter((s) =>
          subjectOptions.includes(s),
        ),
      });
      if (result?.error) return void toast.error(result.error);
      router.replace(returnTo);
    });
  };

  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-background">
      <header className="flex h-14 items-center justify-between border-b bg-card px-4">
        {step > 0 ? (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Back"
            onClick={() => setStep(step - 1)}
            disabled={isPending}
          >
            <ArrowLeft />
          </Button>
        ) : (
          <Logo />
        )}
        <span className="text-sm text-muted-foreground">
          Step {step + 1} of {STEPS.length}
        </span>
      </header>

      <div className="h-1 w-full bg-muted" aria-hidden>
        <div
          className="h-full bg-primary transition-[width]"
          style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      <form
        className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pt-6 pb-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (canContinue && !isPending) next();
        }}
      >
        <h1 className="text-xl font-semibold sm:text-2xl">
          {STEPS[step].title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {STEPS[step].description}
        </p>

        <div className="mt-6 flex-1 space-y-5">
          {step === 0 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Your name</Label>
                <Input
                  id="name"
                  autoComplete="name"
                  value={profile.name}
                  onChange={(e) =>
                    setProfile({ ...profile, name: e.target.value })
                  }
                  placeholder="e.g. Jane Wanjiku"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school">
                  School name{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <Input
                  id="school"
                  autoComplete="organization"
                  value={profile.schoolName}
                  onChange={(e) =>
                    setProfile({ ...profile, schoolName: e.target.value })
                  }
                  placeholder="e.g. Kilimani Primary School"
                />
                <p className="text-xs text-muted-foreground">
                  Shown on your schemes of work and lesson plans.
                </p>
              </div>
            </>
          )}

          {step === 1 && picked && (
            <p className="rounded-md bg-muted p-3 text-sm">
              We have picked {picked} from the design you were reading. Add any
              other grades and learning areas you teach.
            </p>
          )}

          {step === 1 &&
            (grades.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Grades have not been set up yet. Please contact support.
              </p>
            ) : (
              levels.map((level) => (
                <section key={level} className="space-y-2">
                  <h2 className="text-sm font-medium text-muted-foreground">
                    {level}
                  </h2>
                  <ChoiceChips
                    multiple
                    label={level}
                    options={grades
                      .filter((g) => g.level === level)
                      .map((g) => g.name)}
                    value={profile.gradesTaught}
                    onChange={(gradesTaught) =>
                      setProfile({ ...profile, gradesTaught })
                    }
                  />
                </section>
              ))
            ))}

          {step === 2 &&
            (subjectOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No learning areas are set up for the grades you chose yet.
              </p>
            ) : (
              <ChoiceChips
                multiple
                label="Learning areas"
                options={subjectOptions}
                value={profile.subjectsTaught}
                onChange={(subjectsTaught) =>
                  setProfile({ ...profile, subjectsTaught })
                }
              />
            ))}
        </div>

        <div className="sticky bottom-0 -mx-4 mt-6 border-t bg-background px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:static sm:mx-0 sm:border-0 sm:px-0">
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={!canContinue || isPending}
          >
            {step < STEPS.length - 1
              ? "Continue"
              : isPending
                ? "Saving…"
                : "Finish setup"}
          </Button>
        </div>
      </form>
    </div>
  );
}
