"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { startCheckout } from "@/lib/actions/pilot";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

/** Opens Paystack's checkout, where the teacher pays with M-Pesa or a card. */
export function CheckoutButton({ price }: { price: number }) {
  const [isPending, startTransition] = useTransition();

  const pay = () =>
    startTransition(async () => {
      const result = await startCheckout();
      if (!result.success) return void toast.error(result.error);
      window.location.assign(result.url);
    });

  return (
    <Button size="lg" className="w-full sm:w-auto" disabled={isPending} onClick={pay}>
      {isPending && <Spinner />} Pay KES {price}
    </Button>
  );
}
