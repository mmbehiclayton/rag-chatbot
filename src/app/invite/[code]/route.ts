import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { INVITE_COOKIE } from "@/lib/invites";
import { siteUrl } from "@/lib/site-url";

/**
 * A colleague's invite link: remember the code for 30 days, then go to create an account.
 * Someone already signed in is asked whether to join the school instead. Redirects use the
 * public address: behind nginx, req.url is the container's own (0.0.0.0:3000).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const session = await auth().catch(() => null);
  const res = NextResponse.redirect(
    new URL(session?.userId ? "/dashboard/join" : "/register", siteUrl()),
  );
  if (/^[A-Z0-9]{6}$/i.test(code)) {
    res.cookies.set(INVITE_COOKIE, code.toUpperCase(), {
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }
  return res;
}
