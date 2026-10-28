"use client";

import { RefreshCw } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { InviteShare } from "@/components/pilot/invite-share";
import { confirmAction } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { resetSchoolInviteLink } from "@/lib/actions/invites";

/** A school admin's link for teachers to join the school, with a way to replace it. */
export function SchoolInvite({
  url,
  school,
  joined,
}: {
  url: string;
  school: string;
  joined: number;
}) {
  const [pending, startTransition] = useTransition();

  const reset = async () => {
    if (
      !(await confirmAction({
        title: "Make a new link?",
        body: "The old link will stop working, but teachers who already joined stay in the school.",
        confirm: "Make new link",
      }))
    )
      return;
    startTransition(async () => {
      const result = await resetSchoolInviteLink();
      if (result.success)
        toast.success("New link ready. Share this one from now on.");
      else toast.error(result.error);
    });
  };

  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold">Invite teachers</h2>
      <div className="space-y-3 rounded-xl border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          Teachers who create an account with this link join {school} and use
          the school's monthly AI limit.{" "}
          {joined > 0
            ? `${joined} ${joined === 1 ? "teacher has" : "teachers have"} joined with your link.`
            : "Nobody has joined with it yet."}
        </p>
        <InviteShare
          url={url}
          message={`Join ${school} on Elimu to draft schemes of work, lesson plans and records of work. Create your account here: ${url}`}
        />
        <Button
          variant="ghost"
          className="h-11"
          disabled={pending}
          onClick={reset}
        >
          <RefreshCw className={pending ? "animate-spin" : undefined} /> Make a
          new link
        </Button>
      </div>
    </section>
  );
}
