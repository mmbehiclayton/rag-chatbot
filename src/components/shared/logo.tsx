import Link from "next/link";
import { cn } from "@/lib/utils";

/** The Elimu mark: an open book with a spark of light. Inline, so it costs no extra download. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      aria-hidden="true"
      className={cn("size-7 shrink-0", className)}
    >
      <rect width="512" height="512" rx="116" fill="#0d72ef" />
      <g transform="translate(256 262) scale(0.9) translate(-256 -256)">
        <path
          d="M247 236 C 200 196 140 186 86 198 V 392 C 140 380 200 390 247 424 Z"
          fill="#ffffff"
        />
        <path
          d="M265 236 C 312 196 372 186 426 198 V 392 C 372 380 312 390 265 424 Z"
          fill="#ffffff"
          fillOpacity="0.8"
        />
        <path
          d="M256 66 C 263 112 278 128 322 136 C 278 144 263 160 256 206 C 249 160 234 144 190 136 C 234 128 249 112 256 66 Z"
          fill="#ffc53d"
        />
        <path
          d="M352 64 C 355 80 360 85 376 88 C 360 91 355 96 352 112 C 349 96 344 91 328 88 C 344 85 349 80 352 64 Z"
          fill="#ffc53d"
        />
      </g>
    </svg>
  );
}

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
      <LogoMark />
      <span className="text-lg font-semibold text-foreground">Elimu</span>
    </Link>
  );
}
