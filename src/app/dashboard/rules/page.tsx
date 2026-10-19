import { redirect } from "next/navigation";
import { RulesClient } from "@/components/dashboard/rules-client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function RulesPage() {
  const session = await auth();
  if (session?.role !== "SUPERADMIN") redirect("/dashboard");

  const [rules, requests] = await Promise.all([
    db.generationRule.findMany(),
    // What teachers asked Elimu to change, so staff can turn common asks into rules.
    db.generationLog
      .findMany({
        where: { instruction: { not: null } },
        orderBy: { createdAt: "desc" },
        take: 200,
        select: { contentType: true, instruction: true, createdAt: true },
      })
      .catch(() => []),
  ]);

  return (
    <RulesClient
      initialRules={rules}
      requests={requests.map((r) => ({
        contentType: r.contentType,
        instruction: r.instruction ?? "",
        createdAt: r.createdAt.toISOString(),
      }))}
    />
  );
}
