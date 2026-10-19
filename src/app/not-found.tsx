import { Home, SearchX } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <EmptyState
        icon={SearchX}
        title="We couldn't find that page"
        description="The link may be old or mistyped."
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button size="lg" render={<Link href="/dashboard" />}>
              <Home /> Go to my Elimu
            </Button>
            <Button variant="ghost" size="lg" render={<Link href="/" />}>
              Elimu home page
            </Button>
          </div>
        }
      />
    </main>
  );
}
