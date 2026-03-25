import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { RulesClient } from "@/components/dashboard/rules-client";

export default async function RulesPage() {
  const session = await auth();
  if (session?.role !== "SUPERADMIN") redirect("/dashboard");

  const rules = await db.generationRule.findMany();

  return <RulesClient initialRules={rules} />;
}
