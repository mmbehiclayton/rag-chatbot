import { NextRequest, NextResponse } from "next/server";
import { INVITE_COOKIE } from "@/lib/invites";

/** A colleague's invite link: remember the code for 30 days, then go to create an account. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const res = NextResponse.redirect(new URL("/register", req.url));
  if (/^[A-Z0-9]{6}$/i.test(code)) {
    res.cookies.set(INVITE_COOKIE, code.toUpperCase(), { maxAge: 60 * 60 * 24 * 30, httpOnly: true, sameSite: "lax", path: "/" });
  }
  return res;
}
