import { School } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { JoinSchool } from "@/components/admin/join-school";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { db, withDbRetry } from "@/lib/db";
import { findInviter, INVITE_COOKIE } from "@/lib/invites";

export const metadata = { title: "Join your school · Elimu" };

/** Where a signed-in teacher lands after opening their school's invite link. */
export default async function JoinPage() {
  const session = await auth();
  if (!session?.userId) redirect("/login");

  const code = (await cookies()).get(INVITE_COOKIE)?.value;
  const [inviter, current] = await Promise.all([
    findInviter(code),
    withDbRetry(() =>
      db.tenant.findUnique({
        where: { id: session.tenantId ?? "no-school" },
        select: { id: true, name: true, type: true },
      }),
    ),
  ]);
  const school = inviter?.school;
  const inSchool = current?.type === "SCHOOL" ? current : null;

  const home = (
    <Button variant="outline" size="lg" render={<Link href="/dashboard" />}>
      Go to home
    </Button>
  );

  let title: string;
  let body: React.ReactNode;
  let action: React.ReactNode = home;

  if (!school) {
    title = inSchool ? `You're in ${inSchool.name}` : "No school link found";
    body = inSchool
      ? "Your school admin can see you on their Teachers page."
      : "This link isn't a school link, or it has been replaced. Ask your school admin to send you their link again.";
  } else if (inSchool?.id === school.id) {
    title = `You're already in ${school.name}`;
    body =
      "Nothing more to do. Your school admin can see you on their Teachers page.";
  } else if (session.role !== "TEACHER") {
    title = `Join ${school.name}?`;
    body =
      "School links are for teacher accounts. To move an admin account to another school, ask Elimu.";
  } else {
    title = `Join ${school.name}?`;
    body = (
      <>
        <span className="block">
          Your schemes, lessons, notes and records stay yours. After you join:
        </span>
        <span className="mt-2 block">
          · your school admin sees your name and how much you have prepared
        </span>
        <span className="block">
          · your AI use counts toward the school's monthly limit
        </span>
        {inSchool && (
          <span className="mt-2 block font-medium text-foreground">
            You will leave {inSchool.name}.
          </span>
        )}
      </>
    );
    action = <JoinSchool school={school.name} />;
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PageHeader title={title} />
      <div className="space-y-4 rounded-xl border bg-card p-4">
        <span
          className="flex size-11 items-center justify-center rounded-md bg-primary/10 text-primary"
          aria-hidden
        >
          <School className="size-5" />
        </span>
        <p className="text-sm text-muted-foreground">{body}</p>
        {action}
      </div>
    </div>
  );
}
