import { Badge } from "@/components/ui/badge";

const BADGE = {
  DRAFT: { label: "Draft", variant: "secondary" },
  IN_REVIEW: { label: "Waiting for a check", variant: "warning" },
  PUBLISHED: { label: "In use", variant: "success" },
} as const;

export function MapStatusBadge({ status }: { status: string }) {
  const badge = BADGE[status as keyof typeof BADGE];
  return badge ? <Badge variant={badge.variant}>{badge.label}</Badge> : null;
}

export function mapHref(grade: string, subject: string) {
  return `/dashboard/curriculum/${encodeURIComponent(grade)}/${encodeURIComponent(subject)}`;
}
