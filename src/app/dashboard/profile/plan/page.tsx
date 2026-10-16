import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Check, Clock, Info } from "lucide-react";
import { auth } from "@/lib/auth";
import { getAccess, paybill, termPrice } from "@/lib/plans";
import { PaymentForm } from "@/components/pilot/payment-form";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";

const dateLabel = (d: Date) => d.toLocaleDateString("en-KE", { timeZone: "Africa/Nairobi", weekday: "short", day: "numeric", month: "short" });

export default async function TermPassPage() {
  const session = await auth();
  if (!session?.userId) redirect("/login");

  const access = await getAccess(session.userId);
  const { term, pass } = access;
  const price = termPrice();
  const pay = paybill();
  const paid = pass?.status === "ACTIVE";
  const pending = pass?.status === "PENDING";

  const status =
    access.kind === "paid"
      ? `Your term pass for ${term.label} is active. Every class is open.`
      : access.kind === "trial"
        ? `Free trial: every class is open until ${dateLabel(access.trialEndsOn!)}.`
        : access.kind === "free"
          ? `Free plan: ${access.freeClass ? `${access.freeClass.grade} ${access.freeClass.subject}` : "one class of your choice"}, with the full term plan and printing.`
          : "Elimu is free for now. Term passes start with the pilot term.";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-3">
        <Link href="/dashboard/profile" className="inline-flex min-h-10 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Me
        </Link>
        <PageHeader title="Term pass" description={`KES ${price} for ${term.label}: schemes, lesson plans, records of work and assessments for all your classes.`} />
      </div>

      <p className="flex gap-2 rounded-xl border bg-card p-4 text-sm">
        {paid ? <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /> : <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />}
        {status}
      </p>

      {pending && (
        <p className="flex gap-2 rounded-md bg-info/10 p-3 text-sm">
          <Clock className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
          We're checking your payment ({pass.mpesaCode}). This usually takes less than a day.
        </p>
      )}
      {pass?.status === "REJECTED" && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm">
          We couldn't confirm payment {pass.mpesaCode}
          {pass.note ? `: ${pass.note}` : "."} Check the code in your M-Pesa message and send it again.
        </p>
      )}

      <section className="space-y-2">
        <h2 className="text-base font-semibold">What you get</h2>
        <ul className="divide-y rounded-xl border bg-card text-sm">
          <li className="px-4 py-3">
            <p className="font-medium">Free</p>
            <p className="mt-0.5 text-muted-foreground">One class: its scheme of work, lesson plans, record of work and printing.</p>
          </li>
          <li className="px-4 py-3">
            <p className="font-medium">Term pass · KES {price}</p>
            <p className="mt-0.5 text-muted-foreground">Every class you teach, for the whole of {term.label}.</p>
          </li>
        </ul>
      </section>

      {!paid && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Pay with M-Pesa</h2>
          {pay.number ? (
            <Card>
              <CardContent className="space-y-5">
                <ol className="list-decimal space-y-1.5 pl-5 text-sm">
                  <li>Open M-Pesa and choose Lipa na M-Pesa, then Pay Bill.</li>
                  <li>
                    Business number: <span className="font-semibold">{pay.number}</span>
                  </li>
                  <li>
                    Account number: <span className="font-semibold">{pay.account ?? "ELIMU"}</span>
                  </li>
                  <li>
                    Amount: <span className="font-semibold">KES {price}</span>
                  </li>
                  <li>When the M-Pesa message comes, type its code below.</li>
                </ol>
                <PaymentForm label={term.label} />
              </CardContent>
            </Card>
          ) : (
            <p className="rounded-xl border border-dashed bg-card p-4 text-sm text-muted-foreground">
              Payment details are coming soon. Until then, keep using Elimu as you are.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
