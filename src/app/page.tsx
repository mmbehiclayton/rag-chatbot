import { auth } from "@/lib/auth";
import { LandingClient } from "@/components/landing-client";

export default async function Home() {
  const session = await auth();
  return <LandingClient session={session} />;
}
