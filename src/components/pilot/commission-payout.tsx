"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { markCommissionsPaid } from "@/lib/actions/pilot";

/** After sending a teacher their commission by M-Pesa, record the code so it shows as paid. */
export function CommissionPayout({
  referrerId,
  ids,
  amount,
}: {
  referrerId: string;
  ids: string[];
  amount: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [code, setCode] = useState("");

  const send = () =>
    startTransition(async () => {
      const result = await markCommissionsPaid({
        referrerId,
        ids,
        payoutRef: code,
      });
      if (!result.success) return void toast.error(result.error);
      toast.success(`KES ${amount.toLocaleString("en-KE")} marked paid`);
      router.refresh();
    });

  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="M-Pesa code"
        aria-label="M-Pesa code of the payment you sent"
        maxLength={20}
        autoComplete="off"
        className="uppercase sm:w-40"
        required
      />
      <Button type="submit" disabled={isPending || !code.trim()}>
        {isPending ? <Spinner /> : <Check />} Paid
      </Button>
    </form>
  );
}
