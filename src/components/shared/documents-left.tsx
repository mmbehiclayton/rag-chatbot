import { CircleAlert } from "lucide-react";
import Link from "next/link";
import { getAllowance, limitInfo } from "@/lib/allowance";
import { getAccess } from "@/lib/plans";
import { cn } from "@/lib/utils";

/** Fewer than this many left and the count turns into a warning. */
const LOW = 2;

/**
 * How many documents a teacher can still make this month, shown where they make them.
 * Renders nothing for admins and staff, who have no allowance. Wrap it in Suspense.
 */
export async function DocumentsLeft({
  userId,
  role,
  className,
}: {
  userId: string;
  role: string | null | undefined;
  className?: string;
}) {
  if (role !== "TEACHER") return null;
  const access = await getAccess(userId).catch(() => null);
  const allowance = access
    ? await getAllowance(userId, role, access).catch(() => null)
    : null;
  if (!allowance || !access) return null;

  const left = Math.max(0, allowance.limit - allowance.used);
  const info = limitInfo(allowance, access);

  if (left > LOW)
    return (
      <p className={cn("text-xs text-muted-foreground", className)}>
        {left} of {allowance.limit} documents left this month ·{" "}
        <Link
          href="/dashboard/profile"
          className="underline underline-offset-2"
        >
          See usage
        </Link>
      </p>
    );

  return (
    <div
      className={cn(
        "flex gap-2 rounded-xl border p-3 text-sm",
        left === 0
          ? "border-destructive/30 bg-destructive/5"
          : "border-warning/40 bg-warning/10",
        className,
      )}
    >
      <CircleAlert
        className={cn(
          "mt-0.5 size-4 shrink-0",
          left === 0 ? "text-destructive" : "text-warning",
        )}
        aria-hidden
      />
      <p>
        <span className="font-medium">
          {left === 0
            ? "No documents left this month."
            : `Only ${left} ${left === 1 ? "document" : "documents"} left this month.`}
        </span>{" "}
        You can make more from {info.resetsOn}.
        {left === 0 && " Everything you've already made still opens."}
        {info.pass && (
          <>
            {" "}
            <Link
              href="/dashboard/profile/plan"
              className="font-medium text-primary underline underline-offset-2"
            >
              A term pass gives you {info.pass.limit} a month
            </Link>
            .
          </>
        )}
      </p>
    </div>
  );
}
