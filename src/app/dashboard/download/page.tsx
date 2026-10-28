import { ArrowLeft, Check, Clock, FileText, Gift, Ticket } from "lucide-react";
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
  docPagePath,
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
          href={docPagePath(params)}
          className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to the document
        </Link>
        <PageHeader
          title="Download this document"
          description="Making documents and reading them here is free. You pay to download or print them."
        />
      </div>

      <div className="flex gap-3 rounded-xl border bg-card p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
          <FileText className="size-5 text-primary" aria-hidden />
        </span>
        <div className="min-w-0 space-y-0.5">
          <p className="text-xs text-muted-foreground">
            {DOC_LABELS[ref.type]}
          </p>
          <p className="text-sm font-medium break-words">{doc.title}</p>
        </div>
      </div>

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

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Choose how to download</h2>

        {freeLeft && (
          <Option
            icon={<Gift className="size-4 text-success" aria-hidden />}
            name="Your free download"
            price="Free"
            note="once"
          >
            <p className="text-sm text-muted-foreground">
              Use it on this document, or keep it for another one. Once used,
              this document downloads as often as you like.
            </p>
            <FreeDownloadButton query={query} />
          </Option>
        )}

        <Option
          icon={<FileText className="size-4 text-primary" aria-hidden />}
          name="Just this document"
          price={`KES ${price}`}
          note="paid once"
        >
          <p className="text-sm text-muted-foreground">
            Download it as PDF or Word and print it as often as you like, even
            after you edit it. Pay with M-Pesa or a card.
          </p>
          {online ? (
            <PayDownloadButton query={query} price={price} main={!freeLeft} />
          ) : (
            <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
              Paying for one document by M-Pesa is coming soon. For now, get a
              term pass.
            </p>
          )}
        </Option>

        <Option
          icon={<Ticket className="size-4 text-primary" aria-hidden />}
          name="Term pass"
          price={`KES ${access.price}`}
          note={`for ${access.term.label}`}
        >
          <ul className="space-y-1.5 text-sm">
            <li className="flex gap-2">
              <Check
                className="mt-0.5 size-4 shrink-0 text-success"
                aria-hidden
              />
              Every download for all your classes this term
            </li>
            <li className="flex gap-2">
              <Check
                className="mt-0.5 size-4 shrink-0 text-success"
                aria-hidden
              />
              Up to {passDocs} new documents a month
            </li>
          </ul>
          <Button
            variant="outline"
            size="lg"
            className="w-full sm:w-auto"
            render={<Link href="/dashboard/profile/plan" />}
          >
            See the term pass
          </Button>
        </Option>
      </section>
    </div>
  );
}

/** One way to get the download: what it is and its price on top, the details and button below. */
function Option({
  icon,
  name,
  price,
  note,
  children,
}: {
  icon: React.ReactNode;
  name: string;
  price: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-medium">
            {icon}
            {name}
          </p>
          <p className="shrink-0 text-right">
            <span className="block text-lg font-semibold tabular-nums">
              {price}
            </span>
            <span className="block text-xs text-muted-foreground">{note}</span>
          </p>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}
