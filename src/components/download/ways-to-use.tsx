import type { AllowancePlan } from "@/lib/allowance";
import { DOC_LABELS, type DocKind } from "@/lib/documents";
import { DOWNLOAD_KINDS } from "@/lib/downloads";

/** The three ways to use Elimu, each with its price, for the term pass page. */
export function WaysToUse({
  limits,
  prices,
  pass,
}: {
  limits: Record<AllowancePlan, number>;
  prices: Record<DocKind, number>;
  pass: { price: number; term: string };
}) {
  return (
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
            Paid once for each document, then download and print it as often as
            you like, as PDF or Word.
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
          <PlanRow name="Term pass" price={`KES ${pass.price}`} />
          <p className="text-muted-foreground">
            Every download for all your classes for the whole of {pass.term},
            and up to {limits.paid} new documents a month.
          </p>
        </li>
      </ul>
    </section>
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
