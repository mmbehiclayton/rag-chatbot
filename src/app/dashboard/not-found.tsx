import { FolderOpen, Home, SearchX } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

/** Shown when a document doesn't exist, was deleted, or belongs to another teacher. */
export default function DashboardNotFound() {
  return (
    <div className="mx-auto max-w-md py-10">
      <EmptyState
        icon={SearchX}
        title="We couldn't find that"
        description="It may have been deleted, or the link is for another teacher's work. Your own work is in your Library."
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button size="lg" render={<Link href="/dashboard/library" />}>
              <FolderOpen /> Open my Library
            </Button>
            <Button
              variant="ghost"
              size="lg"
              render={<Link href="/dashboard" />}
            >
              <Home /> Go to Home
            </Button>
          </div>
        }
      />
    </div>
  );
}
