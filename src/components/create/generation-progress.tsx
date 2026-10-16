import { Spinner } from "@/components/ui/spinner";

/** Honest waiting state for a generation: one spinner, what is happening, roughly how long. */
export function GenerationProgress({
  title,
  detail,
  estimate = "This usually takes about 30 seconds. Please keep this page open.",
}: {
  title: string;
  detail?: string;
  estimate?: string;
}) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center gap-4 rounded-xl border bg-card px-6 py-12 text-center">
      <Spinner className="size-8 text-primary" />
      <div className="space-y-1">
        <p className="text-base font-semibold">{title}</p>
        {detail && <p className="text-sm text-muted-foreground">{detail}</p>}
      </div>
      <p className="max-w-xs text-sm text-muted-foreground">{estimate}</p>
    </div>
  );
}
