import { WhatsAppShare } from "@/components/shared/public-header";
import { getInviteCode, inviteUrl } from "@/lib/invites";

/**
 * Asks a teacher who has just made something useful to tell a colleague, through their invite link.
 * The link carries ?ref=whatsapp so the Pilot page can count who joins this way.
 */
export async function ShareElimu({
  userId,
  made,
}: {
  userId: string;
  /** What they made, e.g. "my Grade 7 English scheme of work". */
  made: string;
}) {
  const code = await getInviteCode(userId).catch(() => null);
  if (!code) return null;
  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <div className="space-y-1">
        <h2 className="text-base font-semibold">Tell a colleague</h2>
        <p className="text-sm text-muted-foreground">
          Know a teacher who would like help with their schemes and lesson
          plans? Share your invite link on WhatsApp.
        </p>
      </div>
      <WhatsAppShare
        url={`${inviteUrl(code)}?ref=whatsapp`}
        text={`I made ${made} with Elimu in a few minutes. You can try it free:`}
      />
    </section>
  );
}
