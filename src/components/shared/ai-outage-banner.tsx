import { formatDistanceToNow } from "date-fns";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { outageText } from "@/lib/ai-health";

/**
 * Shown on every dashboard page while OpenAI isn't working. Teachers learn their saved work is
 * safe; Elimu staff see what to fix. With the Claude backup on, only staff see it.
 */
/** Anthropic's own words when the account has no money left, as opposed to a key problem. */
const NO_CREDIT = /credit balance|credits|billing|quota/i;

export function AIOutageBanner({
  staff,
  problem,
  since,
  backup = false,
  backupError,
}: {
  staff: boolean;
  problem: "credit" | "key";
  since: Date;
  backup?: boolean;
  /** Why Claude failed too, while it keeps failing. */
  backupError?: string;
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
            {backup && !backupError
              ? "OpenAI isn't working, so Claude is writing for teachers, since "
              : "Elimu can't write anything, since "}
            {formatDistanceToNow(since, { addSuffix: true })}.
          </span>{" "}
          {outageText(problem)}{" "}
          {backup && backupError && (
            <>
              The Claude backup is failing too: "{backupError}"{" "}
              {NO_CREDIT.test(backupError) ? (
                <>
                  Add credit in Anthropic billing (console.anthropic.com, Plans
                  &amp; Billing).{" "}
                </>
              ) : (
                <>
                  Fix it on{" "}
                  <Link
                    href="/dashboard/ai-keys"
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    AI keys
                  </Link>
                  .{" "}
                </>
              )}
            </>
          )}
          This clears by itself once a lesson plan or answer works again. Then{" "}
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
