"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TermBreak } from "@/lib/term-pack";

const MAX_BREAKS = 10;

/** Half-term and other days without lessons inside one term: a name and a from–to date range each. */
export function BreaksEditor({
  breaks,
  onChange,
  idPrefix,
}: {
  breaks: TermBreak[];
  onChange: (next: TermBreak[]) => void;
  /** Keeps input ids unique when several editors are on one page. */
  idPrefix: string;
}) {
  const set = (i: number, patch: Partial<TermBreak>) =>
    onChange(breaks.map((b, j) => (j === i ? { ...b, ...patch } : b)));

  return (
    <div className="space-y-3">
      {breaks.map((b, i) => {
        const id = `${idPrefix}-break-${i}`;
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: rows have no id, and keying by their dates would remount an input while it's edited
          <div key={i} className="space-y-3 rounded-md border p-3">
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-2">
                <Label htmlFor={id}>Name</Label>
                <Input
                  id={id}
                  value={b.label}
                  placeholder="Half-term break"
                  maxLength={60}
                  onChange={(e) => set(i, { label: e.target.value })}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-lg"
                aria-label={`Remove ${b.label || "this break"}`}
                onClick={() => onChange(breaks.filter((_, j) => j !== i))}
              >
                <Trash2 />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor={`${id}-from`}>From</Label>
                <Input
                  id={`${id}-from`}
                  type="date"
                  value={b.from}
                  onChange={(e) => set(i, { from: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${id}-to`}>To</Label>
                <Input
                  id={`${id}-to`}
                  type="date"
                  value={b.to}
                  onChange={(e) => set(i, { to: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>
        );
      })}
      {breaks.length < MAX_BREAKS && (
        <Button
          type="button"
          variant="outline"
          onClick={() => onChange([...breaks, { from: "", to: "", label: "" }])}
        >
          <Plus /> Add a break
        </Button>
      )}
    </div>
  );
}
