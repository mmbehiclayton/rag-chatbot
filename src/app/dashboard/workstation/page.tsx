import { redirect } from "next/navigation";

// The workstation was replaced by the Create hub; keep this route so old links still work.
export default function WorkstationPage() {
  redirect("/dashboard#make");
}
