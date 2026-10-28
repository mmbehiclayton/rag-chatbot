"use client";

import { UserMinus } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { confirmAction } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { removeTeacher } from "@/lib/actions/invites";

/** A school admin takes a teacher out of the school. The teacher keeps their account and work. */
export function RemoveTeacher({
  teacherId,
  name,
}: {
  teacherId: string;
  name: string;
}) {
  const [pending, startTransition] = useTransition();

  const remove = async () => {
    if (
      !(await confirmAction({
        title: `Remove ${name} from your school?`,
        body: "They keep their account and everything they made, but you won't see them here and they stop using the school's AI limit.",
        confirm: "Remove",
        destructive: true,
      }))
    )
      return;
    startTransition(async () => {
      const result = await removeTeacher(teacherId);
      if (result.success) toast.success(`${name} is no longer in your school`);
      else toast.error(result.error);
    });
  };

  return (
    <Button
      variant="ghost"
      className="h-11 text-destructive hover:text-destructive"
      disabled={pending}
      onClick={remove}
    >
      <UserMinus /> Remove from school
    </Button>
  );
}
