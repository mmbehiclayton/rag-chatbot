import { redirect } from "next/navigation";

// Notifications aren't built yet; the old page showed made-up examples.
export default function NotificationsPage() {
  redirect("/dashboard");
}
