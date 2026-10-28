import { ArrowLeft, Check, Clock, Info } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckoutButton } from "@/components/pilot/checkout-button";
import { PaymentForm } from "@/components/pilot/payment-form";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { allowances } from "@/lib/allowance";
import { auth } from "@/lib/auth";
import { DOC_LABELS } from "@/lib/documents";
import {
  DOWNLOAD_KINDS,
  downloadPrices,
  freeDownloadUsed,
} from "@/lib/downloads";
import { paystackOn } from "@/lib/paystack";
import { getAccess, paybill } from "@/lib/plans";

export default async function TermPassPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  const session = await auth();
  if (!session?.userId) redirect("/login");

  const { payment } = await searchParams;
  const [access, prices, limits, freeUsed] = await Promise.all([
    getAccess(session.userId),
    downloadPrices(),
    allowances(),
    freeDownloadUsed(session.userId),
  ]);
  const { term, pass } = access;
  const { price } = access;
  const pay = paybill();
  const paid = pass?.status === "ACTIVE";
  // A Paystack pass waits as PENDING only until checkout finishes, so only typed M-Pesa codes are "being checked".
  const pending = pass?.status === "PENDING" && pass.method === "MPESA_CODE";

  const status =
    access.kind === "paid"
      ? `Your term pass for ${term.label} is active. Every download is open.`
      : access.kind === "free"
        ? `You're on the free plan. ${freeUsed ? "You've used your free download, so" : "Your first download is free. After that,"} each document is paid for once when you download it, or a term pass opens them all.`
        : "Elimu is free for now. Term passes start with the pilot term.";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-3">
        <Link
          href="/dashboard/profile"
          className="inline-flex min-h-10 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Profile
        </Link>
        <PageHeader
          title="Term pass"
          description={`KES ${price} for ${term.label}: download and print every scheme, lesson plan, record of work and assessment for all your classes.`}
        />
      </div>

      <p className="flex gap-2 rounded-xl border bg-card p-4 text-sm">
        {paid ? (
          <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
        ) : (
          <Info
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
        )}
        {status}
      </p>

      {payment === "paid" && paid && (
        <p className="flex gap-2 rounded-md bg-success/10 p-3 text-sm">
          <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
          Payment received. Thank you!
        </p>
      )}
      {payment === "pending" && !paid && (
        <p className="flex gap-2 rounded-md bg-info/10 p-3 text-sm">
          <Clock className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
          Your payment is still going through. Once M-Pesa confirms it, your
          term pass switches on by itself. Refresh this page in a minute.
        </p>
      )}
      {payment === "failed" && !paid && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm">
          The payment didn't go through, and no money was taken by Elimu. You
          can try again below.
        </p>
      )}

      {pending && (
        <p className="flex gap-2 rounded-md bg-info/10 p-3 text-sm">
          <Clock className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
          We're checking your payment ({pass.reference}). This usually takes
          less than a day.
        </p>
      )}
      {pass?.status === "REJECTED" && pass.method === "MPESA_CODE" && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm">
          We couldn't confirm payment {pass.reference}
          {pass.note ? `: ${pass.note}` : "."} Check the code in your M-Pesa
          message and send it again.
        </p>
      )}

      {!paid && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Get your term pass</h2>
          {paystackOn() ? (
            <Card>
              <CardContent className="space-y-4">
                <p className="text-sm">
                  Pay KES {price} for {term.label} with M-Pesa or a card. Your
                  phone will ask for your M-Pesa PIN, and your term pass
                  switches on as soon as the payment goes through.
                </p>
                <CheckoutButton price={price} />
              </CardContent>
            </Card>
          ) : pay.number ? (
            <Card>
              <CardContent className="space-y-5">
                <ol className="list-decimal space-y-1.5 pl-5 text-sm">
                  <li>Open M-Pesa and choose Lipa na M-Pesa, then Pay Bill.</li>
                  <li>
                    Business number:{" "}
                    <span className="font-semibold">{pay.number}</span>
                  </li>
                  <li>
                    Account number:{" "}
                    <span className="font-semibold">
                      {pay.account ?? "ELIMU"}
                    </span>
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
              Payment details are coming soon. Until then, keep using Elimu as
              you are.
            </p>
          )}
        </section>
      )}
      <section className="space-y-2">
        <h2 className="text-base font-semibold">Ways to use Elimu</h2>
        <ul className="divide-y rounded-xl border bg-card text-sm">
          <li className="space-y-1 px-4 py-3">
            <PlanRow name="Free" price="KES 0" />
            <p className="text-muted-foreground">
              Make up to {limits.free} documents a month for any class and read
              them in full here. Your first download is free.
            </p>
          </li>
          <li className="space-y-1 px-4 py-3">
            <PlanRow
              name="Pay per download"
              price={`from KES ${Math.min(...Object.values(prices))}`}
            />
            <p className="text-muted-foreground">
              Paid once for each document, then download and print it as often
              as you like, as PDF or Word.
            </p>
            <ul className="mt-2 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
              {DOWNLOAD_KINDS.map((kind) => (
                <li key={kind} className="flex justify-between gap-3">
                  <span className="text-muted-foreground">
                    {DOC_LABELS[kind]}
                  </span>
                  <span className="font-medium whitespace-nowrap tabular-nums">
                    KES {prices[kind]}
                  </span>
                </li>
              ))}
            </ul>
          </li>
          <li className="space-y-1 px-4 py-3">
            <PlanRow name="Term pass" price={`KES ${price}`} />
            <p className="text-muted-foreground">
              Every download for all your classes for the whole of {term.label},
              and up to {limits.paid} new documents a month.
            </p>
          </li>
        </ul>
      </section>
    </div>
  );
}

function PlanRow({ name, price }: { name: string; price: string }) {
  return (
    <p className="flex items-baseline justify-between gap-3">
      <span className="font-medium">{name}</span>
      <span className="font-semibold whitespace-nowrap tabular-nums">
        {price}
      </span>
    </p>
  );
}
