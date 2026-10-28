import { ArrowLeft, Clock, FileText, Gift, Ticket } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  FreeDownloadButton,
  PayDownloadButton,
} from "@/components/download/download-buttons";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { allowances } from "@/lib/allowance";
import { auth } from "@/lib/auth";
import { DOC_LABELS } from "@/lib/documents";
import {
  downloadAccess,
  exportQuery,
  findDoc,
  parseDocRef,
} from "@/lib/downloads";
import { paystackOn } from "@/lib/paystack";

/**
 * Where /api/export sends a teacher whose download still needs paying for: their free download,
 * paying for this one document, or a term pass.
 */
export default async function DownloadPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.userId) redirect("/login");

  const params = await searchParams;
  const query = exportQuery(params);
  const ref = parseDocRef(params);
  const doc = ref && (await findDoc(session.userId, ref));
  if (!ref || !doc) redirect("/dashboard");

  const state = await downloadAccess(session.userId, ref);
  if (state.open) redirect(`/api/export?${query}`);
  const { price, freeLeft, access } = state;
  const payment = params.payment;
  const online = paystackOn();
  const { paid: passDocs } = await allowances();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-3">
        <Link
          href="/dashboard"
          className="inline-flex min-h-10 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Home
        </Link>
        <PageHeader
          title="Download this document"
          description="Making documents and reading them here is free. You pay to download or print them."
        />
      </div>

      <p className="flex gap-2 rounded-xl border bg-card p-4 text-sm">
        <FileText
          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <span>
          <span className="font-medium">{doc.title}</span>
          <span className="block text-muted-foreground">
            {DOC_LABELS[ref.type]}
          </span>
        </span>
      </p>

      {payment === "pending" && (
        <p className="flex gap-2 rounded-md bg-info/10 p-3 text-sm">
          <Clock className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
          Your payment is still going through. Once M-Pesa confirms it, the
          document opens by itself. Refresh this page in a minute.
        </p>
      )}
      {payment === "failed" && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm">
          The payment didn't go through, and no money was taken by Elimu. You
          can try again below.
        </p>
      )}

      {freeLeft && (
        <Card>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Gift
                className="mt-0.5 size-4 shrink-0 text-success"
                aria-hidden
              />
              <div className="space-y-1 text-sm">
                <p className="font-medium">Your first download is free</p>
                <p className="text-muted-foreground">
                  Use it on this document, or keep it for another one. Once
                  used, this document downloads as often as you like.
                </p>
              </div>
            </div>
            <FreeDownloadButton query={query} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-4">
          <div className="space-y-1 text-sm">
            <p className="font-medium">
              This document · KES {price}, paid once
            </p>
            <p className="text-muted-foreground">
              Download it as PDF or Word and print it as often as you like, even
              after you edit it. Pay with M-Pesa or a card.
            </p>
          </div>
          {online ? (
            <PayDownloadButton query={query} price={price} main={!freeLeft} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Paying for one document by M-Pesa is coming soon. For now, get a
              term pass.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Ticket
              className="mt-0.5 size-4 shrink-0 text-primary"
              aria-hidden
            />
            <div className="space-y-1 text-sm">
              <p className="font-medium">
                Term pass · KES {access.price} for {access.term.label}
              </p>
              <p className="text-muted-foreground">
                Every download for all your classes this term, and up to{" "}
                {passDocs} new documents a month. Better value if you need more
                than a few documents.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="lg"
            className="w-full sm:w-auto"
            render={<Link href="/dashboard/profile/plan" />}
          >
            See the term pass
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
