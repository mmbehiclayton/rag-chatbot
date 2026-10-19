"use client";

import { usePathname } from "next/navigation";
import { titleForPath } from "./nav-config";

export function PageTitle() {
  return (
    <span className="truncate text-base font-semibold">
      {titleForPath(usePathname())}
    </span>
  );
}
