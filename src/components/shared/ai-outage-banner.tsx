import { formatDistanceToNow } from "date-fns";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { outageText } from "@/lib/ai-health";

/**
 * Shown on every dashboard page while OpenAI isn't working. Teachers learn their saved work is
 * safe; Elimu staff see what to fix.
 */
export function AIOutageBanner({
  staff,
  problem,
  since,
}: {
  staff: boolean;
  problem: "credit" | "key";
  since: Date;
}) {
  return (
    <div className="no-print mb-4 flex gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm">
      <AlertTriangle
        className="mt-0.5 size-4 shrink-0 text-destructive"
        aria-hidden
      />
      {staff ? (
        <p>
          <span className="font-semibold">
            Elimu can't write anything, since{" "}
            {formatDistanceToNow(since, { addSuffix: true })}.
          </span>{" "}
          {outageText(problem)} This clears by itself once a lesson plan or
          answer works again. Then{" "}
          <Link
            href="/dashboard/knowledge?status=error"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            try the failed designs again
          </Link>
          .
        </p>
      ) : (
        <p>
          <span className="font-semibold">
            Elimu can't create documents or answer questions right now.
          </span>{" "}
          We're fixing it. Your saved work is safe and you can still open, print
          and download it.
        </p>
      )}
    </div>
  );
}
