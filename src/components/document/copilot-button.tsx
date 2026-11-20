"use client";

import { Sparkles } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";

// The chat code (ai SDK) only downloads when the teacher opens the panel.
const CopilotPanel = dynamic(
  () => import("./copilot-panel").then((m) => m.CopilotPanel),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <Spinner />
      </div>
    ),
  },
);

export function CopilotButton({
  lessonId,
  topic,
}: {
  lessonId: string;
  topic: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="secondary"
        className="no-print w-full sm:w-auto"
        onClick={() => setOpen(true)}
      >
        <Sparkles /> Ask Elimu about this lesson
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
        >
          <SheetHeader className="border-b">
            <SheetTitle>Ask Elimu</SheetTitle>
            <SheetDescription className="truncate">
              About: {topic}
            </SheetDescription>
          </SheetHeader>
          {open && <CopilotPanel lessonId={lessonId} />}
        </SheetContent>
      </Sheet>
    </>
  );
}
