import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { NameForm } from "@/components/admin/name-form";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROLE_LABELS, type Role } from "@/lib/access";
import { backupModelName, modelName } from "@/lib/ai-models";
import { auth } from "@/lib/auth";
import { db, withDbRetry } from "@/lib/db";

// What Elimu really uses now (src/lib/ai-models.ts and src/lib/rag.ts).
const models = () => [
  {
    use: "Writing schemes, lessons, notes and assessments",
    model: `OpenAI ${modelName("write")}`,
  },
  {
    use: "Ask Elimu and the lesson helper",
    model: `OpenAI ${modelName("chat")}`,
  },
  {
    use: "Backup when OpenAI isn't working",
    model: `Claude ${backupModelName()}`,
  },
  {
    use: "Finding the right part of the curriculum designs",
    model: "OpenAI text-embedding-3-small",
  },
];

const STAFF_LINKS = [
  {
    href: "/dashboard/ai-keys",
    title: "AI keys",
    desc: "The OpenAI and Anthropic keys Elimu uses",
  },
  {
    href: "/dashboard/pilot",
    title: "Pilot",
    desc: "Test mode, term pass price and M-Pesa payments",
  },
  {
    href: "/dashboard/tenants",
    title: "Schools and accounts",
    desc: "Add schools and set monthly AI limits",
  },
  {
    href: "/dashboard/rbac",
    title: "Access control",
    desc: "What each role can open",
  },
  {
    href: "/dashboard/rules",
    title: "Generation rules",
    desc: "Extra instructions added to every generation",
  },
];

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.userId) redirect("/login");

  const user = await withDbRetry(() =>
    db.user.findUnique({
      where: { id: session.userId },
      select: {
        name: true,
        email: true,
        role: true,
        tenant: { select: { name: true, type: true } },
      },
    }),
  );
  if (!user) redirect("/login");

  const isStaff = session.role === "SUPERADMIN";
  const isSchoolAdmin = session.role === "ADMIN";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Settings"
        description="Your details and, for admins, your school's."
      />

      <Card>
        <CardHeader>
          <CardTitle>Your details</CardTitle>
          <CardDescription>
            Signed in as {user.email} ·{" "}
            {ROLE_LABELS[user.role as Role] ?? user.role}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <NameForm
            kind="profile"
            label="Your name"
            initial={user.name ?? ""}
          />
          <p className="text-xs text-muted-foreground">
            Your email is how you sign in, so it can't be changed here. To
            change your password, sign out and use "Forgot password".
          </p>
        </CardContent>
      </Card>

      {isSchoolAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Your school</CardTitle>
            <CardDescription>
              The name teachers see on Elimu and on exported documents.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {user.tenant ? (
              <NameForm
                kind="school"
                label="School name"
                initial={user.tenant.name}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Your account isn't linked to a school yet. Contact Elimu to set
                this up.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {isStaff && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>AI models</CardTitle>
              <CardDescription>
                Change them in Vercel's environment settings: ELIMU_MODEL_WRITE,
                ELIMU_MODEL_CHAT and ELIMU_MODEL_BACKUP.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="divide-y text-sm">
                {models().map((m) => (
                  <div
                    key={m.use}
                    className="flex flex-col gap-0.5 py-2 sm:flex-row sm:justify-between sm:gap-4"
                  >
                    <dt className="text-muted-foreground">{m.use}</dt>
                    <dd className="font-medium">{m.model}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          <section className="space-y-2">
            <h2 className="text-base font-semibold">Platform settings</h2>
            <ul className="divide-y rounded-xl border bg-card">
              {STAFF_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="flex min-h-11 items-center gap-3 p-4 hover:bg-muted"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{l.title}</p>
                      <p className="text-xs text-muted-foreground">{l.desc}</p>
                    </div>
                    <ChevronRight
                      className="size-4 text-muted-foreground"
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
