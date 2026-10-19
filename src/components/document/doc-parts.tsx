import { ArrowLeft, Download } from "lucide-react";
import Link from "next/link";
import { CheckButton } from "@/components/document/check-button";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  type CheckableKind,
  DOC_LABELS,
  type DocKind,
  NEEDS_REVIEW,
} from "@/lib/documents";
import { cn } from "@/lib/utils";

/** Splits the "[Needs Review]" flag the verification pass adds off a title. */
export function parseTitle(title: string) {
  return {
    title: title.replace(NEEDS_REVIEW, ""),
    needsReview: NEEDS_REVIEW.test(title),
  };
}

export function asArray<T = string>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

/** Header for a generated document: back link, document type, title, context line, status and actions. */
export function DocHeader({
  kind,
  backHref,
  backLabel,
  title,
  meta,
  needsReview,
  check,
  actions,
}: {
  kind?: DocKind;
  backHref: string;
  backLabel: string;
  title: string;
  meta: string;
  needsReview?: boolean;
  /** The saved document, so the teacher can mark it as checked. */
  check?: { kind: CheckableKind; id: string; checkedAt: Date | null };
  actions?: React.ReactNode;
}) {
  return (
    <div className="no-print space-y-3">
      <Link
        href={backHref}
        className="inline-flex min-h-10 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {backLabel}
      </Link>
      <div className="space-y-2">
        {kind && (
          <p className="text-sm font-medium text-primary">{DOC_LABELS[kind]}</p>
        )}
        <h1 className="text-xl font-semibold sm:text-2xl">{title}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{meta}</span>
          {!check && (
            <StatusBadge status={needsReview ? "needsReview" : "draft"} />
          )}
        </div>
        {check && (
          <CheckButton
            kind={check.kind}
            id={check.id}
            checkedAt={check.checkedAt?.toISOString() ?? null}
            needsReview={!!needsReview}
          />
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function ExportButton({
  href,
  label = "Export PDF",
}: {
  href: string;
  label?: string;
}) {
  return (
    <Button
      variant="outline"
      render={
        <a href={href} rel="noopener" target="_blank">
          <span className="sr-only">Export PDF</span>
        </a>
      }
    >
      <Download /> {label}
    </Button>
  );
}

export function DocSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "space-y-3 rounded-xl border bg-card p-4 sm:p-5",
        className,
      )}
    >
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="space-y-3 text-base leading-relaxed">{children}</div>
    </section>
  );
}

export function BulletList({
  items,
  ordered = false,
}: {
  items: unknown;
  ordered?: boolean;
}) {
  const list = asArray(items).filter((i) => typeof i === "string" && i.trim());
  if (list.length === 0) return null;
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag
      className={cn("space-y-1.5 pl-5", ordered ? "list-decimal" : "list-disc")}
    >
      {list.map((item) => (
        <li key={String(item)}>{item as string}</li>
      ))}
    </Tag>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  if (
    children === null ||
    children === undefined ||
    children === false ||
    children === ""
  )
    return null;
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div>{children}</div>
    </div>
  );
}
