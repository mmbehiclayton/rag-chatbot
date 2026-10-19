import { redirect } from "next/navigation";

// "Make something" now lives on Home; keep this route so old links still work.
export default function CreatePage() {
  redirect("/dashboard#make");
}
