import { cookies } from "next/headers";
import { findInviter, INVITE_COOKIE } from "@/lib/invites";
import { RegisterForm } from "./register-form";

export default async function RegisterPage() {
  // Name the school only from our own records, never from the link, so a link can't show a fake school.
  const code = (await cookies()).get(INVITE_COOKIE)?.value;
  const inviter = await findInviter(code).catch(() => null);
  return <RegisterForm school={inviter?.school?.name ?? null} />;
}
