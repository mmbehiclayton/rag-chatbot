"use client";

import { Copy, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** Share the teacher's invite link on WhatsApp, or copy it to paste anywhere. */
export function InviteShare({ url }: { url: string }) {
  const message = `I use Elimu to draft my schemes of work, lesson plans and records of work. Try it free: ${url}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy. Press and hold the link to copy it.");
    }
  };

  return (
    <div className="space-y-3">
      <p className="break-all rounded-md bg-muted px-3 py-2 text-sm">{url}</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button size="lg" render={<a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" />}>
          <MessageCircle /> Share on WhatsApp
        </Button>
        <Button variant="outline" size="lg" onClick={copy}>
          <Copy /> Copy link
        </Button>
      </div>
    </div>
  );
}
