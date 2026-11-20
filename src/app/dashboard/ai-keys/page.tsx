import { redirect } from "next/navigation";
import { AIKeyCard } from "@/components/admin/ai-key-card";
import { PageHeader } from "@/components/shared/page-header";
import { AI_PROVIDERS, keyStatus } from "@/lib/ai-keys";
import { auth } from "@/lib/auth";

export default async function AIKeysPage() {
  const session = await auth();
  if (!session?.userId) redirect("/login");
  if (session.role !== "SUPERADMIN") redirect("/dashboard");

  const statuses = await Promise.all(AI_PROVIDERS.map(keyStatus));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="AI keys"
        description="The keys Elimu uses to write for teachers. A key saved here replaces the one in the server settings straight away, with no new release. Only the last 4 characters are ever shown."
      />
      {statuses.map((s) => (
        <AIKeyCard
          key={s.provider}
          provider={s.provider}
          source={s.source}
          last4={s.last4}
          hostingLast4={s.hostingLast4}
          updatedAt={s.updatedAt?.toISOString() ?? null}
          unreadable={s.unreadable}
          workspace={s.workspace}
        />
      ))}
      <p className="text-xs text-muted-foreground">
        Saved keys are locked with JWT_SECRET_KEY (or ELIMU_SECRETS_KEY) before
        they are stored. If that value changes, save the keys again.
      </p>
    </div>
  );
}
