"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { submitPayment } from "@/lib/actions/pilot";

/** After paying by Paybill, the teacher types the code from their M-Pesa message. */
export function PaymentForm({ label }: { label: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");

  const submit = () =>
    startTransition(async () => {
      const result = await submitPayment({ mpesaCode: code, phone });
      if (!result.success) return void toast.error(result.error);
      toast.success(
        "Thank you. We'll check your payment and switch on your term pass.",
      );
      setCode("");
      router.refresh();
    });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="mpesa-code">M-Pesa code</Label>
        <Input
          id="mpesa-code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. SJK3A1B2C4"
          autoComplete="off"
          autoCapitalize="characters"
          maxLength={14}
          required
          aria-describedby="mpesa-hint"
        />
        <p id="mpesa-hint" className="text-xs text-muted-foreground">
          The 10 letters and numbers at the start of your M-Pesa message.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="mpesa-phone">
          Phone number you paid from (optional)
        </Label>
        <Input
          id="mpesa-phone"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="0712 345 678"
          autoComplete="tel"
          maxLength={16}
        />
      </div>
      <Button
        type="submit"
        size="lg"
        className="w-full sm:w-auto"
        disabled={isPending || code.trim().length < 10}
      >
        {isPending && <Spinner />} Send for {label}
      </Button>
    </form>
  );
}
