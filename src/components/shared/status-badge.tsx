import { Badge } from "@/components/ui/badge";

const STATUS = {
  draft: { label: "Draft · review before use", variant: "secondary" },
  reviewed: { label: "Reviewed", variant: "success" },
  needsReview: { label: "Needs review", variant: "warning" },
  generating: { label: "Generating…", variant: "info" },
  failed: { label: "Failed", variant: "destructive" },
} as const;

export type Status = keyof typeof STATUS;

export function StatusBadge({ status }: { status: Status }) {
  const { label, variant } = STATUS[status];
  return <Badge variant={variant}>{label}</Badge>;
}
