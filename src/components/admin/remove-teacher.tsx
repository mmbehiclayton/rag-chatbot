"use client";

import { UserMinus } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
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

  const remove = () => {
    if (
      !window.confirm(
        `Remove ${name} from your school? They keep their account and everything they made, but you won't see them here and they stop using the school's AI limit.`,
      )
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
