"use client";

import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { parentPath, titleForPath } from "./nav-config";

export function PageTitle() {
  return (
    <span className="truncate text-base font-semibold">
      {titleForPath(usePathname())}
    </span>
  );
}

// The pages visited in this tab, so Back only uses the browser history when the previous
// page is ours. The installed app has no browser back button of its own.
const visited: string[] = [];

function track(pathname: string) {
  if (visited.at(-1) === pathname) return;
  // Arriving at the page before this one means the browser went back.
  if (visited.at(-2) === pathname) visited.pop();
  else visited.push(pathname);
}

/** A back arrow on pages below the top level: back where the teacher came from, else up a level. */
export function BackButton() {
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => track(pathname), [pathname]);

  const parent = parentPath(pathname);
  if (!parent) return null;
  return (
    <Button
      variant="ghost"
      size="icon"
      className="shrink-0"
      data-back
      aria-label="Back"
      onClick={() => {
        if (visited.length > 1 && visited.at(-1) === pathname) router.back();
        else router.push(parent);
      }}
    >
      <ArrowLeft />
    </Button>
  );
}
