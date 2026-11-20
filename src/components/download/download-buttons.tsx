"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  claimFreeDownload,
  startDownloadCheckout,
} from "@/lib/actions/downloads";

/** Uses the teacher's one free download on this document, then opens it. */
export function FreeDownloadButton({ query }: { query: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      size="lg"
      className="w-full sm:w-auto"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await claimFreeDownload(query);
          if (!result.success) return void toast.error(result.error);
          window.location.assign(result.url);
        })
      }
    >
      {isPending && <Spinner />} Use my free download
    </Button>
  );
}

/** Opens Paystack's checkout for this document. Paystack brings the teacher back to it once paid. */
export function PayDownloadButton({
  query,
  price,
  main = true,
}: {
  query: string;
  price: number;
  main?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      size="lg"
      variant={main ? "default" : "outline"}
      className="w-full sm:w-auto"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await startDownloadCheckout(query);
          if (!result.success) return void toast.error(result.error);
          window.location.assign(result.url);
        })
      }
    >
      {isPending && <Spinner />} Pay KES {price}
    </Button>
  );
}
