"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { declineSchool, joinSchool } from "@/lib/actions/invites";

/** Join or turn down the school whose link a signed-in teacher opened. */
export function JoinSchool({ school }: { school: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const join = () =>
    startTransition(async () => {
      const result = await joinSchool();
      if (result.success) {
        toast.success(`You're now in ${school}`);
        router.push("/dashboard");
      } else toast.error(result.error);
    });

  const decline = () =>
    startTransition(async () => {
      await declineSchool();
      router.push("/dashboard");
    });

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button size="lg" disabled={pending} onClick={join}>
        Join {school}
      </Button>
      <Button variant="outline" size="lg" disabled={pending} onClick={decline}>
        Not now
      </Button>
    </div>
  );
}
