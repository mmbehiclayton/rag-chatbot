import { cn } from "@/lib/utils";

/**
 * A ring chart in plain SVG (no chart library, so nothing extra to download on a phone).
 * `marker` draws a tick where the value should be, e.g. expected coverage by today.
 */
export function Donut({
  value,
  marker,
  size = 120,
  stroke = 12,
  label,
  className,
  children,
}: {
  /** 0–100 */
  value: number;
  marker?: number | null;
  size?: number;
  stroke?: number;
  label: string;
  className?: string;
  /** Shown in the middle; defaults to the percentage. */
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  const angle = ((marker ?? 0) / 100) * 2 * Math.PI - Math.PI / 2;
  const mid = size / 2;

  return (
    <div
      role="img"
      aria-label={label}
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
      >
        <circle
          cx={mid}
          cy={mid}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted"
        />
        {v > 0 && (
          <circle
            cx={mid}
            cy={mid}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${(v / 100) * c} ${c}`}
            transform={`rotate(-90 ${mid} ${mid})`}
            className="stroke-primary"
          />
        )}
        {marker != null && marker > 0 && (
          <line
            x1={mid + (r - stroke / 2 - 2) * Math.cos(angle)}
            y1={mid + (r - stroke / 2 - 2) * Math.sin(angle)}
            x2={mid + (r + stroke / 2 + 2) * Math.cos(angle)}
            y2={mid + (r + stroke / 2 + 2) * Math.sin(angle)}
            strokeWidth={2}
            className="stroke-foreground"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children ?? <span className="text-sm font-semibold">{v}%</span>}
      </div>
    </div>
  );
}
