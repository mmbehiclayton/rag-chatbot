import { Check, Minus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  OTHER_RULES,
  ROLE_LABELS,
  ROUTE_ACCESS,
  type Role,
} from "@/lib/access";
import { auth } from "@/lib/auth";
import { db, withDbRetry } from "@/lib/db";

const ROLES = Object.keys(ROLE_LABELS) as Role[];

/** What each role can open, read from the same table the proxy enforces. */
export default async function AccessControlPage() {
  const session = await auth();
  if (session?.role !== "SUPERADMIN") redirect("/dashboard");

  const counts = await withDbRetry(() =>
    db.user.groupBy({ by: ["role"], _count: true }),
  );
  const count = (r: Role) => counts.find((c) => c.role === r)?._count ?? 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Access control"
        description="What each role can open. These rules are set in the code, so this page always shows what really happens."
        action={
          <Button
            variant="outline"
            render={<Link href="/dashboard/teachers" />}
          >
            Change someone's role
          </Button>
        }
      />

      <dl className="grid grid-cols-3 divide-x rounded-xl border bg-card text-center">
        {ROLES.map((r) => (
          <div key={r} className="p-3">
            <dt className="text-xs text-muted-foreground">{ROLE_LABELS[r]}</dt>
            <dd className="text-lg font-semibold">{count(r)}</dd>
          </div>
        ))}
      </dl>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Area</TableHead>
              {ROLES.map((r) => (
                <TableHead key={r} className="text-center">
                  {ROLE_LABELS[r]}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {ROUTE_ACCESS.map((a) => (
              <TableRow key={a.prefix}>
                <TableCell className="whitespace-normal">
                  <p className="text-sm font-medium">{a.area}</p>
                  <p className="text-xs text-muted-foreground">{a.prefix}</p>
                </TableCell>
                {ROLES.map((r) => (
                  <TableCell key={r} className="text-center">
                    {a.roles.includes(r) ? (
                      <Check
                        className="mx-auto size-4 text-success"
                        aria-label="Allowed"
                      />
                    ) : (
                      <Minus
                        className="mx-auto size-4 text-muted-foreground"
                        aria-label="Not allowed"
                      />
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Other rules</h2>
        <ul className="list-disc space-y-1.5 rounded-xl border bg-card p-4 pl-8 text-sm">
          {OTHER_RULES.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
