import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  href = "/",
  className,
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2", className)}
    >
      <Image
        src="/elimu-logo.png"
        alt=""
        width={28}
        height={28}
        className="h-7 w-7 object-contain"
        priority
      />
      <span className="text-lg font-semibold text-foreground">Elimu</span>
    </Link>
  );
}
