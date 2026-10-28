import { ArrowLeft, Check, Clock, FileText, Gift, Ticket } from "lucide-react";
import Link from "next/link";
import {
  FreeDownloadButton,
  PayDownloadButton,
} from "@/components/download/download-buttons";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** The download page's layout: the document, then the ways to download it with their prices. */
export function DownloadChoices({
  backHref,
  title,
  payment,
  query,
  freeLeft,
  price,
  online,
  pass,
}: {
  backHref: string;
  title: string;
  payment?: string;
  query: string;
  freeLeft: boolean;
  price: number;
  online: boolean;
  pass: { price: number; term: string; docs: number };
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-3">
        <Link
          href={backHref}
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
          <p className="text-sm font-medium break-words">{title}</p>
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
            note="One per teacher"
          >
            <p className="text-sm text-muted-foreground">
              Use it here or keep it for another document. Once used, this one
              downloads as often as you like.
            </p>
            <FreeDownloadButton query={query} />
          </Option>
        )}

        <Option
          icon={<FileText className="size-4 text-primary" aria-hidden />}
          name="Just this document"
          price={`KES ${price}`}
          note="Paid once, yours to keep"
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
          price={`KES ${pass.price}`}
          note={`For ${pass.term}`}
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
              Up to {pass.docs} new documents a month
            </li>
          </ul>
          <Button
            variant="outline"
            size="lg"
            className="w-full sm:w-auto"
            nativeButton={false}
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
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 gap-2">
            <span className="mt-0.5 shrink-0">{icon}</span>
            <div>
              <p className="text-sm font-medium">{name}</p>
              <p className="text-xs text-muted-foreground">{note}</p>
            </div>
          </div>
          <p className="shrink-0 text-lg font-semibold whitespace-nowrap tabular-nums">
            {price}
          </p>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}
