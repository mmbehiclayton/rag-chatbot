import { Share2 } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";

/**
 * Header for pages anyone can read without signing in. Teachers who are already signed in
 * get a way back to their dashboard instead of "Sign in".
 */
export function PublicHeader({
  signedIn = false,
  wide = false,
}: {
  signedIn?: boolean;
  /** Match the wider landing page. */
  wide?: boolean;
}) {
  return (
    <header className="border-b bg-card">
      <div
        className={`mx-auto flex h-14 items-center ${wide ? "max-w-5xl" : "max-w-4xl"} justify-between gap-2 px-4`}
      >
        <Logo />
        <nav aria-label="Site" className="flex items-center gap-1">
          <Button
            variant="ghost"
            className="h-11"
            render={<Link href="/designs" />}
          >
            <span className="sm:hidden">Designs</span>
            <span className="hidden sm:inline">Curriculum designs</span>
          </Button>
          {signedIn ? (
            <Button className="h-11" render={<Link href="/dashboard" />}>
              My dashboard
            </Button>
          ) : (
            <Button
              variant="ghost"
              className="h-11"
              render={<Link href="/login" />}
            >
              Sign in
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}

/** The sign-up box at the end of each public page. */
export function SignUpPrompt({ title, body }: { title: string; body: string }) {
  return (
    <section className="space-y-3 rounded-xl border bg-card p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{body}</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button size="lg" render={<Link href="/register" />}>
          Sign up
        </Button>
        <Button size="lg" variant="outline" render={<Link href="/login" />}>
          Sign in
        </Button>
      </div>
    </section>
  );
}

/** A WhatsApp share link for a public page. No script needed, so it costs no extra data. */
export function WhatsAppShare({ url, text }: { url: string; text: string }) {
  return (
    <Button
      variant="outline"
      className="h-11"
      render={
        // biome-ignore lint/a11y/useAnchorContent: the Button supplies the content
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`}
          target="_blank"
          rel="noopener noreferrer"
        />
      }
    >
      <Share2 /> Share on WhatsApp
    </Button>
  );
}
