import { Resend } from "resend";
import { siteUrl } from "@/lib/site-url";

const FROM = process.env.RESEND_FROM_EMAIL ?? "Elimu <noreply@elimu.ai>";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export async function sendVerificationEmail(email: string, token: string) {
  const link = `${siteUrl()}/verify-email?token=${token}`;
  const resend = getResend();

  if (!resend) {
    console.log(`[DEV] Verification link for ${email}: ${link}`);
    return;
  }

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Verify your Elimu account",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px">
        <h2 style="color:#1a1a1a">Welcome to Elimu</h2>
        <p>Click the button below to verify your email address. The link expires in 24 hours.</p>
        <a href="${link}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#0d72ef;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Verify Email
        </a>
        <p style="margin-top:24px;color:#6b7280;font-size:13px">
          If you didn't create an account, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const link = `${siteUrl()}/reset-password?token=${token}`;
  const resend = getResend();

  if (!resend) {
    console.log(`[DEV] Password reset link for ${email}: ${link}`);
    return;
  }

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Reset your Elimu password",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px">
        <h2 style="color:#1a1a1a">Reset your password</h2>
        <p>Click the button below to set a new password. The link expires in 1 hour.</p>
        <a href="${link}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#0d72ef;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Reset Password
        </a>
        <p style="margin-top:24px;color:#6b7280;font-size:13px">
          If you didn't request a password reset, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}

/** Sent when Elimu staff add someone to a school: a link to set their password and sign in. */
export async function sendSchoolWelcomeEmail(
  email: string,
  token: string,
  school: string,
) {
  const link = `${siteUrl()}/reset-password?token=${token}`;
  const resend = getResend();

  if (!resend) {
    console.log(`[DEV] Set-password link for ${email}: ${link}`);
    return;
  }

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `You've been added to ${school} on Elimu`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px">
        <h2 style="color:#2c3e50">Welcome to Elimu</h2>
        <p>You've been added to ${school}. Set a password to sign in. The link expires in 7 days.</p>
        <a href="${link}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#0d72ef;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Set your password
        </a>
        <p style="margin-top:24px;color:#6b7280;font-size:13px">
          If you weren't expecting this, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}

/** Tells Elimu staff that OpenAI has stopped working, so teachers aren't the first to notice. */
export async function sendAIOutageEmail(to: string[], problem: string) {
  const link = `${siteUrl()}/dashboard/knowledge`;
  const resend = getResend();
  if (!resend || to.length === 0) {
    console.log(`[DEV] AI outage alert for ${to.join(", ")}: ${problem}`);
    return;
  }

  await resend.emails.send({
    from: FROM,
    to,
    subject: "Elimu can't write right now: OpenAI needs attention",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px">
        <h2 style="color:#2c3e50">OpenAI has stopped working for Elimu</h2>
        <p>${problem}</p>
        <p>Until this is fixed, teachers can't create lesson plans, schemes, notes or assessments, Ask Elimu doesn't answer, and new curriculum designs can't be read.</p>
        <p>Once it's fixed, the warning in Elimu clears by itself the next time a teacher creates something. Failed designs need <b>Try again</b> on the Curriculum Designs page.</p>
        <a href="${link}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#0d72ef;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Open Curriculum Designs
        </a>
        <p style="margin-top:24px;color:#6b7280;font-size:13px">You get this at most once every 6 hours while the problem lasts.</p>
      </div>
    `,
  });
}
