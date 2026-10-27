"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { removeAIKey, saveAIKey, testAIKey } from "@/lib/actions/ai-keys";
import type { AIProvider, KeySource } from "@/lib/ai-keys";

const INFO: Record<
  AIProvider,
  { name: string; use: string; placeholder: string; where: string }
> = {
  openai: {
    name: "OpenAI",
    use: "Writes every document and answers Ask Elimu. Also finds the right part of the curriculum designs.",
    placeholder: "sk-...",
    where: "platform.openai.com, API keys",
  },
  anthropic: {
    name: "Anthropic (Claude)",
    use: "The backup. Claude writes for teachers when OpenAI is out of credit or down.",
    placeholder: "sk-ant-...",
    where: "console.anthropic.com, API keys",
  },
};

const SOURCE: Record<
  KeySource,
  { label: string; variant: "success" | "secondary" | "warning" }
> = {
  saved: { label: "Saved here", variant: "success" },
  hosting: { label: "From server settings", variant: "secondary" },
  none: { label: "Not set", variant: "warning" },
};

export function AIKeyCard({
  provider,
  source,
  last4,
  hostingLast4,
  updatedAt,
  unreadable,
  workspace,
}: {
  provider: AIProvider;
  source: KeySource;
  last4: string | null;
  hostingLast4: string | null;
  updatedAt: string | null;
  unreadable: boolean;
  workspace: string | null;
}) {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [workspaceId, setWorkspaceId] = useState(workspace ?? "");
  const [busy, setBusy] = useState<"save" | "test" | "remove" | null>(null);
  const [, startTransition] = useTransition();
  const info = INFO[provider];
  const badge = SOURCE[source];

  const run = (
    kind: "save" | "test" | "remove",
    action: () => Promise<
      { success: true; message: string } | { success: false; error: string }
    >,
  ) => {
    setBusy(kind);
    startTransition(async () => {
      const result = await action();
      setBusy(null);
      if (!result.success) return void toast.error(result.error);
      toast.success(result.message);
      if (kind === "save") setKey("");
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>{info.name}</CardTitle>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>
        <CardDescription>{info.use}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Key in use</dt>
            <dd className="font-medium">
              {last4 ? `ends in ${last4}` : "None"}
            </dd>
          </div>
          {source === "saved" && updatedAt && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Saved</dt>
              <dd>
                {new Date(updatedAt).toLocaleString("en-KE", {
                  timeZone: "Africa/Nairobi",
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </dd>
            </div>
          )}
          {workspace && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Workspace</dt>
              <dd className="break-all">{workspace}</dd>
            </div>
          )}
          {source === "saved" && hostingLast4 && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Server fallback</dt>
              <dd>ends in {hostingLast4}</dd>
            </div>
          )}
        </dl>

        {unreadable && (
          <p className="rounded-md bg-warning/10 p-3 text-sm text-warning">
            A saved key can't be read, probably because JWT_SECRET_KEY changed.
            Save the key again.
          </p>
        )}

        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (key.trim())
              run("save", () =>
                saveAIKey({
                  provider,
                  key: key.trim(),
                  workspace: workspaceId,
                }),
              );
          }}
        >
          <Label htmlFor={`key-${provider}`}>
            {source === "saved" ? "Replace the key" : "Save a new key"}
          </Label>
          <Input
            id={`key-${provider}`}
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder={info.placeholder}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="h-11"
          />
          <p className="text-xs text-muted-foreground">
            Get it from {info.where}. We check it with {info.name} before
            saving, so a wrong key never replaces a working one.
          </p>
          {provider === "anthropic" && (
            <div className="space-y-2 pt-2">
              <Label htmlFor="workspace-anthropic">
                Workspace ID (only for organisation keys)
              </Label>
              <Input
                id="workspace-anthropic"
                autoComplete="off"
                spellCheck={false}
                placeholder="wrkspc_..."
                value={workspaceId}
                onChange={(e) => setWorkspaceId(e.target.value)}
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                Leave this empty for a key made inside a workspace. A key made
                for the whole organisation needs the workspace ID, from
                console.anthropic.com, Settings, Workspaces.
              </p>
            </div>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="submit"
              className="h-11"
              disabled={busy !== null || !key.trim()}
            >
              {busy === "save" && <Spinner />} Check and save
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11"
              disabled={busy !== null || source === "none"}
              onClick={() => run("test", () => testAIKey({ provider }))}
            >
              {busy === "test" && <Spinner />} Test key in use
            </Button>
            {source === "saved" && (
              <Button
                type="button"
                variant="outline"
                className="h-11 text-destructive"
                disabled={busy !== null}
                onClick={() => {
                  if (
                    window.confirm(
                      hostingLast4
                        ? `Remove the saved ${info.name} key? Elimu goes back to the key in the server settings (ends in ${hostingLast4}).`
                        : `Remove the saved ${info.name} key? There is no key in the server settings, so ${info.name} stops working.`,
                    )
                  )
                    run("remove", () => removeAIKey({ provider }));
                }}
              >
                {busy === "remove" && <Spinner />} Remove saved key
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
