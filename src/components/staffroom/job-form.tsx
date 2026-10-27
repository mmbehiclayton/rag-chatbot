"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { type JobInput, postJob } from "@/lib/actions/jobs";
import { JOB_KINDS, type JobKind, KENYA_COUNTIES } from "@/lib/staffroom";

const EMPTY: JobInput = {
  title: "",
  school: "",
  county: "",
  kind: "BOM",
  learningAreas: "",
  details: "",
  howToApply: "",
  closesOn: "",
};

/** A teacher shares a job; Elimu staff check it before it shows on the feed. */
export function JobForm() {
  const router = useRouter();
  const [job, setJob] = useState(EMPTY);
  const [isPending, startTransition] = useTransition();
  const set =
    (key: keyof JobInput) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) =>
      setJob((j) => ({ ...j, [key]: e.target.value }));

  const submit = () =>
    startTransition(async () => {
      const result = await postJob(job);
      if (!result.success) return void toast.error(result.error);
      toast.success("Sent. It will show on Jobs once Elimu staff check it.");
      router.push("/dashboard/jobs");
    });

  return (
    <form
      className="space-y-4 rounded-xl border bg-card p-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="job-title">Job title</Label>
        <Input
          id="job-title"
          placeholder="e.g. Mathematics and Science teacher"
          maxLength={120}
          value={job.title}
          onChange={set("title")}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="job-school">School or employer</Label>
        <Input
          id="job-school"
          maxLength={120}
          value={job.school}
          onChange={set("school")}
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="job-county">County</Label>
          <NativeSelect
            id="job-county"
            value={job.county}
            onChange={set("county")}
            className="w-full"
            required
          >
            <NativeSelectOption value="">Choose a county</NativeSelectOption>
            {KENYA_COUNTIES.map((c) => (
              <NativeSelectOption key={c} value={c}>
                {c}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="job-kind">Type of job</Label>
          <NativeSelect
            id="job-kind"
            value={job.kind}
            onChange={(e) =>
              setJob((j) => ({ ...j, kind: e.target.value as JobKind }))
            }
            className="w-full"
          >
            {Object.entries(JOB_KINDS).map(([value, label]) => (
              <NativeSelectOption key={value} value={value}>
                {label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="job-areas">Learning areas (optional)</Label>
          <Input
            id="job-areas"
            placeholder="e.g. English, Kiswahili"
            maxLength={200}
            value={job.learningAreas}
            onChange={set("learningAreas")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="job-closes">Closing date (optional)</Label>
          <Input
            id="job-closes"
            type="date"
            value={job.closesOn}
            onChange={set("closesOn")}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="job-details">Details</Label>
        <Textarea
          id="job-details"
          placeholder="Grades, requirements, start date, pay if known"
          maxLength={3000}
          rows={5}
          value={job.details}
          onChange={set("details")}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="job-apply">How to apply</Label>
        <Textarea
          id="job-apply"
          placeholder="e.g. Send your CV and TSC number to the head teacher at ..."
          maxLength={1000}
          rows={3}
          value={job.howToApply}
          onChange={set("howToApply")}
          required
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Share only real jobs you know about. Elimu staff check every post before
        teachers see it.
      </p>
      <Button
        type="submit"
        className="h-11 w-full sm:w-auto"
        disabled={isPending}
      >
        {isPending && <Spinner />} Send for checking
      </Button>
    </form>
  );
}
