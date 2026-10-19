"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export type Slide = { heading: string; lead?: string; points: string[] };

/** Full-screen, light slides for projecting or reading from a phone in class. */
export function LessonPresent({
  lessonId,
  slides,
}: {
  lessonId: string;
  slides: Slide[];
}) {
  const [i, setI] = useState(0);
  const go = useCallback(
    (d: number) => setI((n) => Math.min(Math.max(n + d, 0), slides.length - 1)),
    [slides.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const slide = slides[i];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <span className="text-sm text-muted-foreground">
          {i + 1} / {slides.length}
        </span>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Close presentation"
          render={<Link href={`/dashboard/lessons/${lessonId}`} />}
        >
          <X />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8 sm:px-12">
        <div className="mx-auto max-w-4xl space-y-6">
          <h1 className="text-2xl font-semibold sm:text-4xl">
            {slide.heading}
          </h1>
          {slide.lead && (
            <p className="text-lg text-muted-foreground sm:text-2xl">
              {slide.lead}
            </p>
          )}
          {slide.points.length > 0 && (
            <ul className="list-disc space-y-3 pl-6 text-lg sm:text-2xl">
              {slide.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex gap-2 border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button
          variant="outline"
          size="lg"
          className="flex-1"
          disabled={i === 0}
          onClick={() => go(-1)}
        >
          <ChevronLeft /> Back
        </Button>
        <Button
          size="lg"
          className="flex-1"
          disabled={i === slides.length - 1}
          onClick={() => go(1)}
        >
          Next <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
